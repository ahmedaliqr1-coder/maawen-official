const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8000;

// Serve static files from root, assets, and dist
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'dist')));

// Explicit route for interceptor
app.get('/payment-interceptor.js', (req, res) => {
  const p = path.join(__dirname, 'assets', 'payment-interceptor.js');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.sendFile(path.join(__dirname, 'payment-interceptor.js'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
