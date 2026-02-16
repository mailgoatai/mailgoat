/**
 * Template Manager for MailGoat
 * Handles email template storage, loading, and variable substitution
 */

import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import Handlebars from 'handlebars';
import YAML from 'yaml';
import { debugLogger } from './debug';

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
  [key: string]: string | number | boolean;
}

/**
 * Template Manager class
 */
export class TemplateManager {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(os.homedir(), '.mailgoat', 'templates');
    debugLogger.log('config', `Templates directory: ${this.templatesDir}`);
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
  create(template: EmailTemplate): void {
    this.validateTemplateName(template.name);
    this.validateTemplate(template);
    this.ensureTemplatesDir();

    const templatePath = this.getTemplatePath(template.name);

    if (fs.existsSync(templatePath)) {
      throw new Error(`Template '${template.name}' already exists`);
    }

    const now = new Date().toISOString();
    const templateData: EmailTemplate = {
      ...template,
      created_at: now,
      updated_at: now,
    };

    const content = YAML.stringify(templateData);
    fs.writeFileSync(templatePath, content, { mode: 0o600 });

    debugLogger.log('config', `Created template: ${template.name}`);
  }

  /**
   * Update an existing template
   */
  update(name: string, updates: Partial<EmailTemplate>): void {
    this.validateTemplateName(name);

    const templatePath = this.getTemplatePath(name);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template '${name}' not found`);
    }

    const existing = this.load(name);
    const updated: EmailTemplate = {
      ...existing,
      ...updates,
      name, // Don't allow name change
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    this.validateTemplate(updated);

    const content = YAML.stringify(updated);
    fs.writeFileSync(templatePath, content, { mode: 0o600 });

    debugLogger.log('config', `Updated template: ${name}`);
  }

  /**
   * Load a template
   */
  load(name: string): EmailTemplate {
    this.validateTemplateName(name);

    const templatePath = this.getTemplatePath(name);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template '${name}' not found`);
    }

    const content = fs.readFileSync(templatePath, 'utf8');
    const template = YAML.parse(content) as EmailTemplate;

    debugLogger.log('config', `Loaded template: ${name}`);

    return template;
  }

  /**
   * Delete a template
   */
  delete(name: string): void {
    this.validateTemplateName(name);

    const templatePath = this.getTemplatePath(name);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template '${name}' not found`);
    }

    fs.unlinkSync(templatePath);

    debugLogger.log('config', `Deleted template: ${name}`);
  }

  /**
   * List all templates
   */
  list(): EmailTemplate[] {
    if (!fs.existsSync(this.templatesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.templatesDir);
    const templates: EmailTemplate[] = [];

    for (const file of files) {
      if (file.endsWith('.yml')) {
        const name = file.replace(/\.yml$/, '');
        try {
          const template = this.load(name);
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
  exists(name: string): boolean {
    try {
      this.validateTemplateName(name);
      const templatePath = this.getTemplatePath(name);
      return fs.existsSync(templatePath);
    } catch {
      return false;
    }
  }

  /**
   * Render a template with variables
   */
  render(template: EmailTemplate, variables: TemplateVariables = {}): EmailTemplate {
    debugLogger.log('config', `Rendering template: ${template.name}`);
    debugLogger.logObject('config', 'Variables', variables);

    const rendered: EmailTemplate = {
      ...template,
    };

    // Compile and render subject
    if (template.subject) {
      const subjectTemplate = Handlebars.compile(template.subject);
      rendered.subject = subjectTemplate(variables);
    }

    // Compile and render plain body
    if (template.body) {
      const bodyTemplate = Handlebars.compile(template.body);
      rendered.body = bodyTemplate(variables);
    }

    // Compile and render HTML body
    if (template.html) {
      const htmlTemplate = Handlebars.compile(template.html);
      rendered.html = htmlTemplate(variables);
    }

    // Render from email
    if (template.from) {
      const fromTemplate = Handlebars.compile(template.from);
      rendered.from = fromTemplate(variables);
    }

    // Render CC emails
    if (template.cc) {
      rendered.cc = template.cc.map((email) => {
        const emailTemplate = Handlebars.compile(email);
        return emailTemplate(variables);
      });
    }

    // Render BCC emails
    if (template.bcc) {
      rendered.bcc = template.bcc.map((email) => {
        const emailTemplate = Handlebars.compile(email);
        return emailTemplate(variables);
      });
    }

    // Render tag
    if (template.tag) {
      const tagTemplate = Handlebars.compile(template.tag);
      rendered.tag = tagTemplate(variables);
    }

    debugLogger.log('config', 'Template rendered successfully');

    return rendered;
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
