const Subscription = require('../models/Subscription');

// إنشاء اشتراك جديد
exports.createSubscription = async (req, res) => {
  try {
    const {
      plan,
      price,
      currency,
      stripeSubscriptionId,
      stripeCustomerId,
      endDate,
      autoRenew,
    } = req.body;

    const subscription = await Subscription.create({
      user: req.user._id, // نفترض إن عندك middleware للـ auth
      plan,
      price,
      currency,
      stripeSubscriptionId,
      stripeCustomerId,
      endDate,
      autoRenew,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// جلب كل الاشتراكات
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate('user', 'name email');
    res.json({ success: true, subscriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// جلب اشتراك معين للمستخدم الحالي
exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found' });
    }
    res.json({ success: true, subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// تحديث الاشتراك (مثل تجديد أو تغيير الخطة)
exports.updateSubscription = async (req, res) => {
  try {
    const { plan, status, endDate, autoRenew } = req.body;

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (plan) subscription.plan = plan;
    if (status) subscription.status = status;
    if (endDate) subscription.endDate = endDate;
    if (autoRenew !== undefined) subscription.autoRenew = autoRenew;

    await subscription.save();

    res.json({ success: true, subscription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// حذف الاشتراك
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
