const test = require('node:test');
const assert = require('node:assert/strict');
const { orderConfirmation, shippingUpdate, receipt } = require('../lib/email');

const sample = { email: 'a@b.com', orderId: 'ORD-1', total: '$10', trackingNumber: 'TRK' };

test('order confirmation includes order id', () => {
  assert.match(orderConfirmation(sample).subject, /ORD-1/);
});

test('shipping update includes tracking number', () => {
  assert.match(shippingUpdate(sample).html_body, /TRK/);
});

test('receipt includes review prompt', () => {
  assert.match(receipt(sample).html_body, /review/i);
});
