-- 완결률 정의가 바뀌면서(당일입퇴원·가퇴원 제외 후 12시 이전 퇴실 여부) 분모가
-- 더 이상 noticed_count가 아니게 되어, 그 분모를 담을 컬럼을 추가한다.
alter table discharge_monthly_stats
  add column if not exists completion_eligible_count integer not null default 0;

-- 의사별(교수별) 통계. 진료과별 통계와 같은 구조를 쓴다.
create table if not exists discharge_doctor_stats (
  id bigint generated always as identity primary key,
  period text not null,
  doctor_id text not null,
  doctor_name text not null,
  total_discharges integer not null,
  noticed_count integer not null,
  completion_eligible_count integer not null default 0,
  completed_count integer not null,
  notice_rate_percent numeric,
  completion_rate_percent numeric,
  created_at timestamptz not null default now(),
  unique (period, doctor_id, doctor_name)
);

create index if not exists idx_discharge_doctor_stats_period on discharge_doctor_stats (period);

alter table discharge_doctor_stats enable row level security;
