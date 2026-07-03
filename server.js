const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Serve all files from the root
app.use(express.static(__dirname));

// Ensure /admin points to admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// For any other route, serve index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
