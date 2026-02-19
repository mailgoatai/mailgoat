#!/usr/bin/env node
/**
 * Weekly Growth Report Generator
 * Creates markdown report from collected metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const NPM_DATA_FILE = path.join(DATA_DIR, 'npm-metrics.json');
const GITHUB_DATA_FILE = path.join(DATA_DIR, 'github-metrics.json');

/**
 * Load metrics from JSON file
 */
function loadMetrics(filename) {
  if (!fs.existsSync(filename)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return [];
  }
}

/**
 * Calculate percentage change
 */
function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous * 100);
  return change.toFixed(1);
}

/**
 * Format number with +/- sign
 */
function formatChange(change) {
  if (change === null) return 'N/A';
  const num = parseFloat(change);
  return num > 0 ? `+${change}%` : `${change}%`;
}

/**
 * Get data from 7 days ago
 */
function getLastWeekData(data) {
  if (data.length < 7) return null;
  return data[data.length - 7];
}

/**
 * Generate weekly report
 */
function generateReport(npmData, githubData) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  // Get current data
  const currentNpm = npmData[npmData.length - 1];
  const currentGithub = githubData[githubData.length - 1];

  // Get data from 7 days ago
  const lastWeekNpm = getLastWeekData(npmData);
  const lastWeekGithub = getLastWeekData(githubData);

  // Calculate changes
  const npmWeeklyChange = lastWeekNpm ? percentChange(currentNpm.weeklyDownloads, lastWeekNpm.weeklyDownloads) : null;
  const npmMonthlyChange = lastWeekNpm ? percentChange(currentNpm.monthlyDownloads, lastWeekNpm.monthlyDownloads) : null;
  const starsChange = lastWeekGithub ? currentGithub.stars - lastWeekGithub.stars : 0;
  const forksChange = lastWeekGithub ? currentGithub.forks - lastWeekGithub.forks : 0;
  const contributorsChange = lastWeekGithub ? currentGithub.contributors - lastWeekGithub.contributors : 0;

  // Generate markdown report
  const report = `# Weekly Growth Report

**Period:** ${weekAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}  
**Generated:** ${today.toISOString()}

---

## 📦 npm Package Metrics

| Metric | Current | Change (7d) |
|--------|---------|-------------|
| **Weekly Downloads** | ${currentNpm.weeklyDownloads.toLocaleString()} | ${formatChange(npmWeeklyChange)} |
| **Monthly Downloads** | ${currentNpm.monthlyDownloads.toLocaleString()} | ${formatChange(npmMonthlyChange)} |

**Package:** \`${currentNpm.package}\`

### Download Trend (Last 7 Days)
${npmData.slice(-7).map((d, i) => {
  const date = new Date(d.timestamp).toISOString().split('T')[0];
  const downloads = d.weeklyDownloads.toLocaleString();
  return `- **${date}**: ${downloads} weekly downloads`;
}).join('\n')}

---

## ⭐ GitHub Repository Metrics

| Metric | Current | Change (7d) |
|--------|---------|-------------|
| **Stars** | ${currentGithub.stars.toLocaleString()} | ${starsChange > 0 ? '+' : ''}${starsChange} |
| **Forks** | ${currentGithub.forks.toLocaleString()} | ${forksChange > 0 ? '+' : ''}${forksChange} |
| **Contributors** | ${currentGithub.contributors.toLocaleString()} | ${contributorsChange > 0 ? '+' : ''}${contributorsChange} |
| **Open Issues** | ${currentGithub.openIssues.toLocaleString()} | - |
| **Open PRs** | ${currentGithub.openPRs.toLocaleString()} | - |

**Repository:** \`${currentGithub.repository}\`

### Stars Trend (Last 7 Days)
${githubData.slice(-7).map((d, i) => {
  const date = new Date(d.timestamp).toISOString().split('T')[0];
  const stars = d.stars.toLocaleString();
  return `- **${date}**: ${stars} stars`;
}).join('\n')}

${currentGithub.traffic ? `
### Traffic (Last 14 Days)
- **Views:** ${currentGithub.traffic.views.toLocaleString()}
- **Unique Visitors:** ${currentGithub.traffic.uniqueVisitors.toLocaleString()}
- **Clones:** ${currentGithub.traffic.clones.toLocaleString()}
- **Unique Cloners:** ${currentGithub.traffic.uniqueCloners.toLocaleString()}
` : ''}

### Top Contributors (by commits)
${currentGithub.topContributors.slice(0, 5).map((c, i) => 
  `${i + 1}. **@${c.login}** - ${c.contributions} contributions`
).join('\n')}

---

## 📊 Summary

${starsChange > 0 ? `🎉 **+${starsChange} stars this week!**` : ''}
${npmWeeklyChange && parseFloat(npmWeeklyChange) > 0 ? `\n📈 **npm downloads up ${npmWeeklyChange}%!**` : ''}
${contributorsChange > 0 ? `\n👥 **+${contributorsChange} new contributors!**` : ''}

${starsChange === 0 && contributorsChange === 0 ? '📊 Steady week - no major changes in GitHub metrics.' : ''}

---

## 🎯 Next Week Focus

- Continue monitoring growth trends
- [Add manual focus areas here]

---

*This report was auto-generated by the Growth Analytics system.*
`;

  return report;
}

/**
 * Save report to file
 */
function saveReport(report) {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const filename = `weekly-${new Date().toISOString().split('T')[0]}.md`;
  const filepath = path.join(REPORTS_DIR, filename);
  
  fs.writeFileSync(filepath, report);
  console.log(`✅ Report saved to: ${filepath}`);
  
  // Also save as "latest" for easy access
  const latestPath = path.join(REPORTS_DIR, 'latest.md');
  fs.writeFileSync(latestPath, report);
  console.log(`✅ Also saved as: ${latestPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log(`📈 Generating weekly growth report...`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    const npmData = loadMetrics(NPM_DATA_FILE);
    const githubData = loadMetrics(GITHUB_DATA_FILE);

    if (npmData.length === 0 || githubData.length === 0) {
      console.error('❌ Insufficient data to generate report');
      console.log(`   npm metrics: ${npmData.length} entries`);
      console.log(`   GitHub metrics: ${githubData.length} entries`);
      process.exit(1);
    }

    const report = generateReport(npmData, githubData);
    saveReport(report);

    console.log(`\n✅ Weekly report generated successfully!`);
  } catch (error) {
    console.error(`\n❌ Failed to generate report:`, error.message);
    process.exit(1);
  }
}

main();
