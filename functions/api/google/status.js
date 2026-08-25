import { json, refreshAccessToken } from '../../_lib/google.js';

export async function onRequestGet({env, request}) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return json({connected:false,configured:false});
  const token = await refreshAccessToken(env, request);
  return json({connected:!!token,configured:true});
}
