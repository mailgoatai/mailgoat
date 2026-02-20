/**
 * Template Manager for MailGoat
 * Handles email template storage, loading, and variable substitution
 */

import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import Handlebars from 'handlebars';
import YAML from 'yaml';
import { debugLogger } from './debug';
import { assertSafeTemplate, TemplateRenderOptions } from './security';

export interface EmailTemplate {
  name: string;
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  tag?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateVariables {
  [key: string]: unknown;
}

/**
 * Template Manager class
 */
export class TemplateManager {
  private static helpersRegistered = false;
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(os.homedir(), '.mailgoat', 'templates');
    TemplateManager.registerHelpers();
    debugLogger.log('config', `Templates directory: ${this.templatesDir}`);
  }

  private static registerHelpers(): void {
    if (TemplateManager.helpersRegistered) {
      return;
    }

    Handlebars.registerHelper('uppercase', (value: unknown) => String(value ?? '').toUpperCase());
    Handlebars.registerHelper('lowercase', (value: unknown) => String(value ?? '').toLowerCase());
    Handlebars.registerHelper('date', () => new Date().toISOString());

    TemplateManager.helpersRegistered = true;
  }

  private renderField(
    template: string,
    variables: TemplateVariables,
    options: TemplateRenderOptions = {}
  ): string {
    try {
      const renderOptions: Required<TemplateRenderOptions> = {
        escapeHtml: options.escapeHtml !== false,
        allowRawHtml: options.allowRawHtml === true,
        strictMode: options.strictMode !== false,
      };
      assertSafeTemplate(template, renderOptions);
      const compiled = Handlebars.compile(template, {
        strict: renderOptions.strictMode,
        noEscape: !renderOptions.escapeHtml,
      });
      return compiled(variables);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Template rendering failed: ${message}`);
    }
  }

  /**
   * Ensure templates directory exists
   */
  private async ensureTemplatesDir(): Promise<void> {
    try {
      await fsPromises.access(this.templatesDir);
    } catch {
      debugLogger.log('config', `Creating templates directory: ${this.templatesDir}`);
      await fsPromises.mkdir(this.templatesDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Get path to template file
   */
  private getTemplatePath(name: string): string {
    return path.join(this.templatesDir, `${name}.yml`);
  }

  /**
   * Validate template name
   */
  private validateTemplateName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Template name is required');
    }

    // Only allow alphanumeric, dash, underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Template name must contain only letters, numbers, dashes, and underscores');
    }

    if (name.length > 100) {
      throw new Error('Template name must be 100 characters or less');
    }
  }

  /**
   * Validate template data
   */
  private validateTemplate(template: EmailTemplate): void {
    if (!template.subject) {
      throw new Error('Template must have a subject');
    }

    if (!template.body && !template.html) {
      throw new Error('Template must have either body or html content');
    }

    if (template.subject.length > 1000) {
      throw new Error('Template subject must be 1000 characters or less');
    }

    // Validate email addresses if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (template.from && !emailRegex.test(template.from)) {
      throw new Error(`Invalid from email address: ${template.from}`);
    }

    if (template.cc) {
      template.cc.forEach((email) => {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid CC email address: ${email}`);
        }
      });
    }

    if (template.bcc) {
      template.bcc.forEach((email) => {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid BCC email address: ${email}`);
        }
      });
    }
  }

  /**
   * Create a new template
   */
  async create(template: EmailTemplate): Promise<void> {
    this.validateTemplateName(template.name);
    this.validateTemplate(template);
    await this.ensureTemplatesDir();

    const templatePath = this.getTemplatePath(template.name);

    try {
      await fsPromises.access(templatePath);
      throw new Error(`Template '${template.name}' already exists`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.message.includes('already exists')) throw err;
      // File doesn't exist, continue
    }

    const now = new Date().toISOString();
    const templateData: EmailTemplate = {
      ...template,
      created_at: now,
      updated_at: now,
    };

    const content = YAML.stringify(templateData);
    await fsPromises.writeFile(templatePath, content);

    debugLogger.log('config', `Created template: ${template.name}`);
  }

  /**
   * Update an existing template
   */
  async update(name: string, updates: Partial<EmailTemplate>): Promise<void> {
    this.validateTemplateName(name);

    const templatePath = this.getTemplatePath(name);

    try {
      await fsPromises.access(templatePath);
    } catch {
      throw new Error(`Template '${name}' not found`);
    }

    const existing = await this.load(name);
    const updated: EmailTemplate = {
      ...existing,
      ...updates,
      name, // Don't allow name change
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    this.validateTemplate(updated);

    const content = YAML.stringify(updated);
    await fsPromises.writeFile(templatePath, content);

    debugLogger.log('config', `Updated template: ${name}`);
  }

  /**
   * Load a template
   */
  async load(name: string): Promise<EmailTemplate> {
    this.validateTemplateName(name);

    const templatePath = this.getTemplatePath(name);

    try {
      await fsPromises.access(templatePath);
    } catch {
      throw new Error(`Template '${name}' not found`);
    }

    const content = await fsPromises.readFile(templatePath, 'utf8');
    const template = YAML.parse(content) as EmailTemplate;

    debugLogger.log('config', `Loaded template: ${name}`);

    return template;
  }

  /**
   * Delete a template
   */
  async delete(name: string): Promise<void> {
    this.validateTemplateName(name);

    const templatePath = this.getTemplatePath(name);

    try {
      await fsPromises.access(templatePath);
    } catch {
      throw new Error(`Template '${name}' not found`);
    }

    await fsPromises.unlink(templatePath);

    debugLogger.log('config', `Deleted template: ${name}`);
  }

  /**
   * List all templates
   */
  async list(): Promise<EmailTemplate[]> {
    try {
      await fsPromises.access(this.templatesDir);
    } catch {
      return [];
    }

    const files = await fsPromises.readdir(this.templatesDir);
    const templates: EmailTemplate[] = [];

    for (const file of files) {
      if (file.endsWith('.yml')) {
        const name = file.replace(/\.yml$/, '');
        try {
          const template = await this.load(name);
          templates.push(template);
        } catch (error) {
          debugLogger.logError('config', error as Error);
          // Skip invalid templates
        }
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Check if a template exists
   */
  async exists(name: string): Promise<boolean> {
    try {
      this.validateTemplateName(name);
      const templatePath = this.getTemplatePath(name);
      await fsPromises.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Render a template with variables
   */
  render(
    template: EmailTemplate,
    variables: TemplateVariables = {},
    options: TemplateRenderOptions = {}
  ): EmailTemplate {
    debugLogger.log('config', `Rendering template: ${template.name}`);
    debugLogger.logObject('config', 'Variables', variables);

    const rendered: EmailTemplate = {
      ...template,
    };

    // Compile and render subject
    if (template.subject) {
      rendered.subject = this.renderField(template.subject, variables, options);
    }

    // Compile and render plain body
    if (template.body) {
      rendered.body = this.renderField(template.body, variables, options);
    }

    // Compile and render HTML body
    if (template.html) {
      rendered.html = this.renderField(template.html, variables, options);
    }

    // Render from email
    if (template.from) {
      rendered.from = this.renderField(template.from, variables, options);
    }

    // Render CC emails
    if (template.cc) {
      rendered.cc = template.cc.map((email) => this.renderField(email, variables, options));
    }

    // Render BCC emails
    if (template.bcc) {
      rendered.bcc = template.bcc.map((email) => this.renderField(email, variables, options));
    }

    // Render tag
    if (template.tag) {
      rendered.tag = this.renderField(template.tag, variables, options);
    }

    debugLogger.log('config', 'Template rendered successfully');

    return rendered;
  }

  renderString(
    template: string,
    variables: TemplateVariables = {},
    options: TemplateRenderOptions = {}
  ): string {
    return this.renderField(template, variables, options);
  }

  /**
   * Parse variables from command line format
   * Example: "name=John" => { name: "John" }
   */
  static parseVariables(varStrings: string[]): TemplateVariables {
    const variables: TemplateVariables = {};

    for (const varString of varStrings) {
      const match = varString.match(/^([a-zA-Z0-9_]+)=(.+)$/);

      if (!match) {
        throw new Error(`Invalid variable format: ${varString}. Use format: key=value`);
      }

      const [, key, value] = match;

      // Try to parse as number or boolean
      if (value === 'true') {
        variables[key] = true;
      } else if (value === 'false') {
        variables[key] = false;
      } else if (/^\d+$/.test(value)) {
        variables[key] = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        variables[key] = parseFloat(value);
      } else {
        // Remove quotes if present
        variables[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    return variables;
  }

  /**
   * Get templates directory path
   */
  getTemplatesDir(): string {
    return this.templatesDir;
  }
}
