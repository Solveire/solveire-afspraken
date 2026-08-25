import { json, refreshAccessToken } from '../../_lib/google.js';

export async function onRequestPost({env, request}) {
  const token = await refreshAccessToken(env, request);
  if (!token?.access_token) return json({ok:false,error:'not_connected'},401);
  let body;
  try { body = await request.json(); } catch { return json({ok:false,error:'invalid_json'},400); }
  const {title, description, location, attendee, start, end, timezone='Europe/Amsterdam'} = body || {};
  if (!title || !attendee || !start || !end) return json({ok:false,error:'missing_fields'},400);
  const event = {
    summary:title,
    description:description || '',
    location:location || '',
    start:{dateTime:start,timeZone:timezone},
    end:{dateTime:end,timeZone:timezone},
    attendees:[{email:attendee}],
    reminders:{useDefault:true}
  };
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',{
    method:'POST',
    headers:{Authorization:`Bearer ${token.access_token}`,'content-type':'application/json'},
    body:JSON.stringify(event)
  });
  const data = await r.json();
  if (!r.ok) return json({ok:false,error:'google_error',details:data},r.status);
  return json({ok:true,eventId:data.id,htmlLink:data.htmlLink});
}
