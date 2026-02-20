function trialStart(user) {
  return { to: [user.email], subject: 'Your trial has started', html_body: `<p>Welcome ${user.name}</p>` };
}
function trialExpiring(user) {
  return { to: [user.email], subject: '3 days left in your trial', html_body: '<p>Upgrade now</p>' };
}
function trialExpired(user) {
  return { to: [user.email], subject: 'Your trial has expired', html_body: '<p>Stay with us</p>' };
}
module.exports = { trialStart, trialExpiring, trialExpired };
