const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// كل الراوتس الخاصة بالاشتراكات

// 👤 أي مستخدم مسجل يقدر يشوف اشتراكه
router.get('/me', protect, subscriptionController.getMySubscription);

// 👨‍💼 Admin أو Coach يقدروا يشوفوا كل الاشتراكات
router.get('/', protect, restrictTo('admin', 'coach'), subscriptionController.getAllSubscriptions);

// 👨‍💼 إنشاء اشتراك جديد
router.post('/', protect, restrictTo('admin', 'coach'), subscriptionController.createSubscription);

// 👨‍💼 تحديث الاشتراك
router.put('/:id', protect, restrictTo('admin', 'coach'), subscriptionController.updateSubscription);

// 👨‍💼 حذف الاشتراك
router.delete('/:id', protect, restrictTo('admin', 'coach'), subscriptionController.deleteSubscription);

module.exports = router;
