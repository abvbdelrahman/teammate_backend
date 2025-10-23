const mongoose = require('mongoose');
const { Schema } = mongoose;
const matchEventSchema = new Schema({
  match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  event_type: { type: String, required: true },
  minute: { type: Number, required: true },
  x_coordinate: Number,
  y_coordinate: Number,
  notes: String,
  is_own_goal: { type: Boolean, default: false },
  is_penalty: { type: Boolean, default: false },
}, { timestamps: true });

const MatchEvent = mongoose.model('MatchEvent', matchEventSchema);
module.exports = MatchEvent;