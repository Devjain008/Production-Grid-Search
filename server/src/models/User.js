const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'demo'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Async salted PBKDF2 password hasher
 */
UserSchema.statics.hashPassword = function (password, salt = null) {
  return new Promise((resolve, reject) => {
    const s = salt || crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, s, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        salt: s,
        hash: derivedKey.toString('hex')
      });
    });
  });
};

/**
 * Verifies password against salt and hash
 */
UserSchema.methods.verifyPassword = function (password) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, this.salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex') === this.passwordHash);
    });
  });
};

module.exports = mongoose.model('User', UserSchema);
