const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const WebSocket = require('ws');
const http = require('http');

const app = express();
app.use((req, res, next) => { console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`); next(); });
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/maawen';
const SECRET_KEY = process.env.SECRET_KEY || 'maawen-super-secret-key-2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Function to find file in multiple locations
const serveFile = (fileName) => (req, res) => {
  const paths = [
    path.join(__dirname, 'dist', fileName),
    path.join(__dirname, fileName),
    path.join(__dirname, 'assets', fileName)
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('File not found');
};

// Explicit routes for helper scripts
app.get('/force-payment-redirect.js', serveFile('force-payment-redirect.js'));
app.get('/payment-interceptor.js', serveFile('payment-interceptor.js'));
app.get('/payment-flow.js', serveFile('payment-flow.js'));

// Serve static files from multiple directories
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

// Serve index.html for the root path
app.get('/', (req, res) => {
  const p = fs.existsSync(path.join(__dirname, 'dist', 'index.html')) 
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(p);
});

// Serve admin.html
app.get('/admin', (req, res) => {
  const p = fs.existsSync(path.join(__dirname, 'dist', 'admin.html')) 
    ? path.join(__dirname, 'dist', 'admin.html')
    : path.join(__dirname, 'admin.html');
  res.sendFile(p);
});

// API Routes
app.post('/api/intercept', async (req, res) => {
  try {
    const data = req.body;
    let ref = data.order_ref || data.orderRef;
    const now = Date.now();
    if (!ref) {
      ref = uuidv4().substring(0, 8).toUpperCase();
      await pool.query('INSERT INTO orders (order_ref, created_at, updated_at) VALUES ($1, $2, $3)', [ref, now, now]);
    }
    res.json({ orderRef: ref });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/:ref/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT status FROM orders WHERE order_ref = $1', [req.params.ref]);
    res.json({ status: result.rows[0]?.status || 'pending' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SPA routing - MUST BE LAST
app.get('*', (req, res) => {
  const p = fs.existsSync(path.join(__dirname, 'dist', 'index.html')) 
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, 'index.html');
  res.sendFile(p);
});

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
