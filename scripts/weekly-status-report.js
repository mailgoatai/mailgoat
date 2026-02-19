#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const owner = process.env.GITHUB_OWNER || 'mailgoatai';
const repo = process.env.GITHUB_REPO || 'mailgoat';
const pkg = process.env.NPM_PACKAGE_NAME || 'mailgoat';
const now = new Date();

function monday(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function fmt(date) {
  return date.toISOString().slice(0, 10);
}

const weekStart = process.env.WEEK_START_DATE ? new Date(`${process.env.WEEK_START_DATE}T00:00:00Z`) : monday(now);
const weekEnd = new Date(weekStart);
weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

const metricsDir = path.join(root, 'docs', 'metrics', 'weekly');
const dataFile = path.join(metricsDir, 'metrics-history.json');
const reportFile = path.join(metricsDir, `week-of-${fmt(weekStart)}.md`);
const latestFile = path.join(metricsDir, 'latest.md');

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Request failed ${res.status}: ${url}`);
  return res.json();
}

async function npmMetrics() {
  const weekRange = `${fmt(weekStart)}:${fmt(weekEnd)}`;
  const week = await fetchJson(`https://api.npmjs.org/downloads/point/${weekRange}/${pkg}`);
  const total = await fetchJson(`https://api.npmjs.org/downloads/point/2019-01-01:${fmt(weekEnd)}/${pkg}`);
  return {
    weeklyDownloads: week.downloads || 0,
    totalDownloads: total.downloads || 0,
  };
}

async function githubMetrics(octokit) {
  const repoData = (await octokit.repos.get({ owner, repo })).data;
  const stars = repoData.stargazers_count;
  const forks = repoData.forks_count;

  const baseQuery = `repo:${owner}/${repo}`;
  const openedIssues = (await octokit.search.issuesAndPullRequests({ q: `${baseQuery} is:issue created:${fmt(weekStart)}..${fmt(weekEnd)}` })).data.total_count;
  const closedIssues = (await octokit.search.issuesAndPullRequests({ q: `${baseQuery} is:issue closed:${fmt(weekStart)}..${fmt(weekEnd)}` })).data.total_count;
  const openedPRs = (await octokit.search.issuesAndPullRequests({ q: `${baseQuery} is:pr created:${fmt(weekStart)}..${fmt(weekEnd)}` })).data.total_count;
  const mergedPRs = (await octokit.search.issuesAndPullRequests({ q: `${baseQuery} is:pr is:merged merged:${fmt(weekStart)}..${fmt(weekEnd)}` })).data.total_count;

  const commits = await octokit.repos.listCommits({ owner, repo, since: weekStart.toISOString(), until: weekEnd.toISOString(), per_page: 100 });
  const contributorSet = new Set(commits.data.map((c) => c.author?.login).filter(Boolean));

  return { stars, forks, openedIssues, closedIssues, openedPRs, mergedPRs, weekContributors: [...contributorSet] };
}

async function communityMetrics() {
  const reddit = await fetchJson(`https://www.reddit.com/search.json?q=${encodeURIComponent(pkg)}&sort=new&t=week&limit=100`);
  const redditPosts = reddit?.data?.children || [];
  const redditTotals = redditPosts.reduce(
    (acc, p) => {
      acc.posts += 1;
      acc.upvotes += p.data.ups || 0;
      acc.comments += p.data.num_comments || 0;
      return acc;
    },
    { posts: 0, upvotes: 0, comments: 0 }
  );

  const hn = await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(pkg)}&tags=story&hitsPerPage=100`);
  const weekStartTs = Math.floor(weekStart.getTime() / 1000);
  const hnHits = (hn.hits || []).filter((h) => (h.created_at_i || 0) >= weekStartTs);
  const hnTotals = hnHits.reduce(
    (acc, h) => {
      acc.posts += 1;
      acc.points += h.points || 0;
      acc.comments += h.num_comments || 0;
      return acc;
    },
    { posts: 0, points: 0, comments: 0 }
  );

  return {
    reddit: redditTotals,
    hackerNews: hnTotals,
    twitterMentions: null,
    discordMessages: process.env.DISCORD_WEEKLY_MESSAGES ? Number(process.env.DISCORD_WEEKLY_MESSAGES) : null,
  };
}

function loadHistory() {
  if (!fs.existsSync(dataFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return [];
  }
}

function pct(current, previous) {
  if (!previous) return null;
  return (((current - previous) / previous) * 100).toFixed(1);
}

function plus(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

function topIssues(issues) {
  return issues
    .sort((a, b) => (b.comments || 0) - (a.comments || 0))
    .slice(0, 3)
    .map((i) => ({ title: i.title, url: i.html_url, state: i.state }));
}

function inferFocus(m) {
  const focus = [];
  if (m.github.openedIssues > m.github.closedIssues) focus.push('Reduce issue backlog by prioritizing top bug reports and stale triage.');
  if (m.github.openedPRs < 2) focus.push('Increase contribution throughput with starter issues and contributor outreach.');
  if ((m.community.reddit.posts + m.community.hackerNews.posts) === 0) focus.push('Seed community visibility with launch posts and integration demos.');
  if (!focus.length) focus.push('Sustain current velocity and convert feedback into roadmap tickets.');
  return focus.slice(0, 2);
}

async function main() {
  fs.mkdirSync(metricsDir, { recursive: true });

  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit(token ? { auth: token } : {});

  const [npm, github, community] = await Promise.all([
    npmMetrics(),
    githubMetrics(octokit),
    communityMetrics(),
  ]);

  const issues = (await octokit.issues.listForRepo({ owner, repo, state: 'open', per_page: 100 })).data.filter((i) => !i.pull_request);
  const top = topIssues(issues);

  const history = loadHistory();
  const prev = history.length ? history[history.length - 1] : null;
  const seenContributors = new Set(history.flatMap((h) => h.github.weekContributors || []));
  const newContributors = github.weekContributors.filter((c) => !seenContributors.has(c));

  const metrics = {
    generatedAt: now.toISOString(),
    weekOf: fmt(weekStart),
    npm,
    github: {
      ...github,
      starsDelta: prev ? github.stars - prev.github.stars : 0,
      forksDelta: prev ? github.forks - prev.github.forks : 0,
      newContributors: newContributors.length,
      returningContributors: github.weekContributors.length - newContributors.length,
    },
    community,
  };

  history.push(metrics);
  fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));

  const npmGrowth = prev ? pct(metrics.npm.weeklyDownloads, prev.npm.weeklyDownloads) : null;
  const topFeatureReq = issues.filter((i) => (i.labels || []).some((l) => String(l.name).toLowerCase().includes('enhancement') || String(l.name).toLowerCase().includes('feature'))).length;

  const report = `# mailgoat Weekly Status - Week of ${fmt(weekStart)}\n\n## 📊 Growth\n- npm downloads: ${metrics.npm.weeklyDownloads.toLocaleString()}${npmGrowth ? ` (${plus(Number(npmGrowth))}% from last week)` : ''}\n- npm total downloads: ${metrics.npm.totalDownloads.toLocaleString()}\n- GitHub stars: ${metrics.github.stars.toLocaleString()} (${plus(metrics.github.starsDelta)})\n- GitHub forks: ${metrics.github.forks.toLocaleString()} (${plus(metrics.github.forksDelta)})\n- New contributors: ${metrics.github.newContributors}\n- Returning contributors: ${metrics.github.returningContributors}\n\n## 💬 Community\n- Issues opened: ${metrics.github.openedIssues} (${metrics.github.closedIssues} closed)\n- PRs opened: ${metrics.github.openedPRs} (${metrics.github.mergedPRs} merged)\n- Reddit posts: ${metrics.community.reddit.posts} (${metrics.community.reddit.upvotes} upvotes, ${metrics.community.reddit.comments} comments)\n- Hacker News posts: ${metrics.community.hackerNews.posts} (${metrics.community.hackerNews.points} points, ${metrics.community.hackerNews.comments} comments)\n- Twitter mentions: ${metrics.community.twitterMentions === null ? 'N/A (API not configured)' : metrics.community.twitterMentions}\n- Discord activity: ${metrics.community.discordMessages === null ? 'N/A (not configured)' : metrics.community.discordMessages}\n\n## 🐛 Top Issues\n${top.length ? top.map((t, i) => `${i + 1}. [${t.title}](${t.url}) - ${t.state}`).join('\n') : '1. No open issues'}\n\n## 📈 Trend Analysis\n- Feature request frequency (open labeled enhancement/feature): ${topFeatureReq}\n- Most active feedback channels this week: ${metrics.community.reddit.posts >= metrics.community.hackerNews.posts ? 'Reddit' : 'Hacker News'}\n- Common error patterns: derived from issue triage (manual review required for exact stack traces)\n\n## 🎯 Focus for Next Week\n- ${inferFocus(metrics)[0]}\n- ${inferFocus(metrics)[1] || 'Review command usage telemetry once available to prioritize DX improvements.'}\n\n## 📝 Notes\n- Report generated automatically by \`scripts/weekly-status-report.js\`.\n- Raw metrics history is stored in \`docs/metrics/weekly/metrics-history.json\`.\n`;

  fs.writeFileSync(reportFile, report);
  fs.writeFileSync(latestFile, report);

  console.log(`Saved weekly report: ${reportFile}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
