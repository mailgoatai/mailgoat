#!/usr/bin/env node

/**
 * MailGoat Email Signature Generator
 * 
 * Generates personalized email signatures from template
 * 
 * Usage:
 *   node generate-signature.js --name "Developer 1" --role "Software Engineer" --email "dev1@mailgoat.ai"
 *   node generate-signature.js --config agent-config.json
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        const value = args[i + 1];
        config[key] = value;
    }
    
    return config;
}

// Load configuration from file
function loadConfig(configPath) {
    try {
        const fullPath = path.resolve(configPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error(`Error loading config file: ${err.message}`);
        process.exit(1);
    }
}

// Generate signature from template
function generateSignature(template, data, format = 'html') {
    let signature = template;
    
    // Replace all template variables
    for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key.toUpperCase()}}}`;
        const regex = new RegExp(placeholder, 'g');
        signature = signature.replace(regex, value || '');
    }
    
    // Clean up empty lines for plain text
    if (format === 'text') {
        signature = signature
            .split('\n')
            .filter(line => line.trim() || line === '---')
            .join('\n');
    }
    
    return signature;
}

// Main function
function main() {
    const args = parseArgs();
    
    // Load agent data
    let agentData;
    if (args.config) {
        agentData = loadConfig(args.config);
    } else {
        agentData = {
            agent_name: args.name,
            agent_role: args.role,
            agent_email: args.email,
            agent_organization: args.organization || ''
        };
    }
    
    // Validate required fields
    if (!agentData.agent_name || !agentData.agent_role || !agentData.agent_email) {
        console.error('Error: Missing required fields (name, role, email)');
        console.log('\nUsage:');
        console.log('  node generate-signature.js --name "Your Name" --role "Your Role" --email "you@example.com"');
        console.log('  node generate-signature.js --config agent-config.json');
        process.exit(1);
    }
    
    // Load templates
    const templateDir = __dirname;
    const htmlTemplate = fs.readFileSync(path.join(templateDir, 'email-signature.html'), 'utf8');
    const textTemplate = fs.readFileSync(path.join(templateDir, 'email-signature.txt'), 'utf8');
    
    // Generate signatures
    const htmlSignature = generateSignature(htmlTemplate, agentData, 'html');
    const textSignature = generateSignature(textTemplate, agentData, 'text');
    
    // Create output directory
    const outputDir = path.join(templateDir, 'generated');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate safe filename from agent name
    const safeFilename = agentData.agent_name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    
    // Write output files
    const htmlOutput = path.join(outputDir, `${safeFilename}.html`);
    const textOutput = path.join(outputDir, `${safeFilename}.txt`);
    
    fs.writeFileSync(htmlOutput, htmlSignature);
    fs.writeFileSync(textOutput, textSignature);
    
    console.log('✅ Email signatures generated successfully!\n');
    console.log(`HTML: ${htmlOutput}`);
    console.log(`Text: ${textOutput}`);
    console.log('\nPreview (HTML):');
    console.log('─'.repeat(60));
    
    // Strip HTML tags for preview
    const preview = htmlSignature
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/\s{2,}/)
        .join('\n');
    console.log(preview);
    console.log('─'.repeat(60));
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateSignature };
