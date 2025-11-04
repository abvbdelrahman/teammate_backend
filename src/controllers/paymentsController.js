const paypal = require('@paypal/checkout-server-sdk');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Coach = require('../models/Coach');

// إعداد PayPal Environment
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Helper: حساب تاريخ انتهاء الاشتراك
const calculateEndDate = (plan) => {
  const planDurations = { basic: 0, pro: 365, premium: 730 };
  const days = planDurations[plan] || 0;
  return days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
};

// Mapping اسم الخطة من user input
const mapPlanName = (planName) => {
  const mapping = { free: 'basic', pro: 'pro', premium: 'premium' };
  return mapping[planName.toLowerCase()] || 'basic';
};

// ✅ إنشاء الدفع أو تفعيل خطة مجانية
exports.createPayment = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const planNameInput = req.body.planName || req.user.planName || 'free';
  const plan = mapPlanName(planNameInput);

  let price;
  if (plan === 'basic') price = 0;
  else if (plan === 'pro') price = 49.99;
  else if (plan === 'premium') price = 89.99;

  // خطة مجانية → تفعيل مباشر
  if (price === 0) {
    const payment = await Payment.create({
      user: userId,
      planName: plan,
      price: 0,
      status: 'success',
      payment_method: 'manual',
      amount: 0,
    });

    const subscription = await Subscription.create({
      user: userId,
      plan,
      price,
      currency: 'USD',
      status: 'active',
      startDate: new Date(),
      endDate: calculateEndDate(plan),
      autoRenew: true,
      createdBy: userId,
    });

    return res.status(201).json({
      message: 'Free plan activated successfully',
      payment,
      subscription,
    });
  }

  // خطة مدفوعة → إنشاء طلب PayPal
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: { currency_code: 'USD', value: price.toString() },
        description: plan,
      },
    ],
    application_context: {
      brand_name: 'Your App Name',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      return_url: process.env.SUCCESS_URL || 'http://localhost:3000/payment-success',
      cancel_url: process.env.CANCEL_URL || 'http://localhost:3000/payment-cancel',
    },
  });

  const order = await paypalClient.execute(request);

  const payment = await Payment.create({
    user: userId,
    planName: plan,
    price,
    status: 'pending',
    payment_method: 'paypal',
    paypalOrderId: order.result.id,
    amount: price,
  });

  const approvalUrl = order.result.links.find((link) => link.rel === 'approve')?.href;

  res.status(200).json({
    message: 'PayPal order created successfully',
    approvalUrl,
    payment,
  });
});

// ✅ تأكيد الدفع بعد موافقة المستخدم
exports.confirmPayment = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const payment = await Payment.findById(paymentId);
  if (!payment) return next(new AppError('Payment not found', 404));

  if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to confirm this payment', 403));
  }

  const request = new paypal.orders.OrdersCaptureRequest(payment.paypalOrderId);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);

    if (capture.result.status === 'COMPLETED') {
      payment.status = 'success';
      await payment.save();

      const subscription = await Subscription.create({
        user: payment.user,
        plan: payment.planName,
        price: payment.price,
        currency: 'USD',
        status: 'active',
        startDate: new Date(),
        endDate: calculateEndDate(payment.planName),
        autoRenew: true,
        createdBy: req.user.id,
      });

      return res.status(200).json({
        message: 'Payment confirmed successfully',
        payment,
        subscription,
        capture: capture.result,
      });
    } else {
      payment.status = 'failed';
      await payment.save();
      return next(new AppError('Payment not completed', 400));
    }
  } catch (err) {
    console.error(err);
    return next(new AppError('PayPal capture failed', 500));
  }
});

// ✅ Webhook من PayPal (اختياري)
exports.paypalWebhook = catchAsync(async (req, res, next) => {
  const paypalAuthHeader = req.headers['paypal-auth'];
  if (paypalAuthHeader !== process.env.PAYPAL_WEBHOOK_SECRET) {
    return next(new AppError('Unauthorized webhook call', 403));
  }

  console.log('PayPal Webhook:', req.body);
  res.status(200).send('Webhook received');
});

// ✅ استرجاع مدفوعات المستخدم
exports.getPayments = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const filter = req.user.role === 'admin' ? {} : { user: userId };
  const payments = await Payment.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ payments, count: payments.length });
});
