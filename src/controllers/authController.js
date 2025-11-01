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

// 🔑 إنشاء التوكن وإرسال الاستجابة بنفس الشكل اللي الفرونت متوقعه
const createSendToken = (user, res, message = 'Success', session = null) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const userData = user.toObject();
  delete userData.password;

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    data: {
      user: userData,
      session: { access_token: token },
    },
    message,
    session,
  });
};

// 📩 تسجيل مدرب جديد
exports.register = async (req, res) => {
  try {
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

    try {
      await new emailService({ email, name }).sendWelcomeEmail();
    } catch (e) {
      console.warn('Email sending failed:', e.message);
    }

    let session = null;
    if (coach.plan === 'pro') {
      const payment = await createPaymentForUser(coach._id, coach.plan);
      session = { approvalUrl: payment.data.approvalUrl };
    }

    return createSendToken(coach, res, 'Registration successful.', session);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// 🔐 تسجيل الدخول
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

// ✅ التحقق من صحة التوكن
exports.validateToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ success: false, message: 'Token is required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const coach = await Coach.findById(decoded.id);
    if (!coach)
      return res.status(401).json({ success: false, message: 'Invalid token' });

    return res.json({ success: true, data: { valid: true, user: coach } });
  } catch (error) {
    console.error('Validate token error:', error);
    return res.status(500).json({ success: false, message: 'Token validation failed' });
  }
};

// ♻️ تجديد التوكن
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ success: false, message: 'Token is required' });

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign(
      { id: decoded.id, role: decoded.role, plan: decoded.plan },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({ success: true, data: { token: newToken } });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(400).json({ success: false, message: 'Invalid token' });
  }
};

// ⚽ تحديث الرياضة المفضلة
exports.updateSportPreference = async (req, res) => {
  try {
    const { sport } = req.body;
    const coach = await Coach.findByIdAndUpdate(
      req.user.id,
      { sport, sportSelected: true },
      { new: true }
    );
    return res.json({ success: true, data: { user: coach } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update sport', error: error.message });
  }
};

// 🚪 تسجيل الخروج
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

// 🔐 نسيت كلمة المرور
exports.forgotPassword = async (req, res) => {
  try {
    const user = await Coach.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No user with that email.' });

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    await new emailService(user, resetURL).sendPasswordReset();

    res.status(200).json({ success: true, message: 'Reset code sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reset email' });
  }
};

// 🔑 إعادة تعيين كلمة المرور (باستخدام code وليس param)
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

    const user = await Coach.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });

    user.password = password;
    user.passwordConfirm = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return createSendToken(user, res, 'Password reset successful.');
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
