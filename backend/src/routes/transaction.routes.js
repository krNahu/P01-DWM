const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/deposit', isAuthenticated, transactionController.deposit);
router.post('/withdraw', isAuthenticated, transactionController.withdraw);
router.get('/', isAuthenticated, transactionController.getTransactions);

module.exports = router;