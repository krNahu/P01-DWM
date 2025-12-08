const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/database');

// Configuración
console.log("1. Cargando configuraciones...");
dotenv.config();

console.log("2. Conectando a Base de Datos...");
connectDB();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:80',
  credentials: true
}));

// === ZONA DE DIAGNÓSTICO ===
console.log("3. Intentando cargar rutas de Auth...");

try {
    const authRoutes = require('./src/routes/auth.routes');
    
    // AQUÍ ESTÁ EL CHISME: ¿Qué es authRoutes?
    console.log("🧐 ¿Qué recibí del archivo auth.routes.js?", typeof authRoutes);
    console.log("📄 Contenido:", authRoutes);

    if (typeof authRoutes !== 'function') {
        console.error("🚨 ¡ALERTA! El archivo auth.routes.js no está exportando un Router válido.");
        console.error("   Debes asegurarte de tener 'module.exports = router;' al final de ese archivo.");
    } else {
        app.use('/api/auth', authRoutes);
        console.log("✅ Rutas de Auth cargadas correctamente.");
    }

} catch (error) {
    console.error("❌ ERROR FATAL al importar auth.routes.js:");
    console.error(error);
}

// Rutas desactivadas por seguridad (para que no fallen)
// app.use('/api/game', require('./src/routes/roulette.routes'));
// app.use('/api/transactions', require('./src/routes/transaction.routes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend funcionando' });
});

app.listen(port, () => {
  console.log(`🚀 Backend API corriendo en http://localhost:${port}`);
});