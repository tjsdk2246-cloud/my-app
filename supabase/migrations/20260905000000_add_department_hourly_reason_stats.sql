-- 진료과별 상세 화면에서 특정 시간대 막대를 클릭하면 그 시간대의 사유별 내역을
-- 보여주기 위해, 진료과 x 시간대 x 사유 조합으로 건수를 따로 저장한다.

create table if not exists discharge_department_hourly_reason_stats (
  id bigint generated always as identity primary key,
  period text not null,
  department text not null,
  hour integer not null check (hour >= 0 and hour <= 23),
  reason text not null,
  count integer not null,
  created_at timestamptz not null default now(),
  unique (period, department, hour, reason)
);

create index if not exists idx_discharge_dept_hourly_reason_stats_period
  on discharge_department_hourly_reason_stats (period);

alter table discharge_department_hourly_reason_stats enable row level security;
