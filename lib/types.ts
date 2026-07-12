export type MemberStatus = "active" | "inactive" | "blocked" | "deleted";
export type RequestStatus =
  | "pending_review"
  | "in_review"
  | "approved"
  | "approved_adjusted"
  | "rejected"
  | "needs_more_evidence";
export type RedemptionStatus = "pending" | "approved" | "paid" | "rejected" | "cancelled";

export type Level = {
  id: string;
  name: string;
  rank: number;
  min_points: number;
  max_points: number | null;
  message: string | null;
  base_asset_url: string | null;
};

export type MemberProfile = {
  id: string;
  full_name: string;
  area: string | null;
  role_title: string | null;
  email: string | null;
  status: MemberStatus;
  base_avatar_url: string | null;
  custom_avatar_url: string | null;
  joined_at: string;
  private_notes: string | null;
  historical_points: number;
  spent_points: number;
  deducted_points: number;
  available_points: number;
  level_id: string | null;
  level_name: string | null;
  level_rank: number | null;
  level_min_points: number | null;
  level_max_points: number | null;
  level_message: string | null;
  level_asset_url: string | null;
  custom_level_asset_url: string | null;
};

export type AdminData = {
  members: MemberProfile[];
  requests: any[];
  movements: any[];
  redemptions: any[];
  rewards: any[];
  levels: Level[];
  projects: any[];
  audits: any[];
  settings: any[];
};
