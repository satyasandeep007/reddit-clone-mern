const path = require('path');
const express = require('express');
const app = express();
const config = require('./config');
const routes = require('./routes/api');
const mongoose = require('mongoose');
const expressValidator = require('express-validator');
const helmet = require('helmet');
const server = {};

const uri = config.database;
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true }
);

const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connected");
})
connection.on('error', (e) => console.log("error"));

app.use(helmet());
app.use(express.json());
app.use(expressValidator());
app.use('/api', routes);
app.use(express.static(path.join(__dirname, 'client')));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

const PORT = process.env.PORT || config.httpPort;

app.listen(PORT, () => {
  console.log(`We have a ${config.name} server running on PORT: ${PORT}`);
});

module.exports = server;
