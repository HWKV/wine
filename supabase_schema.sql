-- =============================================
-- HWKV - Helshoogte Wine Culture Society
-- Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- MEMBERS TABLE
create table members (
  id uuid default gen_random_uuid() primary key,
  number integer,
  first_name text not null,
  surname text,
  room text,
  language text default 'Eng', -- 'Eng' or 'Afr'
  member_code text unique not null,
  member_type text default 'General', -- 'Founding Member', 'Driver', 'General'
  nominated_by text, -- member_code of nominator
  membership_accepted boolean default false,
  membership_paid boolean default false,
  has_car boolean default false,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- TASTINGS TABLE
create table tastings (
  id uuid default gen_random_uuid() primary key,
  number integer not null,
  title text,
  tasting_date timestamp with time zone,
  location text,
  capacity integer default 20,
  rsvp_method text default 'fcfs', -- 'fcfs' (first come first serve) or 'ballot'
  rsvp_opens_at timestamp with time zone,
  rsvp_closes_at timestamp with time zone,
  status text default 'upcoming', -- 'upcoming', 'open', 'closed', 'completed'
  message text, -- admin message shown to members for this tasting
  created_at timestamp with time zone default now()
);

-- RSVPS TABLE
create table rsvps (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references members(id) on delete cascade,
  tasting_id uuid references tastings(id) on delete cascade,
  status text default 'pending', -- 'pending', 'confirmed', 'waitlist', 'declined'
  payment_confirmed boolean default false, -- member self-confirms
  submitted_at timestamp with time zone default now(),
  unique(member_id, tasting_id)
);

-- MESSAGES TABLE (admin broadcasts)
create table messages (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  language text default 'both', -- 'Eng', 'Afr', 'both'
  pinned boolean default false,
  created_at timestamp with time zone default now()
);

-- =============================================
-- SEED: FOUNDING MEMBERS
-- =============================================

insert into members (number, first_name, surname, room, language, member_code, member_type, membership_accepted, membership_paid, has_car) values
(1,  'Luke',        'Cuff',                'RH Flat', 'Eng', 'PRIMUM-LAC-0',    'Founding Member', true,  true,  true),
(2,  'Corné',       'Prinsloo',            'KW54',    'Afr', 'PRIMUM-CMP-0',    'Founding Member', true,  true,  true),
(3,  'Philip',      'Marais',              'KW54',    'Afr', 'PRIMUM-PCM-0',    'Founding Member', true,  true,  false),
(4,  'Vos',         'Hattingh',            'A917',    'Afr', 'PRIMUM-HVH-9V',   'Founding Member', true,  false, false),
(5,  'Thando',      'Tshabalala',          'B902',    'Eng', 'PRIMUM-TT-9PRIM', 'Founding Member', true,  true,  false),
(6,  'Lucas',       'Kruger',              'A608',    'Afr', 'PRIMUM-LMK-6VP',  'Founding Member', true,  true,  false),
(7,  'Divan',       'de Villiers',         'C108',    'Afr', 'PRIMUM-DDV-1VP',  'Founding Member', true,  true,  true),
(8,  'Aaron',       'Kunnath',             'A908',    'Eng', 'PRIMUM-ABK-9VC',  'Founding Member', true,  true,  false),
(9,  'Tsepo',       'Cele',                'A916',    'Eng', 'PRIMUM-TC-9S',    'Founding Member', true,  true,  false),
(10, 'Uys',         'Cronje',              'B903',    'Afr', 'PRIMUM-JFUC-9A',  'Founding Member', true,  true,  true),
(11, 'Heinrich',    'Loock',               'A911',    'Afr', 'PRIMUM-HL-9SCR',  'Founding Member', true,  false, true),
(12, 'Michael',     'Mulcahy',             'B814',    'Eng', 'PRIMUM-MM-10',    'Founding Member', true,  true,  true),
(13, 'Braam',       'van der Westhuizen',  'B113',    'Afr', 'PRIMUM-BVDW-1',   'Founding Member', true,  false, false),
(14, 'Anco',        'de Koning',           'A201',    'Afr', 'PRIMUM-ALDK-2',   'Founding Member', true,  true,  true),
(15, 'Viwe',        'Tsheyini',            'B712',    'Eng', 'PRIMUM-VT-1',     'Founding Member', true,  false, false),
(16, 'Righardt',    'Pretorius',           'A907',    'Afr', 'PRIMUM-RP-9',     'Founding Member', true,  false, true),
(17, 'AJ',          'van Zyl',             'A906',    'Afr', 'PRIMUM-AJVZ-5',   'Founding Member', true,  false, true),
(18, 'Lee',         'Rothman',             'B513',    'Eng', 'PRIMUM-ALR-5',    'Founding Member', true,  false, true),
(19, 'Allen',       'Grootboom',           'A601',    'Eng', 'PRIMUM-AJMG-6',   'Founding Member', true,  false, true),
(20, 'Christopher', 'Freer',               'B103',    'Eng', 'PRIMUM-CMF-1',    'Founding Member', false, false, true),
(21, 'Tjeerdo',     'Polderman',           'B214',    'Eng', 'PRIMUM-TAP-2',    'Founding Member', true,  false, true),
(22, 'Lunathi',     'Mhlahlo',             'C310',    'Eng', 'PRIMUM-LM-3',     'Founding Member', true,  false, false),
(23, 'Alec',        'Brink',               'A114',    'Eng', 'GUBER-001-APB',   'Driver',          false, false, false),
(24, 'Liam',        'Duvenage',            'B206',    'Eng', 'GUBER-002-LCD',   'Driver',          false, false, false),
(25, 'Eduard',      'Meiring',             'C105',    'Eng', 'GUBER-003-EM',    'Driver',          false, false, false),
(26, 'Mandré',      'Strydom',             'A209L',   'Eng', 'GUBER-004-MBS',   'Driver',          false, false, false),
(27, 'Marnu',       'van Sandewyk',        'B808L',   'Afr', 'GUBER-005-CMVS',  'Driver',          false, false, false),
(28, 'Kyle',        'Coetzee',             null,      'Eng', 'GEN-KPC-001',     'General',         false, false, false);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table members enable row level security;
alter table tastings enable row level security;
alter table rsvps enable row level security;
alter table messages enable row level security;

-- Public can read tastings and messages (needed for member portal)
create policy "tastings_public_read" on tastings for select using (true);
create policy "messages_public_read" on messages for select using (true);

-- Members can look themselves up by code (for login)
create policy "members_read_by_code" on members for select using (true);

-- Anyone can insert/read RSVPs (controlled by app logic)
create policy "rsvps_insert" on rsvps for insert with check (true);
create policy "rsvps_read" on rsvps for select using (true);
create policy "rsvps_update" on rsvps for update using (true);

-- =============================================
-- CARS TABLE (add this if already ran schema)
-- =============================================
create table if not exists cars (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references members(id) on delete cascade,
  make_model text not null,
  registration text,
  seats integer default 4,
  available boolean default true,
  created_at timestamp with time zone default now(),
  unique(member_id)
);

alter table cars enable row level security;
create policy "cars_all" on cars using (true) with check (true);

-- =============================================
-- FINANCIAL ADDITIONS (run these separately if
-- you already ran the original schema)
-- =============================================

-- Add financial columns to tastings
alter table tastings add column if not exists tasting_fee numeric(10,2) default 0;
alter table tastings add column if not exists levy numeric(10,2) default 0; -- optional top-up per member

-- Add financial columns to rsvps
alter table rsvps add column if not exists sponsored boolean default false; -- member pays nothing
alter table rsvps add column if not exists amount_owed numeric(10,2) default 0; -- calculated
alter table rsvps add column if not exists amount_paid numeric(10,2) default 0; -- actual paid
alter table rsvps add column if not exists payment_notes text;

-- DRIVER ASSIGNMENTS per tasting
create table if not exists tasting_drivers (
  id uuid default gen_random_uuid() primary key,
  tasting_id uuid references tastings(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  reimbursement numeric(10,2) default 0,
  reimbursement_paid boolean default false,
  unique(tasting_id, member_id)
);

alter table tasting_drivers enable row level security;
create policy "drivers_all" on tasting_drivers using (true) with check (true);

-- =============================================
-- ADD EMAIL COLUMN (run if schema already set up)
-- =============================================
alter table members add column if not exists email text;

-- Update emails for all matched members
update members set email = '26948559@sun.ac.za' where member_code = 'PRIMUM-HVH-9V';
update members set email = '27017850@sun.ac.za' where member_code = 'PRIMUM-TT-9PRIM';
update members set email = '28117654@sun.ac.za' where member_code = 'PRIMUM-LMK-6VP';
update members set email = '27233480@sun.ac.za' where member_code = 'PRIMUM-DDV-1VP';
update members set email = '26881926@sun.ac.za' where member_code = 'PRIMUM-ABK-9VC';
update members set email = '25965816@sun.ac.za' where member_code = 'PRIMUM-TC-9S';
update members set email = '26894874@sun.ac.za' where member_code = 'PRIMUM-JFUC-9A';
update members set email = '27126250@sun.ac.za' where member_code = 'PRIMUM-HL-9SCR';
update members set email = '27942686@sun.ac.za' where member_code = 'PRIMUM-MM-10';
update members set email = '29280117@sun.ac.za' where member_code = 'PRIMUM-BVDW-1';
update members set email = '29553008@sun.ac.za' where member_code = 'PRIMUM-ALDK-2';
update members set email = '26446693@sun.ac.za' where member_code = 'PRIMUM-VT-1';
update members set email = '27837890@sun.ac.za' where member_code = 'PRIMUM-RP-9';
update members set email = '26296632@sun.ac.za' where member_code = 'PRIMUM-AJVZ-5';
update members set email = '29228565@sun.ac.za' where member_code = 'PRIMUM-ALR-5';
update members set email = '29155258@sun.ac.za' where member_code = 'PRIMUM-AJMG-6';
update members set email = '26946890@sun.ac.za' where member_code = 'PRIMUM-CMF-1';
update members set email = '29193338@sun.ac.za' where member_code = 'PRIMUM-TAP-2';
update members set email = '29246318@sun.ac.za' where member_code = 'PRIMUM-LM-3';
update members set email = '30501091@sun.ac.za' where member_code = 'GUBER-001-APB';
update members set email = '30083699@sun.ac.za' where member_code = 'GUBER-002-LCD';
update members set email = '29447976@sun.ac.za' where member_code = 'GUBER-003-EM';
update members set email = '30163463@sun.ac.za' where member_code = 'GUBER-004-MBS';
update members set email = '30024129@sun.ac.za' where member_code = 'GUBER-005-CMVS';
-- These 3 need manual lookup - Luke Cuff, Corné Prinsloo, Philip Marais (room KW54 not in floor list)
update members set email = 'luka@sun.ac.za' where member_code = 'PRIMUM-LAC-0';

-- =============================================
-- NOMINATIONS TABLE (run if not exists)
-- =============================================
create table if not exists nominations (
  id uuid default gen_random_uuid() primary key,
  nominated_by uuid references members(id) on delete cascade,
  first_name text not null,
  surname text not null,
  room text,
  motivation text not null,
  status text default 'pending', -- 'pending', 'approved', 'declined'
  member_code_assigned text,
  admin_notes text,
  created_at timestamp with time zone default now()
);

alter table nominations enable row level security;
create policy "allow_all_nominations" on nominations using (true) with check (true);

-- Add nomination deadline to settings (store as a message with special title)
-- We'll use a simple approach: store in tastings-like table or just use admin messages
-- Actually store as a column we add to members for nomination count
alter table members add column if not exists nomination_count integer default 0;

-- =============================================
-- NOMINATIONS TABLE (run if not exists)
-- =============================================
create table if not exists nominations (
  id uuid default gen_random_uuid() primary key,
  nominated_by uuid references members(id) on delete cascade,
  first_name text not null,
  surname text not null,
  room text,
  motivation text not null,
  status text default 'pending', -- 'pending', 'approved', 'denied'
  member_code_assigned text,
  admin_notes text,
  created_at timestamp with time zone default now()
);
alter table nominations enable row level security;
create policy "allow_all_nominations" on nominations using (true) with check (true);

-- Nomination deadline on settings table
create table if not exists settings (
  key text primary key,
  value text
);
alter table settings enable row level security;
create policy "allow_all_settings" on settings using (true) with check (true);

insert into settings (key, value) values ('nomination_deadline', null) on conflict (key) do nothing;
insert into settings (key, value) values ('nominations_open', 'true') on conflict (key) do nothing;
