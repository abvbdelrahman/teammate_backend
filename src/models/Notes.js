// src/models/noteModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const noteSchema = new Schema(
  {
    coach: {
      type:   Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
    },
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['pre-match', 'post-match', 'general'],
      default: 'general',
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
