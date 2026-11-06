const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Scheme = require('../models/Scheme');
const { askAI, SUPPORTED_LANGS } = require('../services/aiService');
const { checkUrl } = require('../services/fraudChecker');

// POST /api/ai/ask
router.post(
  '/ask',
  [
    body('question').isString().trim().isLength({ min: 3, max: 500 }),
    body('lang').optional().isIn(Object.keys(SUPPORTED_LANGS)),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { question, userContext = {}, lang = 'hi' } = req.body;

    // Fetch only relevant schemes via text search (limited context = cheap + accurate)
    const schemesContext = await Scheme.find(
      { isActive: true, $text: { $search: question } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(5)
      .select('schemeId name nameHi purpose benefitAmount eligibility documents officialUrl lastDate')
      .lean();

    try {
      const answer = await askAI({ question, userContext, schemesContext, lang });
      res.json({ answer, referencedSchemes: schemesContext.map((s) => s.schemeId) });
    } catch (err) {
      console.error('AI error:', err.message);
      res.status(503).json({ error: 'AI service temporarily unavailable' });
    }
  }
);

// POST /api/ai/check-url  — fraud checker
router.post('/check-url', [body('url').isURL()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  res.json(checkUrl(req.body.url));
});

module.exports = router;