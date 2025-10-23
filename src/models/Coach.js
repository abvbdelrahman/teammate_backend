const mongoose = require('mongoose');
const crypto = require('crypto');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');
const validator = require('validator');
const coachSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true , select: false},
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  team: { type: Schema.Types.ObjectId, ref: 'Team' },
  plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
  planStartsAt: Date,
  planEndsAt: Date,
  isGuest: { type: Boolean, default: false },
  photo: String,

  role: { type: String, default: 'coach', enum: ['coach', 'guest'] },
  location: String,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
}, { timestamps: true });

coachSchema.pre('save', async function(next) {
  // only run this function if password was actually modified
  if (!this.isModified('password')) return next();
  // hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  // delete the passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});
coachSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
coachSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});
coachSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;


  return resetToken;
};



const Coach = mongoose.model('Coach', coachSchema);
module.exports = Coach;