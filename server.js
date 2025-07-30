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
// Optional: Endpoint for storing results (future expansion)
app.post('/api/results', express.json(), (req, res) => {
  // Could store results in a database here
  res.json({ message: 'Results received' });
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


