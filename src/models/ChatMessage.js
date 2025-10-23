
const mongoose = require('mongoose');
const { Schema } = mongoose;
const chatMessageSchema = new Schema({
  session_id: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  tokens_used: { type: Number, default: 0 },
  model_used: { type: String, default: 'gpt-3.5-turbo' },
  created_at: { type: Date, default: Date.now }
});


module.exports = mongoose.model('ChatMessage', chatMessageSchema);