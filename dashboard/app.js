// Configuration - Update these for your project
const CONFIG = {
  dataPath: 'https://raw.githubusercontent.com/mailgoatai/mailgoat/master/data', // Path to data files (adjust for your hosting)
  githubRepo: 'mailgoatai/mailgoat',
  refreshInterval: 60000 // Refresh every minute
};

// Global charts
let npmChart, starsChart;

/**
 * Load JSON data from file
 */
async function loadData(filename) {
  try {
    const response = await fetch(`${CONFIG.dataPath}/${filename}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return [];
  }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Calculate percentage change
 */
function calculateChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous * 100).toFixed(1);
}

/**
 * Update metric card with change indicator
 */
function updateMetricCard(valueId, changeId, value, previousValue) {
  document.getElementById(valueId).textContent = formatNumber(value);
  
  if (previousValue !== undefined) {
    const change = calculateChange(value, previousValue);
    if (change !== null) {
      const changeEl = document.getElementById(changeId);
      const changeNum = parseFloat(change);
      changeEl.textContent = `${changeNum > 0 ? '+' : ''}${change}%`;
      changeEl.className = 'metric-change ' + (changeNum >= 0 ? 'positive' : 'negative');
    }
  }
}

/**
 * Create npm downloads chart
 */
function createNpmChart(data) {
  const ctx = document.getElementById('npmChart');
  
  // Get last 30 days
  const last30 = data.slice(-30);
  const labels = last30.map(d => new Date(d.timestamp).toLocaleDateString());
  const downloads = last30.map(d => d.weeklyDownloads);

  if (npmChart) npmChart.destroy();
  
  npmChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weekly Downloads',
        data: downloads,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

/**
 * Create GitHub stars chart
 */
function createStarsChart(data) {
  const ctx = document.getElementById('starsChart');
  
  // Get last 30 days
  const last30 = data.slice(-30);
  const labels = last30.map(d => new Date(d.timestamp).toLocaleDateString());
  const stars = last30.map(d => d.stars);

  if (starsChart) starsChart.destroy();
  
  starsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Stars',
        data: stars,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

/**
 * Update repository status section
 */
function updateRepoStatus(data) {
  const statusEl = document.getElementById('repoStatus');
  const latest = data[data.length - 1];
  
  statusEl.innerHTML = `
    <li><strong>Open Issues:</strong> ${latest.openIssues}</li>
    <li><strong>Open PRs:</strong> ${latest.openPRs}</li>
    <li><strong>Watchers:</strong> ${formatNumber(latest.watchers)}</li>
    <li><strong>Primary Language:</strong> ${latest.language || 'N/A'}</li>
    ${latest.traffic ? `<li><strong>Views (14d):</strong> ${formatNumber(latest.traffic.views)}</li>` : ''}
  `;
}

/**
 * Update top contributors section
 */
function updateTopContributors(data) {
  const contributorsEl = document.getElementById('topContributors');
  const latest = data[data.length - 1];
  
  if (!latest.topContributors || latest.topContributors.length === 0) {
    contributorsEl.innerHTML = '<li>No data available</li>';
    return;
  }
  
  contributorsEl.innerHTML = latest.topContributors.slice(0, 5).map((c, i) =>
    `<li><strong>${i + 1}. @${c.login}</strong> - ${c.contributions} contributions</li>`
  ).join('');
}

/**
 * Main dashboard update function
 */
async function updateDashboard() {
  try {
    console.log('Loading dashboard data...');
    
    // Load both datasets
    const [npmData, githubData] = await Promise.all([
      loadData('npm-metrics.json'),
      loadData('github-metrics.json')
    ]);

    if (npmData.length === 0 || githubData.length === 0) {
      console.error('No data available');
      document.getElementById('lastUpdated').textContent = 'No data available';
      return;
    }

    // Get current and previous data
    const currentNpm = npmData[npmData.length - 1];
    const previousNpm = npmData.length > 7 ? npmData[npmData.length - 8] : null;
    
    const currentGithub = githubData[githubData.length - 1];
    const previousGithub = githubData.length > 7 ? githubData[githubData.length - 8] : null;

    // Update metric cards
    updateMetricCard('npmWeekly', 'npmChange', currentNpm.weeklyDownloads, previousNpm?.weeklyDownloads);
    updateMetricCard('githubStars', 'starsChange', currentGithub.stars, previousGithub?.stars);
    updateMetricCard('githubForks', 'forksChange', currentGithub.forks, previousGithub?.forks);
    updateMetricCard('contributors', 'contributorsChange', currentGithub.contributors, previousGithub?.contributors);

    // Create/update charts
    createNpmChart(npmData);
    createStarsChart(githubData);

    // Update additional sections
    updateRepoStatus(githubData);
    updateTopContributors(githubData);

    // Update last updated timestamp
    const lastUpdate = new Date(currentGithub.timestamp);
    document.getElementById('lastUpdated').textContent = lastUpdate.toLocaleString();

    console.log('Dashboard updated successfully');
  } catch (error) {
    console.error('Error updating dashboard:', error);
    document.getElementById('lastUpdated').textContent = 'Error loading data';
  }
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  
  // Auto-refresh periodically
  setInterval(updateDashboard, CONFIG.refreshInterval);
});
