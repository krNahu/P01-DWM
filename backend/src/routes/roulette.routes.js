const express = require('express');
const router = express.Router();
const rouletteController = require('../controllers/rouletteController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/bet', isAuthenticated, rouletteController.placeBet);
router.get('/last-numbers', isAuthenticated, rouletteController.getLastNumbers);

module.exports = router;