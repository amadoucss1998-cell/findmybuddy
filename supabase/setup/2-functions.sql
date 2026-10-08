-- Part 2 of 4: Functions, triggers and realtime.
-- Paste this whole file into Supabase → SQL Editor → Run, then do the next part.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(p_user uuid, p_kind text, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, body) values (p_user, p_kind, p_body);
$$;

create or replace function public.require_uid() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  return auth.uid();
end $$;

create or replace function public.size_hours(p_size text) returns numeric
language sql immutable as $$
  select case p_size when 'small' then 1 when 'medium' then 2.5 when 'large' then 4 end
$$;

-- Sandbox stand-in for a payment provider: cash is owed to the Tasker, everything
-- else succeeds instantly. In 'live' mode payments stay 'pending' until a provider
-- webhook (Edge Function) confirms them.
create or replace function public.payment_status_for(p_method text, p_amount integer) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p_method = 'cash' then 'due'
    when p_amount = 0 then 'succeeded'
    when public.setting('payments_mode') = 'sandbox' then 'succeeded'
    else 'pending' end
$$;

-- ---------------------------------------------------------------------------
-- New users: profile + $25 welcome credit
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, wallet_cents) values (new.id, new.phone, 2500);
  insert into public.payments (user_id, kind, method, amount_cents, status) values (new.id, 'bonus', 'wallet', 2500, 'succeeded');
  perform public.notify_user(new.id, 'promo', 'Welcome to LoneStar Tasks 🇱🇷 Get $5 off your first task with code LIB5');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Pricing & booking
-- ---------------------------------------------------------------------------
create or replace function public.quote_booking(
  p_tasker text, p_category text, p_size text, p_promo text default null, p_use_wallet boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := public.require_uid();
  v_rate integer; v_hours numeric; v_sub integer; v_fee integer;
  v_discount integer := 0; v_credit integer := 0; v_total integer;
  v_wallet integer; v_code text := upper(trim(p_promo)); v_promo jsonb := null; v_p public.promo_codes;
begin
  select c.from_cents + t.premium_cents into v_rate
  from public.taskers t
  join public.tasker_skills s on s.tasker_id = t.id and s.category_id = p_category
  join public.categories c on c.id = p_category
  where t.id = p_tasker;
  if v_rate is null then raise exception 'This Tasker does not offer that service' using errcode = 'P0001'; end if;
  v_hours := public.size_hours(p_size);
  if v_hours is null then raise exception 'Invalid task size' using errcode = 'P0001'; end if;
  v_sub := round(v_rate * v_hours);
  v_fee := round(v_sub * public.setting('fee_rate')::numeric);

  if v_code is not null and v_code <> '' then
    select * into v_p from public.promo_codes where code = v_code and active;
    if not found then
      v_promo := jsonb_build_object('code', v_code, 'valid', false, 'reason', 'Invalid promo code');
    elsif exists (select 1 from public.promo_redemptions where code = v_code and user_id = v_uid) then
      v_promo := jsonb_build_object('code', v_code, 'valid', false, 'reason', 'You''ve already used this code');
    else
      v_discount := least(v_p.discount_cents, v_sub + v_fee);
      v_promo := jsonb_build_object('code', v_code, 'valid', true);
    end if;
  end if;

  if p_use_wallet then
    select wallet_cents into v_wallet from public.profiles where id = v_uid;
    v_credit := least(coalesce(v_wallet, 0), v_sub + v_fee - v_discount);
  end if;
  v_total := greatest(0, v_sub + v_fee - v_discount - v_credit);

  return jsonb_build_object(
    'rate_cents', v_rate, 'hours', v_hours, 'subtotal_cents', v_sub, 'fee_cents', v_fee,
    'discount_cents', v_discount, 'credit_cents', v_credit, 'total_cents', v_total, 'promo', v_promo
  );
end $$;

create or replace function public.create_booking(
  p_tasker text, p_category text, p_size text, p_area text, p_address text, p_details text,
  p_date text, p_slot text, p_payment_method text, p_promo text default null, p_use_wallet boolean default false
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_uid();
  q jsonb; v_b public.bookings; v_status text; v_tasker public.taskers; v_cat text;
begin
  if p_payment_method not in ('orange', 'mtn', 'card', 'cash') then raise exception 'Unsupported payment method' using errcode = 'P0001'; end if;
  if char_length(trim(p_address)) < 3 then raise exception 'Please add an address or landmark' using errcode = 'P0001'; end if;
  if char_length(trim(p_details)) < 6 then raise exception 'Please describe your task' using errcode = 'P0001'; end if;

  q := public.quote_booking(p_tasker, p_category, p_size, p_promo, p_use_wallet);
  if q->'promo' is not null and q->'promo' <> 'null'::jsonb and not (q->'promo'->>'valid')::boolean then
    raise exception '%', q->'promo'->>'reason' using errcode = 'P0001';
  end if;

  v_status := public.payment_status_for(p_payment_method, (q->>'total_cents')::int);

  if (q->>'credit_cents')::int > 0 then
    update public.profiles set wallet_cents = wallet_cents - (q->>'credit_cents')::int
      where id = v_uid and wallet_cents >= (q->>'credit_cents')::int;
    if not found then raise exception 'Wallet balance changed — please try again' using errcode = 'P0001'; end if;
  end if;

  insert into public.bookings (client_id, tasker_id, category_id, area, address, details, size, hours, date_label, slot,
    rate_cents, fee_cents, discount_cents, credit_cents, total_cents, promo_code, payment_method, payment_status)
  values (v_uid, p_tasker, p_category, p_area, trim(p_address), trim(p_details), p_size, (q->>'hours')::numeric, p_date, p_slot,
    (q->>'rate_cents')::int, (q->>'fee_cents')::int, (q->>'discount_cents')::int, (q->>'credit_cents')::int,
    (q->>'total_cents')::int,
    case when (q->'promo'->>'valid')::boolean then q->'promo'->>'code' end,
    p_payment_method, v_status)
  returning * into v_b;

  if v_b.credit_cents > 0 then
    insert into public.payments (booking_id, user_id, kind, method, amount_cents, status)
    values (v_b.id, v_uid, 'booking', 'wallet', v_b.credit_cents, 'succeeded');
  end if;
  insert into public.payments (booking_id, user_id, kind, method, amount_cents, status, provider_ref)
  values (v_b.id, v_uid, 'booking', p_payment_method, v_b.total_cents, v_status,
          case when v_status = 'succeeded' and v_b.total_cents > 0 then 'sbx_' || substr(md5(v_b.id::text), 1, 12) end);
  if v_b.promo_code is not null then
    insert into public.promo_redemptions (code, user_id, booking_id) values (v_b.promo_code, v_uid, v_b.id);
  end if;

  select * into v_tasker from public.taskers where id = p_tasker;
  select name into v_cat from public.categories where id = p_category;
  perform public.notify_user(v_uid, 'booking', 'Booking confirmed with ' || v_tasker.name);
  insert into public.messages (client_id, tasker_id, sender, body)
  values (v_uid, p_tasker, 'client', 'Hi ' || v_tasker.first || '! I just booked you for ' || v_cat || '. ' || trim(p_details));
  return v_b;
end $$;

create or replace function public.cancel_booking(p_id uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.require_uid(); v_b public.bookings; v_cat text;
begin
  select * into v_b from public.bookings where id = p_id and client_id = v_uid for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_b.status <> 'confirmed' then raise exception 'Only bookings that haven''t started can be cancelled' using errcode = 'P0001'; end if;
  update public.bookings set status = 'cancelled', updated_at = now() where id = p_id returning * into v_b;
  if v_b.credit_cents > 0 then update public.profiles set wallet_cents = wallet_cents + v_b.credit_cents where id = v_uid; end if;
  update public.payments set status = 'refunded' where booking_id = p_id and status = 'succeeded';
  delete from public.promo_redemptions where booking_id = p_id;
  select name into v_cat from public.categories where id = v_b.category_id;
  perform public.notify_user(v_uid, 'booking', 'Booking for ' || v_cat || ' cancelled');
  return v_b;
end $$;

-- Demo only: real Tasker accounts would drive status from their own app.
create or replace function public.advance_booking(p_id uuid) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.require_uid(); v_b public.bookings; v_next text; v_first text;
  v_flow text[] := array['confirmed', 'on_the_way', 'in_progress', 'completed'];
begin
  if public.setting('demo') <> 'true' then raise exception 'Status updates come from the Tasker' using errcode = '42501'; end if;
  select * into v_b from public.bookings where id = p_id and client_id = v_uid for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_b.status not in ('confirmed', 'on_the_way', 'in_progress') then raise exception 'Booking can''t be advanced' using errcode = 'P0001'; end if;
  v_next := v_flow[array_position(v_flow, v_b.status) + 1];
  update public.bookings set status = v_next, updated_at = now() where id = p_id returning * into v_b;
  select first into v_first from public.taskers where id = v_b.tasker_id;
  if v_next = 'completed' then update public.taskers set jobs = jobs + 1 where id = v_b.tasker_id; end if;
  perform public.notify_user(v_uid, 'booking', case v_next
    when 'on_the_way' then v_first || ' is on the way 🛵'
    when 'in_progress' then v_first || ' has started your task'
    else 'Task completed! Rate ' || v_first || ' and leave a tip' end);
  return v_b;
end $$;

create or replace function public.review_booking(p_id uuid, p_rating integer, p_tip_cents integer default 0, p_review text default null)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.require_uid(); v_b public.bookings; v_name text; v_text text; v_status text;
begin
  if p_rating not between 1 and 5 then raise exception 'Rating must be 1–5' using errcode = 'P0001'; end if;
  if p_tip_cents < 0 or p_tip_cents > 10000 then raise exception 'Invalid tip' using errcode = 'P0001'; end if;
  select * into v_b from public.bookings where id = p_id and client_id = v_uid for update;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_b.status <> 'completed' then raise exception 'You can rate a task once it''s completed' using errcode = 'P0001'; end if;
  if v_b.rating is not null then raise exception 'You''ve already rated this task' using errcode = 'P0001'; end if;
  v_text := coalesce(nullif(trim(p_review), ''),
    (array['Not great.', 'It was okay.', 'Okay job.', 'Great work!', 'Excellent — highly recommend!'])[p_rating]);
  update public.bookings set rating = p_rating, review = v_text, tip_cents = p_tip_cents, updated_at = now()
    where id = p_id returning * into v_b;
  select split_part(name, ' ', 1) || coalesce(' ' || nullif(left(split_part(name, ' ', 2), 1), '') || '.', '')
    into v_name from public.profiles where id = v_uid;
  insert into public.reviews (tasker_id, booking_id, author_name, rating, body, category_id)
    values (v_b.tasker_id, v_b.id, coalesce(nullif(v_name, ''), 'Client'), p_rating, v_text, v_b.category_id);
  update public.taskers set rating = (select round(avg(rating)::numeric, 1) from public.reviews where tasker_id = v_b.tasker_id)
    where id = v_b.tasker_id;
  if p_tip_cents > 0 then
    v_status := public.payment_status_for(v_b.payment_method, p_tip_cents);
    insert into public.payments (booking_id, user_id, kind, method, amount_cents, status)
      values (v_b.id, v_uid, 'tip', v_b.payment_method, p_tip_cents, v_status);
  end if;
  return v_b;
end $$;

create or replace function public.topup_wallet(p_amount_cents integer, p_method text) returns integer
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.require_uid(); v_status text; v_balance integer;
begin
  if p_amount_cents < 100 or p_amount_cents > 50000 then raise exception 'Top ups must be between $1 and $500' using errcode = 'P0001'; end if;
  if p_method not in ('orange', 'mtn', 'card') then raise exception 'Unsupported payment method' using errcode = 'P0001'; end if;
  v_status := public.payment_status_for(p_method, p_amount_cents);
  insert into public.payments (user_id, kind, method, amount_cents, status) values (v_uid, 'topup', p_method, p_amount_cents, v_status);
  if v_status <> 'succeeded' then raise exception 'Payment is pending confirmation' using errcode = 'P0001'; end if;
  update public.profiles set wallet_cents = wallet_cents + p_amount_cents where id = v_uid returning wallet_cents into v_balance;
  perform public.notify_user(v_uid, 'promo', '$' || (p_amount_cents / 100.0)::numeric(10,2) || ' added to your wallet');
  return v_balance;
end $$;

-- ---------------------------------------------------------------------------
-- Demo chat: seeded Taskers (no linked account) answer with a canned reply.
-- ---------------------------------------------------------------------------
create or replace function public.demo_auto_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare replies text[] := array[
  'Hello! Thanks for reaching out 🙏 I''ll be there on time.',
  'No problem at all, I''ll bring everything needed.',
  'I''m around the junction now, 10 minutes away.',
  'Okay my person, see you soon!',
  'Yes, that works for me. Let me know if anything changes.'];
begin
  if new.sender = 'client' and public.setting('demo') = 'true'
     and exists (select 1 from public.taskers where id = new.tasker_id and user_id is null) then
    insert into public.messages (client_id, tasker_id, sender, body, created_at)
    values (new.client_id, new.tasker_id, 'tasker', replies[1 + floor(random() * 5)::int], now() + interval '2 seconds');
  end if;
  return null;
end $$;

create trigger messages_demo_reply after insert on public.messages
  for each row execute function public.demo_auto_reply();

-- ---------------------------------------------------------------------------
-- Tasker mode
-- ---------------------------------------------------------------------------
create or replace function public.seed_jobs(p_user uuid, p_count integer default 4) returns void
language plpgsql security definer set search_path = public as $$
declare
  firsts text[] := array['Musu','Kollie','Fatu','Emmanuel','Comfort','Prince','Hawa','Moses','Bendu','Varney','Garmai','Sekou'];
  lasts text[] := array['K','D','J','S','T','F','W','C','M','N'];
  areas text[] := array['Sinkor','Mamba Point','Congo Town','Paynesville','Old Road','Red Light','Duala','Bushrod Island','Gardnersville','ELWA'];
  whens text[] := array['Today · 2pm','Today · 5pm','Tomorrow · 9am','Tomorrow · 1pm','Sat · 8am','Sun · 10am'];
  c public.categories;
begin
  if exists (select 1 from public.job_requests where tasker_user = p_user and status = 'open') then return; end if;
  for i in 1..p_count loop
    select * into c from public.categories order by random() limit 1;
    insert into public.job_requests (tasker_user, client_name, category_id, area, when_label, pay_cents, distance_km)
    values (p_user,
      firsts[1 + floor(random() * array_length(firsts, 1))::int] || ' ' || lasts[1 + floor(random() * array_length(lasts, 1))::int] || '.',
      c.id, areas[1 + floor(random() * 10)::int], whens[1 + floor(random() * 6)::int],
      round(c.from_cents * (1.5 + random() * 2.5)), round((0.5 + random() * 7)::numeric, 1));
  end loop;
end $$;

create or replace function public.on_profile_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'tasker' and (old.role is distinct from 'tasker') then perform public.seed_jobs(new.id); end if;
  return new;
end $$;

create trigger profiles_role_change after update of role on public.profiles
  for each row execute function public.on_profile_role_change();

create or replace function public.require_tasker() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.profiles where id = v_uid and role = 'tasker') then
    raise exception 'Switch to Tasker mode first' using errcode = '42501';
  end if;
  return v_uid;
end $$;

create or replace function public.respond_to_job(p_id uuid, p_action text) returns public.job_requests
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.require_tasker(); v_j public.job_requests;
begin
  select * into v_j from public.job_requests where id = p_id and tasker_user = v_uid for update;
  if not found then raise exception 'Job not found' using errcode = 'P0002'; end if;
  if p_action = 'accept' and v_j.status = 'open' then
    update public.job_requests set status = 'accepted', accepted_at = now() where id = p_id returning * into v_j;
  elsif p_action = 'decline' and v_j.status = 'open' then
    update public.job_requests set status = 'declined' where id = p_id returning * into v_j;
    perform public.seed_jobs(v_uid, 2);
  elsif p_action = 'complete' and v_j.status = 'accepted' then
    update public.job_requests set status = 'completed', completed_at = now() where id = p_id returning * into v_j;
    perform public.notify_user(v_uid, 'booking', 'Job completed — $' || (v_j.pay_cents / 100.0)::numeric(10,2) || ' added to your earnings');
  else
    raise exception 'That job can''t be updated' using errcode = 'P0001';
  end if;
  return v_j;
end $$;

create or replace function public.tasker_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := public.require_tasker(); v_week jsonb; v_stats record; v_paid integer;
begin
  select jsonb_agg(jsonb_build_object('day', to_char(d, 'Dy'), 'cents', coalesce(s.cents, 0)) order by d) into v_week
  from generate_series(current_date - 6, current_date, interval '1 day') d
  left join (
    select completed_at::date as day, sum(pay_cents)::int as cents from public.job_requests
    where tasker_user = v_uid and status = 'completed' group by 1
  ) s on s.day = d::date;
  select
    count(*) filter (where status in ('accepted', 'completed'))::int as accepted,
    count(*) filter (where status = 'declined')::int as declined,
    count(*) filter (where status = 'completed')::int as completed,
    coalesce(sum(pay_cents) filter (where status = 'completed'), 0)::int as earned
  into v_stats from public.job_requests where tasker_user = v_uid;
  select coalesce(sum(amount_cents), 0)::int into v_paid from public.payments where user_id = v_uid and kind = 'payout';
  return jsonb_build_object(
    'week', v_week,
    'available_cents', v_stats.earned - v_paid,
    'completed', v_stats.completed,
    'acceptance', case when v_stats.accepted + v_stats.declined > 0
      then round(100.0 * v_stats.accepted / (v_stats.accepted + v_stats.declined)) end
  );
end $$;

create or replace function public.cash_out() returns integer
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.require_tasker(); v_amount integer;
begin
  perform 1 from public.profiles where id = v_uid for update;
  select coalesce(sum(pay_cents), 0)::int - (select coalesce(sum(amount_cents), 0)::int from public.payments where user_id = v_uid and kind = 'payout')
    into v_amount from public.job_requests where tasker_user = v_uid and status = 'completed';
  if v_amount <= 0 then raise exception 'No earnings available to cash out' using errcode = 'P0001'; end if;
  insert into public.payments (user_id, kind, method, amount_cents, status)
    values (v_uid, 'payout', 'orange', v_amount, case when public.setting('payments_mode') = 'sandbox' then 'succeeded' else 'pending' end);
  perform public.notify_user(v_uid, 'promo', 'Cash out of $' || (v_amount / 100.0)::numeric(10,2) || ' sent to Orange Money');
  return v_amount;
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges: internal helpers are not callable from the API.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.quote_booking, public.create_booking, public.cancel_booking, public.advance_booking,
  public.review_booking, public.topup_wallet, public.respond_to_job, public.tasker_dashboard, public.cash_out
  to authenticated;
revoke execute on function public.notify_user, public.seed_jobs, public.setting, public.payment_status_for
  from authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.notifications, public.bookings, public.profiles, public.job_requests;
