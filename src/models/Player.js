const mongoose = require('mongoose');
const { Schema } = mongoose;
const playerSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: 'Coach', required: true },
  name: { type: String, required: true },
  age: Number,
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  position: String,
  height: Number,
  weight: Number,
  fitness_level: { type: Number, default: 0, min: 0, max: 100 },
  notes: String,
  profile_img: String,
  // Offensive stats
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  shots: { type: Number, default: 0 },
  shots_on_target: { type: Number, default: 0 },
  shot_accuracy: { type: Number, default: 0 },
  // Defensive stats
  ball_recovery: { type: Number, default: 0 },
  duels_won: { type: Number, default: 0 },
  fouls_committed: { type: Number, default: 0 },
  yellow_cards: { type: Number, default: 0 },
  red_cards: { type: Number, default: 0 },
}, { timestamps: true });


playerSchema.statics.findByCoach = function(coachId, filter = {}) {
  return this.find({ ...filter, coach: coachId });
};

playerSchema.statics.findOneByCoach = function(coachId, filter = {}) {
  return this.findOne({ ...filter, coach: coachId });
};

const Player = mongoose.model('Player', playerSchema);
module.exports = Player;