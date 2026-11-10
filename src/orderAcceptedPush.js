export async function sendOrderAcceptedPush(order, send = fetch) {
  if (!order.push_token) return false;
  try {
    const response = await send('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: order.push_token,
        sound: 'default',
        title: 'Beställningen accepterad',
        body: 'Husman har accepterat din beställning.',
        data: { orderId: order.id, status: 'Accepterad' },
      }),
    });
    const result = await response.json();
    const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
    return response.ok && ticket?.status === 'ok';
  } catch {
    return false;
  }
}
