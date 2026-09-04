-- 의사별 통계 화면에서 소속 진료과를 같이 보여주기 위해 컬럼을 추가한다.
alter table discharge_doctor_stats
  add column if not exists department text not null default '';
