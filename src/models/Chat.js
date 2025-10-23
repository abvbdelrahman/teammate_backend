const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatSessionSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: 'Coach', required: true },
  title: { type: String },
  context_type: { type: String, default: 'general' },
  context_id: { type: Schema.Types.ObjectId },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

chatSessionSchema.statics.findByCoach = function (coachId, filter = {}) {
  return this.find({ ...filter, coach: coachId });
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);
