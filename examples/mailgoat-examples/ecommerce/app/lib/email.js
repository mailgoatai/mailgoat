function orderConfirmation(order) {
  return {
    to: [order.email],
    subject: `Order confirmed: ${order.orderId}`,
    html_body: `<h1>Thanks for your order</h1><p>Total: ${order.total}</p>`,
  };
}

function shippingUpdate(order) {
  return {
    to: [order.email],
    subject: `Shipping update: ${order.orderId}`,
    html_body: `<p>Tracking: ${order.trackingNumber}</p>`,
  };
}

function receipt(order) {
  return {
    to: [order.email],
    subject: `Receipt: ${order.orderId}`,
    html_body: `<p>Delivered. Please review your purchase.</p>`,
  };
}

module.exports = { orderConfirmation, shippingUpdate, receipt };
