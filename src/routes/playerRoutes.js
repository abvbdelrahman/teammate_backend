const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const {
  createPlayer, getPlayers, getPlayer, updatePlayer, deletePlayer
} = require('../controllers/playerController');

router.use(protect);
router.route('/').get(getPlayers).post(restrictTo('coach'), createPlayer);
router.route('/:id').get(getPlayer).patch(restrictTo('coach'), updatePlayer).delete(restrictTo('coach'), deletePlayer);

module.exports = router;
