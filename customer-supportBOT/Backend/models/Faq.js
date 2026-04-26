const mongoose = require('mongoose');

const FaqSchema = new mongoose.Schema({
  question: String,
  answer: String,
  suggestions: [String] // Smart suggestions links or tips
});

module.exports = mongoose.model('Faq', FaqSchema);
