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
app.get('/api/cloud/updates/latest', cloudController.getLatestUpdate);

// SuperAdmin endpoints
// Admin Dashboard Routes
app.post('/api/cloud/admin/login', cloudController.login);
// Protect these routes with verifyAdmin middleware
app.get('/api/cloud/admin/licenses', cloudController.verifyAdmin, cloudController.getLicenses);
app.post('/api/cloud/admin/licenses', cloudController.verifyAdmin, cloudController.createLicense);
app.delete('/api/cloud/admin/licenses/:id', cloudController.verifyAdmin, cloudController.deleteLicense);
app.get('/api/cloud/admin/devices', cloudController.verifyAdmin, cloudController.getDevices);
app.post('/api/cloud/admin/approve', cloudController.verifyAdmin, cloudController.approveDevice);
app.get('/api/cloud/admin/updates', cloudController.verifyAdmin, cloudController.getUpdateHistory);
app.post('/api/cloud/admin/updates', cloudController.verifyAdmin, cloudController.publishUpdate);

// Serve Static Frontend (Dashboard)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For local testing
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`☁️ SaaS Cloud Manager (Supabase) is running on port ${PORT}`);
    });
}

// Export the app for Vercel serverless
module.exports = app;
