const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar rutas
const apiRoutes = require('./routes/api');

const app = express();
const port = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a MongoDB (Sin opciones viejas)
mongoose.connect('mongodb+srv://nociiva:pocchinko@Pocchinko.mseba1s.mongodb.net/?appName=Pocchinko')
    .then(() => console.log('🟢 Backend conectado a MongoDB'))
    .catch(err => console.error('🔴 Error de conexión:', err));

// Usar las rutas
app.use('/api', apiRoutes);

// Arrancar
app.listen(port, () => {
    console.log(`🔥 Servidor Modular corriendo en http://localhost:${port}`);
});