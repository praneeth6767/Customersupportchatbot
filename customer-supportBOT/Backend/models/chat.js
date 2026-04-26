const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  user: String,
  message: String,
  response: String,
  intent: String,        // detected intent
  language: String,      // detected language
  timestamp: { type: Date, default: Date.now },
  escalated: { type: Boolean, default: false }
});

module.exports = mongoose.model('Chat', ChatSchema);
