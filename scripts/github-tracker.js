#!/usr/bin/env node
/**
 * GitHub Metrics Tracker
 * Collects repository statistics from GitHub API
 * Tracks stars, forks, contributors, issues, and more
 */

import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'mailgoat';
const GITHUB_REPO = process.env.GITHUB_REPO || 'mailgoat';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'github-metrics.json');

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// Initialize Octokit
const octokit = new Octokit({ auth: GITHUB_TOKEN });

/**
 * Fetch repository statistics
 */
async function fetchRepoStats() {
  try {
    console.log(`📡 Fetching repo stats for ${GITHUB_OWNER}/${GITHUB_REPO}...`);
    
    const { data: repo } = await octokit.repos.get({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    });

    return {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      openIssues: repo.open_issues_count,
      size: repo.size,
      language: repo.language,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at
    };
  } catch (error) {
    console.error('Error fetching repo stats:', error.message);
    throw error;
  }
}

/**
 * Fetch contributors count
 */
async function fetchContributors() {
  try {
    console.log(`👥 Fetching contributors...`);
    
    const { data: contributors } = await octokit.repos.listContributors({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      per_page: 100
    });

    return {
      count: contributors.length,
      topContributors: contributors.slice(0, 10).map(c => ({
        login: c.login,
        contributions: c.contributions
      }))
    };
  } catch (error) {
    console.error('Error fetching contributors:', error.message);
    return { count: 0, topContributors: [] };
  }
}

/**
 * Fetch recent issues and PRs stats
 */
async function fetchIssuesAndPRs() {
  try {
    console.log(`📋 Fetching issues and PRs...`);
    
    // Get open issues (excluding PRs)
    const { data: openIssues } = await octokit.issues.listForRepo({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      state: 'open',
      per_page: 100
    });

    // Filter out PRs (issues with pull_request property)
    const actualIssues = openIssues.filter(issue => !issue.pull_request);
    
    // Get open PRs
    const { data: openPRs } = await octokit.pulls.list({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      state: 'open',
      per_page: 100
    });

    return {
      openIssuesCount: actualIssues.length,
      openPRsCount: openPRs.length
    };
  } catch (error) {
    console.error('Error fetching issues/PRs:', error.message);
    return { openIssuesCount: 0, openPRsCount: 0 };
  }
}

/**
 * Try to fetch traffic stats (requires push access)
 */
async function fetchTraffic() {
  try {
    console.log(`📊 Fetching traffic stats...`);
    
    const { data: views } = await octokit.repos.getViews({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    });

    const { data: clones } = await octokit.repos.getClones({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    });

    return {
      views: views.count,
      uniqueVisitors: views.uniques,
      clones: clones.count,
      uniqueCloners: clones.uniques
    };
  } catch (error) {
    // Traffic stats require push access, so this might fail
    console.log('⚠️  Traffic stats not available (requires push access)');
    return null;
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
 * Calculate change since last collection
 */
function calculateChange(current, previous) {
  if (!previous) return null;
  const change = current - previous;
  return change !== 0 ? (change > 0 ? `+${change}` : `${change}`) : '0';
}

/**
 * Main execution
 */
async function main() {
  console.log(`⭐ Collecting GitHub metrics for: ${GITHUB_OWNER}/${GITHUB_REPO}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Fetch all metrics
    const repoStats = await fetchRepoStats();
    const contributors = await fetchContributors();
    const issuesAndPRs = await fetchIssuesAndPRs();
    const traffic = await fetchTraffic();

    const metrics = {
      timestamp: new Date().toISOString(),
      repository: `${GITHUB_OWNER}/${GITHUB_REPO}`,
      ...repoStats,
      contributors: contributors.count,
      topContributors: contributors.topContributors,
      openIssues: issuesAndPRs.openIssuesCount,
      openPRs: issuesAndPRs.openPRsCount,
      traffic: traffic
    };

    // Calculate changes if we have previous data
    const history = loadHistory();
    if (history.length > 0) {
      const last = history[history.length - 1];
      console.log(`\n📊 Current Metrics:`);
      console.log(`   ⭐ Stars: ${metrics.stars.toLocaleString()} (${calculateChange(metrics.stars, last.stars) || 'first'})`);
      console.log(`   🍴 Forks: ${metrics.forks.toLocaleString()} (${calculateChange(metrics.forks, last.forks) || 'first'})`);
      console.log(`   👥 Contributors: ${metrics.contributors.toLocaleString()} (${calculateChange(metrics.contributors, last.contributors) || 'first'})`);
      console.log(`   📋 Open Issues: ${metrics.openIssues.toLocaleString()}`);
      console.log(`   🔀 Open PRs: ${metrics.openPRs.toLocaleString()}`);
      if (traffic) {
        console.log(`   👀 Views (14d): ${metrics.traffic.views.toLocaleString()}`);
      }
    } else {
      console.log(`\n📊 Current Metrics:`);
      console.log(`   ⭐ Stars: ${metrics.stars.toLocaleString()}`);
      console.log(`   🍴 Forks: ${metrics.forks.toLocaleString()}`);
      console.log(`   👥 Contributors: ${metrics.contributors.toLocaleString()}`);
      console.log(`   📋 Open Issues: ${metrics.openIssues.toLocaleString()}`);
      console.log(`   🔀 Open PRs: ${metrics.openPRs.toLocaleString()}`);
      if (traffic) {
        console.log(`   👀 Views (14d): ${metrics.traffic.views.toLocaleString()}`);
      }
    }
    
    saveMetrics(metrics);
    console.log(`\n✅ GitHub metrics collection complete!`);
    
  } catch (error) {
    console.error(`\n❌ Failed to collect GitHub metrics:`, error.message);
    process.exit(1);
  }
}

main();
