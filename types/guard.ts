export type Sex = "male" | "female";

export interface Guard {
  id: string;
  employee_no: string; // "GRD-2026-0001"
  name: string;
  dob: string; // "YYYY-MM-DD"
  sex: "male" | "female";
  duty_hours: string; // returned as "8.0" string from API
  shift_start: string; // "08:00:00"
  shift_end: string; // "09:00:00"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
