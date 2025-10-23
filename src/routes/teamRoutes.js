const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createTeam,
  getTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  addPlayerToTeam,
  removePlayerFromTeam,
  updatePlayerInTeam,
  getTeamStats
} = require('../controllers/teamController');

router.use(protect);

// Team CRUD operations
router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:id', getTeam);
router.patch('/:id', updateTeam);
router.delete('/:id', deleteTeam);

// Team statistics
router.get('/:teamId/stats', getTeamStats);

// Team-Player management
router.post('/:teamId/players', addPlayerToTeam);
router.delete('/:teamId/players/:playerId', removePlayerFromTeam);
router.patch('/:teamId/players/:playerId', updatePlayerInTeam);

module.exports = router;
