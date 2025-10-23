// models/exerciseModel.js
const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise must have a name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  videoUrl: {
    type: String,
    trim: true
  },
  focusArea: {
    type: String,
    enum: ['strength', 'agility', 'stamina', 'technique', 'tactics'],
    default: 'technique'
  },
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: [true, 'Exercise must belong to a coach']
  },
  training: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Training'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Exercise', exerciseSchema);
