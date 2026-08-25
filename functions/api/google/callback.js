import { REDIRECT_URI, cookie, readCookie, seal, unseal } from '../../_lib/google.js';

export async function onRequestGet({env, request}) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  if (err) return Response.redirect(`https://afspraken.solveire.nl/?google=error&reason=${encodeURIComponent(err)}`,302);
  const sealedState = readCookie(request, 'solveire_google_state');
  const expected = sealedState ? await unseal(sealedState, env.GOOGLE_CLIENT_SECRET) : null;
  if (!code || !state || !expected || state !== expected) return new Response('Ongeldige Google-koppeling. Probeer opnieuw.', {status:400});
  const body = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,code,grant_type:'authorization_code',redirect_uri:REDIRECT_URI});
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const data = await r.json();
  if (!r.ok || !data.refresh_token) return new Response('Google gaf geen permanente agenda-toegang. Probeer opnieuw te koppelen.', {status:400});
  const sealedRefresh = await seal(data.refresh_token, env.GOOGLE_CLIENT_SECRET);
  return new Response(null,{status:302,headers:{
    Location:'https://afspraken.solveire.nl/?google=connected',
    'Set-Cookie':cookie('solveire_google_refresh',sealedRefresh)
  }});
}
