-- Odemes: send a welcome email when someone signs up (Google or Apple).
-- Run in Supabase -> SQL Editor. Replace REPLACE_WITH_WELCOME_EMAIL_SECRET first;
-- it must be byte-identical to the WELCOME_EMAIL_SECRET env var on Vercel.
--
-- Fires once per row inserted into auth.users. The HTTP call is made through pg_net,
-- which queues the request and returns immediately, so signup is never slowed down or
-- blocked by the email. Any error here is swallowed on purpose: a failed welcome email
-- must never turn into "Database error saving new user" for the person signing up.

create extension if not exists pg_net with schema extensions;

create or replace function public.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if new.email is null or new.email = '' then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://www.odemes.com/api/welcome-email',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-welcome-secret', 'Q_uUEauu2zaR2O_ypamxJdGTZ167B2NjxjeCMqx7hvI'
    ),
    body    := jsonb_build_object(
      'email',  new.email,
      -- Google sends full_name/name; Apple often sends neither, and the greeting
      -- falls back to a plain "Hi," when it's missing.
      'name',   coalesce(meta->>'full_name', meta->>'name', ''),
      'locale', coalesce(meta->>'locale', 'en')
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  raise warning 'send_welcome_email failed for %: %', new.email, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_send_welcome on auth.users;

create trigger on_auth_user_created_send_welcome
  after insert on auth.users
  for each row
  execute function public.send_welcome_email();

-- Debugging: pg_net records every response it gets.
--   select id, status_code, content, created
--   from net._http_response
--   order by created desc
--   limit 20;
-- 200 = sent. 401 = the secret here and on Vercel don't match.
-- 500 = RESEND_API_KEY or WELCOME_EMAIL_SECRET missing on Vercel.
