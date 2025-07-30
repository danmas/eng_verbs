// public/script.js
let currentStory = null;
let currentVerbData = null;
let aiTimeouts = {
  patienceMessage: { topics: 5000, story: 15000 }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadAITimeouts();
    loadStoryList();
    setupAIFeatures();
    checkAIStatus();
    
    // Add event listener for back button
    document.getElementById('back-to-selection').addEventListener('click', () => {
        showStorySelection();
    });
});

// Load and display the list of available stories
async function loadStoryList() {
    const storyList = document.getElementById('story-list');
    
    try {
        const response = await fetch('/api/stories');
        if (!response.ok) throw new Error('Failed to load stories');
        
        const stories = await response.json();
        
        if (stories.length === 0) {
            storyList.innerHTML = '<div class="error">Истории не найдены. Убедитесь, что файлы находятся в папке texts/</div>';
            return;
        }
        
        storyList.innerHTML = stories.map(story => `
            <div class="story-card" onclick="loadStory('${story.id}')">
                <h3>${story.title}</h3>
                <p><strong>Уровень:</strong> ${getLevelText(story.level)}</p>
                <p><strong>Глаголов:</strong> ${story.verbCount}</p>
                <p>${story.description}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading stories:', error);
        storyList.innerHTML = '<div class="error">Ошибка загрузки историй. Проверьте соединение с сервером.</div>';
    }
}

// Convert level code to Russian text
function getLevelText(level) {
    const levels = {
        'beginner': 'Начинающий',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый'
    };
    return levels[level] || level;
}

// Load a specific story
async function loadStory(storyId) {
    const storyList = document.getElementById('story-list');
    storyList.innerHTML = '<div class="loading">Загрузка истории...</div>';
    
    try {
        const response = await fetch(`/api/stories/${storyId}`);
        if (!response.ok) throw new Error('Story not found');
        
        const story = await response.json();
        currentStory = story;
        currentVerbData = story.verbData;
        
        // Show the story content
        showStoryContent(story);
        
    } catch (error) {
        console.error('Error loading story:', error);
        storyList.innerHTML = '<div class="error">Ошибка загрузки истории. Попробуйте еще раз.</div>';
    }
}

// Display the story content and hide selection
function showStoryContent(story) {
    // Hide story selection and show story content
    document.getElementById('story-selection').style.display = 'none';
    document.getElementById('story-content').style.display = 'block';
    
    // Set story title
    document.getElementById('current-story-title').textContent = story.title;
    
    // Set story content
    const container = document.getElementById('story-container');
    let storyHTML = story.storyText;
    
    // Enhance check sections with AI buttons
    storyHTML = storyHTML.replace(
        /<div class="check-section">\s*<button class="section-check-btn" onclick="checkSection\((\d+)\)">([^<]+)<\/button>\s*<div class="section-score" id="section-score-(\d+)"><\/div>\s*<\/div>/g,
        (match, sectionNum, buttonText, scoreId) => {
            return `
                <div class="check-section">
                    <div class="section-check-enhanced">
                        <button class="section-check-btn" onclick="checkSection(${sectionNum})">${buttonText}</button>
                        <button class="ai-check-btn" onclick="checkSectionWithAI(${sectionNum})" disabled title="Сначала проверьте раздел">🤖 Объяснение от ИИ</button>
                    </div>
                    <div class="section-score" id="section-score-${sectionNum}"></div>
                </div>
            `;
        }
    );
    
    container.innerHTML = storyHTML;
    
    // Add dropdowns to each verb
    const verbs = document.querySelectorAll('.verb');
    verbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        if (!currentVerbData[verbKey]) {
            console.error(`Verb data not found for: ${verbKey}`);
            return;
        }
        
        const select = document.createElement('select');
        select.innerHTML = '<option value="">Select tense</option>' + 
            currentVerbData[verbKey].tenses.map(tense => `<option value="${tense}">${tense}</option>`).join('');
        verb.innerHTML = '';
        verb.appendChild(select);

        // Store student selection
        select.addEventListener('change', (e) => {
            verb.dataset.selected = e.target.value;
        });
    });
    
    // Add event listener for global check button
    const checkButton = document.getElementById('check-answers');
    checkButton.onclick = checkAllAnswers;
    
    // Clear any previous scores
    document.getElementById('score').textContent = '';
}

// Show story selection and hide content
function showStorySelection() {
    document.getElementById('story-content').style.display = 'none';
    document.getElementById('story-selection').style.display = 'block';
    
    // Reset current story data
    currentStory = null;
    currentVerbData = null;
    
    // Reload story list in case new stories were added
    loadStoryList();
}

// Function to check a specific section
function checkSection(sectionNumber) {
    if (!currentVerbData) {
        alert('История не загружена!');
        return;
    }
    
    const sectionVerbs = document.querySelectorAll(`[data-section="${sectionNumber}"]`);
    let correctCount = 0;
    
    sectionVerbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const selected = verb.dataset.selected || '';
        const correct = currentVerbData[verbKey].correct;
        
        if (selected === correct) {
            verb.style.borderBottom = '2px solid green';
            correctCount++;
        } else {
            verb.style.borderBottom = '2px solid red';
        }
        
        // Disable dropdown after checking
        const select = verb.querySelector('select');
        if (select) select.disabled = true;
    });
    
    // Display section score
    const scoreDiv = document.getElementById(`section-score-${sectionNumber}`);
    if (scoreDiv) {
        scoreDiv.textContent = `Счет: ${correctCount} / ${sectionVerbs.length}`;
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.marginTop = '10px';
    }
    
    // Disable the button after checking
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Проверено';
}

// Global check function
function checkAllAnswers() {
    if (!currentVerbData) {
        alert('История не загружена!');
        return;
    }
    
    let correctCount = 0;
    const verbs = document.querySelectorAll('.verb');
    
    verbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const selected = verb.dataset.selected || '';
        const correct = currentVerbData[verbKey].correct;
        
        if (selected === correct) {
            verb.style.borderBottom = '2px solid green';
            correctCount++;
        } else {
            verb.style.borderBottom = '2px solid red';
        }
        
        // Disable dropdown after checking
        const select = verb.querySelector('select');
        if (select) select.disabled = true;
    });

    // Display total score
    document.getElementById('score').textContent = `Общий счет: ${correctCount} / ${verbs.length}`;
    
    // Disable all section buttons
    const sectionButtons = document.querySelectorAll('.section-check-btn');
    sectionButtons.forEach(button => {
        button.disabled = true;
        button.textContent = 'Проверено';
    });
    
    // Disable global check button
    const checkButton = document.getElementById('check-answers');
    checkButton.disabled = true;
    checkButton.textContent = 'Проверено';
}

// AI Features Setup
function setupAIFeatures() {
    // Story generation modal
    document.getElementById('generate-story-btn').addEventListener('click', openStoryGenerationModal);
    document.getElementById('close-generation-modal').addEventListener('click', closeStoryGenerationModal);
    document.getElementById('cancel-generation').addEventListener('click', closeStoryGenerationModal);
    document.getElementById('start-generation').addEventListener('click', generateStoryWithAI);
    document.getElementById('use-generated-story').addEventListener('click', useGeneratedStory);
    document.getElementById('save-generated-story').addEventListener('click', saveGeneratedStory);
    
    // Topic suggestions
    document.getElementById('suggest-topics-btn').addEventListener('click', loadTopicSuggestions);
    
    // AI feedback modal
    document.getElementById('close-feedback-modal').addEventListener('click', closeAIFeedbackModal);
    document.getElementById('close-feedback').addEventListener('click', closeAIFeedbackModal);
}

// Open story generation modal
function openStoryGenerationModal() {
    document.getElementById('story-generation-modal').style.display = 'flex';
    resetGenerationModal();
}

// Close story generation modal
function closeStoryGenerationModal() {
    document.getElementById('story-generation-modal').style.display = 'none';
}

// Reset generation modal to initial state
function resetGenerationModal() {
    document.getElementById('story-topic').value = '';
    document.getElementById('story-level-gen').value = 'intermediate';
    document.getElementById('suggested-topics').style.display = 'none';
    document.getElementById('generation-status').style.display = 'none';
    document.getElementById('generated-story-preview').style.display = 'none';
    document.getElementById('start-generation').style.display = 'inline-block';
    document.getElementById('use-generated-story').style.display = 'none';
    document.getElementById('save-generated-story').style.display = 'none';
}

// Load topic suggestions from AI
async function loadTopicSuggestions() {
    const suggestionsContainer = document.getElementById('suggested-topics');
    const button = document.getElementById('suggest-topics-btn');
    
    button.disabled = true;
    button.textContent = '💭 Думаю...';
    
    // Show patience message for slow AI
    const patienceTimeout = setTimeout(() => {
        if (button.disabled) {
            button.textContent = '⏳ AI думает медленно...';
        }
    }, aiTimeouts.patienceMessage.topics);
    
    try {
        const response = await fetch('/api/ai/topic-suggestions');
        const data = await response.json();
        clearTimeout(patienceTimeout);
        
        if (data.success && data.topics) {
            suggestionsContainer.innerHTML = `
                <h4>💡 Предложенные темы:</h4>
                <div class="topics-grid">
                    ${data.topics.map(topic => 
                        `<span class="topic-chip" onclick="selectTopic('${topic}')">${topic}</span>`
                    ).join('')}
                </div>
            `;
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.innerHTML = '<div class="error">Не удалось загрузить предложения тем</div>';
            suggestionsContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading topic suggestions:', error);
        clearTimeout(patienceTimeout);
        suggestionsContainer.innerHTML = '<div class="error">Ошибка соединения с AI сервисом</div>';
        suggestionsContainer.style.display = 'block';
    } finally {
        button.disabled = false;
        button.textContent = '💡 Предложить темы';
    }
}

// Select topic from suggestions
function selectTopic(topic) {
    document.getElementById('story-topic').value = topic;
    document.getElementById('suggested-topics').style.display = 'none';
}

// Generate story with AI
async function generateStoryWithAI() {
    const topic = document.getElementById('story-topic').value.trim();
    const level = document.getElementById('story-level-gen').value;
    
    if (!topic) {
        alert('Пожалуйста, введите тему для истории');
        return;
    }
    
    // Show loading state
    const statusElement = document.getElementById('generation-status');
    statusElement.style.display = 'block';
    statusElement.innerHTML = '<div class="loading">🤖 ИИ создает историю...</div>';
    document.getElementById('start-generation').style.display = 'none';
    
    // Show patience message for slow AI story generation
    const patienceTimeout = setTimeout(() => {
        statusElement.innerHTML = '<div class="loading">⏳ Создание истории может занять 1-2 минуты...<br><small>AI модели работают медленно</small></div>';
    }, aiTimeouts.patienceMessage.story);
    
    try {
        const response = await fetch('/api/ai/generate-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topic, level })
        });
        
        const data = await response.json();
        clearTimeout(patienceTimeout);
        
        if (data.success) {
            displayGeneratedStory(data.content, topic, level, data.warning);
            
            // Update AI status if using mock
            if (data.source === 'mock') {
                const statusElement = document.getElementById('ai-status');
                const indicatorElement = document.getElementById('ai-status-indicator');
                statusElement.className = 'ai-status mock';
                indicatorElement.textContent = '🎭 Demo режим';
            }
        } else {
            throw new Error(data.error || 'Failed to generate story');
        }
    } catch (error) {
        console.error('Error generating story:', error);
        clearTimeout(patienceTimeout);
        document.getElementById('generation-status').innerHTML = 
            '<div class="error">Ошибка генерации истории. Проверьте соединение с AI сервисом.</div>';
        document.getElementById('start-generation').style.display = 'inline-block';
    }
}

// Display generated story
function displayGeneratedStory(content, topic, level) {
    document.getElementById('generation-status').style.display = 'none';
    
    const previewContainer = document.getElementById('generated-story-preview');
    previewContainer.innerHTML = `
        <h3>🎯 Сгенерированная история</h3>
        <div class="story-meta">
            <strong>Тема:</strong> ${topic}<br>
            <strong>Уровень:</strong> ${getLevelText(level)}
        </div>
        <div class="story-content">${formatGeneratedContent(content)}</div>
    `;
    previewContainer.style.display = 'block';
    document.getElementById('use-generated-story').style.display = 'inline-block';
    document.getElementById('save-generated-story').style.display = 'inline-block';
    
    // Store generated content for later use
    window.generatedStoryContent = content;
    window.generatedStoryTopic = topic;
    window.generatedStoryLevel = level;
}

// Format generated content for display
function formatGeneratedContent(content) {
    // Basic formatting for better readability
    return content
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// Get level text in Russian
function getLevelText(level) {
    const levels = {
        'beginner': 'Начинающий',
        'intermediate': 'Средний', 
        'advanced': 'Продвинутый'
    };
    return levels[level] || level;
}

// Use generated story
async function useGeneratedStory() {
    if (!window.generatedStoryContent) {
        alert('Нет сгенерированной истории для использования');
        return;
    }
    
    const useButton = document.getElementById('use-generated-story');
    const originalText = useButton.textContent;
    
    useButton.disabled = true;
    useButton.textContent = '🤖 Обрабатываю историю...';
    
    try {
        // Process the story with AI
        const response = await fetch('/api/ai/process-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                story: window.generatedStoryContent,
                title: extractTitleFromContent(window.generatedStoryContent),
                level: window.generatedStoryLevel || 'intermediate'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Story processed successfully:', data.story);
            
            if (data.warning) {
                console.warn('Processing warning:', data.warning);
            }
            
            // Load the processed story
            currentStory = data.story;
            currentVerbData = data.story.verbData;
            
            // Show the story
            closeStoryGenerationModal();
            showStoryContent(data.story);
            
            // Show success message
            if (data.warning) {
                alert('✅ История загружена!\n\n⚠️ Внимание: ' + data.warning + '\n\nИстория доступна для изучения, но без интерактивных глаголов.');
            } else {
                alert('🎉 История успешно обработана и готова к изучению!\n\nВы можете сейчас практиковать времена глаголов.');
            }
        } else {
            throw new Error(data.error || 'Failed to process story');
        }
        
    } catch (error) {
        console.error('Error processing story:', error);
        alert('❌ Ошибка обработки истории: ' + error.message + '\n\nПопробуйте ещё раз или используйте админ-панель для создания историй.');
    } finally {
        useButton.disabled = false;
        useButton.textContent = originalText;
    }
}

// Extract title from generated content
function extractTitleFromContent(content) {
    // Try to find title patterns
    const titlePatterns = [
        /###\s*(.+)/,           // ### Title
        /##\s*(.+)/,            // ## Title  
        /#\s*(.+)/,             // # Title
        /\*\*(.+?)\*\*/,        // **Title**
        /^(.+?)(?:\n|$)/        // First line
    ];
    
    for (const pattern of titlePatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return 'AI Generated Story';
}

// Save generated story to library
async function saveGeneratedStory() {
    if (!window.generatedStoryContent) {
        alert('Нет сгенерированной истории для сохранения');
        return;
    }
    
    const saveButton = document.getElementById('save-generated-story');
    const originalText = saveButton.textContent;
    
    saveButton.disabled = true;
    saveButton.textContent = '💾 Сохраняю...';
    
    try {
        // Process the story with AI first
        const processResponse = await fetch('/api/ai/process-story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                story: window.generatedStoryContent,
                title: extractTitleFromContent(window.generatedStoryContent),
                level: window.generatedStoryLevel || 'intermediate'
            })
        });
        
        const processData = await processResponse.json();
        
        if (processData.success) {
            // Save the processed story
            const saveResponse = await fetch('/api/admin/save-story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processData.story)
            });
            
            const saveData = await saveResponse.json();
            
            if (saveData.message) {
                alert('✅ История успешно сохранена в библиотеку!\n\n📖 Название: ' + processData.story.title + '\n🆔 ID: ' + processData.story.id + '\n\nТеперь она доступна в списке историй.');
                
                // Refresh story list if we're on the main page
                if (document.getElementById('story-selection').style.display !== 'none') {
                    loadStoryList();
                }
            } else {
                throw new Error(saveData.error || 'Failed to save story');
            }
        } else {
            throw new Error(processData.error || 'Failed to process story');
        }
        
    } catch (error) {
        console.error('Error saving story:', error);
        alert('❌ Ошибка сохранения истории: ' + error.message + '\n\nПопробуйте ещё раз.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    }
}

// Modified checkSection function to include AI checking
function checkSection(sectionNumber) {
    if (!currentVerbData) {
        alert('История не загружена!');
        return;
    }
    
    const sectionVerbs = document.querySelectorAll(`[data-section="${sectionNumber}"]`);
    let correctCount = 0;
    
    // Collect user answers and correct answers for AI analysis
    const userAnswers = {};
    const correctAnswers = {};
    const sectionText = getSectionText(sectionNumber);
    
    sectionVerbs.forEach(verb => {
        const verbKey = verb.dataset.verb;
        const selected = verb.dataset.selected || '';
        const correct = currentVerbData[verbKey].correct;
        
        userAnswers[verbKey] = selected;
        correctAnswers[verbKey] = correct;
        
        if (selected === correct) {
            verb.style.borderBottom = '2px solid green';
            correctCount++;
        } else {
            verb.style.borderBottom = '2px solid red';
        }
        
        // Disable dropdown after checking
        const select = verb.querySelector('select');
        if (select) select.disabled = true;
    });
    
    // Display section score and enable AI button
    const scoreDiv = document.getElementById(`section-score-${sectionNumber}`);
    if (scoreDiv) {
        scoreDiv.innerHTML = `<div>Счет: ${correctCount} / ${sectionVerbs.length}</div>`;
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.marginTop = '10px';
        
        // Enable AI check button
        const checkSection = scoreDiv.closest('.check-section');
        if (checkSection) {
            const aiButton = checkSection.querySelector('.ai-check-btn');
            if (aiButton) {
                aiButton.disabled = false;
                aiButton.title = 'Получить объяснение от ИИ';
                // Store data for AI check
                aiButton.dataset.sectionText = sectionText;
                aiButton.dataset.userAnswers = JSON.stringify(userAnswers);
                aiButton.dataset.correctAnswers = JSON.stringify(correctAnswers);
            }
        }
    }
    
    // Disable the button after checking
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Проверено';
}

// Get section text for AI analysis
function getSectionText(sectionNumber) {
    const sectionVerbs = document.querySelectorAll(`[data-section="${sectionNumber}"]`);
    if (sectionVerbs.length === 0) return '';
    
    // Find the text content around these verbs
    let sectionText = '';
    sectionVerbs.forEach(verb => {
        const paragraph = verb.closest('p');
        if (paragraph && !sectionText.includes(paragraph.textContent)) {
            sectionText += paragraph.textContent + ' ';
        }
    });
    
    return sectionText.trim();
}

// Check section with AI
async function checkSectionWithAI(sectionNumber) {
    const button = event.target;
    const originalText = button.textContent;
    
    // Get data from button attributes
    const sectionText = button.dataset.sectionText || getSectionText(sectionNumber);
    const userAnswers = button.dataset.userAnswers ? JSON.parse(button.dataset.userAnswers) : {};
    const correctAnswers = button.dataset.correctAnswers ? JSON.parse(button.dataset.correctAnswers) : {};
    
    button.disabled = true;
    button.textContent = '🤖 Анализирую...';
    
    try {
        const response = await fetch('/api/ai/check-section', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sectionText,
                userAnswers,
                correctAnswers
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAIFeedback(data.feedback);
        } else {
            throw new Error(data.error || 'Failed to get AI feedback');
        }
    } catch (error) {
        console.error('Error getting AI feedback:', error);
        alert('Ошибка получения объяснения от ИИ. Проверьте соединение с AI сервисом.');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// Show AI feedback modal
function showAIFeedback(feedback) {
    const feedbackContent = document.getElementById('ai-feedback-content');
    feedbackContent.innerHTML = formatAIFeedback(feedback);
    document.getElementById('ai-feedback-modal').style.display = 'flex';
}

// Close AI feedback modal
function closeAIFeedbackModal() {
    document.getElementById('ai-feedback-modal').style.display = 'none';
}

// Format AI feedback for better display
function formatAIFeedback(feedback) {
    // Basic formatting to make AI feedback more readable
    let formatted = feedback
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
    
    // Add some structure for common patterns
    formatted = formatted
        .replace(/<p>1\.\s*<strong>Анализ ошибок<\/strong>(.*?)<\/p>/g, '<div class="error-analysis"><h4>📝 Анализ ошибок</h4>$1</div>')
        .replace(/<p>2\.\s*<strong>Объяснения правил<\/strong>(.*?)<\/p>/g, '<div class="rule-explanation"><h4>📚 Объяснения правил</h4>$1</div>')
        .replace(/<p>3\.\s*<strong>Исправленный текст<\/strong>(.*?)<\/p>/g, '<div class="corrected-text"><h4>✅ Исправленный текст</h4>$1</div>')
        .replace(/<p>4\.\s*<strong>Советы для запоминания<\/strong>(.*?)<\/p>/g, '<div class="memory-tips"><h4>💡 Советы для запоминания</h4>$1</div>');
    
    return formatted;
}

// Load AI timeout configuration
async function loadAITimeouts() {
    try {
        const response = await fetch('/api/ai/timeouts');
        const data = await response.json();
        
        if (data.success && data.timeouts) {
            aiTimeouts = data.timeouts;
            console.log('AI timeouts loaded:', aiTimeouts);
        }
    } catch (error) {
        console.error('Error loading AI timeouts:', error);
        // Keep default values
    }
}

// Check AI service status
async function checkAIStatus() {
    const statusElement = document.getElementById('ai-status');
    const indicatorElement = document.getElementById('ai-status-indicator');
    
    try {
        const response = await fetch('/api/ai/status');
        const data = await response.json();
        
        if (data.available) {
            statusElement.className = 'ai-status connected';
            indicatorElement.textContent = '✅ AI подключен';
            console.log('AI service is available');
        } else {
            statusElement.className = 'ai-status disconnected';
            indicatorElement.textContent = '⚠️ AI недоступен';
            console.log('AI service is not available:', data.error);
        }
    } catch (error) {
        statusElement.className = 'ai-status disconnected';
        indicatorElement.textContent = '❌ AI отключен';
        console.error('Error checking AI status:', error);
    }
}

// Update story display to show mock warning
function displayGeneratedStory(content, topic, level, warning) {
    document.getElementById('generation-status').style.display = 'none';
    
    const previewContainer = document.getElementById('generated-story-preview');
    let warningHtml = '';
    
    if (warning) {
        warningHtml = `<div class="mock-warning">⚠️ ${warning}</div>`;
    }
    
    previewContainer.innerHTML = `
        <h3>🎯 Сгенерированная история</h3>
        ${warningHtml}
        <div class="story-meta">
            <strong>Тема:</strong> ${topic}<br>
            <strong>Уровень:</strong> ${getLevelText(level)}
        </div>
        <div class="story-content">${formatGeneratedContent(content)}</div>
    `;
    previewContainer.style.display = 'block';
    document.getElementById('use-generated-story').style.display = 'inline-block';
    document.getElementById('save-generated-story').style.display = 'inline-block';
    
    // Store generated content for later use
    window.generatedStoryContent = content;
    window.generatedStoryTopic = topic;
    window.generatedStoryLevel = level;
}
