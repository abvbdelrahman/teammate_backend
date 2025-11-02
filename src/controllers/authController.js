const Coach = require('../models/Coach');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const passport = require('../services/google-strategy');
const crypto = require('crypto');
const { createPaymentForUser } = require('./paymentsController');
const catchAsync = require('../utils/catchAsync');

// إعدادات JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '7d';

/**
 * ✅ إنشاء التوكن وإرسال الاستجابة
 */
const createSendToken = (user, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const userData = user.toObject();
  delete userData.password;

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع
  });

  return res.status(201).json({
    success: true,
    message,
    data: {
      user: userData,
      session: { access_token: token },
    },
  });
};

/**
 * 📩 تسجيل مستخدم جديد
 */
exports.register = catchAsync(async (req, res) => {
  const { name, email, password, passwordConfirm, location, role, plan, planEndsAt } = req.body;

  if (!name || !email || !password || !passwordConfirm || !plan) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }

  const existingCoach = await Coach.findOne({ email });
  if (existingCoach) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }

  const coach = await Coach.create({
    name,
    email,
    password,
    passwordConfirm,
    role: role || 'coach',
    location,
    plan,
    planStartsAt: Date.now(),
    planEndsAt,
  });

  // إرسال رسالة ترحيب (اختياري)
  try {
    await new emailService({ email, name }).sendWelcomeEmail();
  } catch (err) {
    console.warn('Email sending failed:', err.message);
  }

  // لو الخطة pro نبدأ الدفع
  // let session = null;
  // if (coach.plan === 'pro') {
  //   const payment = await createPaymentForUser(coach._id, coach.plan);
  //   session = { approvalUrl: payment.data.approvalUrl };
  // }

  return createSendToken(coach, res, 'Registration successful.');
});

/**
 * 🔐 تسجيل الدخول
 */
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Please provide email and password' });

  const coach = await Coach.findOne({ email }).select('+password');
  if (!coach)
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  const isMatch = await bcrypt.compare(password, coach.password);
  if (!isMatch)
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  return createSendToken(coach, res, 'Login successful.');
});

/**
 * ✅ التحقق من التوكن
 */
exports.validateToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

  const decoded = jwt.verify(token, JWT_SECRET);
  const coach = await Coach.findById(decoded.id);
  if (!coach) return res.status(401).json({ success: false, message: 'Invalid token' });

  return res.json({ success: true, data: { valid: true, user: coach } });
});

/**
 * ♻️ تجديد التوكن
 */
exports.refreshToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

  const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
  const newToken = jwt.sign(
    { id: decoded.id, role: decoded.role, plan: decoded.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({ success: true, data: { token: newToken } });
});

/**
 * ⚽ تحديث الرياضة المفضلة
 */
exports.updateSportPreference = catchAsync(async (req, res) => {
  const { sport } = req.body;
  const coach = await Coach.findByIdAndUpdate(
    req.user.id,
    { sport, sportSelected: true },
    { new: true }
  );
  return res.json({ success: true, data: { user: coach } });
});

/**
 * 🚪 تسجيل الخروج
 */
exports.logout = catchAsync(async (req, res) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * 🔗 Google OAuth
 */
exports.googleLogin = passport.authenticate('google', { scope: ['email', 'profile'] });

exports.googleCallback = (req, res, next) => {
  passport.authenticate('google', { failureRedirect: '/login', session: false }, async (err, googleUser) => {
    try {
      if (err || !googleUser)
        return res.status(400).json({ message: 'Google authentication failed' });

      let coach = await Coach.findOne({ email: googleUser.email });
      if (!coach) {
        coach = await Coach.create({
          name: googleUser.displayName,
          email: googleUser.email,
          role: 'coach',
          plan: 'free',
        });
      }

      createSendToken(coach, res, 'Google login successful.');
    } catch (error) {
      console.error('Google callback error:', error);
      res.status(500).json({ message: 'Google login failed', error: error.message });
    }
  })(req, res, next);
};

/**
 * 🔐 نسيت كلمة المرور
 */
exports.forgotPassword = catchAsync(async (req, res) => {
  const user = await Coach.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ success: false, message: 'No user with that email.' });

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
  await new emailService(user, resetURL).sendPasswordReset();

  res.status(200).json({ success: true, message: 'Reset code sent to your email' });
});

/**
 * 🔑 إعادة تعيين كلمة المرور
 */
exports.resetPassword = catchAsync(async (req, res) => {
  const { email, code, password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

  const user = await Coach.findOne({
    email,
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user)
    return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });

  user.password = password;
  user.passwordConfirm = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return createSendToken(user, res, 'Password reset successful.');
});

/**
 * 👤 تسجيل الدخول كزائر
 */
exports.guestLogin = catchAsync(async (req, res) => {
  const randomSuffix = Math.floor(Math.random() * 10000);
  const randomPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(randomPassword, 12);

  const guestUser = await Coach.create({
    name: `Guest${randomSuffix}`,
    email: `guest${Date.now()}@example.com`,
    password: hashedPassword,
    passwordConfirm: hashedPassword,
    isGuest: true,
    role: 'guest',
    plan: 'free',
  });

  const token = jwt.sign(
    { id: guestUser._id, role: 'guest', plan: 'free' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    success: true,
    message: 'Guest login successful',
    data: {
      user: guestUser,
      session: { access_token: token },
    },
  });
});
