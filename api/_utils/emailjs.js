import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export const requireMethod = (req, res, method = 'POST') => {
  if (req.method !== method) {
    json(res, 405, { error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
};

export const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

export const sendJson = json;

const getEnv = (name, fallbackName) => {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : '');
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
};

const safeProjectRefFromUrl = (url = '') => {
  const match = String(url).match(/^https:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] || 'unknown-project';
};

export const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

export const getSupabaseAdmin = () => {
  const url = getSupabaseUrl();
  if (!url) throw new Error('Missing server environment variable: SUPABASE_URL');

  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

export const generateOtp = () => String(crypto.randomInt(100000, 1000000));

export const hashOtp = (email, code, purpose) => {
  const secret = getEnv('OTP_HASH_SECRET');
  return crypto
    .createHash('sha256')
    .update(`${purpose}:${normalizeEmail(email)}:${String(code).trim()}:${secret}`)
    .digest('hex');
};

export const getBearerToken = (req) => {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const match = String(auth).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

export const verifyOfficerToken = async (req, supabaseAdmin) => {
  const token = getBearerToken(req);
  if (!token) throw new Error('Missing officer session. Please sign in again.');

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user?.id) {
    const serverProject = safeProjectRefFromUrl(getSupabaseUrl());
    throw new Error(
      `Invalid officer session. Check Vercel env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be from the same Supabase project as the live app (${serverProject}). Please sign out and sign in again after fixing env vars.`
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.role !== 'municipal_officer' || profile?.status !== 'active') {
    throw new Error('Only active municipal officers can send staff creation OTPs');
  }

  return userData.user;
};

export const storeOtp = async (supabaseAdmin, { email, purpose, code, metadata = {}, minutes = 10 }) => {
  const normalizedEmail = normalizeEmail(email);
  const otpHash = hashOtp(normalizedEmail, code, purpose);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const { error } = await supabaseAdmin.from('email_otps').insert({
    email: normalizedEmail,
    purpose,
    otp_hash: otpHash,
    expires_at: expiresAt,
    metadata,
  });

  if (error) throw error;
};

export const consumeOtp = async (supabaseAdmin, { email, purpose, code }) => {
  const normalizedEmail = normalizeEmail(email);
  const otpHash = hashOtp(normalizedEmail, code, purpose);
  const now = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('email_otps')
    .select('id, attempts, expires_at, metadata')
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .eq('otp_hash', otpHash)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error('Invalid or expired OTP');

  await supabaseAdmin
    .from('email_otps')
    .update({ consumed_at: now, attempts: Number(row.attempts || 0) + 1 })
    .eq('id', row.id);

  return row;
};

export const findAuthUserByEmail = async (supabaseAdmin, email) => {
  const normalizedEmail = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data?.users?.find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
    if (user) return user;
    if (!data?.users || data.users.length < 100) break;
  }

  return null;
};

export const sendOtpEmail = async ({ to, code, purpose }) => {
  const serviceId = getEnv('EMAILJS_SERVICE_ID');
  const templateId = getEnv('EMAILJS_TEMPLATE_ID');
  const publicKey = getEnv('EMAILJS_PUBLIC_KEY');
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN || '';
  const fromName = process.env.EMAILJS_FROM_NAME || 'VistaBalayan';

  const isReset = purpose === 'password_reset';
  const message = isReset
    ? 'Use this 6-digit code to reset your VistaBalayan account password.'
    : 'Use this 6-digit code to verify and create the VistaBalayan staff account.';

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      ...(privateKey ? { accessToken: privateKey } : {}),
      template_params: {
        to_email: to,
        email: to,
        name: fromName,
        time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        message,
        otp_code: code,
        code,
        expires_in: '10 minutes',
        purpose: isReset ? 'Password Reset' : 'Staff Account Verification',
        subject: `${code} is your VistaBalayan ${isReset ? 'password reset' : 'verification'} code`,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`EmailJS failed to send OTP${detail ? `: ${detail}` : ''}`);
  }
};
