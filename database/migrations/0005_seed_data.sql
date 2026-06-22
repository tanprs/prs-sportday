-- ============================================================
-- 0005: seed real tournament data from the project brief
-- (section 2 — houses + sport_types). classroom_house_mapping
-- and students are NOT seeded here: real per-classroom color
-- assignments and the student roster come later from the QR
-- attendance sync (Phase 2) / admin setup screen.
-- ============================================================

insert into houses (house_color, name_th, primary_hex, secondary_hex) values
  ('red',    'แดง',         '#CC2222', '#8B0000'),
  ('yellow', 'เหลือง/ทอง',   '#E8A000', '#B8860B'),
  ('green',  'เขียว',        '#1A5C2A', '#0F3D1A'),
  ('blue',   'น้ำเงิน',       '#1A3A8F', '#0D2460');

-- team sports: futsal, basketball (8/team, 4+4 quota),
-- sharball, volleyball (10/team, 5+5 quota)
-- x 3 grade groups x 2 genders = 24 rows
with team_sports (name, team_size, quota1, quota2) as (
  values
    ('ฟุตซอล',     8, 4, 4),
    ('บาสเกตบอล',  8, 4, 4),
    ('แชร์บอล',    10, 5, 5),
    ('วอลเลย์บอล', 10, 5, 5)
),
grade_groups (grade_group, g1, g2) as (
  values
    ('ม.1-2', 'ม.1', 'ม.2'),
    ('ม.3-4', 'ม.3', 'ม.4'),
    ('ม.5-6', 'ม.5', 'ม.6')
),
genders (gender_type) as (
  values ('male'), ('female')
)
insert into sport_types (name, category, grade_group, gender_type, team_size, sub_grade_quota, max_teams_per_color, sort_order)
select
  ts.name, 'team_sport', gg.grade_group, gd.gender_type, ts.team_size,
  jsonb_build_object(gg.g1, ts.quota1, gg.g2, ts.quota2),
  1, 10
from team_sports ts cross join grade_groups gg cross join genders gd;

-- individual sports: badminton, table tennis (1 person)
-- x 3 grade groups x 2 genders = 12 rows
with ind_sports (name) as (
  values ('แบดมินตัน'), ('เทเบิลเทนนิส')
),
grade_groups (grade_group) as (
  values ('ม.1-2'), ('ม.3-4'), ('ม.5-6')
),
genders (gender_type) as (
  values ('male'), ('female')
)
insert into sport_types (name, category, grade_group, gender_type, team_size, sub_grade_quota, max_teams_per_color, sort_order)
select s.name, 'individual', gg.grade_group, gd.gender_type, 1, null, 1, 20
from ind_sports s cross join grade_groups gg cross join genders gd;

-- esports (secondary level only) — 10 rows
insert into sport_types (name, category, grade_group, gender_type, team_size, sub_grade_quota, max_teams_per_color, sort_order) values
  ('Valorant',           'esport', 'รวม',     'both', 5, null, 1, 30),
  ('FC 26',              'esport', 'ม.ต้น',   'both', 1, null, 1, 31),
  ('FC 26',              'esport', 'ม.ปลาย',  'both', 1, null, 1, 32),
  ('E Football Mobile',  'esport', 'ม.ต้น',   'both', 1, null, 1, 33),
  ('E Football Mobile',  'esport', 'ม.ปลาย',  'both', 1, null, 1, 34),
  ('Street Fighter 6',   'esport', 'ม.ต้น',   'both', 1, null, 1, 35),
  ('Street Fighter 6',   'esport', 'ม.ปลาย',  'both', 1, null, 1, 36),
  ('Free Fire',          'esport', 'รวม',     'both', 4, null, 4, 37),
  ('ROV',                'esport', 'ม.ต้น',   'both', 5, null, 1, 38),
  ('ROV',                'esport', 'ม.ปลาย',  'both', 5, null, 1, 39);
