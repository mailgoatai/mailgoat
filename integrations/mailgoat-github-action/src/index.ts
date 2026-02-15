/**
 * MailGoat GitHub Action
 *
 * Send email notifications from GitHub workflows using MailGoat/Postal
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

interface PostalResponse {
  status: string;
  time: number;
  flags: Record<string, unknown>;
  data: {
    message_id: string;
    messages: Record<
      string,
      {
        id: number;
        token: string;
      }
    >;
  };
}

/**
 * Send email via Postal API
 */
async function sendEmail(config: {
  postalServer: string;
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  isHtml: boolean;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}): Promise<PostalResponse> {
  const url = `${config.postalServer}/api/v1/send/message`;

  const payload = {
    to: config.to,
    from: config.from,
    subject: config.subject,
    ...(config.isHtml ? { html_body: config.body } : { plain_body: config.body }),
    ...(config.cc && config.cc.length > 0 && { cc: config.cc }),
    ...(config.bcc && config.bcc.length > 0 && { bcc: config.bcc }),
    ...(config.replyTo && { reply_to: config.replyTo }),
  };

  core.debug(`Sending email to Postal: ${url}`);
  core.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

  try {
    const response = await axios.post<PostalResponse>(url, payload, {
      headers: {
        'X-Server-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const data = error.response?.data;

      throw new Error(
        `Postal API error: ${status} ${statusText}\n${JSON.stringify(data, null, 2)}`
      );
    }
    throw error;
  }
}

/**
 * Parse comma-separated email list
 */
function parseEmailList(input: string): string[] {
  return input
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Expand GitHub context variables in text
 */
function expandVariables(text: string, context: typeof github.context): string {
  return text
    .replace(/\$\{\{\s*github\.sha\s*\}\}/g, context.sha)
    .replace(/\$\{\{\s*github\.ref\s*\}\}/g, context.ref)
    .replace(/\$\{\{\s*github\.repository\s*\}\}/g, context.repo.repo)
    .replace(/\$\{\{\s*github\.actor\s*\}\}/g, context.actor)
    .replace(/\$\{\{\s*github\.workflow\s*\}\}/g, context.workflow)
    .replace(/\$\{\{\s*github\.event_name\s*\}\}/g, context.eventName)
    .replace(/\$\{\{\s*github\.run_number\s*\}\}/g, String(context.runNumber))
    .replace(/\$\{\{\s*github\.run_id\s*\}\}/g, String(context.runId));
}

/**
 * Main action logic
 */
async function run(): Promise<void> {
  try {
    // Get inputs
    const postalServer = core.getInput('postal_server', { required: true });
    const apiKey = core.getInput('postal_api_key', { required: true });
    const from = core.getInput('from_email', { required: true });
    const toInput = core.getInput('to', { required: true });
    const subject = core.getInput('subject', { required: true });
    const body = core.getInput('body', { required: true });

    const ccInput = core.getInput('cc');
    const bccInput = core.getInput('bcc');
    const replyTo = core.getInput('reply_to');
    const isHtml = core.getInput('html') === 'true';
    const failOnError = core.getInput('fail_on_error') !== 'false';

    // Parse email lists
    const to = parseEmailList(toInput);
    const cc = ccInput ? parseEmailList(ccInput) : undefined;
    const bcc = bccInput ? parseEmailList(bccInput) : undefined;

    // Validate emails
    const allEmails = [...to, ...(cc || []), ...(bcc || []), from];
    if (replyTo) allEmails.push(replyTo);

    for (const email of allEmails) {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    // Expand GitHub context variables
    const expandedSubject = expandVariables(subject, github.context);
    const expandedBody = expandVariables(body, github.context);

    // Log action details (without sensitive data)
    core.info('MailGoat Email Action');
    core.info('====================');
    core.info(`From: ${from}`);
    core.info(`To: ${to.join(', ')}`);
    if (cc && cc.length > 0) core.info(`CC: ${cc.join(', ')}`);
    if (bcc && bcc.length > 0) core.info(`BCC: ${bcc.length} recipient(s)`);
    core.info(`Subject: ${expandedSubject}`);
    core.info(`Format: ${isHtml ? 'HTML' : 'Plain Text'}`);
    core.info('');

    // Send email
    core.info('Sending email via Postal...');

    const result = await sendEmail({
      postalServer,
      apiKey,
      from,
      to,
      subject: expandedSubject,
      body: expandedBody,
      isHtml,
      cc,
      bcc,
      replyTo,
    });

    // Set outputs
    core.setOutput('message_id', result.data.message_id);
    core.setOutput('success', 'true');
    core.setOutput('error', '');

    // Success summary
    core.info('');
    core.info('✅ Email sent successfully!');
    core.info(`Message ID: ${result.data.message_id}`);
    core.info(`Time: ${result.time}s`);

    // Create job summary
    await core.summary
      .addHeading('📧 Email Sent Successfully')
      .addTable([
        [
          { data: 'Field', header: true },
          { data: 'Value', header: true },
        ],
        ['From', from],
        ['To', to.join(', ')],
        ['Subject', expandedSubject],
        ['Message ID', result.data.message_id],
        ['Time', `${result.time}s`],
      ])
      .write();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    core.error('Failed to send email');
    core.error(errorMessage);

    // Set outputs
    core.setOutput('message_id', '');
    core.setOutput('success', 'false');
    core.setOutput('error', errorMessage);

    // Create error summary
    await core.summary
      .addHeading('❌ Email Send Failed')
      .addCodeBlock(errorMessage, 'text')
      .write();

    // Fail action if configured
    const failOnError = core.getInput('fail_on_error') !== 'false';
    if (failOnError) {
      core.setFailed(errorMessage);
    } else {
      core.warning('Email send failed but action will not fail (fail_on_error=false)');
    }
  }
}

// Run action
run();
