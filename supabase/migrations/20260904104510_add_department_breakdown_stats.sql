-- 진료과별 상세 화면(시간대별·사유별)을 위해, 병원 전체 집계 말고
-- 진료과 단위로 나눈 시간대별·사유별 통계도 따로 저장한다.

create table if not exists discharge_department_hourly_stats (
  id bigint generated always as identity primary key,
  period text not null,
  department text not null,
  hour integer not null check (hour >= 0 and hour <= 23),
  count integer not null,
  created_at timestamptz not null default now(),
  unique (period, department, hour)
);

create table if not exists discharge_department_reason_stats (
  id bigint generated always as identity primary key,
  period text not null,
  department text not null,
  reason text not null,
  count integer not null,
  created_at timestamptz not null default now(),
  unique (period, department, reason)
);

create index if not exists idx_discharge_dept_hourly_stats_period on discharge_department_hourly_stats (period);
create index if not exists idx_discharge_dept_reason_stats_period on discharge_department_reason_stats (period);

alter table discharge_department_hourly_stats enable row level security;
alter table discharge_department_reason_stats enable row level security;
