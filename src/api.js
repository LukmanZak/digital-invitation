// Supabase lewat REST (PostgREST RPC) tanpa SDK. Hanya anon key di browser; tabel tidak bisa dibaca langsung.
const URL_ = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const enabled = Boolean(URL_ && KEY);

async function rpc(fn, args = {}) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    let msg = 'Gagal terhubung, coba lagi ya';
    try { const e = await res.json(); if (e && e.message) msg = e.message; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const getGuest = (code) => rpc('get_guest', { p_code: code });
export const submitRsvp = (code, attending, guests) => rpc('submit_rsvp', { p_code: code, p_attending: attending, p_guests: guests });
export const submitWish = (code, message) => rpc('submit_wish', { p_code: code, p_message: message });
export const listWishes = (limit = 30, before = null) => rpc('list_wishes', { p_limit: limit, p_before: before });
export const wishCount = () => rpc('wish_count');
