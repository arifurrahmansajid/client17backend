const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  minDeposit: {
    type: Number,
    default: 50
  },
  depositInstructions: {
    type: String,
    default: "Please transfer exact amount to our MOMO number."
  },
  minWithdrawal: {
    type: Number,
    default: 100
  },
  withdrawFee: {
    type: Number,
    default: 5
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
