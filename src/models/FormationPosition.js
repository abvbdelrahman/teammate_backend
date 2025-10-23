// models/formationPositionModel.js
const mongoose = require('mongoose');

const formationPositionSchema = new mongoose.Schema({
  formation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Formation',
    required: [true, 'FormationPosition must belong to a formation']
  },
  positionName: {
    type: String,
    required: [true, 'Position name is required'], // مثال: "LW", "ST", "CB"
    trim: true
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null // ممكن يكون فاضي لو لسه ما اتعيّنش لاعب في المركز دا
  },
  coordinates: {
    x: {
      type: Number,
      required: [true, 'X coordinate is required'],
      min: 0,
      max: 100 // تمثيل نسبي للملعب
    },
    y: {
      type: Number,
      required: [true, 'Y coordinate is required'],
      min: 0,
      max: 100
    }
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: [true, 'FormationPosition must have a creator (coach)']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ممكن نضيف index لتحسين سرعة الاستعلام بالتشكيلة
formationPositionSchema.index({ formation: 1 });

module.exports = mongoose.model('FormationPosition', formationPositionSchema);
