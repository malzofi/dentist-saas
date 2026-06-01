const express = require('express');
const serverless = require('serverless-http');
const cloudController = require('../controllers/cloudController');

const app = express();
app.use(express.json());

// API Routes
app.post('/api/verify', cloudController.verifyLicense);
app.post('/api/activate', cloudController.activateRequest);
app.post('/api/licenses', cloudController.createLicense);

module.exports.handler = serverless(app);
