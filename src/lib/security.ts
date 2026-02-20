import { debugLogger } from './debug';

export type SanitizationLevel = 'strict' | 'moderate' | 'off';

export interface SecurityPolicy {
  sanitization?: {
    html?: SanitizationLevel;
    templates?: 'safe' | 'legacy';
    headers?: 'validate' | 'sanitize' | 'off';
    attachments?: 'scan' | 'trust';
  };
  csp?: {
    enabled?: boolean;
    policy?: string;
  };
}

export interface SanitizeEmailOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripScripts?: boolean;
}

export interface TemplateRenderOptions {
  escapeHtml?: boolean;
  allowRawHtml?: boolean;
  strictMode?: boolean;
}

export interface SecurityIssue {
  type:
    | 'script-tag'
    | 'event-handler'
    | 'javascript-uri'
    | 'data-uri'
    | 'svg-script'
    | 'raw-template-html';
  line: number;
  message: string;
}

const DEFAULT_SANITIZE_OPTIONS: Required<SanitizeEmailOptions> = {
  allowedTags: [
    'a',
    'abbr',
    'b',
    'blockquote',
    'br',
    'code',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'span',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'title'],
    '*': ['class', 'id', 'style', 'align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  stripScripts: true,
};

export function sanitizeEmail(unsafeHtml: string, options: SanitizeEmailOptions = {}): string {
  const cfg: Required<SanitizeEmailOptions> = {
    ...DEFAULT_SANITIZE_OPTIONS,
    ...options,
    allowedAttributes: {
      ...DEFAULT_SANITIZE_OPTIONS.allowedAttributes,
      ...(options.allowedAttributes || {}),
    },
  };

  if (!unsafeHtml) {
    return unsafeHtml;
  }

  let sanitized = unsafeHtml;

  if (cfg.stripScripts) {
    sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  // Strip scriptable SVG blocks entirely.
  sanitized = sanitized.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Remove inline event handlers like onclick="...".
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: and dangerous data:text/html URLs.
  sanitized = sanitized.replace(
    /\s(href|src)\s*=\s*("|')\s*(javascript:[^"']*|data:text\/html[^"']*)\2/gi,
    ''
  );

  // Drop disallowed tags while preserving inner text content.
  const allowedTagSet = new Set(cfg.allowedTags.map((tag) => tag.toLowerCase()));
  sanitized = sanitized.replace(
    /<\/?([a-z0-9-]+)([^>]*)>/gi,
    (full, tagName: string, attrs = '') => {
      const lowerTag = tagName.toLowerCase();

      if (!allowedTagSet.has(lowerTag)) {
        return '';
      }

      if (full.startsWith('</')) {
        return `</${lowerTag}>`;
      }

      const allowedAttrs = new Set([
        ...(cfg.allowedAttributes['*'] || []),
        ...(cfg.allowedAttributes[lowerTag] || []),
      ]);

      const keptAttrs: string[] = [];
      const attrRegex = /([a-zA-Z0-9:-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g;
      let attrMatch: RegExpExecArray | null = null;

      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        let attrValue = attrMatch[2];

        if (!allowedAttrs.has(attrName)) {
          continue;
        }

        if (attrName === 'href' || attrName === 'src') {
          const unquoted = attrValue.replace(/^['"]|['"]$/g, '').trim();
          const normalized = unquoted.toLowerCase();
          const hasScheme = /^[a-z][a-z0-9+.-]*:/.test(normalized);

          if (hasScheme) {
            const scheme = normalized.split(':', 1)[0];
            if (!cfg.allowedSchemes.includes(scheme)) {
              continue;
            }
          }
        }

        if (!/^['"].*['"]$/.test(attrValue)) {
          attrValue = `"${attrValue}"`;
        }

        keptAttrs.push(`${attrName}=${attrValue}`);
      }

      const attrSuffix = keptAttrs.length > 0 ? ` ${keptAttrs.join(' ')}` : '';
      return `<${lowerTag}${attrSuffix}>`;
    }
  );

  return sanitized;
}

export function validateEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  if (/[\r\n]/.test(email)) {
    return false;
  }

  const trimmed = email.trim();
  const regex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(trimmed);
}

export function sanitizeHeaders(
  headers: Record<string, string | undefined>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    sanitized[key] = value.replace(/[\r\n]+/g, ' ').trim();
  }

  if (sanitized.from && !validateEmailAddress(sanitized.from)) {
    throw new Error(`Invalid from email address: ${sanitized.from}`);
  }

  return sanitized;
}

export function validateHeaders(headers: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    if (/[\r\n]/.test(value)) {
      throw new Error(`Invalid header value for ${key}: CRLF injection pattern detected`);
    }
  }

  if (headers.from && !validateEmailAddress(headers.from)) {
    throw new Error(`Invalid from email address: ${headers.from}`);
  }
}

export function assertSafeTemplate(template: string, options: TemplateRenderOptions = {}): void {
  const cfg: Required<TemplateRenderOptions> = {
    escapeHtml: options.escapeHtml !== false,
    allowRawHtml: options.allowRawHtml === true,
    strictMode: options.strictMode !== false,
  };

  if (!cfg.allowRawHtml && /{{{[\s\S]*?}}}/.test(template)) {
    throw new Error('Unsafe template interpolation detected: raw HTML blocks {{{ }}} are disabled');
  }

  if (template.includes('..\\') || template.includes('../')) {
    throw new Error('Template path traversal pattern detected');
  }

  if (!cfg.strictMode && /{{\s*[a-zA-Z0-9_.-]+\s*}}/.test(template)) {
    debugLogger.log(
      'validation',
      'Template strict mode disabled; undefined values may render as empty'
    );
  }
}

export function scanHtmlSecurityIssues(content: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lines = content.split(/\r?\n/);

  const checks: Array<{ type: SecurityIssue['type']; pattern: RegExp; message: string }> = [
    { type: 'script-tag', pattern: /<script\b/i, message: 'Script tag detected' },
    { type: 'event-handler', pattern: /\son[a-z]+\s*=/i, message: 'Inline event handler detected' },
    {
      type: 'javascript-uri',
      pattern: /(href|src)\s*=\s*['"]\s*javascript:/i,
      message: 'javascript: URI detected',
    },
    {
      type: 'data-uri',
      pattern: /(href|src)\s*=\s*['"]\s*data:text\/html/i,
      message: 'data:text/html URI detected',
    },
    { type: 'svg-script', pattern: /<svg\b/i, message: 'SVG block detected (can execute scripts)' },
    {
      type: 'raw-template-html',
      pattern: /{{{[\s\S]*?}}}/,
      message: 'Raw template interpolation {{{ }}} detected',
    },
  ];

  lines.forEach((line, index) => {
    for (const check of checks) {
      if (check.pattern.test(line)) {
        issues.push({
          type: check.type,
          line: index + 1,
          message: check.message,
        });
      }
    }
  });

  return issues;
}

export function securityPolicyForLevel(level: SanitizationLevel): SanitizeEmailOptions {
  if (level === 'moderate') {
    return {
      stripScripts: true,
      allowedSchemes: ['http', 'https', 'mailto', 'cid'],
    };
  }

  if (level === 'off') {
    return {
      stripScripts: false,
      allowedTags: DEFAULT_SANITIZE_OPTIONS.allowedTags,
      allowedAttributes: DEFAULT_SANITIZE_OPTIONS.allowedAttributes,
      allowedSchemes: DEFAULT_SANITIZE_OPTIONS.allowedSchemes,
    };
  }

  return {
    stripScripts: true,
    allowedSchemes: ['http', 'https', 'mailto'],
  };
}
