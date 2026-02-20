import {
  sanitizeEmail,
  sanitizeHeaders,
  validateHeaders,
  validateEmailAddress,
  scanHtmlSecurityIssues,
  assertSafeTemplate,
} from '../security';

describe('security utilities', () => {
  it('removes script tags, event handlers, and javascript URIs', () => {
    const input = `<div><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">x</a></div>`;
    const result = sanitizeEmail(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('onclick=');
    expect(result).not.toContain('javascript:');
  });

  it('sanitizes CRLF from headers', () => {
    const sanitized = sanitizeHeaders({ subject: 'Hello\r\nBcc:evil@example.com' });
    expect(sanitized.subject).toBe('Hello Bcc:evil@example.com');
  });

  it('rejects header injection when validating', () => {
    expect(() => validateHeaders({ subject: 'Hi\r\nBcc: bad@example.com' })).toThrow(
      'CRLF injection'
    );
  });

  it('rejects injected email addresses', () => {
    expect(validateEmailAddress('user@example.com\r\nBcc: bad@example.com')).toBe(false);
  });

  it('detects risky HTML patterns in scan', () => {
    const issues = scanHtmlSecurityIssues('<script>x</script>\n<a onclick="x()">link</a>');
    expect(issues.some((i) => i.type === 'script-tag')).toBe(true);
    expect(issues.some((i) => i.type === 'event-handler')).toBe(true);
  });

  it('blocks raw html template interpolation by default', () => {
    expect(() => assertSafeTemplate('Hello {{{dangerous}}}')).toThrow('raw HTML blocks');
  });
});
