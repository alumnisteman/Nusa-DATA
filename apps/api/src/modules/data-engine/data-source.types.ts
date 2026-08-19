export type TrustLevel =
  | "OFFICIAL_PUBLIC"
  | "LICENSED_PARTNER"
  | "PARTNER"
  | "SELF_DECLARED"
  | "AI_ASSISTED";

export interface SourceRecord {
  sourceName: string;
  sourceUrl?: string;
  trustLevel: TrustLevel;
  retrievedAt: string;
  period?: string;
  license?: string;
  payload: unknown;
}
