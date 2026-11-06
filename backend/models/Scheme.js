const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    schemeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameHi: { type: String },
    // Translations: { hi: {}, bn: {}, ta: {} ... }
    translations: { type: mongoose.Schema.Types.Mixed, default: {} },

    level: { type: String, enum: ['central', 'state'], required: true, index: true },
    state: { type: String, default: 'all', index: true }, // 'all' or state code
    category: {
      type: String,
      enum: ['farmer', 'women', 'student', 'pension', 'health', 'housing',
             'employment', 'business', 'disability', 'general'],
      index: true,
    },

    purpose: { type: String, required: true },
    benefitAmount: { type: String },
    subsidyPercent: { type: Number, default: 0 },

    eligibility: {
      minAge: { type: Number, default: 0 },
      maxAge: { type: Number, default: 120 },
      maxAnnualIncome: { type: Number, default: null }, // null = no limit
      gender: { type: [String], default: ['male', 'female', 'other'] },
      caste: { type: [String], default: ['general', 'obc', 'sc', 'st', 'ews'] },
      occupation: { type: [String], default: [] }, // empty = any
      education: { type: [String], default: [] },
      residency: { type: [String], default: ['rural', 'urban'] },
      specialConditions: { type: String },
    },

    documents: [{ type: String }],
    applicationProcess: { online: String, offline: String },
    officialUrl: { type: String, required: true },
    applyUrl: { type: String },
    lastDate: { type: Date },
    isActive: { type: Boolean, default: true, index: true },

    verifiedAt: { type: Date, required: true },
    verifiedBy: { type: String, required: true }, // admin email who verified
    sourceUrl: { type: String, required: true },
  },
  { timestamps: true }
);

schemeSchema.index({ level: 1, state: 1, category: 1, isActive: 1 });
schemeSchema.index({ name: 'text', purpose: 'text', nameHi: 'text' });

module.exports = mongoose.model('Scheme', schemeSchema);