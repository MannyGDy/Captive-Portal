const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'frontend')}`);
  console.log(`🎨 CSS file: ${path.join(__dirname, 'frontend/css/style.css')}`);
  console.log(`📜 JS file: ${path.join(__dirname, 'frontend/js/app.js')}`);
  console.log(`🌐 Test the portal at: http://localhost:${PORT}`);
});
