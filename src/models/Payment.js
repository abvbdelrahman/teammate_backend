const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'Coach',
    required: true,
  },
  planName: {
    type: String,
    required: [true, 'Payment must have a plan name'],
  },
  amount: {
    type: Number,
    required: [true, 'Payment must have an amount'],
  },
  currency: {
    type: String,
    default: 'usd',
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'manual'],
    default: 'paypal',
  },
  paypalOrderId: {
    type: String, // معرف الطلب من PayPal (بديل stripeSessionId)
  },
  paypalCaptureId: {
    type: String, // ممكن تستخدمه لحفظ الـ capture ID بعد التأكيد
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Payment', paymentSchema);
