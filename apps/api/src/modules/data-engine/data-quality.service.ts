import { SourceRecord } from "./data-source.types";

export interface QualityResult {
  valid: boolean;
  score: number;
  issues: string[];
}

export function validateSourceRecord(record: SourceRecord): QualityResult {
  const issues: string[] = [];

  if (!record.sourceName) issues.push("sourceName is required");
  if (!record.retrievedAt) issues.push("retrievedAt is required");
  if (!record.trustLevel) issues.push("trustLevel is required");
  if (record.payload == null) issues.push("payload is empty");

  const score = Math.max(0, 100 - issues.length * 25);

  return {
    valid: issues.length === 0,
    score,
    issues,
  };
}
