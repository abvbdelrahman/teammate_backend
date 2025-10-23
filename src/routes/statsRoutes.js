const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getOverview, getTopPlayers, getTimeseries } = require('../controllers/statsController');

router.use(protect);

router.get('/overview', getOverview);
router.get('/players/top', getTopPlayers);
router.get('/timeseries', getTimeseries);

module.exports = router;
