const express = require('express');
const router = express.Router();
const Scheme = require('../models/Scheme');
const { calculateEligibility } = require('../services/eligibilityEngine');

// GET /api/schemes?state=BR&category=farmer&lang=hi&page=1
router.get('/', async (req, res) => {
  const { state, category, level, lang = 'hi', page = 1, limit = 20, q } = req.query;
  const filter = { isActive: true };
  if (state) filter.$or = [{ state }, { state: 'all' }];
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (q) filter.$text = { $search: q };

  const skip = (Math.max(1, +page) - 1) * Math.min(50, +limit);
  const [items, total] = await Promise.all([
    Scheme.find(filter)
      .select('schemeId name nameHi translations level state category purpose benefitAmount officialUrl lastDate eligibility')
      .skip(skip)
      .limit(Math.min(50, +limit))
      .lean(),
    Scheme.countDocuments(filter),
  ]);

  // Localize
  const localized = items.map((s) => ({
    ...s,
    displayName: s.translations?.[lang]?.name || s.nameHi || s.name,
    displayPurpose: s.translations?.[lang]?.purpose || s.purpose,
  }));

  res.json({ total, page: +page, items: localized });
});

// POST /api/schemes/match  — personalized finder
router.post('/match', async (req, res) => {
  const { age, annualIncome, gender, caste, occupation, education, residency, state, lang = 'hi' } = req.body;

  if (typeof age !== 'number' || age < 0 || age > 120) {
    return res.status(400).json({ error: 'Valid age required' });
  }

  const user = { age, annualIncome: +annualIncome || 0, gender, caste, occupation, education, residency, state };

  // Efficient pre-filter: only fetch schemes where basic ranges match
  const candidates = await Scheme.find({
    isActive: true,
    $or: [{ state: 'all' }, { state }],
    'eligibility.minAge': { $lte: age },
    'eligibility.maxAge': { $gte: age },
  })
    .select('schemeId name nameHi translations category purpose benefitAmount officialUrl lastDate eligibility subsidyPercent')
    .lean();

  const scored = candidates
    .map((s) => {
      const { score, eligible, checks } = calculateEligibility(s, user);
      return {
        schemeId: s.schemeId,
        name: s.translations?.[lang]?.name || s.nameHi || s.name,
        category: s.category,
        purpose: s.translations?.[lang]?.purpose || s.purpose,
        benefitAmount: s.benefitAmount,
        officialUrl: s.officialUrl,
        lastDate: s.lastDate,
        score,
        eligible,
        failedChecks: checks.filter((c) => !c.ok).map((c) => c.reason),
      };
    })
    .filter((s) => s.score >= 60) // show near-matches too
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  res.json({ matches: scored, total: scored.length });
});

// GET /api/schemes/:id
router.get('/:id', async (req, res) => {
  const scheme = await Scheme.findOne({ schemeId: req.params.id, isActive: true }).lean();
  if (!scheme) return res.status(404).json({ error: 'Not found' });
  res.json(scheme);
});

module.exports = router;