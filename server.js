require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/steps', require('./routes/steps'));
app.use('/api/rules', require('./routes/rules'));
app.use('/api/executions', require('./routes/executions'));

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/index.html')));
app.get('/workflows/new', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/workflow-editor.html')));
app.get('/workflows/:id/edit', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/workflow-editor.html')));
app.get('/workflows/:id/execute', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/execute.html')));
app.get('/executions', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/audit.html')));
app.get('/executions/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/pages/execution-detail.html')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow_automation';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
