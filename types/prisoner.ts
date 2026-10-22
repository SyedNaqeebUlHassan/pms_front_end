export type Sex = "male" | "female";
export type PunishmentStatus = "active" | "completed" | "cancelled" | "pending";
export type FIRStatus = "registered" | "convicted" | "acquitted" | "closed" | "cancelled";

export interface Punishment {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  remarks: string | null;
  status: PunishmentStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FIRSummary {
  id: string;
  complaint_number: string;
  accused_name: string;
  police_station: string;
  incident_date_time: string;
  offense_type: string;
  description: string;
  status: FIRStatus;
  registered_at: string;
  updated_at: string;
}

export interface Prisoner {
  id: string;
  prisoner_number: string;
  name: string;
  dob: string;
  sex: Sex;
  address: string;
  crime: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  punishments?: Punishment[];
  firs?: FIRSummary[];
}

export interface PrisonersResponse {
  message: string;
  prisoners: Prisoner[];
}

export interface PrisonerResponse {
  message: string;
  prisoner: Prisoner;
}
