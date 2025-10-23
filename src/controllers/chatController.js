const ChatSession = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');
const openaiService = require('../services/openaiService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// إنشاء جلسة جديدة
exports.createSession = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { title, contextType, contextId } = req.body;

    const session = await ChatSession.create({
        coach: coachId,
        title: title || 'New Chat Session',
        context_type: contextType || 'general',
        context_id: contextId || null
    });

    res.status(201).json(session);
});

// جلب جميع الجلسات للمدرب
exports.getSessions = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const sessions = await ChatSession.find({ coach: coachId }).sort({ updated_at: -1 });
    res.json(sessions);
});

// جلب جلسة معينة مع الرسائل
exports.getSession = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session || session.coach.toString() !== coachId) {
        throw new AppError('Session not found', 404);
    }

    const messages = await ChatMessage.find({ session_id: sessionId }).sort({ created_at: 1 });

    res.json({ session, messages });
});

// إرسال رسالة والحصول على رد AI
exports.sendMessage = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
        throw new AppError('Message content is required', 400);
    }

    const session = await ChatSession.findById(sessionId);
    if (!session || session.coach.toString() !== coachId) {
        throw new AppError('Session not found', 404);
    }

    // حفظ رسالة المستخدم
    const userMessage = await ChatMessage.create({
        session_id: sessionId,
        role: 'user',
        content: content.trim()
    });

    // جلب كل الرسائل للمحادثة
    const messages = await ChatMessage.find({ session_id: sessionId }).sort({ created_at: 1 });

    const conversationMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({ role: msg.role, content: msg.content }));

    // جلب السياق إذا موجود
    const context = await getContextData(session.context_type, session.context_id, coachId);

    // إنشاء رد AI
    const aiResponse = await openaiService.generateChatResponse(conversationMessages, context);

    const assistantMessage = await ChatMessage.create({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse.content,
        tokens_used: aiResponse.tokens_used,
        model_used: aiResponse.model_used
    });

    // تحديث updated_at للجلسة
    session.updated_at = new Date();
    await session.save();

    res.json({ userMessage, assistantMessage });
});

// حذف جلسة
exports.deleteSession = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session || session.coach.toString() !== coachId) {
        throw new AppError('Session not found', 404);
    }

    await ChatMessage.deleteMany({ session_id: sessionId });
    await session.deleteOne();

    res.status(204).json();
});

// تحديث عنوان الجلسة
exports.updateSession = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;
    const { title } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session || session.coach.toString() !== coachId) {
        throw new AppError('Session not found', 404);
    }

    session.title = title || session.title;
    await session.save();

    res.json(session);
});

// تحليلات AI
exports.getPlayerAnalysis = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { playerId } = req.params;

    const analysis = await openaiService.generatePlayerAnalysis(playerId, coachId);
    res.json(analysis);
});

exports.getTeamAnalysis = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { teamId } = req.params;

    const analysis = await openaiService.generateTeamAnalysis(teamId, coachId);
    res.json(analysis);
});

exports.getMatchAnalysis = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { matchId } = req.params;

    const analysis = await openaiService.generateMatchAnalysis(matchId, coachId);
    res.json(analysis);
});

exports.getTrainingRecommendations = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { playerId } = req.params;

    const recommendations = await openaiService.generateTrainingRecommendations(playerId, coachId);
    res.json(recommendations);
});

// دالة مساعدة لجلب بيانات السياق
async function getContextData(contextType, contextId, coachId) {
    try {
        switch (contextType) {
            case 'player_analysis':
                const player = await Player.findById(contextId);
                if (player && player.coach.toString() === coachId) {
                    return {
                        type: 'player_analysis',
                        playerName: player.name,
                        playerPosition: player.position,
                        playerAge: player.age
                    };
                }
                break;

            case 'team_analysis':
                const team = await Team.findById(contextId);
                if (team && team.coach.toString() === coachId) {
                    return {
                        type: 'team_analysis',
                        teamName: team.name,
                        formation: team.formation_id
                    };
                }
                break;

            case 'match_analysis':
                const match = await Match.findById(contextId);
                if (match) {
                    return {
                        type: 'match_analysis',
                        matchDetails: `${match.opponent} - ${match.date}`
                    };
                }
                break;

            case 'training_plan':
                return {
                    type: 'training_plan',
                    trainingContext: 'General training recommendations'
                };

            default:
                return null;
        }
    } catch (error) {
        console.error('Error getting context data:', error);
        return null;
    }
}
