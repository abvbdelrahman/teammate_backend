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

// ⚙️ خريطة صلاحيات الخطط
const PLAN_PERMISSIONS = {
  free: {
    dashboards: 1,
    widgets: 3,
    maxPlayers: 5,
    uploadLimit: 5,
    canExportPDF: false,
    supportLevel: '48-72h',
  },
  pro: {
    dashboards: Infinity,
    widgets: 15,
    maxPlayers: Infinity,
    uploadLimit: 50,
    canExportPDF: true,
    supportLevel: '24h',
  },
  custom: {
    dashboards: Infinity,
    widgets: Infinity,
    maxPlayers: Infinity,
    uploadLimit: Infinity,
    canExportPDF: true,
    supportLevel: '<12h',
    whiteLabel: true,
    betaAccess: true,
  },
};

// 🔑 إنشاء التوكن وإرسال الاستجابة
const createSendToken = (user, res, message = 'Success', session ) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const userData = user.toObject();
  delete userData.password;

    res.cookie('jwt', token, {
    httpOnly: true, // يمنع الوصول للكوكي من JavaScript
    secure: process.env.NODE_ENV === 'production', // يستخدم فقط في HTTPS في الإنتاج
    maxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع
  });


  res.status(200).json({
    success: true,
    token,
    user: userData,
    message,
    session,
  });
};

// 📩 تسجيل مدرب جديد
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm, location, role, plan, planEndsAt } = req.body;

    if (!name || !email || !password || !passwordConfirm || !plan)
      return res.status(400).json({ message: 'Please provide all required fields' });

    const existingCoach = await Coach.findOne({ email });
    if (existingCoach)
      return res.status(400).json({ message: 'Email already in use' });

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

    let session;
    if (coach.plan === 'free') {
      session = null;
    } else if (coach.plan === 'pro') {
      session = await createPaymentForUser(coach._id, coach.plan);
    } else if (coach.plan === 'premium') {
      await emailService.sendWelcomeEmail(`contact our sales team to set up your custom plan 'statsor1@gmail.com'`);
    }


    createSendToken(coach, res, 'Registration successful.', session.data.approvalUrl);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};


// 🔐 تسجيل الدخول
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
      return res.status(400).json({ message: 'Please provide email and password' });

    const coach = await Coach.findOne({ email }).select('+password');
    if (!coach)
      return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, coach.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    createSendToken(coach, res, 'Login successful.');
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

    res.json({
      success: true,
      data: { user: coach },
    });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ success: false, message: 'Token validation failed' });
  }
};

// 🚪 تسجيل الخروج (Stateless)
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

// 🔗 Google OAuth
exports.googleLogin = (req, res, next) => {
  passport.authenticate('google', { scope: ['email', 'profile'] })(req, res, next);
};

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

// 🔐 نسيت كلمة المرور
exports.forgotPassword = async (req, res, next) => {
  const user = await Coach.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: 'No user with that email.' });

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/resetPassword/${resetToken}`;
    await new emailService(user, resetURL).sendPasswordReset();
    res.status(200).json({ status: 'success', message: 'Token sent to email!' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ message: 'Email sending failed' });
  }
};

// 🔑 إعادة تعيين كلمة المرور
exports.resetPassword = async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await Coach.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Token is invalid or has expired' });
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, res, 'Password reset successful.');
};

// 👤 تسجيل الدخول كزائر
exports.guestLogin = async (req, res, next) => {
  try {
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
      status: 'success',
      message: 'Guest login successful',
      token,
      user: guestUser,
    });
  } catch (err) {
    console.error('Guest login error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Guest login failed',
      error: err.message,
    });
  }
};
