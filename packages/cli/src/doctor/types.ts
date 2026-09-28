export type DoctorCheckStatus = "ok" | "warning" | "error" | "skipped";

export type DoctorCheckResult = {
  id: string;
  label: string;
  status: DoctorCheckStatus;
  message?: string;
  details?: readonly string[];
  cause?: unknown;
};
