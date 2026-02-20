/**
 * Email Accessibility Checker
 *
 * Validates email templates against WCAG guidelines
 */

import * as cheerio from 'cheerio';

export interface AccessibilityCheckResult {
  score: number; // 0-10
  issues: AccessibilityIssue[];
  passed: boolean;
}

export interface AccessibilityIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  element?: string;
}

export class AccessibilityChecker {
  checkEmail(html: string): AccessibilityCheckResult {
    const $ = cheerio.load(html);
    const issues: AccessibilityIssue[] = [];

    // Check images for alt text
    const imageIssues = this.checkImages($);
    issues.push(...imageIssues);

    // Check semantic HTML
    const semanticIssues = this.checkSemanticHTML($);
    issues.push(...semanticIssues);

    // Check links
    const linkIssues = this.checkLinks($);
    issues.push(...linkIssues);

    // Check tables
    const tableIssues = this.checkTables($);
    issues.push(...tableIssues);

    // Calculate score
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    let score = 10 - errorCount * 2 - warningCount;
    score = Math.max(0, Math.min(10, score));

    return {
      score,
      issues,
      passed: score >= 7,
    };
  }

  private checkImages($: cheerio.CheerioAPI): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    $('img').each((_, elem) => {
      const $img = $(elem);
      const alt = $img.attr('alt');
      const src = $img.attr('src');

      if (!alt && alt !== '') {
        issues.push({
          severity: 'error',
          category: 'Images',
          message: 'Image missing alt attribute',
          element: src || 'unknown',
        });
      } else if (alt && alt.length > 125) {
        issues.push({
          severity: 'warning',
          category: 'Images',
          message: 'Alt text too long (> 125 characters)',
          element: src || 'unknown',
        });
      }
    });

    return issues;
  }

  private checkSemanticHTML($: cheerio.CheerioAPI): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check for heading hierarchy
    const headings = $('h1, h2, h3, h4, h5, h6')
      .map((_, elem) => parseInt($(elem).prop('tagName').substring(1), 10))
      .get();

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        issues.push({
          severity: 'warning',
          category: 'Semantic HTML',
          message: `Heading hierarchy skip: h${headings[i - 1]} to h${headings[i]}`,
        });
      }
    }

    // Check for empty headings
    $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const $heading = $(elem);
      if ($heading.text().trim().length === 0) {
        issues.push({
          severity: 'error',
          category: 'Semantic HTML',
          message: `Empty ${$heading.prop('tagName')} element`,
        });
      }
    });

    return issues;
  }

  private checkLinks($: cheerio.CheerioAPI): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    $('a').each((_, elem) => {
      const $link = $(elem);
      const text = $link.text().trim();
      const href = $link.attr('href');

      // Check for empty links
      if (!text && !$link.find('img[alt]').length) {
        issues.push({
          severity: 'error',
          category: 'Links',
          message: 'Link with no text or alt text',
          element: href || 'unknown',
        });
      }

      // Check for non-descriptive text
      const nonDescriptive = ['click here', 'here', 'read more', 'link', 'more'];
      if (nonDescriptive.includes(text.toLowerCase())) {
        issues.push({
          severity: 'warning',
          category: 'Links',
          message: `Non-descriptive link text: "${text}"`,
          element: href || 'unknown',
        });
      }
    });

    return issues;
  }

  private checkTables($: cheerio.CheerioAPI): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    $('table').each((_, elem) => {
      const $table = $(elem);

      // Check for table headers
      if ($table.find('th').length === 0) {
        issues.push({
          severity: 'warning',
          category: 'Tables',
          message: 'Table without header cells (<th>)',
        });
      }

      // Check for table summary/caption
      if (!$table.find('caption').length && !$table.attr('summary')) {
        issues.push({
          severity: 'info',
          category: 'Tables',
          message: 'Table without caption or summary',
        });
      }
    });

    return issues;
  }
}
