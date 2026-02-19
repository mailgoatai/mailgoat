#!/usr/bin/env node
/**
 * npm Download Tracker
 * Collects daily download statistics from npm registry API
 * Stores historical data in JSON format
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PACKAGE_NAME = process.env.NPM_PACKAGE_NAME || 'mailgoat';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'npm-metrics.json');

/**
 * Fetch download stats from npm API
 */
async function fetchNpmDownloads(packageName) {
  try {
    // Get last week's downloads
    const weekUrl = `https://api.npmjs.org/downloads/point/last-week/${packageName}`;
    const weekResponse = await fetch(weekUrl);
    if (!weekResponse.ok) {
      throw new Error(`npm API error: ${weekResponse.status} ${weekResponse.statusText}`);
    }
    const weekData = await weekResponse.json();

    // Get last month's downloads
    const monthUrl = `https://api.npmjs.org/downloads/point/last-month/${packageName}`;
    const monthResponse = await fetch(monthUrl);
    const monthData = await monthResponse.json();

    // Get daily breakdown for last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    const rangeUrl = `https://api.npmjs.org/downloads/range/${startDate}:${endDate}/${packageName}`;
    const rangeResponse = await fetch(rangeUrl);
    const rangeData = await rangeResponse.json();

    return {
      timestamp: new Date().toISOString(),
      package: packageName,
      weeklyDownloads: weekData.downloads,
      monthlyDownloads: monthData.downloads,
      dailyBreakdown: rangeData.downloads || []
    };
  } catch (error) {
    console.error('Error fetching npm downloads:', error.message);
    throw error;
  }
}

/**
 * Load existing metrics history
 */
function loadHistory() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading history:', error.message);
    return [];
  }
}

/**
 * Save metrics to history file
 */
function saveMetrics(metrics) {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load existing history
  const history = loadHistory();
  
  // Append new metrics
  history.push(metrics);
  
  // Keep only last 90 days of data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const filtered = history.filter(m => new Date(m.timestamp) > ninetyDaysAgo);
  
  // Save to file
  fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
  console.log(`✅ Saved metrics to ${DATA_FILE}`);
}

/**
 * Calculate growth rate
 */
function calculateGrowth(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous * 100).toFixed(1);
}

/**
 * Main execution
 */
async function main() {
  console.log(`📦 Collecting npm download metrics for: ${PACKAGE_NAME}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    const metrics = await fetchNpmDownloads(PACKAGE_NAME);
    
    // Calculate growth if we have previous data
    const history = loadHistory();
    if (history.length > 0) {
      const lastWeek = history[history.length - 1];
      const weeklyGrowth = calculateGrowth(metrics.weeklyDownloads, lastWeek.weeklyDownloads);
      const monthlyGrowth = calculateGrowth(metrics.monthlyDownloads, lastWeek.monthlyDownloads);
      
      console.log(`\n📊 Current Metrics:`);
      console.log(`   Weekly downloads: ${metrics.weeklyDownloads.toLocaleString()} ${weeklyGrowth ? `(${weeklyGrowth > 0 ? '+' : ''}${weeklyGrowth}%)` : ''}`);
      console.log(`   Monthly downloads: ${metrics.monthlyDownloads.toLocaleString()} ${monthlyGrowth ? `(${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}%)` : ''}`);
    } else {
      console.log(`\n📊 Current Metrics:`);
      console.log(`   Weekly downloads: ${metrics.weeklyDownloads.toLocaleString()}`);
      console.log(`   Monthly downloads: ${metrics.monthlyDownloads.toLocaleString()}`);
    }
    
    saveMetrics(metrics);
    console.log(`\n✅ npm metrics collection complete!`);
    
  } catch (error) {
    console.error(`\n❌ Failed to collect npm metrics:`, error.message);
    process.exit(1);
  }
}

main();
