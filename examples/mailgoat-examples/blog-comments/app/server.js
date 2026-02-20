const http = require('http');
const notifications = require('./notifications');
http
  .createServer((_req, res) => {
    const sample = notifications.newComment({
      authorEmail: 'author@example.com',
      commenter: 'Sam',
      postTitle: 'MailGoat Post',
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(sample));
  })
  .listen(3004);
