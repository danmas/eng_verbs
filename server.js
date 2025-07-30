// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Basic route to serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// API endpoint to get list of available stories
app.get('/api/stories', (req, res) => {
  const fs = require('fs');
  const storiesPath = path.join(__dirname, 'public', 'texts');
  
  try {
    const files = fs.readdirSync(storiesPath);
    const stories = [];
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const storyData = JSON.parse(fs.readFileSync(path.join(storiesPath, file), 'utf8'));
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
    });
    
    res.json(stories);
  } catch (error) {
    console.error('Error reading stories directory:', error);
    res.status(500).json({ error: 'Failed to load stories' });
  }
});

// API endpoint to get a specific story
app.get('/api/stories/:id', (req, res) => {
  const fs = require('fs');
  const storyId = req.params.id;
  const storyPath = path.join(__dirname, 'public', 'texts', `${storyId}.json`);
  
  try {
    const storyData = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    res.json(storyData);
  } catch (error) {
    console.error(`Error reading story ${storyId}:`, error);
    res.status(404).json({ error: 'Story not found' });
  }
});

// Admin endpoints for story management
app.post('/api/admin/save-story', express.json(), (req, res) => {
  const fs = require('fs');
  const storyData = req.body;
  const storyPath = path.join(__dirname, 'public', 'texts', `${storyData.id}.json`);
  
  try {
    fs.writeFileSync(storyPath, JSON.stringify(storyData, null, 2));
    res.json({ message: 'Story saved successfully' });
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({ error: 'Failed to save story' });
  }
});

app.delete('/api/admin/delete-story/:id', (req, res) => {
  const fs = require('fs');
  const storyId = req.params.id;
  const storyPath = path.join(__dirname, 'public', 'texts', `${storyId}.json`);
  
  try {
    fs.unlinkSync(storyPath);
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

// Optional: Endpoint for storing results (future expansion)
app.post('/api/results', express.json(), (req, res) => {
  // Could store results in a database here
  res.json({ message: 'Results received' });
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


