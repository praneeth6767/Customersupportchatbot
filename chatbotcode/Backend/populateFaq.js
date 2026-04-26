const mongoose = require('mongoose');
require('dotenv').config();
const Faq = require('./models/Faq');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");

    const faqs = [
      { question: "How do I return a product?", answer: "You can return a product within 30 days via your orders page.", suggestions: ["Return policy link"] },
      { question: "What are your working hours?", answer: "Our support is available 24/7.", suggestions: ["Support hours page"] },
      { question: "Do you ship internationally?", answer: "Hi there! I am your friendly support assistant.", suggestions: ["Shipping info page"] }
    ];

    return Faq.insertMany(faqs);
  })
  .then(() => {
    console.log("FAQs added!");
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Error inserting FAQs:", err);
    mongoose.disconnect();
  });
