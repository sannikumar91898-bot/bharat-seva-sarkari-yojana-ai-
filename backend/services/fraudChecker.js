/**
 * Blocks known phishing patterns + validates against whitelist of official domains.
 * Whitelist must be manually curated — never auto-trusted.
 */
const OFFICIAL_DOMAIN_PATTERNS = [
  /\.gov\.in$/,
  /\.nic\.in$/,
  /^india\.gov\.in$/,
  /^pgportal\.gov\.in$/,
  /^uidai\.gov\.in$/,
  /^epfindia\.gov\.in$/,
  /^incometax\.gov\.in$/,
];

const SUSPICIOUS_PATTERNS = [
  /-gov/i, /govt?-?scheme/i, /yojana-?\d+/i, /\.(tk|ml|ga|cf|xyz)$/i,
  /bit\.ly|tinyurl|t\.co/i,
];

function checkUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    for (const p of SUSPICIOUS_PATTERNS) {
      if (p.test(url)) {
        return { safe: false, reason: 'Suspicious pattern detected (fake domain/shortener)' };
      }
    }
    if (OFFICIAL_DOMAIN_PATTERNS.some((p) => p.test(host))) {
      return { safe: true, reason: 'Official government domain' };
    }
    return { safe: false, reason: 'Not a .gov.in / .nic.in domain — verify manually' };
  } catch {
    return { safe: false, reason: 'Malformed URL' };
  }
}

module.exports = { checkUrl };