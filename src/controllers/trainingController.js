// src/controllers/trainingController.js
const Training = require('../models/Training');
const Exercise = require('../models/Exercise');
const Player = require('../models/Player');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ✅ إنشاء تدريب جديد مع تمارين
exports.createTraining = catchAsync(async (req, res, next) => {
  const { playerId, exercises = [], notes, date } = req.body;
  const { role, id: userId } = req.user;

  // التحقق من وجود اللاعب
  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));

  // التحقق من الملكية
  if (role !== 'admin' && player.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }


  const training = await Training.create({
    player: playerId,
    notes,
    date: date || new Date(),
    created_by: userId,
  });

  // إنشاء التمارين
  const exerciseDocs = exercises.map(ex => ({
    training: training._id,
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    duration: ex.duration,
    notes: ex.notes,
    coach: userId
  }));

  if (exerciseDocs.length > 0) {
    await Exercise.insertMany(exerciseDocs);
  }

  // جلب التدريب مع التمارين
  const trainingWithExercises = await Training.findById(training._id).lean();
  trainingWithExercises.exercises = await Exercise.find({ training: training._id });

  res.status(201).json(trainingWithExercises);
});

// ✅ جلب كل التدريبات للاعب محدد
exports.getTrainingsForPlayer = catchAsync(async (req, res, next) => {
  const { playerId } = req.params;
  const { role, id: userId } = req.user;

  // التحقق من وجود اللاعب
  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));

  // التحقق من الملكية
  if (role !== 'admin' && player.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  // جلب التدريبات مع التمارين
  const trainings = await Training.find({ player: playerId }).sort({ date: -1 }).lean();

  const trainingsWithExercises = await Promise.all(
    trainings.map(async t => {
      const exercises = await Exercise.find({ training: t._id });
      return { ...t, exercises };
    })
  );

  res.status(200).json({ trainingsWithExercises, count: trainingsWithExercises.length });
});
