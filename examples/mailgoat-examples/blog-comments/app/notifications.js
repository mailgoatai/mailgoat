function newComment({ authorEmail, commenter, postTitle }) {
  return { to: [authorEmail], subject: `New comment on ${postTitle}`, html_body: `<p>${commenter} commented</p>` };
}
function commentReply({ commenterEmail, replier, postTitle }) {
  return { to: [commenterEmail], subject: `New reply on ${postTitle}`, html_body: `<p>${replier} replied</p>` };
}
function commentApproved({ commenterEmail, postTitle }) {
  return { to: [commenterEmail], subject: `Comment approved on ${postTitle}`, html_body: '<p>Your comment is now visible.</p>' };
}
module.exports = { newComment, commentReply, commentApproved };
