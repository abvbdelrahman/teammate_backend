// src/controllers/overviewController.js
const Player = require('../models/Player');
const Match = require('../models/Match');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Coach = require('../models/Coach');

// ✅ إحصائيات عامة
exports.getOverview = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const query = role === 'admin' ? {} : { Coach: userId };

  const playersCount = await Player.countDocuments(query);
  const matchesCount = await Match.countDocuments(query);

  const goalsAggregate = await Player.aggregate([
    { $match: query },
    { $group: { _id: null, totalGoals: { $sum: '$goals' }, totalAssists: { $sum: '$assists' } } },
  ]);

  const stats = {
    playersCount,
    matchesCount,
    totalGoals: goalsAggregate[0]?.totalGoals || 0,
    totalAssists: goalsAggregate[0]?.totalAssists || 0,
  };

  res.status(200).json(stats);
});

// ✅ أفضل اللاعبين حسب مقياس معين
exports.getTopPlayers = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const query = role === 'admin' ? {} : { Coach: userId };

  const metric = req.query.metric || 'goals';
  const limit = Math.min(parseInt(req.query.limit || '5', 10), 50);
  const validMetrics = ['goals', 'assists', 'matchesPlayed'];

  if (!validMetrics.includes(metric)) return next(new AppError('Invalid metric', 400));

  const players = await Player.find(query)
    .sort({ [metric]: -1 })
    .limit(limit);

  res.status(200).json(players);
});

// ✅ بيانات زمنية للأداء
exports.getTimeseries = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const query = role === 'admin' ? {} : { Coach: userId };

  const range = req.query.range || '30d';
  const granularity = req.query.granularity || 'day';

  let startDate = new Date();
  if (range.endsWith('d')) {
    const days = parseInt(range.replace('d', ''), 10);
    startDate.setDate(startDate.getDate() - days);
  }

  const data = await Player.aggregate([
    { $match: query },
    { $unwind: '$matchStats' },
    { $match: { 'matchStats.date': { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: granularity === 'day' ? '%Y-%m-%d' : '%Y-%m',
            date: '$matchStats.date',
          },
        },
        goals: { $sum: '$matchStats.goals' },
        assists: { $sum: '$matchStats.assists' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json(data);
});
