const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentsController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); 
router.post('/create', paymentController.createPayment);
router.put('/:paymentId/confirm', paymentController.confirmPayment);
router.post('/webhook', express.json({ type: 'application/json' }), paymentController.paypalWebhook);
router.get('/user/:userId', paymentController.getPayments);

module.exports = router;
