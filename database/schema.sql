create table sectors (
  id bigint generated always as identity primary key,
  name text not null
);

create table schools (
  id bigint generated always as identity primary key,
  name text not null,
  sector_id bigint not null references sectors(id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('teacher','admin','officer')),
  school_id bigint references schools(id),
  sector_id bigint references sectors(id),
  phone text
);

create table classes (
  id bigint generated always as identity primary key,
  school_id bigint not null references schools(id),
  name text not null,
  teacher_id uuid references profiles(id)
);

create table guardians (
  id bigint generated always as identity primary key,
  school_id bigint not null references schools(id),
  full_name text not null,
  phone text not null check (phone ~ '^\+2507[0-9]{8}$')
);

create table students (
  id bigint generated always as identity primary key,
  school_id bigint not null references schools(id),
  class_id bigint not null references classes(id),
  guardian_id bigint references guardians(id),
  full_name text not null
);

create table attendance (
  id bigint generated always as identity primary key,
  student_id bigint not null references students(id) on delete cascade,
  class_id bigint not null references classes(id),
  date date not null,
  status text not null check (status in ('Present','Absent','Late')),
  marked_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (student_id, date)
);

create table alerts (
  id bigint generated always as identity primary key,
  student_id bigint not null references students(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('guardian','officer')),
  recipient_phone text,
  message text not null,
  absence_count int not null,
  status text not null default 'Sent (simulated)',
  created_at timestamptz default now()
);

create table cases (
  id bigint generated always as identity primary key,
  student_id bigint not null references students(id) on delete cascade,
  sector_id bigint not null references sectors(id),
  status text not null default 'Open' check (status in ('Open','In Progress','Resolved')),
  absence_count int not null,
  flagged_on date not null default current_date,
  updated_at timestamptz default now()
);

-- Only logged-in users can read or write. Role rules are enforced in the app.
do $$
declare t text;
begin
  foreach t in array array['sectors','schools','profiles','classes','guardians','students','attendance','alerts','cases']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Permissions for logged-in users
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;