const jwt = require('jsonwebtoken');
const User = require('../models/Coach'); // تأكد إن اسم الموديل صحيح
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// ✅ التحقق من التوكن وصلاحية المستخدم
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // استخراج التوكن من الهيدر
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized, no token provided', 401));
  }

  // ✅ تحقق من التوكن
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // ✅ جلب المستخدم من قاعدة البيانات
  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    return next(new AppError('User not found', 401));
  }

  req.user = user;
  if (req.user.role === 'guest') {
      req.user.isGuest = true;
    }

  next();
});

// ✅ تقييد الوصول حسب الأدوار
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
