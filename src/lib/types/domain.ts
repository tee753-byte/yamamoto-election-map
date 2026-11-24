export type UserRole = "admin" | "worker" | "viewer";

export type WorkStatus = "not_started" | "assigned" | "completed" | "needs_review";

export interface Profile {
  id: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Candidate {
  id: string;
  displayName: string;
  color: string;
  isActive: boolean;
}

export interface PosterBoard {
  id: string;
  boardNumber: string;
  latitude: number;
  longitude: number;
  locationHint: string;
  isSample: boolean;
}

export interface PosterWork {
  id: string;
  candidateId: string;
  boardId: string;
  status: WorkStatus;
  assigneeId: string | null;
  assigneeLabel: string | null;
  note: string | null;
  version: number;
  board: PosterBoard;
  assignee: Pick<Profile, "id" | "displayName"> | null;
}

export interface PostingArea {
  id: string;
  areaCode: string;
  name: string;
  geometry: GeoJsonPolygon;
  status: WorkStatus;
  assigneeId: string | null;
  assigneeLabel: string | null;
  targetCount: number | null;
  deliveredCount: number;
  note: string | null;
  version: number;
  isSample: boolean;
  assignee: Pick<Profile, "id" | "displayName"> | null;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface ProgressSummary {
  total: number;
  completed: number;
  percent: number;
  counts: Record<WorkStatus, number>;
}
