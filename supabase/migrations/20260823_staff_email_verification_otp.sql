-- Allows the post-creation Gmail validation flow to reuse the server-owned OTP table.
-- Run in Supabase SQL Editor before using staff Gmail verification from Profile.

alter table public.email_otps
  drop constraint if exists email_otps_purpose_check;

alter table public.email_otps
  add constraint email_otps_purpose_check
  check (purpose in ('staff_creation', 'password_reset', 'email_verification'));
