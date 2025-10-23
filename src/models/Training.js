const mongoose = require('mongoose');
const { Schema } = mongoose;
const trainingSchema = new Schema({
  player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'Coach' },
  exercises: [{
    name: String,
    reps: Number,
    sets: Number,
    duration: Number, // in seconds
    created_at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

trainingSchema.statics.findByCoach = async function(coachId, filter = {}) {
  return this.find(filter).populate({
    path: 'player',
    match: { coach: coachId }
  });
};

const Training = mongoose.model('Training', trainingSchema);
module.exports = Training;