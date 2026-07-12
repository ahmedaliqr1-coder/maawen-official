const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from the 'assets' directory with correct MIME types
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Serve other static files from root
app.use(express.static(path.join(__dirname)));

// API for sync (MaawenSync)
let orders = {};
app.post('/api/intercept', (req, res) => {
    const data = req.body;
    const orderRef = data.order_ref || data.orderRef;
    if (orderRef) {
        orders[orderRef] = { ...orders[orderRef], ...data };
        console.log(`Order ${orderRef} updated`);
    }
    res.json({ success: true });
});

// Handle SPA routing - send all non-file requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
