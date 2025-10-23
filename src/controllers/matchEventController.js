const MatchEvent = require('../models/Match-events');
const Match = require('../models/Match');
const Player = require('../models/Player');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// إنشاء حدث في المباراة
exports.createMatchEvent = catchAsync(async (req, res) => {
    const { matchId } = req.params;
    const { playerId, event_type, minute, x_coordinate, y_coordinate, notes, is_own_goal = false, is_penalty = false } = req.body;

    const match = await Match.findById(matchId);
    if (!match) throw new AppError('Match not found', 404);

    const player = await Player.findById(playerId);
    if (!player || player.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    // تحقق أن اللاعب موجود ضمن هذه المباراة
    if (!match.players.includes(playerId)) {
        throw new AppError('Player is not in this match', 400);
    }

    const event = await MatchEvent.create({
        match_id: matchId,
        player: playerId,
        event_type,
        minute,
        x_coordinate,
        y_coordinate,
        notes,
        is_own_goal,
        is_penalty
    });

    // تحديث إحصائيات اللاعب إذا كان هدف أو تمريرة حاسمة
    if (event_type === 'goal' && !is_own_goal) {
        player.goals += 1;
        await player.save();
    } else if (event_type === 'assist') {
        player.assists += 1;
        await player.save();
    }

    res.status(201).json(event);
});

// جلب كل أحداث المباراة
exports.getMatchEvents = catchAsync(async (req, res) => {
    const { matchId } = req.params;
    const { event_type, player } = req.query;

    const match = await Match.findById(matchId);
    if (!match) throw new AppError('Match not found', 404);

    let filter = { match_id: matchId };
    if (event_type) filter.event_type = event_type;
    if (player) filter.player = player;

    const events = await MatchEvent.find(filter).sort({ minute: 1 }).populate('player', 'name position');
    res.json(events);
});

// جلب حدث محدد
exports.getMatchEvent = catchAsync(async (req, res) => {
    const event = await MatchEvent.findById(req.params.eventId).populate('player', 'name position coach');
    if (!event) throw new AppError('Event not found', 404);

    if (event.player.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    res.json(event);
});

// تحديث حدث المباراة
exports.updateMatchEvent = catchAsync(async (req, res) => {
    const event = await MatchEvent.findById(req.params.eventId).populate('player', 'coach');
    if (!event) throw new AppError('Event not found', 404);

    if (event.player.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    Object.assign(event, req.body);
    await event.save();
    res.json(event);
});

// حذف حدث المباراة
exports.deleteMatchEvent = catchAsync(async (req, res) => {
    const event = await MatchEvent.findById(req.params.eventId).populate('player', 'coach');
    if (!event) throw new AppError('Event not found', 404);

    if (event.player.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    // تحديث إحصائيات اللاعب إذا كان هدف أو تمريرة حاسمة
    const player = await Player.findById(event.player._id);
    if (event.event_type === 'goal' && !event.is_own_goal) player.goals -= 1;
    else if (event.event_type === 'assist') player.assists -= 1;
    await player.save();

    await event.deleteOne();
    res.json({ message: 'Event removed' });
});

// جلب الـ timeline للمباراة
exports.getMatchTimeline = catchAsync(async (req, res) => {
    const { matchId } = req.params;
    const match = await Match.findById(matchId);
    if (!match) throw new AppError('Match not found', 404);

    const events = await MatchEvent.find({ match_id: matchId }).sort({ minute: 1 }).populate('player', 'name position');

    const timeline = {
        goals: events.filter(e => e.event_type === 'goal'),
        assists: events.filter(e => e.event_type === 'assist'),
        cards: events.filter(e => ['yellow_card', 'red_card'].includes(e.event_type)),
        substitutions: events.filter(e => e.event_type === 'substitution'),
        other: events.filter(e => !['goal','assist','yellow_card','red_card','substitution'].includes(e.event_type))
    };

    res.json({
        match,
        timeline,
        all_events: events
    });
});

// جلب أحداث لاعب محدد
exports.getPlayerMatchEvents = catchAsync(async (req, res) => {
    const { playerId } = req.params;
    const { match_id, event_type } = req.query;

    const player = await Player.findById(playerId);
    if (!player) throw new AppError('Player not found', 404);
    if (player.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    let filter = { player: playerId };
    if (match_id) filter.match_id = match_id;
    if (event_type) filter.event_type = event_type;

    const events = await MatchEvent.find(filter).sort({ minute: 1 }).populate('match_id', 'date opponent team_score opponent_score');
    res.json(events);
});
