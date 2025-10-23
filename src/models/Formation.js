const mongoose = require('mongoose');
const { Schema } = mongoose;
const formationSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: 'Coach', required: true },
  name: { type: String, required: true },
  description: String,
  formation_type: { type: String, default: 'balanced' },
  difficulty_level: { type: String, default: 'intermediate' },
  is_default: { type: Boolean, default: false },
  positions: [{
    position_name: String,
    position_code: String,
    x_coordinate: Number,
    y_coordinate: Number,
    role_description: String,
  }]
}, { timestamps: true });

formationSchema.statics.findByCoach = function(coachId, filter = {}) {
  return this.find({ ...filter, coach: coachId });
};

const Formation = mongoose.model('Formation', formationSchema);
module.exports = Formation;