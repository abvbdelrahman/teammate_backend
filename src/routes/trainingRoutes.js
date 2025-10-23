const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { createTraining, getTrainingsForPlayer } = require('../controllers/trainingController');

router.use(protect);
router.post('/', restrictTo('coach'), createTraining);
router.get('/player/:playerId', getTrainingsForPlayer);

module.exports = router;
