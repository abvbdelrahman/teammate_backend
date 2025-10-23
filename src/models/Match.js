const mongoose = require('mongoose');
const { Schema } = mongoose;
const matchSchema = new Schema({
  date: { type: Date, default: Date.now },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  opponent: String,
  location: String,
  result: { type: String, enum: ['win', 'loss', 'tie'], default: 'tie' },
  coach: { type: Schema.Types.ObjectId, ref: 'Coach', required: true },
  team_score: { type: Number, default: 0 },
  opponent_score: { type: Number, default: 0 },
  notes: String,
  players: [{ type: Schema.Types.ObjectId, ref: 'Player' }], // match_players
}, { timestamps: true });

matchSchema.statics.findByCoach = function(coachId, filter = {}) {
  return this.find({
    ...filter,
    players: { $elemMatch: { coach: coachId } }
  });
};

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;