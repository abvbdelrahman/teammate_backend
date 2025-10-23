const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createMatchEvent,
  getMatchEvents,
  getMatchEvent,
  updateMatchEvent,
  deleteMatchEvent,
  getMatchTimeline,
  getPlayerMatchEvents
} = require('../controllers/matchEventController');

router.use(protect);

// Match Events CRUD operations
router.post('/matches/:matchId/events', createMatchEvent);
router.get('/matches/:matchId/events', getMatchEvents);
router.get('/matches/:matchId/timeline', getMatchTimeline);
router.get('/events/:eventId', getMatchEvent);
router.patch('/events/:eventId', updateMatchEvent);
router.delete('/events/:eventId', deleteMatchEvent);

// Player match events
router.get('/players/:playerId/events', getPlayerMatchEvents);

module.exports = router;
