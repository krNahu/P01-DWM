// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); 
const { isAuthenticated } = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas
router.get('/profile', isAuthenticated, authController.getProfile);
router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;