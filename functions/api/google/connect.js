import { REDIRECT_URI, SCOPES, cookie, seal } from '../../_lib/google.js';

export async function onRequestGet({env}) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return new Response('Google OAuth is not configured.', {status:500});
  const state = crypto.randomUUID();
  const sealedState = await seal(state, env.GOOGLE_CLIENT_SECRET);
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  });
  return new Response(null, {status:302, headers:{
    Location:`https://accounts.google.com/o/oauth2/v2/auth?${p}`,
    'Set-Cookie':cookie('solveire_google_state', sealedState, 600)
  }});
}
