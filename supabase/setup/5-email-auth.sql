-- Part 5 of 5: Update.
-- Paste this whole file into Supabase → SQL Editor → Run, then do the next part.

-- Email + password sign-in: keep the user's email on their profile.
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email, wallet_cents) values (new.id, new.phone, new.email, 2500);
  insert into public.payments (user_id, kind, method, amount_cents, status) values (new.id, 'bonus', 'wallet', 2500, 'succeeded');
  perform public.notify_user(new.id, 'promo', 'Welcome to LoneStar Tasks 🇱🇷 Get $5 off your first task with code LIB5');
  return new;
end $$;
revoke execute on function public.handle_new_user from public, anon, authenticated;
