const http = require('http');
const { orderConfirmation, shippingUpdate, receipt } = require('./lib/email');

http
  .createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200);
      res.end('ok');
      return;
    }
    if (req.url === '/demo') {
      const order = { email: 'buyer@example.com', orderId: 'ORD-1001', total: '$40', trackingNumber: 'TRK123' };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify([orderConfirmation(order), shippingUpdate(order), receipt(order)]));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  })
  .listen(3002);
