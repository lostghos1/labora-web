require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db/database'); // initializes schema + seed data on first run

const locationsRouter = require('./routes/locations');
const categoriesRouter = require('./routes/categories');
const commentsRouter = require('./routes/comments');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/locations', locationsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api', commentsRouter);
app.use('/api/admin', adminRouter);

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LABORA server running at http://localhost:${PORT}`);
});
