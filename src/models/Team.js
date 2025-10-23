const mongoose = require('mongoose');
const { Schema } = mongoose;
const teamSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: 'Coach', required: true },
  name: { type: String, required: true },
  description: String,
  logo_url: String,
  formation: { type: Schema.Types.ObjectId, ref: 'Formation' },
  is_active: { type: Boolean, default: true },
  players: [{
    player: { type: Schema.Types.ObjectId, ref: 'Player' },
    position_in_team: String,
    jersey_number: Number,
    joined_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true }
  }]
}, { timestamps: true });

teamSchema.statics.findByCoach = function(coachId, filter = {}) {
  return this.find({ ...filter, coach: coachId });
};

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;