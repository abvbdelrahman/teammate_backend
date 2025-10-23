const Match = require('../models/Match');
const Player = require('../models/Player');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// إنشاء مباراة جديدة
exports.createMatch = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot create matches', 403);

    const coachId = req.user.id;
    const { date, opponent, location, score, notes, playerIds = [] } = req.body;

    // التحقق أن كل اللاعبين ينتمون للمدرب
    if (playerIds.length > 0) {
        const players = await Player.find({ _id: { $in: playerIds }, coach: coachId });
        if (players.length !== playerIds.length) {
            throw new AppError('Some players do not belong to you', 400);
        }
    }

    console.log(req.user);
    
    const match = await Match.create({
        date,
        opponent,
        location,
        team_score: score?.team || 0,
        opponent_score: score?.opponent || 0,
        notes,
        coach: coachId,
        player_ids: playerIds,
        team: req.body.team || null,
    });

    res.status(201).json(match);
});

// جلب كل المباريات أو حسب لاعب
exports.getMatches = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const matches = await Match.find({ coach: coachId }).sort({ date: -1 });
    res.json({matches, count: matches.length});
});

// جلب مباراة واحدة مع اللاعبين
exports.getMatch = catchAsync(async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);

    // تحقق ملكية المدرب
    if (
        match.coach.toString() !== req.user.id &&
        req.user.role !== 'admin' &&
        req.user.role !== 'guest'
    ) {
        throw new AppError('Forbidden', 403);
    }

    // جلب معلومات اللاعبين
    const players = await Player.find({ _id: { $in: match.player_ids } }, 'name position');
    res.json({ ...match.toObject(), players });
});

// حذف مباراة
exports.deleteMatch = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot delete matches', 403);

    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);

    if (match.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    await match.deleteOne();
    res.json({ message: 'Match removed' });
});
