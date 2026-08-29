import { createClient } from '@supabase/supabase-js';
import { describeError, getBearerToken, getSupabaseUrl, sendJson } from './_utils/emailjs.js';

const BALAYAN_CENTER = { latitude: 13.9385, longitude: 120.7332 };

const getSupabaseAdmin = () => {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) throw new Error('Missing server Supabase environment variables.');

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const requireActiveVistaBalayanUser = async (req) => {
  const token = getBearerToken(req);
  if (!token) throw new Error('Missing session. Please sign in again.');

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user?.id) throw new Error('Invalid session. Please sign in again.');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.status !== 'active') throw new Error('Only active VistaBalayan users can search listing locations.');

  return profile;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: `Method ${req.method} not allowed` });
  }

  try {
    await requireActiveVistaBalayanUser(req);

    const apiKey = process.env.GEOAPIFY_API_KEY || '';
    if (!apiKey) {
      return sendJson(res, 500, { error: 'Geoapify API key is not configured on the server.' });
    }

    const query = String(req.query?.q || '').replace(/\s+/g, ' ').trim();
    if (!query) return sendJson(res, 400, { error: 'Search query is required.' });
    if (query.length > 220) return sendJson(res, 400, { error: 'Search query is too long.' });

    const url = new URL('https://api.geoapify.com/v1/geocode/search');
    url.searchParams.set('text', query);
    url.searchParams.set('filter', 'countrycode:ph');
    url.searchParams.set('bias', `proximity:${BALAYAN_CENTER.longitude},${BALAYAN_CENTER.latitude}`);
    url.searchParams.set('limit', '1');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.message || data?.error || `Geoapify returned ${response.status}`;
      throw new Error(detail);
    }

    const feature = Array.isArray(data?.features) ? data.features[0] : null;
    const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return sendJson(res, 200, { result: null });
    }

    return sendJson(res, 200, {
      result: {
        latitude,
        longitude,
        displayName: feature?.properties?.formatted || feature?.properties?.address_line1 || '',
        provider: 'Geoapify',
      },
    });
  } catch (error) {
    console.error('geoapify-search failed', error);
    return sendJson(res, 500, { error: describeError(error, 'Geoapify search failed.') });
  }
}
