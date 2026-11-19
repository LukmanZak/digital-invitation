-- Skema Supabase untuk undangan (1 pernikahan, ±1000 tamu).
-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Anon TIDAK punya akses langsung ke tabel; semua lewat fungsi di bawah.

create table if not exists public.guests (
  code        text primary key check (code ~ '^[a-z0-9]{6,12}$'),
  name        text not null check (char_length(name) between 1 and 60),
  max_guests  int  not null default 2 check (max_guests between 1 and 10),
  created_at  timestamptz not null default now()
);

create table if not exists public.rsvps (
  guest_code  text primary key references public.guests(code) on delete cascade,
  attending   boolean not null,
  guests      int not null check (guests between 0 and 10),
  updated_at  timestamptz not null default now()
);

create table if not exists public.wishes (
  id          bigint generated always as identity primary key,
  guest_code  text references public.guests(code) on delete set null,
  name        text not null check (char_length(name) between 1 and 60),
  message     text not null check (char_length(message) between 1 and 120),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists wishes_visible_idx on public.wishes (id desc) where not hidden;

alter table public.guests enable row level security;
alter table public.rsvps  enable row level security;
alter table public.wishes enable row level security;
revoke all on public.guests, public.rsvps, public.wishes from anon, authenticated;
-- (tanpa policy = anon dan authenticated ditolak; service_role di dashboard/skrip tetap bisa)

-- ---------- fungsi yang boleh dipanggil dari browser ----------

create or replace function public.get_guest(p_code text)
returns json language sql security definer set search_path = public, pg_temp stable as $$
  select json_build_object(
           'name', g.name, 'max_guests', g.max_guests,
           'attending', r.attending, 'guests', r.guests)
  from public.guests g left join public.rsvps r on r.guest_code = g.code
  where g.code = lower(p_code);
$$;

create or replace function public.submit_rsvp(p_code text, p_attending boolean, p_guests int)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare g public.guests; n int;
begin
  select * into g from public.guests where code = lower(p_code);
  if not found then raise exception 'Kode undangan tidak dikenal'; end if;
  n := case when p_attending then greatest(1, least(coalesce(p_guests, 1), g.max_guests)) else 0 end;
  insert into public.rsvps (guest_code, attending, guests, updated_at)
  values (g.code, p_attending, n, now())
  on conflict (guest_code) do update
    set attending = excluded.attending, guests = excluded.guests, updated_at = now();
  return json_build_object('name', g.name, 'attending', p_attending, 'guests', n);
end $$;

create or replace function public.submit_wish(p_code text, p_message text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare g public.guests; msg text; w public.wishes;
begin
  select * into g from public.guests where code = lower(p_code);
  if not found then raise exception 'Kode undangan tidak dikenal'; end if;
  msg := btrim(coalesce(p_message, ''));
  if char_length(msg) < 1 or char_length(msg) > 120 then raise exception 'Ucapan 1 sampai 120 karakter'; end if;
  if (select count(*) from public.wishes where guest_code = g.code) >= 3 then
    raise exception 'Batas 3 ucapan per tamu tercapai';
  end if;
  insert into public.wishes (guest_code, name, message) values (g.code, g.name, msg) returning * into w;
  return json_build_object('id', w.id, 'name', w.name, 'message', w.message, 'created_at', w.created_at);
end $$;

create or replace function public.list_wishes(p_limit int default 30, p_before bigint default null)
returns table (id bigint, name text, message text, created_at timestamptz)
language sql security definer set search_path = public, pg_temp stable as $$
  select w.id, w.name, w.message, w.created_at
  from public.wishes w
  where not w.hidden and (p_before is null or w.id < p_before)
  order by w.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

create or replace function public.wish_count()
returns bigint language sql security definer set search_path = public, pg_temp stable as $$
  select count(*) from public.wishes where not hidden;
$$;

create or replace function public.keep_alive()
returns int language sql security definer set search_path = public, pg_temp stable as $$ select 1; $$;

revoke execute on all functions in schema public from public;
grant execute on function
  public.get_guest(text), public.submit_rsvp(text, boolean, int), public.submit_wish(text, text),
  public.list_wishes(int, bigint), public.wish_count(), public.keep_alive()
to anon;
