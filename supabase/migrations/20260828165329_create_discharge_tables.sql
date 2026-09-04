-- 퇴원예고·병상회전율 관리 챗봇의 월별 집계 결과를 저장하는 테이블.
-- 서버 코드(비공개 secret key)로만 접근하며, RLS를 켜서 다른 경로(anon/publishable key)로는
-- 아무것도 못 읽고 못 쓰게 막는다.

create table if not exists discharge_monthly_stats (
  id bigint generated always as identity primary key,
  period text not null,
  department text not null,
  total_discharges integer not null,
  noticed_count integer not null,
  completed_count integer not null,
  notice_rate_percent numeric,
  completion_rate_percent numeric,
  created_at timestamptz not null default now(),
  unique (period, department)
);

create table if not exists discharge_hourly_stats (
  id bigint generated always as identity primary key,
  period text not null,
  hour integer not null check (hour >= 0 and hour <= 23),
  count integer not null,
  created_at timestamptz not null default now(),
  unique (period, hour)
);

create table if not exists discharge_reason_stats (
  id bigint generated always as identity primary key,
  period text not null,
  reason text not null,
  count integer not null,
  created_at timestamptz not null default now(),
  unique (period, reason)
);

create index if not exists idx_discharge_monthly_stats_period on discharge_monthly_stats (period);
create index if not exists idx_discharge_hourly_stats_period on discharge_hourly_stats (period);
create index if not exists idx_discharge_reason_stats_period on discharge_reason_stats (period);

alter table discharge_monthly_stats enable row level security;
alter table discharge_hourly_stats enable row level security;
alter table discharge_reason_stats enable row level security;
