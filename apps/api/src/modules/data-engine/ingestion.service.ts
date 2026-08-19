import { validateSourceRecord } from "./data-quality.service";
import { SourceRecord } from "./data-source.types";

export interface IngestionRepository {
  saveRaw(record: SourceRecord): Promise<void>;
  saveQuality(result: {
    sourceName: string;
    retrievedAt: string;
    score: number;
    valid: boolean;
  }): Promise<void>;
}

export async function ingest(
  record: SourceRecord,
  repository: IngestionRepository,
): Promise<void> {
  // Raw payload is retained for traceability.
  await repository.saveRaw(record);

  const quality = validateSourceRecord(record);

  await repository.saveQuality({
    sourceName: record.sourceName,
    retrievedAt: record.retrievedAt,
    score: quality.score,
    valid: quality.valid,
  });

  if (!quality.valid) {
    throw new Error(`Data quality failed: ${quality.issues.join(", ")}`);
  }
}
