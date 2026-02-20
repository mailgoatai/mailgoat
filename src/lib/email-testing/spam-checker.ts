/**
 * Spam Score Checker
 *
 * Analyzes email content for spam indicators
 */

export interface SpamCheckResult {
  score: number; // 0-10, higher is worse
  issues: SpamIssue[];
  passed: boolean;
}

export interface SpamIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
}

const SPAM_KEYWORDS = [
  'free money',
  'click here',
  'act now',
  'limited time',
  'buy now',
  'earn money',
  'make money fast',
  'no credit check',
  'viagra',
  'casino',
  'lottery',
  'winner',
  'congratulations',
  'claim your prize',
  'urgent',
  'guarantee',
];

const SPAM_PATTERNS = {
  excessiveExclamation: /!{2,}/g,
  allCaps: /\b[A-Z]{4,}\b/g,
  excessiveCaps: /[A-Z]{10,}/g,
  moneySymbols: /\$\$+/g,
};

export class SpamChecker {
  checkEmail(subject: string, body: string, headers?: Record<string, string>): SpamCheckResult {
    const issues: SpamIssue[] = [];
    let score = 0;

    // Check subject
    const subjectIssues = this.checkSubject(subject);
    issues.push(...subjectIssues);
    score += subjectIssues.length;

    // Check body
    const bodyIssues = this.checkBody(body);
    issues.push(...bodyIssues);
    score += bodyIssues.filter((i) => i.severity === 'error').length * 2;
    score += bodyIssues.filter((i) => i.severity === 'warning').length;

    // Check headers
    if (headers) {
      const headerIssues = this.checkHeaders(headers);
      issues.push(...headerIssues);
      score += headerIssues.length * 2;
    }

    // Cap score at 10
    score = Math.min(score, 10);

    return {
      score,
      issues,
      passed: score < 5,
    };
  }

  private checkSubject(subject: string): SpamIssue[] {
    const issues: SpamIssue[] = [];

    // Check for spam keywords
    for (const keyword of SPAM_KEYWORDS) {
      if (subject.toLowerCase().includes(keyword)) {
        issues.push({
          severity: 'warning',
          category: 'Subject',
          message: `Spam keyword detected: "${keyword}"`,
        });
      }
    }

    // Check for excessive exclamation marks
    const exclamations = (subject.match(/!/g) || []).length;
    if (exclamations > 1) {
      issues.push({
        severity: 'warning',
        category: 'Subject',
        message: `Excessive exclamation marks (${exclamations})`,
      });
    }

    // Check for all caps
    if (subject === subject.toUpperCase() && subject.length > 5) {
      issues.push({
        severity: 'error',
        category: 'Subject',
        message: 'Subject is all caps',
      });
    }

    return issues;
  }

  private checkBody(body: string): SpamIssue[] {
    const issues: SpamIssue[] = [];

    // Check for spam keywords
    const bodyLower = body.toLowerCase();
    const foundKeywords = new Set<string>();

    for (const keyword of SPAM_KEYWORDS) {
      if (bodyLower.includes(keyword)) {
        foundKeywords.add(keyword);
      }
    }

    if (foundKeywords.size > 0) {
      issues.push({
        severity: foundKeywords.size > 3 ? 'error' : 'warning',
        category: 'Body',
        message: `Spam keywords detected (${foundKeywords.size})`,
        details: Array.from(foundKeywords).slice(0, 5).join(', '),
      });
    }

    // Check patterns
    const excessiveExclamation = body.match(SPAM_PATTERNS.excessiveExclamation);
    if (excessiveExclamation) {
      issues.push({
        severity: 'warning',
        category: 'Body',
        message: `Multiple consecutive exclamation marks (${excessiveExclamation.length} instances)`,
      });
    }

    const allCaps = body.match(SPAM_PATTERNS.allCaps);
    if (allCaps && allCaps.length > 3) {
      issues.push({
        severity: 'warning',
        category: 'Body',
        message: `Excessive ALL CAPS usage (${allCaps.length} instances)`,
      });
    }

    // Check link/text ratio
    const links = (body.match(/<a /gi) || []).length;
    const textLength = body.replace(/<[^>]*>/g, '').length;
    const linkRatio = textLength > 0 ? (links * 50) / textLength : 0;

    if (linkRatio > 0.2) {
      issues.push({
        severity: 'error',
        category: 'Body',
        message: `High link/text ratio: ${(linkRatio * 100).toFixed(0)}%`,
      });
    } else if (linkRatio > 0.15) {
      issues.push({
        severity: 'warning',
        category: 'Body',
        message: `Link/text ratio: ${(linkRatio * 100).toFixed(0)}% (warning at 20%)`,
      });
    }

    return issues;
  }

  private checkHeaders(headers: Record<string, string>): SpamIssue[] {
    const issues: SpamIssue[] = [];

    // Check for missing important headers
    if (!headers['From']) {
      issues.push({
        severity: 'error',
        category: 'Headers',
        message: 'Missing From header',
      });
    }

    if (!headers['Message-ID']) {
      issues.push({
        severity: 'warning',
        category: 'Headers',
        message: 'Missing Message-ID header',
      });
    }

    // Check for suspicious headers
    if (headers['X-Mailer']?.toLowerCase().includes('bulk')) {
      issues.push({
        severity: 'warning',
        category: 'Headers',
        message: 'Bulk mailer detected in X-Mailer header',
      });
    }

    return issues;
  }
}
