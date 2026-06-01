require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const cloudController = require('./controllers/cloudController');

// Client endpoints
app.post('/api/cloud/activate-request', cloudController.activateRequest);
app.post('/api/cloud/sync', cloudController.syncDevice);

// SuperAdmin endpoints
app.get('/api/cloud/admin/devices', cloudController.getDevices);
app.post('/api/cloud/admin/approve', cloudController.approveDevice);

// For local testing
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`☁️ SaaS Cloud Manager (Supabase) is running on port ${PORT}`);
    });
}

// Export the app for Vercel serverless
module.exports = app;
