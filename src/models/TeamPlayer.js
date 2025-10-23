const mongoose = require('mongoose');

const teamPlayerSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    position: {
      type: String,
      trim: true
    },
    jerseyNumber: {
      type: Number,
      min: 1
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const TeamPlayer = mongoose.model('TeamPlayer', teamPlayerSchema);

module.exports = TeamPlayer;
