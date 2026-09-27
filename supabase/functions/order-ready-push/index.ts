type OrderRecord = {
  id: string | number;
  status: string | null;
  expo_push_token: string | null;
};

type OrderUpdate = {
  type: string;
  schema: string;
  table: string;
  record: OrderRecord | null;
  old_record: OrderRecord | null;
};

function equalSecrets(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let difference = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return difference === 0;
}

Deno.serve(async (request) => {
  const secret = Deno.env.get('ORDER_READY_WEBHOOK_SECRET');
  const supplied = request.headers.get('x-husman-webhook-secret') ?? '';
  if (request.method !== 'POST' || !secret || !equalSecrets(supplied, secret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let event: OrderUpdate;
  try {
    event = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const order = event.record;
  if (event.schema !== 'public' || event.table !== 'orders' ||
      event.type !== 'UPDATE' || order?.status !== 'Maten färdig' ||
      event.old_record?.status === 'Maten färdig') {
    return Response.json({ sent: false, reason: 'No ready transition' });
  }

  const token = order.expo_push_token;
  if (!token || !/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
    return Response.json({ sent: false, reason: 'No valid customer token' });
  }

  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      to: token,
      title: 'Husman Lunchrestaurang',
      body: 'Din mat är färdig!',
      sound: 'default',
      channelId: 'orders',
      data: { orderId: order.id },
    }),
  });

  const result = await response.json();
  if (!response.ok || result.data?.status !== 'ok') {
    console.error('Expo rejected ready notification', result);
    return Response.json({ sent: false, error: 'Push service rejected message' }, { status: 502 });
  }
  return Response.json({ sent: true, ticketId: result.data.id });
});
