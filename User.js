/**
 * models/User.js
 * Represents a registered AutoNest user.
 * Passwords are hashed with bcrypt before saving.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type:  String,
      trim:  true,
      default: '',
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: 8,
      select:   false, // Never return password in queries by default
    },
    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },
    // Saved / favourite service IDs
    savedServices: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }
    ],
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

// ── Hash password before saving ───────────────────────────────
UserSchema.pre('save', async function (next) {
  // Only hash if the password field was actually modified
  if (!this.isModified('password')) return next();

  const salt  = await bcrypt.genSalt(12); // 12 rounds = good balance
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plain password with hashed ───────
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
