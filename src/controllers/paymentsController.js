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
const calculateEndDate = (planName) => {
  const planDurations = { Free: 0, Pro: 365, 'Pro Plus': 730 };
  const days = planDurations[planName] || 0;
  return days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
};

// ✅ إنشاء الدفع أو تفعيل خطة مجانية عبر endpoint
exports.createPayment = async (req, res, next) => {
  const userId = req.user.id;
  const planName = req.user.planName;

  try {
    const result = await createPaymentForUserInternal(userId, planName);
    return res.status(result.statusCode || 200).json(result.data);
  } catch (error) {
    console.error('Payment error:', error);
    return next(new AppError('Payment creation failed', 500));
  }
};

// ✅ دالة داخلية قابلة لإعادة الاستخدام في أي مكان
const createPaymentForUserInternal = async (userId, planName) => {
  let planPrice;
  if (!planName || planName === 'free') {planPrice = 0}else if (planName === 'pro') {planPrice = 49.99}else if (planName === 'premium') {planPrice = 89.99}
  
  if (planPrice === undefined) throw new AppError('Invalid plan selected', 400);

  // خطة مجانية → تفعيل مباشر
  if (planPrice === 0) {
    const payment = await Payment.create({
      user: userId,
      planName,
      price: 0,
      status: 'success',
      payment_method: 'manual',
      amount: 0,
    });

    await Subscription.create({
      user: userId,
      planName,
      start_date: new Date(),
      end_date: calculateEndDate(planName),
      is_active: true,
    });

    return {
      statusCode: 201,
      data: { message: 'Free plan activated successfully', payment },
    };
  }

  // خطة مدفوعة → إنشاء طلب PayPal
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: planPrice.toString(),
        },
        description: planName,
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
    planName,
    price: planPrice,
    status: 'pending',
    payment_method: 'paypal',
    paypalOrderId: order.result.id,
    amount: planPrice,
  });

  const approvalUrl = order.result.links.find((link) => link.rel === 'approve')?.href;

  return {
    statusCode: 200,
    data: {
      message: 'PayPal order created successfully',
      approvalUrl,
      payment,
    },
  };
};

// ✅ دالة عامة تستخدمها داخل أي كنترولر أو خدمة
exports.createPaymentForUser = createPaymentForUserInternal;

// ✅ تأكيد الدفع بعد موافقة المستخدم
exports.confirmPayment = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const payment = await Payment.findById(paymentId);
  if (!payment) return next(new AppError('Payment not found', 404));

  // 🔒 التحقق من ملكية المستخدم أو الأدمن
  if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to confirm this payment', 403));
  }

  // تنفيذ عملية الدفع في PayPal
  const request = new paypal.orders.OrdersCaptureRequest(payment.paypalOrderId);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);

    if (capture.result.status === 'COMPLETED') {
      payment.status = 'success';
      await payment.save();

      await Subscription.create({
        user: payment.user,
        planName: payment.planName,
        start_date: new Date(),
        end_date: calculateEndDate(payment.planName),
        is_active: true,
      });

      return res.status(200).json({
        message: 'Payment confirmed successfully',
        payment,
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

  if (!['user', 'coach', 'player', 'admin'].includes(req.user.role)) {
    return next(new AppError('You do not have permission to view payments', 403));
  }

  const filter = req.user.role === 'admin' ? {} : { user: userId };
  const payments = await Payment.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ payments, count: payments.length });
});
