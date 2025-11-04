const Subscription = require('../models/Subscription');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// 🟢 إنشاء اشتراك جديد (لـ admin/coach)
exports.createSubscription = catchAsync(async (req, res, next) => {
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
    user: req.user._id,
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
});

// 🟢 جلب كل الاشتراكات (لـ admin/coach)
exports.getAllSubscriptions = catchAsync(async (req, res, next) => {
  const subscriptions = await Subscription.find().populate('user', 'name email');
  res.json({ success: true, subscriptions });
});

// 🟢 جلب الاشتراك الحالي للمستخدم
exports.getMySubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOne({ user: req.user._id });
  if (!subscription) return next(new AppError('No subscription found', 404));
  res.json({ success: true, subscription });
});

// 🟢 تحديث الاشتراك (لـ admin/coach)
exports.updateSubscription = catchAsync(async (req, res, next) => {
  const { plan, status, endDate, autoRenew } = req.body;

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) return next(new AppError('Subscription not found', 404));

  if (plan) subscription.plan = plan;
  if (status) subscription.status = status;
  if (endDate) subscription.endDate = endDate;
  if (autoRenew !== undefined) subscription.autoRenew = autoRenew;

  await subscription.save();
  res.json({ success: true, subscription });
});

// 🟢 حذف الاشتراك (لـ admin/coach)
exports.deleteSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findByIdAndDelete(req.params.id);
  if (!subscription) return next(new AppError('Subscription not found', 404));
  res.json({ success: true, message: 'Subscription deleted successfully' });
});

// 🟢 إنشاء اشتراك مجاني للمستخدم العادي بعد التسجيل
exports.createUserSubscription = catchAsync(async (req, res, next) => {
  const existing = await Subscription.findOne({ user: req.user._id });
  if (existing) return res.json({ success: true, subscription: existing });

  const subscription = await Subscription.create({
    user: req.user._id,
    plan: 'free',
    price: 0,
    currency: 'USD',
    status: 'active',
    startDate: new Date(),
    endDate: null, // غير محدود للخطة المجانية
    autoRenew: false,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    subscription,
    message: 'Free plan activated successfully',
  });
});

// 🟢 ترقية الاشتراك للمستخدم العادي
exports.upgradeSubscription = catchAsync(async (req, res, next) => {
  const { newPlan } = req.body;
  const subscription = await Subscription.findOne({ user: req.user._id });
  if (!subscription) return next(new AppError('Subscription not found', 404));

  subscription.plan = newPlan;
  subscription.status = 'active';
  subscription.autoRenew = true;
  // يمكن إضافة endDate حسب الدفع
  await subscription.save();

  res.json({ success: true, subscription, message: `Upgraded to ${newPlan} plan` });
});

// 🟢 إلغاء الاشتراك للمستخدم العادي
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const subscription = await Subscription.findOne({ user: req.user._id });
  if (!subscription) return next(new AppError('Subscription not found', 404));

  subscription.status = 'canceled';
  subscription.autoRenew = false;
  await subscription.save();

  res.json({
    success: true,
    subscription,
    message: 'Subscription cancelled. You can continue using premium features until the end of your billing period.'
  });
});
