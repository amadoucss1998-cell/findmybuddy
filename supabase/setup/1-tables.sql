-- Part 1 of 5: Tables and row-level security.
-- Paste this whole file into Supabase → SQL Editor → Run, then do the next part.

-- LoneStar Tasks — Supabase schema, row-level security and RPC functions.
-- Money is stored in US cents. Anything that moves money runs in SECURITY DEFINER
-- functions so the client can never set prices, balances or statuses directly.

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key   text primary key,
  value text not null
);
-- demo: seeded Taskers auto-reply in chat and clients can simulate booking progress.
-- payments_mode: 'sandbox' marks mobile-money payments as paid instantly; 'live' requires
-- an Edge Function integration with Orange Money / MTN MoMo (not included yet).
insert into public.app_settings (key, value) values ('demo', 'true'), ('payments_mode', 'sandbox'), ('fee_rate', '0.07');

create or replace function public.setting(p_key text) returns text
language sql stable security definer set search_path = public as $$
  select value from public.app_settings where key = p_key
$$;

-- ---------------------------------------------------------------------------
-- Catalog (public read)
-- ---------------------------------------------------------------------------
create table public.categories (
  id          text primary key,
  name        text not null,
  icon        text not null,
  color       text not null,
  from_cents  integer not null,
  description text not null,
  sort        integer not null
);

create table public.taskers (
  id            text primary key,
  user_id       uuid unique references auth.users(id) on delete set null,
  name          text not null,
  first         text not null,
  gradient      jsonb not null,
  rating        numeric(2,1) not null default 5.0,
  jobs          integer not null default 0,
  premium_cents integer not null default 0,
  area          text not null,
  distance_km   numeric(4,1) not null default 1.0,
  elite         boolean not null default false,
  verified      boolean not null default false,
  response_mins integer not null default 15,
  bio           text not null default '',
  languages     jsonb not null default '[]',
  vehicle       text,
  online        boolean not null default true
);

create table public.tasker_skills (
  tasker_id   text not null references public.taskers(id) on delete cascade,
  category_id text not null references public.categories(id),
  position    integer not null default 0,
  primary key (tasker_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text,
  name          text not null default '',
  area          text not null default 'Sinkor',
  role          text not null default 'client' check (role in ('client', 'tasker')),
  wallet_cents  integer not null default 0 check (wallet_cents >= 0),
  tasker_online boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tasker_id  text not null references public.taskers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tasker_id)
);

-- ---------------------------------------------------------------------------
-- Bookings & money
-- ---------------------------------------------------------------------------
create table public.promo_codes (
  code           text primary key,
  discount_cents integer not null,
  active         boolean not null default true
);

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  tasker_id      text not null references public.taskers(id),
  category_id    text not null references public.categories(id),
  area           text not null,
  address        text not null,
  details        text not null,
  size           text not null check (size in ('small', 'medium', 'large')),
  hours          numeric(4,1) not null,
  date_label     text not null,
  slot           text not null,
  rate_cents     integer not null,
  fee_cents      integer not null,
  discount_cents integer not null default 0,
  credit_cents   integer not null default 0,
  total_cents    integer not null,
  promo_code     text references public.promo_codes(code),
  payment_method text not null check (payment_method in ('orange', 'mtn', 'card', 'cash')),
  payment_status text not null default 'pending',
  status         text not null default 'confirmed'
                 check (status in ('confirmed', 'on_the_way', 'in_progress', 'completed', 'cancelled')),
  rating         integer check (rating between 1 and 5),
  review         text,
  tip_cents      integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index bookings_client_idx on public.bookings (client_id, created_at desc);

create table public.promo_redemptions (
  code       text not null references public.promo_codes(code),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  primary key (code, user_id)
);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references public.bookings(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('booking', 'topup', 'tip', 'payout', 'bonus')),
  method        text not null,
  amount_cents  integer not null,
  status        text not null check (status in ('pending', 'succeeded', 'failed', 'due', 'refunded')),
  provider_ref  text,
  created_at    timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  tasker_id   text not null references public.taskers(id) on delete cascade,
  booking_id  uuid unique references public.bookings(id) on delete set null,
  author_name text not null,
  rating      integer not null check (rating between 1 and 5),
  body        text not null,
  category_id text references public.categories(id),
  created_at  timestamptz not null default now()
);
create index reviews_tasker_idx on public.reviews (tasker_id, created_at desc);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  tasker_id  text not null references public.taskers(id) on delete cascade,
  sender     text not null check (sender in ('client', 'tasker')),
  body       text not null check (char_length(body) between 1 and 1000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (client_id, tasker_id, created_at);

create table public.job_requests (
  id           uuid primary key default gen_random_uuid(),
  tasker_user  uuid not null references public.profiles(id) on delete cascade,
  client_name  text not null,
  category_id  text not null references public.categories(id),
  area         text not null,
  when_label   text not null,
  pay_cents    integer not null,
  distance_km  numeric(4,1) not null,
  status       text not null default 'open' check (status in ('open', 'accepted', 'declined', 'completed')),
  accepted_at  timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index job_requests_user_idx on public.job_requests (tasker_user, status);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.categories enable row level security;
alter table public.taskers enable row level security;
alter table public.tasker_skills enable row level security;
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;
alter table public.promo_codes enable row level security;
alter table public.bookings enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.job_requests enable row level security;

create policy "catalog is public" on public.categories for select using (true);
create policy "taskers are public" on public.taskers for select using (true);
create policy "skills are public" on public.tasker_skills for select using (true);
create policy "reviews are public" on public.reviews for select using (true);

create policy "own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "mark own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own favorites" on public.favorites for select using (user_id = auth.uid());
create policy "add favorite" on public.favorites for insert with check (user_id = auth.uid());
create policy "remove favorite" on public.favorites for delete using (user_id = auth.uid());

create policy "own bookings" on public.bookings for select using (client_id = auth.uid());
create policy "own payments" on public.payments for select using (user_id = auth.uid());
create policy "own jobs" on public.job_requests for select using (tasker_user = auth.uid());

create policy "own messages" on public.messages for select using (client_id = auth.uid());
create policy "send as client" on public.messages for insert
  with check (client_id = auth.uid() and sender = 'client' and read_at is null);
create policy "mark own messages read" on public.messages for update using (client_id = auth.uid()) with check (client_id = auth.uid());

-- Column-level guards: clients may only touch harmless columns directly.
revoke update on public.profiles from anon, authenticated;
grant update (name, area, role, tasker_online) on public.profiles to authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;
revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;
revoke insert on public.messages from anon;
grant insert (client_id, tasker_id, sender, body) on public.messages to authenticated;
