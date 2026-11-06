require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');
const seedData = require('./schemes.seed.json');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const s of seedData) {
    await Scheme.updateOne({ schemeId: s.schemeId }, { $set: s }, { upsert: true });
  }
  console.log(`Seeded ${seedData.length} schemes`);
  await mongoose.disconnect();
})();