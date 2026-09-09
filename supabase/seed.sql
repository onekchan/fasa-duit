-- Local dev seed. Runs after `supabase db reset`.
-- The auth.users row we create here matches the default local Supabase Studio
-- login shown in the CLI banner (dev@fasa.local / password). Adjust for prod.

-- Note: profiles row auto-creates via the on_auth_user_created trigger.

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@fasa.local',
  crypt('password', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
