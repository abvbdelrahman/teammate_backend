const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { createMatch, getMatches, getMatch, deleteMatch } = require('../controllers/matchController');

router.use(protect);

router.route('/')
  .get(getMatches)
  .post(restrictTo('coach'), createMatch);

router.route('/:id')
  .get(getMatch)
  .delete(restrictTo('coach'), deleteMatch);

module.exports = router; 