// src/controllers/noteController.js
const Note = require('../models/Notes');
const Player = require('../models/Player');
const Match = require('../models/Match');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ✅ إنشاء ملاحظة جديدة
exports.createNote = catchAsync(async (req, res, next) => {
  const { playerId, matchId, content, type } = req.body;

  console.log(req.body);
  
  // تحقق من أن اللاعب موجود ويتبع الكوتش
  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (player.coach.toString() !== req.user.id)
    return next(new AppError('Forbidden', 403));

  // تحقق من أن المباراة موجودة
  const match = await Match.findById(matchId);
  if (!match) return next(new AppError('Match not found', 404));

  const note = await Note.create({
    coach: req.user.id,
    playerId,
    matchId,
    content,
    type,
  });

  res.status(201).json({
    status: 'success',
    data:  note.content,
  });
});

// ✅ جلب كل الملاحظات الخاصة بالكوتش
exports.getAllNotes = catchAsync(async (req, res, next) => {
  const notes = await Note.find({ coach: req.user.id })
    .populate('playerId', 'name position')
    .populate('matchId', 'date opponent team_score opponent_score')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: { notes: notes.map(note => note.content) ,player: notes.map(note => note.playerId.name) ,match: notes.map(note => note.matchId.date) },
  });
});

// ✅ جلب ملاحظات لاعب معين
exports.getPlayerNotes = catchAsync(async (req, res, next) => {
  const { playerId } = req.params;

  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (player.coach.toString() !== req.user.id)
    return next(new AppError('Forbidden', 403));

  const notes = await Note.find({ playerId: playerId })
    .populate('match_id', 'date opponent team_score opponent_score')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: notes.length,
    data: notes,
  });
});

// ✅ تعديل ملاحظة
exports.updateNote = catchAsync(async (req, res, next) => {
  const note = await Note.findById(req.params.id);
  if (!note) return next(new AppError('Note not found', 404));
  if (note.coach.toString() !== req.user.id)
    return next(new AppError('Forbidden', 403));

  note.content = req.body.content ?? note.content;
  note.type = req.body.type ?? note.type;

  await note.save();

  res.status(200).json({
    status: 'success',
    data: note,
  });
});

// ✅ حذف ملاحظة
exports.deleteNote = catchAsync(async (req, res, next) => {
  const note = await Note.findById(req.params.id);
  if (!note) return next(new AppError('Note not found', 404));
  if (note.coach.toString() !== req.user.id)
    return next(new AppError('Forbidden', 403));

  await note.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
