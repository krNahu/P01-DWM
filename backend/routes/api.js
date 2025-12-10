const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const casinoController = require('../controllers/casinoController');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/user/:username', casinoController.getDatosUsuario); // Obtiene perfil + historial
router.post('/transaccion', casinoController.nuevaTransaccion); // Depositar / Retirar

// Rutas de Juego
router.post('/ruleta/girar', casinoController.girarRuleta);      // Jugar

module.exports = router;