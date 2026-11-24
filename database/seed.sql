-- Run AFTER creating three users in Supabase Authentication (auto-confirmed):
-- teacher@example.com, admin@example.com, officer@example.com (password: Demo@12345)

insert into sectors (name) values ('Demo Sector');
insert into schools (name, sector_id) values ('Kabeza Demo Primary School', 1);

insert into profiles (id, full_name, role, school_id, sector_id, phone)
select id, 'Grace Uwase', 'teacher', 1, 1, null from auth.users where email = 'teacher@example.com';
insert into profiles (id, full_name, role, school_id, sector_id, phone)
select id, 'Jean Habimana', 'admin', 1, 1, null from auth.users where email = 'admin@example.com';
insert into profiles (id, full_name, role, school_id, sector_id, phone)
select id, 'Alice Mukamana', 'officer', null, 1, '+250788000099' from auth.users where email = 'officer@example.com';

insert into classes (school_id, name, teacher_id)
select 1, 'Primary 4A', id from auth.users where email = 'teacher@example.com';

insert into guardians (school_id, full_name, phone) values
(1, 'Marie Mukamana', '+250788000001'),
(1, 'Eric Niyonzima', '+250788000002'),
(1, 'Claudine Uwimana', '+250788000003'),
(1, 'Patrick Habineza', '+250788000004'),
(1, 'Josiane Mukeshimana', '+250788000005'),
(1, 'Emmanuel Ndayisaba', '+250788000006');

insert into students (school_id, class_id, guardian_id, full_name) values
(1, 1, 1, 'Aline Mukamana'),
(1, 1, 2, 'David Niyonzima'),
(1, 1, 3, 'Sandrine Uwimana'),
(1, 1, 4, 'Kevin Habineza'),
(1, 1, 5, 'Divine Mukeshimana'),
(1, 1, 6, 'Samuel Ndayisaba');

-- Aline has 2 absences in a row, so one more absence triggers the alert.
insert into attendance (student_id, class_id, date, status)
select s.id, 1, v.d,
  case when s.id = 1 then 'Absent'
       when s.id = 2 and v.d = current_date - 1 then 'Absent'
       else 'Present' end
from students s, (values (current_date - 2), (current_date - 1)) as v(d);