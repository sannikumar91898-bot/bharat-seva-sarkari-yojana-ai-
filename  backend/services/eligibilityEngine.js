/**
 * Deterministic eligibility scorer — NO AI here.
 * Rules come from scheme.eligibility in DB (verified by admin).
 * Returns score + reasons so user knows why they qualify/fail.
 */
function calculateEligibility(scheme, user) {
  const e = scheme.eligibility || {};
  const checks = [];
  let passed = 0;
  let total = 0;

  const addCheck = (name, ok, reason) => {
    total++;
    if (ok) passed++;
    checks.push({ name, ok, reason });
  };

  addCheck('age', user.age >= (e.minAge ?? 0) && user.age <= (e.maxAge ?? 120),
    `Age must be between ${e.minAge ?? 0} and ${e.maxAge ?? 120}, you are ${user.age}`);

  if (e.maxAnnualIncome !== null && e.maxAnnualIncome !== undefined) {
    addCheck('income', user.annualIncome <= e.maxAnnualIncome,
      `Income must be ≤ ₹${e.maxAnnualIncome}, you: ₹${user.annualIncome}`);
  }

  if (e.gender?.length) {
    addCheck('gender', e.gender.includes(user.gender),
      `Scheme for: ${e.gender.join(', ')}`);
  }

  if (e.caste?.length) {
    addCheck('caste', e.caste.includes(user.caste),
      `Scheme for caste: ${e.caste.join(', ')}`);
  }

  if (e.occupation?.length) {
    addCheck('occupation', e.occupation.includes(user.occupation),
      `Scheme for occupation: ${e.occupation.join(', ')}`);
  }

  if (e.education?.length) {
    addCheck('education', e.education.includes(user.education),
      `Education required: ${e.education.join(', ')}`);
  }

  if (e.residency?.length) {
    addCheck('residency', e.residency.includes(user.residency),
      `Residency: ${e.residency.join(', ')}`);
  }

  if (scheme.level === 'state' && scheme.state !== 'all') {
    addCheck('state', user.state === scheme.state,
      `Only for residents of ${scheme.state}`);
  }

  const score = total === 0 ? 100 : Math.round((passed / total) * 100);
  return { score, checks, eligible: passed === total };
}

module.exports = { calculateEligibility };