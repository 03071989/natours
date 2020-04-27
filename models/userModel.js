const crypto = require('crypto'); //Built in node module
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A name is required']
  },
  email: {
    type: String,
    required: [true, 'Please provide a valid email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false //Hide information from any output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //This function only works on .save or .create methods
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// Encrypting password
userSchema.pre('save', async function(next) {
  //Only run this functiion if password was actually modified
  if (!this.isModified('password')) return next();

  //Hash the password with a cost of 12, (the higher the number the stronger the encryption, but harder for the cpu to generate)
  this.password = await bcrypt.hash(this.password, 12);

  //Delete the passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // It can sometimes take longer to save the password to the database then issue the token. Therefore, token will be issued before passwordChangedAT. As the token date must greater than (issued after) the passwordChangedAt. Taking 1 second off the date can stop this issue.
  next();
});

userSchema.pre(/^find/, function(next) {
  //This points to the current query
  this.find({ active: { $ne: false } });
  return next();
});

// Method for validating the encrypted password against the user login
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Checking if the password has been changed since the token was created
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimeStamp, JWTTimestamp);
    return JWTTimestamp < changedTimeStamp;
  }

  //False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
