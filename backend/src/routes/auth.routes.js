// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 

// 👇 DESCOMENTA ESTA LÍNEA (Quita las // del principio)
const { isAuthenticated } = require('../middleware/auth'); 

// Definición de rutas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// 👇 DESCOMENTA ESTA LÍNEA TAMBIÉN (Es la puerta que da error 404)
router.get('/perfil', isAuthenticated, authController.getProfile);

module.exports = router;