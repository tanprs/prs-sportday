-- ============================================================
-- 0001: extensions + enums
-- ============================================================

create extension if not exists pgcrypto;

create type user_role as enum (
  'admin',
  'teacher',
  'house_teacher',
  'sport_captain',
  'house_captain',
  'referee'
);

create type team_status as enum (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'locked'
);

create type match_round as enum ('qualifier', 'final');

create type match_status as enum ('scheduled', 'ongoing', 'completed', 'cancelled');
