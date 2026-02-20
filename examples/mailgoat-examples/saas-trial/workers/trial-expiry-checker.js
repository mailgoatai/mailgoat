const { trialExpiring, trialExpired } = require('../app/email');

const users = [
  { email: 'trial-3days@example.com', daysLeft: 3 },
  { email: 'trial-expired@example.com', daysLeft: 0 },
];

for (const user of users) {
  const payload = user.daysLeft <= 0 ? trialExpired(user) : trialExpiring(user);
  console.log(JSON.stringify(payload));
}
