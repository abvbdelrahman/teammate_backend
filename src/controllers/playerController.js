// src/controllers/playerController.js
const Player = require('../models/Player');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Coach = require('../models/Coach');

// ✅ إنشاء لاعب جديد
exports.createPlayer = catchAsync(async (req, res, next) => {
  // 🔒 التحقق من صلاحية الدور
  if (!['coach', 'admin'].includes(req.user.role)) {
    return next(new AppError('Only coaches or admins can create players', 403));
  }

  const coachId = req.user.id;
  const { name, age, position, height, weight } = req.body;

  console.log(req.user);
  
  const player = await Player.create({
    coach: coachId,
    name,
    age,
    position,
    height,
    weight,
    team: req.body.team
  });

  res.status(201).json(player);
});

// ✅ جلب كل اللاعبين للكوتش
exports.getPlayers = catchAsync(async (req, res, next) => {
  // 🔒 التحقق من صلاحية العرض
  if (!['coach', 'admin'].includes(req.user.role)) {
    return next(new AppError('You do not have permission to view players', 403));
  }

  let filter = {};

  // الكوتش يشوف لاعبيه فقط
  if (req.user.role === 'coach') {
    filter = { coach: req.user.id };
  }

  // الأدمن يشوف الكل
  const players = await Player.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ players, count: players.length });
});

// ✅ جلب لاعب واحد مع بيانات إضافية
exports.getPlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findById(req.params.id);
  if (!player) return next(new AppError('Player not found', 404));

  // 🔒 تحقق الملكية أو الأدمن
  if (player.coach.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Forbidden', 403));
  }

  res.status(200).json(player);
});

// ✅ تحديث بيانات لاعب
exports.updatePlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findById(req.params.id);
  if (!player) return next(new AppError('Player not found', 404));

  // 🔒 فقط الكوتش صاحب اللاعب أو الأدمن
  if (player.coach.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Forbidden', 403));
  }

  Object.assign(player, req.body);
  await player.save();

  res.status(200).json(player);
});

// ✅ حذف لاعب
exports.deletePlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findById(req.params.id);
  if (!player) return next(new AppError('Player not found', 404));

  // 🔒 فقط الكوتش صاحب اللاعب أو الأدمن
  if (player.coach.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Forbidden', 403));
  }

  await player.deleteOne();
  res.status(200).json({ message: 'Player removed' });
});
