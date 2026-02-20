/**
 * Link Validator
 *
 * Validates all links in email templates
 */

import * as cheerio from 'cheerio';
import axios from 'axios';

export interface LinkValidationResult {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  redirects: number;
  results: LinkResult[];
}

export interface LinkResult {
  url: string;
  status: 'ok' | 'broken' | 'redirect' | 'error';
  statusCode?: number;
  redirectUrl?: string;
  error?: string;
}

export class LinkValidator {
  async validateLinks(html: string, data?: Record<string, string>): Promise<LinkValidationResult> {
    const $ = cheerio.load(html);
    const links = new Set<string>();

    // Extract all links
    $('a[href]').each((_, elem) => {
      let href = $(elem).attr('href');
      if (href) {
        // Replace template variables if data provided
        if (data) {
          href = this.replaceVariables(href, data);
        }
        if (href.startsWith('http')) {
          links.add(href);
        }
      }
    });

    // Validate each link
    const results: LinkResult[] = [];

    for (const url of links) {
      const result = await this.checkLink(url);
      results.push(result);
    }

    const validLinks = results.filter((r) => r.status === 'ok').length;
    const brokenLinks = results.filter((r) => r.status === 'broken').length;
    const redirects = results.filter((r) => r.status === 'redirect').length;

    return {
      totalLinks: links.size,
      validLinks,
      brokenLinks,
      redirects,
      results,
    };
  }

  private async checkLink(url: string): Promise<LinkResult> {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        maxRedirects: 0,
        validateStatus: () => true, // Don't throw on any status
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          url,
          status: 'ok',
          statusCode: response.status,
        };
      }

      if (response.status >= 300 && response.status < 400) {
        return {
          url,
          status: 'redirect',
          statusCode: response.status,
          redirectUrl: response.headers.location,
        };
      }

      return {
        url,
        status: 'broken',
        statusCode: response.status,
      };
    } catch (error) {
      return {
        url,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private replaceVariables(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }
}
