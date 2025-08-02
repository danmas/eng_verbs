// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const fs = require('fs').promises; // Use promises version of fs
const fsSync = require('fs'); // Use sync version for initial setup
const axios = require('axios');
const matter = require('gray-matter'); // For parsing markdown frontmatter

// Log file path
const LOG_FILE_AI = path.join(__dirname, 'ai_log.txt');

// Ensure directories exist
const explanationsDir = path.join(__dirname, 'public', 'explanations');
if (!fsSync.existsSync(explanationsDir)) {
    fsSync.mkdirSync(explanationsDir, { recursive: true });
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Basic route to serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Fisher-Yates shuffle algorithm to randomize array
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffleArray(array) {
    const shuffled = [...array]; // Create a copy
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Parses a Markdown story file and converts it to JSON format
 * @param {string} mdContent - The raw markdown content
 * @param {string} storyId - The story ID (filename without extension)
 * @returns {object} - Parsed story object
 */
function parseMdStory(mdContent, storyId) {
    // Parse frontmatter and content
    const parsed = matter(mdContent);
    const { data: frontmatter, content } = parsed;

    // Initialize the story object
    const story = {
        id: storyId,
        title: frontmatter.title || 'Untitled Story',
        description: frontmatter.description || 'No description provided',
        level: frontmatter.level || 'intermediate',
        verbCount: 0,
        verbData: {},
        storyText: ''
    };

    let sectionNumber = 1;
    let processedContent = content;

    // Find all verb arrays like ["lived", "lives", "will live", ...]
    const verbMatches = [...processedContent.matchAll(/\["([^"]+)"(?:,\s*"([^"]+)")*\]/g)];
    const verbKeys = new Set();

    verbMatches.forEach((match, index) => {
        const fullMatch = match[0]; // The entire match like ["lived", "lives", ...]
        
        // Parse the array content properly
        const arrayContent = fullMatch.slice(1, -1); // Remove [ and ]
        const verbForms = arrayContent.split(',').map(item => 
            item.trim().replace(/^"/, '').replace(/"$/, '')
        );

        if (verbForms.length > 0) {
            const correctForm = verbForms[0]; // First form is correct (before shuffling)
            const baseVerb = correctForm.replace(/\s+/g, '_').toLowerCase(); // Create a key
            
            // Avoid duplicate keys
            let uniqueKey = baseVerb;
            let counter = 1;
            while (verbKeys.has(uniqueKey)) {
                uniqueKey = `${baseVerb}_${counter}`;
                counter++;
            }
            verbKeys.add(uniqueKey);

            // Shuffle the verb forms to randomize correct answer position
            const shuffledForms = shuffleArray(verbForms);

            // Determine section number based on position in text
            const beforeMatch = processedContent.substring(0, match.index);
            const sectionCount = (beforeMatch.match(/##\s/g) || []).length;
            const currentSection = Math.max(1, sectionCount);

            // Add to verbData with shuffled forms
            story.verbData[uniqueKey] = {
                tenses: shuffledForms,
                correct: correctForm // Keep original correct form
            };

            // Replace in content with HTML span
            processedContent = processedContent.replace(
                fullMatch,
                `<span class="verb" data-verb="${uniqueKey}" data-section="${currentSection}">...</span>`
            );
        }
    });

    // Process section buttons {checkSection(1), "Проверить этот раздел"}
    processedContent = processedContent.replace(
        /\{checkSection\((\d+)\),?\s*"([^"]+)"\}/g,
        '<div class="check-section"><button class="section-check-btn" onclick="checkSection($1)">$2</button><div class="section-score" id="section-score-$1"></div></div>'
    );

    // Convert ## headers to HTML h2
    processedContent = processedContent.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // Convert newlines to paragraphs for better formatting
    const paragraphs = processedContent.split('\n\n').filter(p => p.trim());
    let htmlContent = '';
    
    paragraphs.forEach(paragraph => {
        const trimmed = paragraph.trim();
        if (trimmed.startsWith('<h2>') || trimmed.startsWith('<div class="check-section">')) {
            htmlContent += trimmed + '\n';
        } else if (trimmed) {
            htmlContent += `<p>${trimmed}</p>\n`;
        }
    });

    story.storyText = htmlContent.trim();
    story.verbCount = Object.keys(story.verbData).length;

    return story;
}

// API endpoint to get list of available stories
app.get('/api/stories', async (req, res) => {
  const storiesPath = path.join(__dirname, 'public', 'texts');
  
  try {
    const files = await fs.readdir(storiesPath);
    const stories = [];
    
    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.md')) {
        try {
          let storyData;
          const storyId = path.basename(file, path.extname(file));
          
          if (file.endsWith('.md')) {
            // Parse markdown file
            const mdContent = await fs.readFile(path.join(storiesPath, file), 'utf8');
            storyData = parseMdStory(mdContent, storyId);
          } else {
            // Parse JSON file (legacy support)
            storyData = JSON.parse(await fs.readFile(path.join(storiesPath, file), 'utf8'));
          }
          
          stories.push({
            id: storyData.id,
            title: storyData.title,
            description: storyData.description,
            level: storyData.level,
            verbCount: storyData.verbCount
          });
        } catch (error) {
          console.error(`Error reading story file ${file}:`, error);
        }
      }
    }
    
    res.json(stories);
  } catch (error) {
    console.error('Error reading stories directory:', error);
    res.status(500).json({ error: 'Failed to load stories' });
  }
});

// API endpoint to get a specific story
app.get('/api/stories/:id', async (req, res) => {
  const storyId = req.params.id;
  const storiesPath = path.join(__dirname, 'public', 'texts');
  
  try {
    // Try markdown first, then JSON
    const mdPath = path.join(storiesPath, `${storyId}.md`);
    const jsonPath = path.join(storiesPath, `${storyId}.json`);
    
    let storyData;
    
    try {
      // Check if .md file exists
      await fs.access(mdPath);
      const mdContent = await fs.readFile(mdPath, 'utf8');
      storyData = parseMdStory(mdContent, storyId);
    } catch (mdError) {
      // Fallback to JSON file
      try {
        await fs.access(jsonPath);
        storyData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
      } catch (jsonError) {
        throw new Error(`Story ${storyId} not found in either .md or .json format`);
      }
    }
    
    res.json(storyData);
  } catch (error) {
    console.error(`Error reading story ${storyId}:`, error);
    res.status(404).json({ error: 'Story not found' });
  }
});

// Admin endpoints for story management
app.post('/api/admin/save-story', express.json(), async (req, res) => {
  const storyData = req.body;
  const storyPath = path.join(__dirname, 'public', 'texts', `${storyData.id}.json`);
  
  try {
    await fs.writeFile(storyPath, JSON.stringify(storyData, null, 2));
    res.json({ message: 'Story saved successfully' });
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({ error: 'Failed to save story' });
  }
});

app.delete('/api/admin/delete-story/:id', async (req, res) => {
  const storyId = req.params.id;
  const jsonPath = path.join(__dirname, 'public', 'texts', `${storyId}.json`);
  const mdPath = path.join(__dirname, 'public', 'texts', `${storyId}.md`);
  
  try {
    // Try to delete both formats
    try { await fs.unlink(jsonPath); } catch {}
    try { await fs.unlink(mdPath); } catch {}
    
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Route to serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route to serve AI log viewer
app.get('/admin/logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-logs.html'));
});


// AI Integration endpoints
let aiConfig;
try {
  aiConfig = require('./ai-config.json');
  console.log('AI Config loaded:', {
    url: aiConfig.server.url,
    model: aiConfig.server.defaultModel
  });
} catch (error) {
  console.error('Error loading AI config:', error);
  // Fallback config
  aiConfig = {
    server: { url: 'http://localhost:3002', defaultModel: 'google/gemini-2.0-flash-exp:free' },
    prompts: { topicSuggestion: { template: 'Default topics' } },
    ui: { defaultTopics: ['космическое путешествие', 'детективная история'] }
  };
}

// Function to get a prompt, loading from file if necessary
async function getPrompt(promptName) {
    const promptConfig = aiConfig.prompts[promptName];
    if (!promptConfig) {
        throw new Error(`Prompt "${promptName}" not found in ai-config.json`);
    }

    const template = promptConfig.template;
    if (template.endsWith('.txt')) {
        try {
            const filePath = path.join(__dirname, 'public', template);
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error(`Error reading prompt file ${template}:`, error);
            throw new Error(`Could not load prompt from file: ${template}`);
        }
    }
    return template;
}

/**
 * Logs the AI request and response to a text file.
 * Prepends the new log entry to the file.
 * @param {object} requestDetails - Details about the request sent.
 * @param {object} responseDetails - Details about the response received.
 */
async function logAiInteraction(requestDetails, responseDetails) {
    const requestTimestamp = new Date().toISOString();

    const logEntry = `
================================================================================
Log Entry: ${requestTimestamp}
================================================================================

[REQUEST] -> ${requestDetails.method} ${requestDetails.url}
Timestamp: ${requestTimestamp}

--- Request Payload ---
${JSON.stringify(requestDetails.data, null, 2)}

--------------------------------------------------------------------------------

[RESPONSE] <- Status: ${responseDetails.status}
Timestamp: ${new Date().toISOString()}

--- Response Body ---
${JSON.stringify(responseDetails.data, null, 2)}

`;

    try {
        const currentContent = await fs.readFile(LOG_FILE_AI, 'utf-8').catch(err => {
            if (err.code === 'ENOENT') return ''; // File doesn't exist, start fresh.
            throw err;
        });
        await fs.writeFile(LOG_FILE_AI, logEntry + currentContent, 'utf-8');
    } catch (error) {
        console.error('FATAL: Failed to write to AI log file.', error);
    }
}

/**
 * Wrapper for making requests to the AI server that includes logging.
 * @param {string} method - HTTP method (get, post, etc.).
 * @param {string} url - The URL to request.
 * @param {object} [data] - The data to send in the request body.
 * @param {object} [config] - Axios request config.
 * @returns {Promise<object>} The axios response object.
 */
async function callAiServer(method, url, data = null, config = {}) {
    const requestDetails = {
        method: method.toUpperCase(),
        url: url,
        data: data
    };

    let response;
    try {
        response = await axios({
            method: method,
            url: url,
            data: data,
            ...config,
        });
        await logAiInteraction(requestDetails, {
            status: response.status,
            data: response.data
        });
        return response;
    } catch (error) {
        await logAiInteraction(requestDetails, {
            status: error.response ? error.response.status : 'No Response',
            data: error.response ? error.response.data : { error: error.message, code: error.code }
        });
        throw error; // Re-throw so existing error handling works
    }
}


// Get AI configuration
app.get('/api/ai/config', (req, res) => {
  res.json(aiConfig);
});

// Get timeout configuration for frontend
app.get('/api/ai/timeouts', (req, res) => {
  res.json({
    timeouts: aiConfig.timeouts,
    success: true
  });
});

// Check AI service status
app.get('/api/ai/status', async (req, res) => {
  try {
    console.log('Checking AI service status at:', aiConfig.server.url);
    
    const response = await callAiServer(
        'get',
        `${aiConfig.server.url}/api/available-models`,
        null,
        { timeout: aiConfig.timeouts.statusCheck }
    );
    
    res.json({
      available: true,
      url: aiConfig.server.url,
      models: Array.isArray(response.data) ? response.data.length : 'unknown',
      status: 'connected'
    });
    
  } catch (error) {
    console.log('AI service unavailable:', error.message);
    
    res.json({
      available: false,
      url: aiConfig.server.url,
      error: error.message,
      status: 'disconnected'
    });
  }
});

// Get AI Logs
app.get('/api/admin/ai-logs', async (req, res) => {
    try {
        const logContent = await fs.readFile(LOG_FILE_AI, 'utf-8');
        
        const chunks = logContent.split('================================================================================')
            .map(chunk => chunk.trim())
            .filter(Boolean); // Remove empty strings

        const parsedLogs = [];
        // We iterate by 2 because each log entry consists of a header chunk and a body chunk
        for (let i = 0; i < chunks.length; i += 2) {
            const header = chunks[i];
            const body = chunks[i + 1];

            if (!body || !header.startsWith('Log Entry:')) {
                console.warn('Skipping malformed log chunk:', header);
                continue;
            }

            const requestPayloadMatch = body.match(/--- Request Payload ---\s*(\{[\s\S]*?\})\s*---/);
            const responseBodyMatch = body.match(/--- Response Body ---\s*([\s\S]*?)$/);

            if (!requestPayloadMatch || !responseBodyMatch) {
                console.warn("Could not parse a log entry body, skipping.");
                continue;
            }
            
            try {
                const request = JSON.parse(requestPayloadMatch[1]);
                const response = JSON.parse(responseBodyMatch[1]);
                parsedLogs.push({ request, response });
            } catch (e) {
                console.error("Error parsing JSON in a log entry:", e);
                // Continue to the next entry
            }
        }

        res.json({ success: true, logs: parsedLogs });

    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.json({ success: true, logs: [] }); // No log file yet
        }
        console.error('Error reading or parsing AI log file:', error);
        res.status(500).json({ success: false, error: 'Failed to read or parse AI log file' });
    }
});


// Update AI configuration
app.post('/api/ai/config', express.json(), async (req, res) => {
  try {
    const updatedConfig = { ...aiConfig, ...req.body };
    await fs.writeFile('./ai-config.json', JSON.stringify(updatedConfig, null, 2));
    
    // Update in-memory config
    Object.assign(aiConfig, updatedConfig);
    
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Update AI model
app.post('/api/ai/model', express.json(), async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ error: 'Model name is required' });
    }
    
    // Update model in config
    aiConfig.server.defaultModel = model;
    
    // Save to file
    await fs.writeFile('./ai-config.json', JSON.stringify(aiConfig, null, 2));
    
    console.log(`AI model updated to: ${model}`);
    
    res.json({ 
      message: 'AI model updated successfully',
      model: aiConfig.server.defaultModel 
    });
  } catch (error) {
    console.error('Error updating AI model:', error);
    res.status(500).json({ error: 'Failed to update AI model' });
  }
});

// Update just timeout configuration
app.post('/api/ai/timeouts', express.json(), async (req, res) => {
  try {
    const { timeouts } = req.body;
    
    if (!timeouts) {
      return res.status(400).json({ error: 'Timeouts configuration required' });
    }
    
    // Update timeouts in config
    aiConfig.timeouts = { ...aiConfig.timeouts, ...timeouts };
    
    // Save to file
    await fs.writeFile('./ai-config.json', JSON.stringify(aiConfig, null, 2));
    
    res.json({ 
      message: 'Timeouts updated successfully',
      timeouts: aiConfig.timeouts 
    });
  } catch (error) {
    console.error('Error updating timeouts:', error);
    res.status(500).json({ error: 'Failed to update timeouts' });
  }
});

// Generate story using AI (Markdown format)
app.post('/api/ai/generate-story-md', express.json(), async (req, res) => {
  const { topic, level = 'intermediate' } = req.body;
  
  try {
    console.log('Generating MD story for topic:', topic);
    const storyPromptTemplate = await getPrompt('storyGenerationMd');
    const prompt = storyPromptTemplate.replace('{topic}', topic);
    
    const payload = {
        model: aiConfig.server.defaultModel,
        prompt: prompt,
        inputText: `Создай историю в Markdown формате на тему: ${topic}`,
        saveResponse: false
    };

    const response = await callAiServer(
        'post',
        `${aiConfig.server.url}/api/send-request`,
        payload,
        { timeout: aiConfig.timeouts.storyGeneration }
    );
    
    if (response.data.success) {
      console.log('MD story generated successfully');
      
      // Try to parse and save the generated MD story
      try {
        const mdContent = response.data.content;
        
        // Generate a unique story ID
        const storyId = generateStoryId(`${topic}-md`);
        const mdPath = path.join(__dirname, 'public', 'texts', `${storyId}.md`);
        
        // Save MD file
        await fs.writeFile(mdPath, mdContent, 'utf-8');
        console.log(`MD story saved to ${mdPath}`);
        
        // Parse it to get full story data for response
        const parsedStory = parseMdStory(mdContent, storyId);
        
        res.json({
          success: true,
          content: mdContent,
          story: parsedStory,
          topic: topic,
          storyId: storyId,
          message: 'MD story generated and saved successfully'
        });
        
      } catch (saveError) {
        console.error('Error saving MD story:', saveError);
        // Return content even if saving failed
        res.json({
          success: true,
          content: response.data.content,
          topic: topic,
          warning: 'Story generated but could not be saved automatically'
        });
      }
    } else {
      console.error('AI MD story generation failed:', response.data);
      throw new Error('AI service error: ' + (response.data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error generating MD story:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate MD story',
      details: error.message
    });
  }
});

// Generate story using AI (legacy JSON format)
app.post('/api/ai/generate-story', express.json(), async (req, res) => {
  const { topic, customPrompt } = req.body;
  
  try {
    console.log('Generating story for topic:', topic);
    const storyPromptTemplate = await getPrompt('storyGeneration');
    const prompt = customPrompt || storyPromptTemplate.replace('{topic}', topic);
    
    const payload = {
        model: aiConfig.server.defaultModel,
        prompt: prompt,
        inputText: `Создай историю на тему: ${topic}`,
        saveResponse: false
    };

    const response = await callAiServer(
        'post',
        `${aiConfig.server.url}/api/send-request`,
        payload,
        { timeout: aiConfig.timeouts.storyGeneration }
    );
    
    if (response.data.success) {
      console.log('Story generated successfully');
      res.json({
        success: true,
        content: response.data.content,
        topic: topic
      });
    } else {
      console.error('AI story generation failed:', response.data);
      throw new Error('AI service error: ' + (response.data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error generating story:', error.message);
    
    // Fallback to mock story generation
    console.log('Falling back to mock story generation...');
    const mockStory = generateMockStory(topic);
    
    res.json({
      success: true,
      content: mockStory,
      topic: topic,
      source: 'mock',
      warning: 'AI service unavailable - using demo story'
    });
  }
});

// Generate mock story for fallback
function generateMockStory(topic) {
  const mockStories = {
    'космическое путешествие': `
# The Space Explorer's Journey

**Brief Description:** Captain Sarah embarks on a thrilling mission to explore a mysterious planet in the Andromeda galaxy.

**Level:** Intermediate

**Part 1: The Departure**

Captain Sarah checked her equipment one last time before boarding the spacecraft. She had trained for this mission for years, and now she was finally ready to explore the unknown planet Kepler-442b. The engines roared to life as she initiated the launch sequence.

**Part 2: The Discovery** 

After months of travel, Sarah's ship detected strange energy readings from the planet's surface. She landed carefully in a valley filled with crystal formations that glowed with an ethereal blue light. As she stepped out of her ship, she realized she had discovered something extraordinary.

**Part 3: The Challenge**

Suddenly, the crystal formations began to pulse with increasing intensity. Sarah's instruments showed that a massive storm was approaching. She had to make a quick decision: stay and study these amazing crystals, or return to her ship for safety.
    `,
    'детективная история': `
# The Missing Manuscript Mystery

**Brief Description:** Detective Johnson investigates the theft of a priceless medieval manuscript from the city's main library.

**Level:** Intermediate

**Part 1: The Crime Scene**

Detective Johnson arrived at the library at 8 AM sharp. The librarian, Mrs. Peterson, had called the police when she discovered that the 500-year-old manuscript had vanished overnight. The security cameras had mysteriously stopped working at midnight.

**Part 2: The Investigation**

Johnson interviewed all the staff members who had access to the rare books section. Each person had an alibi, but something didn't feel right. The detective noticed that one of the windows had been left slightly open, even though it had been locked the previous evening.

**Part 3: The Revelation**

After examining the fingerprints on the window frame, Johnson made a shocking discovery. The thief wasn't a stranger - it was someone who worked at the library. Now he had to figure out who and why they had committed this crime.
    `
  };
  
  const defaultStory = `
# The ${topic} Adventure

**Brief Description:** An exciting story about ${topic} that will help you practice English verb tenses.

**Level:** Intermediate

**Part 1: The Beginning**

Our story begins with a character who encounters an interesting situation related to ${topic}. They must make important decisions that will affect the outcome of their journey.

**Part 2: The Challenge**

As the story develops, new challenges appear. The main character uses their skills and knowledge to overcome obstacles and continue their quest.

**Part 3: The Resolution**

Finally, through determination and clever thinking, the character finds a solution to their problem and learns valuable lessons along the way.
  `;
  
  return mockStories[topic] || defaultStory;
}

// Check section with AI
app.post('/api/ai/check-section', express.json(), async (req, res) => {
  const { sectionText, userAnswers, correctAnswers } = req.body;
  
  try {
    console.log('Checking section with AI...');
    let promptTemplate = await getPrompt('sectionCheck');
    let prompt = promptTemplate.replace('{sectionText}', sectionText);
    prompt = prompt.replace('{userAnswers}', JSON.stringify(userAnswers));
    prompt = prompt.replace('{correctAnswers}', JSON.stringify(correctAnswers));
    
    const payload = {
        model: aiConfig.server.defaultModel,
        prompt: prompt,
        inputText: 'Проверь правильность использования времен глаголов',
        saveResponse: false
    };

    const response = await callAiServer(
        'post',
        `${aiConfig.server.url}/api/send-request`,
        payload,
        { timeout: aiConfig.timeouts.sectionCheck }
    );
    
    if (response.data.success) {
      console.log('AI section check completed successfully');
      const feedback = response.data.content;
      
      res.json({
        success: true,
        feedback: feedback
      });
    } else {
      console.error('AI section check failed:', response.data);
      res.status(500).json({ 
        error: 'AI service returned an error', 
        details: response.data.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error checking section:', error.message);
    if (error.code === 'ECONNREFUSED') {
      res.status(500).json({ 
        error: 'AI service is not available. Please check that your AI server is running on ' + aiConfig.server.url 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to connect to AI service', 
        details: error.message 
      });
    }
  }
});

// Save AI feedback to a file
app.post('/api/ai/save-feedback', express.json(), async (req, res) => {
  try {
    const { storyId, sectionNumber, userAnswers, correctAnswers, feedback } = req.body;
    
    const explanationId = `${storyId}-section-${sectionNumber}-${Date.now()}.json`;
    const explanationPath = path.join(explanationsDir, explanationId);
    
    const dataToSave = {
      storyId,
      sectionNumber,
      userAnswers,
      correctAnswers,
      feedback,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(explanationPath, JSON.stringify(dataToSave, null, 2));
    console.log(`Explanation saved to ${explanationPath}`);
    
    res.json({ success: true, message: 'Feedback saved successfully' });
    
  } catch (error) {
    console.error('Error saving AI feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to save feedback' });
  }
});

// Get the last AI explanation for a section
app.get('/api/ai/last-explanation/:storyId/:sectionNumber', async (req, res) => {
    const { storyId, sectionNumber } = req.params;
    try {
        const files = (await fs.readdir(explanationsDir))
            .filter(file => file.startsWith(`${storyId}-section-${sectionNumber}`))
            .sort()
            .reverse();

        if (files.length > 0) {
            const lastFile = files[0];
            const filePath = path.join(explanationsDir, lastFile);
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            res.json({ success: true, explanation: data });
        } else {
            res.json({ success: false, message: 'No explanation found' });
        }
    } catch (error) {
        console.error('Error getting last explanation:', error);
        res.status(500).json({ success: false, error: 'Failed to get last explanation' });
    }
});

// Get topic suggestions
app.get('/api/ai/topic-suggestions', async (req, res) => {
  try {
    console.log('Attempting to connect to AI service at:', aiConfig.server.url);
    const prompt = await getPrompt('topicSuggestion');
    
    const payload = {
        model: aiConfig.server.defaultModel,
        prompt: prompt,
        inputText: 'Предложи темы для историй',
        saveResponse: false
    };

    const response = await callAiServer(
        'post',
        `${aiConfig.server.url}/api/send-request`,
        payload,
        { timeout: aiConfig.timeouts.topicSuggestions }
    );
    
    if (response.data.success) {
      console.log('AI response received successfully');
      // Parse the response to extract topics
      let topics = [];
      const content = response.data.content;
      
      // Try to extract topics from different formats
      if (content.includes('```json')) {
        // Extract JSON from code block
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            topics = parsed.topics || [];
          } catch (e) {
            console.log('Failed to parse JSON topics, falling back to text parsing');
          }
        }
      }
      
      // Fallback to text parsing
      if (topics.length === 0) {
        topics = content
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(topic => topic.length > 0);
      }
      
      res.json({
        success: true,
        topics: topics.length > 0 ? topics : aiConfig.ui.defaultTopics,
        source: 'ai'
      });
    } else {
      console.log('AI request failed, using default topics');
      res.json({
        success: true,
        topics: aiConfig.ui.defaultTopics,
        source: 'default'
      });
    }
  } catch (error) {
    console.error('Error getting topic suggestions:', error.message);
    console.log('Falling back to default topics');
    res.json({
      success: true,
      topics: aiConfig.ui.defaultTopics,
      source: 'default'
    });
  }
});

// Get available AI models
app.get('/api/ai/models', async (req, res) => {
  try {
    const response = await callAiServer(
        'get',
        `${aiConfig.server.url}/api/available-models`,
        null
    );
    res.json({
      success: true,
      models: response.data
    });
  } catch (error) {
    console.error('Error getting AI models:', error);
    res.status(500).json({ error: 'Failed to get available models' });
  }
});

// Process AI-generated story into interactive structure
app.post('/api/ai/process-story', express.json(), async (req, res) => {
  const { story, title, level } = req.body;
  
  try {
    console.log('Processing AI-generated story...');
    
    let promptTemplate = await getPrompt('storyProcessor');
    let prompt = promptTemplate.replace('{story}', story);
    
    const payload = {
        model: aiConfig.server.defaultModel,
        prompt: prompt,
        inputText: 'Обработай эту историю для создания интерактивных упражнений',
        saveResponse: false
    };

    const response = await callAiServer(
        'post',
        `${aiConfig.server.url}/api/send-request`,
        payload,
        { timeout: aiConfig.timeouts.storyProcessing }
    );
    
    if (response.data.success) {
      console.log('Story processing completed successfully');
      
      try {
        // Try to parse JSON response
        let jsonContent = response.data.content;
        
        // Remove ```json blocks if present
        if (jsonContent.includes('```json')) {
          const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonContent = jsonMatch[1];
          }
        }
        
        const processedStory = JSON.parse(jsonContent);
        
        // Convert AI format to our format
        processedStory.storyText = convertAIStoryFormat(processedStory.storyText);
        processedStory.verbData = normalizeVerbData(processedStory.verbData, processedStory.storyText);
        
        // Add auto-generated ID
        processedStory.id = generateStoryId(processedStory.title || title);
        
        // Ensure required fields
        if (!processedStory.title) processedStory.title = title || 'AI Generated Story';
        if (!processedStory.level) processedStory.level = level || 'intermediate';
        if (!processedStory.description) processedStory.description = 'AI-generated story for verb practice';

        // Save the processed story to a file
        const storyPath = path.join(__dirname, 'public', 'texts', `${processedStory.id}.json`);
        await fs.writeFile(storyPath, JSON.stringify(processedStory, null, 2));
        console.log(`Story saved to ${storyPath}`);
        
        res.json({
          success: true,
          story: processedStory,
          message: 'Story processed and saved successfully'
        });
        
      } catch (parseError) {
        console.error('Error parsing AI response as JSON:', parseError);
        console.log('Raw AI response:', response.data.content);
        
        // Fallback: create basic structure manually and save it
        const fallbackStory = createFallbackStory(story, title, level);
        const storyPath = path.join(__dirname, 'public', 'texts', `${fallbackStory.id}.json`);
        await fs.writeFile(storyPath, JSON.stringify(fallbackStory, null, 2));
        console.log(`Fallback story saved to ${storyPath}`);

        res.json({
          success: true,
          story: fallbackStory,
          warning: 'Used fallback processing due to JSON parse error, but saved the story.'
        });
      }
      
    } else {
      console.error('AI story processing failed:', response.data);
      const fallbackStory = createFallbackStory(story, title, level);

      // Save the fallback story to a file
      const storyPath = path.join(__dirname, 'public', 'texts', `${fallbackStory.id}.json`);
      await fs.writeFile(storyPath, JSON.stringify(fallbackStory, null, 2));
      console.log(`Fallback story saved to ${storyPath}`);

      res.json({
        success: true,
        story: fallbackStory,
        warning: 'Used fallback processing due to AI service error, but saved the story.'
      });
    }
  } catch (error) {
    console.error('Error processing story:', error.message);
    
    // Fallback processing and save
    const fallbackStory = createFallbackStory(story, title, level);
    const storyPath = path.join(__dirname, 'public', 'texts', `${fallbackStory.id}.json`);
    await fs.writeFile(storyPath, JSON.stringify(fallbackStory, null, 2));
    console.log(`Fallback story saved to ${storyPath}`);

    res.json({
      success: true,
      story: fallbackStory,
      warning: 'Used fallback processing due to connection error, but saved the story.'
    });
  }
});

// Helper function to generate story ID
function generateStoryId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-ai-' + Date.now().toString().slice(-6);
}

// Convert AI story format to our format
function convertAIStoryFormat(storyText) {
  console.log('Converting AI story format...');
  
  // Convert [VERB:verb:section] format to our format
  let convertedText = storyText.replace(
    /\[VERB:([^:]+):(\d+)\]/g, 
    '<span class="verb" data-verb="$1" data-section="$2">...</span>'
  );
  
  // Convert simple <button>Check Section X</button> to our format
  convertedText = convertedText.replace(
    /<button>Check Section (\d+)<\/button>/g,
    '<div class="check-section"><button class="section-check-btn" onclick="checkSection($1)">Проверить этот раздел</button><div class="section-score" id="section-score-$1"></div></div>'
  );
  
  // Clean up extra <br> tags
  convertedText = convertedText.replace(/<br><br>/g, '');
  
  console.log('AI story format converted successfully');
  return convertedText;
}

// Normalize verb data to match story text
function normalizeVerbData(aiVerbData, storyText) {
  console.log('Normalizing verb data...');
  
  const normalizedData = {};
  
  // Extract verb keys from story text
  const verbMatches = storyText.match(/data-verb="([^"]+)"/g);
  if (verbMatches) {
    verbMatches.forEach(match => {
      const verbKey = match.match(/data-verb="([^"]+)"/)[1];
      
      // Find matching verb in AI data (case insensitive, flexible matching)
      for (const aiKey in aiVerbData) {
        if (aiKey.toLowerCase().includes(verbKey.toLowerCase()) || 
            verbKey.toLowerCase().includes(aiKey.toLowerCase()) ||
            aiKey === verbKey) {
          normalizedData[verbKey] = aiVerbData[aiKey];
          break;
        }
      }
      
      // If no match found, create default
      if (!normalizedData[verbKey]) {
        normalizedData[verbKey] = {
          correct: verbKey,
          tenses: [verbKey, verbKey + 'ed', verbKey + 's', 'will ' + verbKey]
        };
      }
    });
  }
  
  console.log('Verb data normalized:', Object.keys(normalizedData).length, 'verbs');
  return normalizedData;
}

// Helper function to create fallback story structure
function createFallbackStory(story, title, level) {
  console.log('Creating fallback story structure...');
  
  const storyId = generateStoryId(title || 'AI Story');
  
  // Basic text processing to identify potential verbs
  const sentences = story.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sections = Math.ceil(sentences.length / 3); // Divide into sections
  
  let storyText = '<h2>' + (title || 'AI Generated Story') + '</h2>';
  let sectionNum = 1;
  let verbCount = 0;
  const verbData = {};
  
  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) return;
    
    // Add section break
    if (index > 0 && index % Math.ceil(sentences.length / sections) === 0 && sectionNum <= sections) {
      storyText += `
        <div class="check-section">
          <button class="section-check-btn" onclick="checkSection(${sectionNum})">Проверить этот раздел</button>
          <div class="section-score" id="section-score-${sectionNum}"></div>
        </div>
      `;
      sectionNum++;
    }
    
    storyText += '<p>' + trimmedSentence + '.</p>';
  });
  
  // Add final section check
  if (sectionNum <= sections) {
    storyText += `
      <div class="check-section">
        <button class="section-check-btn" onclick="checkSection(${sectionNum})">Проверить этот раздел</button>
        <div class="section-score" id="section-score-${sectionNum}"></div>
      </div>
    `;
  }
  
  return {
    id: storyId,
    title: title || 'AI Generated Story',
    description: 'AI-generated story processed automatically',
    level: level || 'intermediate',
    verbCount: verbCount,
    verbData: verbData,
    storyText: storyText
  };
}

// Optional: Endpoint for storing results (future expansion)
app.post('/api/results', express.json(), (req, res) => {
  // Could store results in a database here
  res.json({ message: 'Results received' });
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});