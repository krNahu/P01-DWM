const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const apiRoutes = require('./routes/api');

const app = express();
const port = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


mongoose.connect('mongodb+srv://nociiva:pocchinko@Pocchinko.mseba1s.mongodb.net/?appName=Pocchinko')
    .then(() => console.log('🟢 Backend conectado a MongoDB'))
    .catch(err => console.error('🔴 Error de conexión:', err));

app.use('/api', apiRoutes);

