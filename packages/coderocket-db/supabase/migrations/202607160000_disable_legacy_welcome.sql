-- CodeRocket previously sent a welcome email from this broad auth trigger.
-- The new product owns onboarding explicitly and must not enqueue that legacy email.
drop trigger if exists on_auth_user_created on auth.users;

comment on schema public is
  'Legacy auth identities are retained. CodeRocket cloud data uses cr_* tables only.';
