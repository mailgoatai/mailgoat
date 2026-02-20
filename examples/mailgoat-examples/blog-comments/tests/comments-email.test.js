const test = require('node:test');
const assert = require('node:assert/strict');
const { newComment, commentReply, commentApproved } = require('../app/notifications');

test('new comment payload', () => {
  assert.match(newComment({ authorEmail: 'a@b.com', commenter: 'x', postTitle: 'P' }).subject, /New comment/);
});

test('reply payload', () => {
  assert.match(commentReply({ commenterEmail: 'a@b.com', replier: 'y', postTitle: 'P' }).subject, /reply/i);
});

test('approval payload', () => {
  assert.match(commentApproved({ commenterEmail: 'a@b.com', postTitle: 'P' }).subject, /approved/i);
});
