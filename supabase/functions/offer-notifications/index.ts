import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const validToken = (token: unknown): token is string => typeof token === 'string' &&
  token.length <= 180 && /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(token);
const validId = (id: unknown): id is string => typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply({ error: 'Använd POST.' }, 405);
  const text = await req.text();
  if (text.length > 4096) return reply({ error: 'För stor förfrågan.' }, 413);
  let input;
  try { input = JSON.parse(text); } catch { return reply({ error: 'Ogiltig förfrågan.' }, 400); }
  if (!input || typeof input !== 'object') return reply({ error: 'Ogiltig förfrågan.' }, 400);
  const url = Deno.env.get('SUPABASE_URL')!;
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    if (['subscription_status', 'subscribe', 'unsubscribe'].includes(input.action)) {
      if (!validToken(input.token)) return reply({ error: 'Ogiltig notisregistrering.' }, 400);
      if (input.action === 'subscription_status') {
        const { data, error } = await db.from('offer_subscriptions').select('enabled')
          .eq('push_token', input.token).maybeSingle();
        if (error) throw error;
        return reply({ enabled: data?.enabled === true });
      }
      const enabled = input.action === 'subscribe';
      if (enabled && input.consent_version !== 'offers-v1') return reply({ error: 'Godkännande saknas.' }, 400);
      const now = new Date().toISOString();
      const { error } = await db.from('offer_subscriptions').upsert({
        push_token: input.token, enabled, consent_version: 'offers-v1',
        ...(enabled ? { consent_at: now } : {}), updated_at: now,
      });
      if (error) throw error;
      return reply({ enabled });
    }
    if (!['audience', 'send', 'campaign_status'].includes(input.action)) {
      return reply({ error: 'Okänd åtgärd.' }, 400);
    }
    // Never trust the client-side admin flag or the publishable API key.
    const bearer = req.headers.get('Authorization') || '';
    const jwt = bearer.startsWith('Bearer ') ? bearer.slice(7) : '';
    if (!jwt || jwt.startsWith('sb_')) return reply({ error: 'Logga in som ägare.' }, 401);
    const caller = createClient(url, publicKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: authError } = await caller.auth.getUser(jwt);
    if (authError || !userData.user) return reply({ error: 'Logga in som ägare.' }, 401);
    const { data: isOwner, error: ownerError } = await caller.rpc('is_restaurant_admin');
    if (ownerError || isOwner !== true) return reply({ error: 'Ägarbehörighet krävs.' }, 403);
    if (input.action === 'campaign_status') {
      if (!validId(input.id)) return reply({ error: 'Ogiltigt utskick.' }, 400);
      const { data, error } = await db.from('offer_campaigns')
        .select('id,status,accepted,failed,uncertain,created_at').eq('id', input.id).maybeSingle();
      if (error) throw error;
      return reply({ campaign: data });
    }
    const expoHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const pushAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (pushAccessToken) expoHeaders.Authorization = `Bearer ${pushAccessToken}`;
    if (input.action === 'audience') {
      // Check older accepted tickets on admin refresh. A ticket is acceptance
      // by Expo, not delivery to a phone. Uninstalled devices leave the audience.
      const { data: tickets, error: ticketError } = await db.from('offer_push_tickets')
        .select('id,push_token').eq('checked', false)
        .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()).limit(1000);
      if (ticketError) throw ticketError;
      if (tickets?.length) {
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
            method: 'POST', headers: expoHeaders, body: JSON.stringify({ ids: tickets.map(t => t.id) }),
            signal: AbortSignal.timeout(10000),
          });
          if (response.ok) {
            const result = await response.json();
            const checked: string[] = [];
            for (const ticket of tickets) {
              const receipt = result.data?.[ticket.id];
              if (!receipt) continue;
              checked.push(ticket.id);
              if (receipt.details?.error === 'DeviceNotRegistered') {
                await db.from('offer_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() })
                  .eq('push_token', ticket.push_token);
              }
            }
            if (checked.length) await db.from('offer_push_tickets').update({ checked: true }).in('id', checked);
          }
        } catch { /* Receipt lookup may be retried; it never sends notifications. */ }
      }
      const { count, error } = await db.from('offer_subscriptions').select('*', { count: 'exact', head: true }).eq('enabled', true);
      if (error) throw error;
      return reply({ count: count || 0 });
    }
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (!validId(input.id) || !title || title.length > 80 || !body || body.length > 500) {
      return reply({ error: 'Skriv en rubrik (högst 80 tecken) och erbjudande (högst 500 tecken).' }, 400);
    }
    const { data: claimed, error: claimError } = await db.rpc('claim_offer_campaign', {
      p_id: input.id, p_owner: userData.user.id, p_title: title, p_body: body,
    });
    if (claimError) {
      if (claimError.message?.includes('OFFER_COOLDOWN')) return reply({ error: 'Vänta fem minuter mellan utskicken.' }, 429);
      throw claimError;
    }
    if (!claimed) {
      const { data, error } = await db.from('offer_campaigns')
        .select('id,status,accepted,failed,uncertain,title,body').eq('id', input.id).single();
      if (error) throw error;
      if (data.title !== title || data.body !== body) return reply({ error: 'Utskicket har redan registrerats med annan text.' }, 409);
      return reply({ campaign: { id: data.id, status: data.status, accepted: data.accepted, failed: data.failed, uncertain: data.uncertain }, duplicate: true });
    }
    let accepted = 0, failed = 0, uncertain = 0, cursor = '';
    const deadline = Date.now() + 100000;
    try {
      while (Date.now() < deadline) {
        let query = db.from('offer_subscriptions').select('push_token').eq('enabled', true).order('push_token').limit(100);
        if (cursor) query = query.gt('push_token', cursor);
        const { data: audience, error } = await query;
        if (error) throw error;
        if (!audience?.length) break;
        cursor = audience[audience.length - 1].push_token;
        // Recheck consent just before dispatch, including cancellations during a send.
        const { data: batch, error: consentError } = await db.from('offer_subscriptions')
          .select('push_token').in('push_token', audience.map(item => item.push_token)).eq('enabled', true);
        if (consentError) throw consentError;
        if (!batch?.length) continue;
        // Persist uncertainty before calling Expo. Never automatically resend a
        // batch after a timeout: the provider may already have accepted it.
        uncertain += batch.length;
        const { error: persistError } = await db.from('offer_campaigns').update({ accepted, failed, uncertain }).eq('id', input.id);
        if (persistError) throw persistError;
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST', headers: expoHeaders, signal: AbortSignal.timeout(15000),
          body: JSON.stringify(batch.map(item => ({
            to: item.push_token, title, body, sound: 'default', channelId: 'offers',
            data: { type: 'offer', campaignId: input.id }, ttl: 86400,
          }))),
        });
        if (!response.ok) throw new Error('Expo response failed');
        const result = await response.json();
        if (!Array.isArray(result.data) || result.data.length !== batch.length) throw new Error('Invalid Expo response');
        uncertain -= batch.length;
        const tickets = [];
        for (let i = 0; i < batch.length; i++) {
          const ticket = result.data[i];
          if (ticket.status === 'ok' && typeof ticket.id === 'string') {
            accepted++;
            tickets.push({ id: ticket.id, campaign_id: input.id, push_token: batch[i].push_token });
          } else {
            failed++;
            if (ticket.details?.error === 'DeviceNotRegistered') {
              await db.from('offer_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() })
                .eq('push_token', batch[i].push_token);
            }
          }
        }
        if (tickets.length) {
          const { error: saveError } = await db.from('offer_push_tickets').insert(tickets);
          if (saveError) throw saveError;
        }
        const { error: progressError } = await db.from('offer_campaigns').update({ accepted, failed, uncertain }).eq('id', input.id);
        if (progressError) throw progressError;
        // At most 200 notifications/second from this sender (Expo permits 600).
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      const status = Date.now() >= deadline || failed || uncertain ? 'partial' : 'completed';
      const { error } = await db.from('offer_campaigns').update({ status, accepted, failed, uncertain, completed_at: new Date().toISOString() }).eq('id', input.id);
      if (error) throw error;
      return reply({ campaign: { id: input.id, status, accepted, failed, uncertain } });
    } catch {
      await db.from('offer_campaigns').update({ status: 'partial', accepted, failed, uncertain, completed_at: new Date().toISOString() }).eq('id', input.id);
      return reply({ campaign: { id: input.id, status: 'partial', accepted, failed, uncertain }, error: 'Utskicket kunde inte slutföras. Kontrollera status innan du skapar ett nytt.' });
    }
  } catch {
    // Do not return database errors, tokens, credentials or request bodies.
    return reply({ error: 'Erbjudanden kunde inte hanteras just nu.' }, 503);
  }
}

Deno.serve(handle);
