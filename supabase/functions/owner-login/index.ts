import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
const fail = () => reply(401, { error: 'Inloggningen misslyckades.' });
const options = { auth: { persistSession: false, autoRefreshToken: false } };

export async function handleOwnerLogin(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    // Never ship the private code to the app, GitHub, logs or responses.
    const configuredEmail = Deno.env.get('OWNER_LOGIN_EMAIL')?.trim().toLowerCase();
    const configuredCode = Deno.env.get('OWNER_LOGIN_CODE');
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!configuredEmail || !configuredCode || !/^\d{4,12}$/.test(configuredCode)
      || !url || !serviceKey || !anonKey) return reply(503, { error: 'Inloggningen är inte konfigurerad.' });
    const raw = await req.text();
    if (raw.length > 2048) return fail();
    const body = JSON.parse(raw);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body?.code === 'string' ? body.code : '';
    if (email !== configuredEmail) return fail();
    const server = createClient(url, serviceKey, options);
    const { data: allowed, error: limitError } = await server.rpc('owner_login_attempt_v1', { p_email: configuredEmail });
    if (limitError) return reply(503, { error: 'Inloggningen kan inte bekräftas.' });
    if (allowed !== true) return reply(429, { error: 'Vänta 15 minuter innan nästa försök.' });
    // Compare fixed-size digests instead of exiting at the first differing digit.
    const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
    const expected = await digest(configuredCode);
    const actual = await digest(code);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ actual[i];
    if (difference !== 0) return fail();
    const { data: accountExists, error: accountError } = await server.rpc('owner_login_account_v1', { p_email: configuredEmail });
    if (accountError || accountExists !== true) return fail();
    // The address is fixed in server configuration. generateLink does not email
    // the user; consume its token on the server to issue a real Auth session.
    const { data: link, error: linkError } = await server.auth.admin.generateLink({ type: 'magiclink', email: configuredEmail });
    if (linkError || !link?.properties?.hashed_token || !link?.user?.email_confirmed_at) return fail();
    const authClient = createClient(url, anonKey, options);
    const { data, error } = await authClient.auth.verifyOtp({ type: 'email', token_hash: link.properties.hashed_token });
    if (error || !data?.session || data.user?.id !== link.user.id) return fail();
    const { data: isOwner, error: ownerError } = await authClient.rpc('is_restaurant_admin');
    if (ownerError || isOwner !== true) {
      await authClient.auth.signOut();
      return fail();
    }
    return reply(200, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return fail();
  }
}

Deno.serve(handleOwnerLogin);
