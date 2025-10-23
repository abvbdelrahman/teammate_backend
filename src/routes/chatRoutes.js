const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Chat session routes
router.route('/sessions')
    .get(chatController.getSessions)
    .post(chatController.createSession);

router.route('/sessions/:sessionId')
    .get(chatController.getSession)
    .put(chatController.updateSession)
    .delete(chatController.deleteSession);

// Chat message routes
router.route('/sessions/:sessionId/messages')
    .post(chatController.sendMessage);

// AI Analysis routes
router.route('/analysis/player/:playerId')
    .get(chatController.getPlayerAnalysis);

router.route('/analysis/team/:teamId')
    .get(chatController.getTeamAnalysis);

router.route('/analysis/match/:matchId')
    .get(chatController.getMatchAnalysis);

router.route('/recommendations/training/:playerId')
    .get(chatController.getTrainingRecommendations);

module.exports = router;
