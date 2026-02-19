# Analytics Infrastructure Setup Guide

## ✅ Completed Steps

The following analytics infrastructure has been added to the repository:

### 1. GitHub Actions Workflows

Three new workflows have been added to `.github/workflows/`:

- **`collect-npm-metrics.yml`** - Runs daily at 00:00 UTC to collect npm download statistics
- **`collect-github-metrics.yml`** - Runs daily at 00:30 UTC to collect GitHub repository metrics
- **`weekly-report.yml`** - Generates weekly summary reports every Monday

### 2. Analytics Scripts

Analytics collection scripts have been added to `scripts/`:

- `npm-tracker.js` - Collects npm download data from npm registry API
- `github-tracker.js` - Collects GitHub stars, forks, issues, PRs using Octokit
- `generate-report.js` - Generates markdown reports from collected metrics
- `package.json` - Dependencies for analytics scripts (@octokit/rest, node-fetch)

### 3. Data Storage Directories

- `data/` - Will store JSON metric files (npm-metrics.json, github-metrics.json)
- `reports/` - Will store generated weekly reports

---

## 🔧 Manual Configuration Required

The following steps require GitHub repository admin access and must be completed through the GitHub web UI:

### Step 1: Configure Repository Variables

Go to: **Repository Settings → Secrets and variables → Actions → Variables tab**

Click **"New repository variable"** and add each of these:

| Variable Name | Value | Example |
|---|---|---|
| `NPM_PACKAGE_NAME` | `mailgoat` | The npm package name |
| `GITHUB_OWNER` | Repository owner/org | `mailgoatai` or `yourusername` |
| `GITHUB_REPO` | Repository name | `mailgoat` |

### Step 2: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Configure the token:
   - **Note:** `Analytics Metrics Collection`
   - **Expiration:** `90 days` (or `No expiration` if preferred)
   - **Select scopes:**
     - ✅ `repo` (Full control of private repositories) *OR* just `public_repo` if only tracking public repos
     - ✅ `read:org` (Read org and team membership, read org projects)
4. Click **"Generate token"**
5. **⚠️ COPY THE TOKEN** - You won't be able to see it again!

### Step 3: Add Token as Repository Secret

Go to: **Repository Settings → Secrets and variables → Actions → Secrets tab**

Click **"New repository secret"** and add:

- **Name:** `METRICS_GITHUB_TOKEN`
- **Value:** Paste the personal access token you just created
- Click **"Add secret"**

### Step 4: Commit and Push Changes

The analytics infrastructure files are ready to be committed:

```bash
cd /Users/vibe/.opengoat/workspaces/lead-engineer/mailgoat
git add .github/workflows/collect-*.yml .github/workflows/weekly-report.yml
git add scripts/npm-tracker.js scripts/github-tracker.js scripts/generate-report.js scripts/package.json
git add data/ reports/
git add ANALYTICS_SETUP_GUIDE.md
git commit -m "Add analytics infrastructure for metrics collection"
git push
```

### Step 5: Test Workflows

After pushing and configuring secrets/variables:

1. Go to your repository on GitHub
2. Click the **"Actions"** tab
3. You should see three new workflows listed:
   - Collect npm Metrics
   - Collect GitHub Metrics  
   - Weekly Report

**Test each workflow manually:**

1. Click on **"Collect npm Metrics"**
2. Click **"Run workflow"** dropdown → **"Run workflow"** button
3. Wait for the workflow to complete (should show green ✅)
4. Repeat for **"Collect GitHub Metrics"**

### Step 6: Verify Data Collection

After workflows run successfully:

1. Check for new commits from "Metrics Bot" in your repository
2. Verify `data/npm-metrics.json` exists and contains data
3. Verify `data/github-metrics.json` exists and contains data
4. Click on the files to inspect the collected metrics

---

## 📊 Expected Data Format

### npm-metrics.json

```json
{
  "package": "mailgoat",
  "timestamp": "2026-02-19T04:15:00.000Z",
  "downloads": {
    "lastDay": 123,
    "lastWeek": 456,
    "lastMonth": 789
  }
}
```

### github-metrics.json

```json
{
  "repository": "mailgoatai/mailgoat",
  "timestamp": "2026-02-19T04:15:00.000Z",
  "stars": 42,
  "forks": 7,
  "openIssues": 5,
  "openPRs": 2,
  "watchers": 15
}
```

---

## 🐛 Troubleshooting

### Workflow fails with "missing required environment variables"

→ Check that repository variables are configured (Step 1)

### GitHub metrics workflow fails with authentication error

→ Verify `METRICS_GITHUB_TOKEN` secret is set correctly (Step 3)
→ Verify token has correct scopes (`repo` + `read:org`)

### No commits from "Metrics Bot"

→ Workflows need `contents: write` permission (already configured in workflows)
→ Check workflow logs for error messages

### "npm install" fails in workflows

→ The `scripts/package.json` dependencies should install automatically
→ Check if npm registry is accessible from GitHub Actions

---

## 📈 Next Steps

Once metrics collection is working:

1. Monitor the Actions tab for any workflow failures
2. Review weekly reports generated in `reports/`
3. Consider setting up a dashboard to visualize the metrics (see deployment docs)
4. Add Plausible Analytics for website tracking (see `DEPLOYMENT.md` Phase 1)

---

## 📝 Task Reference

**Parent Task:** `task-deploy-mailgoat-analytics-manual-steps-requires-stakeholder-access-002232ee`  
**Current Task:** `task-configure-github-repository-for-analytics-automation-a27b0586`  
**Status:** In Progress - Awaiting Manual Configuration

**Time Investment:** 15 minutes (automated setup)  
**Remaining Manual Work:** 10-15 minutes (GitHub web UI configuration)
