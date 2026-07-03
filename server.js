const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve static files from assets directory explicitly
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for any other request to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is live on port ${port}`);
});
