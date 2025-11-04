const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ============================
// 👤 مستخدم عادي
// ============================

// جلب الاشتراك الحالي للمستخدم
router.get('/current', protect, subscriptionController.getMySubscription);

// إنشاء اشتراك جديد للمستخدم (مثلاً الخطة المجانية أو الدفع المباشر)
router.post('/create', protect, subscriptionController.createSubscriptionForUser);

// ترقية الاشتراك الحالي
router.put('/upgrade', protect, subscriptionController.upgradeSubscription);

// إلغاء الاشتراك الحالي
router.post('/cancel', protect, subscriptionController.cancelSubscription);

// ============================
// 👨‍💼 Admin / Coach
// ============================

// جلب كل الاشتراكات
router.get('/', protect, restrictTo('admin', 'coach'), subscriptionController.getAllSubscriptions);

// إنشاء اشتراك لمستخدم محدد
router.post('/', protect, restrictTo('admin', 'coach'), subscriptionController.createSubscription);

// تحديث اشتراك لمستخدم محدد
router.put('/:id', protect, restrictTo('admin', 'coach'), subscriptionController.updateSubscription);

// حذف اشتراك
router.delete('/:id', protect, restrictTo('admin', 'coach'), subscriptionController.deleteSubscription);

module.exports = router;
