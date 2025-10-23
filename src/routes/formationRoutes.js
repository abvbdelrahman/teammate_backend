const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createFormation,
  getFormations,
  getFormation,
  updateFormation,
  deleteFormation,
  addPosition,
  updatePosition,
  deletePosition,
  setDefaultFormation
} = require('../controllers/formationController');

router.use(protect);

// Formation CRUD operations
router.post('/', createFormation);
router.get('/', getFormations);
router.get('/:id', getFormation);
router.patch('/:id', updateFormation);
router.delete('/:id', deleteFormation);

// Default formation management
router.patch('/:formationId/set-default', setDefaultFormation);

// Position management within formations
router.post('/:formationId/positions', addPosition);
router.patch('/:formationId/positions/:positionId', updatePosition);
router.delete('/:formationId/positions/:positionId', deletePosition);

module.exports = router;
