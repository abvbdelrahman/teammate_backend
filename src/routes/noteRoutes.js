const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const noteController = require('../controllers/notesController');

const router = express.Router();

// ✅ كل الراوتات الخاصة بالملاحظات
router
  .route('/')
  .get(protect, noteController.getAllNotes)
  .post(protect, noteController.createNote);

router
  .route('/:id')
  .put(protect, noteController.updateNote)
  .delete(protect, noteController.deleteNote);

module.exports = router;
