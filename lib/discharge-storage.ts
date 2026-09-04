import { getSupabaseServerClient } from "@/lib/supabase";
import type {
  DepartmentStat,
  DoctorStat,
  HourlyStat,
  ReasonStat,
  DepartmentHourlyStat,
  DepartmentReasonStat,
  ParsedDischargeData,
} from "@/lib/discharge-parser";

const TABLES = [
  "discharge_monthly_stats",
  "discharge_doctor_stats",
  "discharge_hourly_stats",
  "discharge_reason_stats",
  "discharge_department_hourly_stats",
  "discharge_department_reason_stats",
] as const;

// 같은 기준 연월을 다시 업로드하면 이전 값을 지우고 새 값으로 덮어쓴다.
export async function saveDischargeStats(period: string, data: ParsedDischargeData) {
  const supabase = getSupabaseServerClient();

  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().eq("period", period);
    if (error) throw new Error(`${table} 기존 데이터 삭제 실패: ${error.message}`);
  }

  if (data.departmentStats.length > 0) {
    const { error } = await supabase.from("discharge_monthly_stats").insert(
      data.departmentStats.map((stat) => ({
        period,
        department: stat.department,
        total_discharges: stat.totalDischarges,
        noticed_count: stat.noticedCount,
        completion_eligible_count: stat.completionEligibleCount,
        completed_count: stat.completedCount,
        notice_rate_percent: stat.noticeRatePercent,
        completion_rate_percent: stat.completionRatePercent,
      })),
    );
    if (error) throw new Error(`진료과별 통계 저장 실패: ${error.message}`);
  }

  // 의사명·의사ID 컬럼이 없는 파일이면 doctorStats가 비어있을 수 있다 — 그런 경우 그냥 건너뛴다.
  if (data.doctorStats.length > 0) {
    const { error } = await supabase.from("discharge_doctor_stats").insert(
      data.doctorStats.map((stat) => ({
        period,
        doctor_id: stat.doctorId,
        doctor_name: stat.doctorName,
        total_discharges: stat.totalDischarges,
        noticed_count: stat.noticedCount,
        completion_eligible_count: stat.completionEligibleCount,
        completed_count: stat.completedCount,
        notice_rate_percent: stat.noticeRatePercent,
        completion_rate_percent: stat.completionRatePercent,
      })),
    );
    if (error) throw new Error(`의사별 통계 저장 실패: ${error.message}`);
  }

  const hourlyToSave = data.hourlyStats.filter((stat) => stat.count > 0);
  if (hourlyToSave.length > 0) {
    const { error } = await supabase
      .from("discharge_hourly_stats")
      .insert(hourlyToSave.map((stat) => ({ period, hour: stat.hour, count: stat.count })));
    if (error) throw new Error(`시간대별 통계 저장 실패: ${error.message}`);
  }

  if (data.reasonStats.length > 0) {
    const { error } = await supabase
      .from("discharge_reason_stats")
      .insert(data.reasonStats.map((stat) => ({ period, reason: stat.reason, count: stat.count })));
    if (error) throw new Error(`사유별 통계 저장 실패: ${error.message}`);
  }

  if (data.departmentHourlyStats.length > 0) {
    const { error } = await supabase.from("discharge_department_hourly_stats").insert(
      data.departmentHourlyStats.map((stat) => ({
        period,
        department: stat.department,
        hour: stat.hour,
        count: stat.count,
      })),
    );
    if (error) throw new Error(`진료과별 시간대 통계 저장 실패: ${error.message}`);
  }

  if (data.departmentReasonStats.length > 0) {
    const { error } = await supabase.from("discharge_department_reason_stats").insert(
      data.departmentReasonStats.map((stat) => ({
        period,
        department: stat.department,
        reason: stat.reason,
        count: stat.count,
      })),
    );
    if (error) throw new Error(`진료과별 사유 통계 저장 실패: ${error.message}`);
  }
}

export type StoredDischargeStats = {
  departmentStats: DepartmentStat[];
  doctorStats: DoctorStat[];
  hourlyStats: HourlyStat[];
  reasonStats: ReasonStat[];
  departmentHourlyStats: DepartmentHourlyStat[];
  departmentReasonStats: DepartmentReasonStat[];
};

// 기준 연월로 저장된 통계를 조회한다. 저장된 것이 없으면 null(=데이터 없음)을 돌려준다.
export async function getDischargeStats(period: string): Promise<StoredDischargeStats | null> {
  const supabase = getSupabaseServerClient();

  const [monthly, doctor, hourly, reason, deptHourly, deptReason] = await Promise.all([
    supabase.from("discharge_monthly_stats").select("*").eq("period", period).order("department"),
    supabase.from("discharge_doctor_stats").select("*").eq("period", period),
    supabase.from("discharge_hourly_stats").select("*").eq("period", period).order("hour"),
    supabase.from("discharge_reason_stats").select("*").eq("period", period).order("count", { ascending: false }),
    supabase
      .from("discharge_department_hourly_stats")
      .select("*")
      .eq("period", period)
      .order("department")
      .order("hour"),
    supabase
      .from("discharge_department_reason_stats")
      .select("*")
      .eq("period", period)
      .order("department")
      .order("count", { ascending: false }),
  ]);

  if (monthly.error) throw new Error(`진료과별 통계 조회 실패: ${monthly.error.message}`);
  if (doctor.error) throw new Error(`의사별 통계 조회 실패: ${doctor.error.message}`);
  if (hourly.error) throw new Error(`시간대별 통계 조회 실패: ${hourly.error.message}`);
  if (reason.error) throw new Error(`사유별 통계 조회 실패: ${reason.error.message}`);
  if (deptHourly.error) throw new Error(`진료과별 시간대 통계 조회 실패: ${deptHourly.error.message}`);
  if (deptReason.error) throw new Error(`진료과별 사유 통계 조회 실패: ${deptReason.error.message}`);

  if (
    monthly.data.length === 0 &&
    doctor.data.length === 0 &&
    hourly.data.length === 0 &&
    reason.data.length === 0
  ) {
    return null;
  }

  return {
    departmentStats: monthly.data.map((row) => ({
      department: row.department,
      totalDischarges: row.total_discharges,
      noticedCount: row.noticed_count,
      completionEligibleCount: row.completion_eligible_count,
      completedCount: row.completed_count,
      noticeRatePercent: row.notice_rate_percent,
      completionRatePercent: row.completion_rate_percent,
    })),
    doctorStats: doctor.data.map((row) => ({
      doctorId: row.doctor_id,
      doctorName: row.doctor_name,
      totalDischarges: row.total_discharges,
      noticedCount: row.noticed_count,
      completionEligibleCount: row.completion_eligible_count,
      completedCount: row.completed_count,
      noticeRatePercent: row.notice_rate_percent,
      completionRatePercent: row.completion_rate_percent,
    })),
    hourlyStats: hourly.data.map((row) => ({ hour: row.hour, count: row.count })),
    reasonStats: reason.data.map((row) => ({ reason: row.reason, count: row.count })),
    departmentHourlyStats: deptHourly.data.map((row) => ({
      department: row.department,
      hour: row.hour,
      count: row.count,
    })),
    departmentReasonStats: deptReason.data.map((row) => ({
      department: row.department,
      reason: row.reason,
      count: row.count,
    })),
  };
}

// 데이터가 저장돼 있는 기준 연월 목록을 최신순으로 돌려준다. (리포트 화면의 연월 선택용)
export async function listAvailablePeriods(): Promise<string[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("discharge_monthly_stats")
    .select("period")
    .order("period", { ascending: false });

  if (error) throw new Error(`연월 목록 조회 실패: ${error.message}`);

  return Array.from(new Set((data ?? []).map((row) => row.period as string)));
}
