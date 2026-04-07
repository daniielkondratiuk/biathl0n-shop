// src/server/db/admin-job-state.ts
import { prisma } from "./prisma";

const COLISSIMO_AUTO_SYNC_KEY = "colissimo_tracking_auto_sync";

export async function getLastColissimoAutoSyncAt(): Promise<Date | null> {
  try {
    const row = await prisma.adminJobState.findUnique({
      where: { key: COLISSIMO_AUTO_SYNC_KEY },
    });
    return row?.lastRunAt ?? null;
  } catch (err) {
    console.error(
      "[AUTO_SYNC_ERROR] getLastColissimoAutoSyncAt failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function setLastColissimoAutoSyncAt(date: Date): Promise<void> {
  try {
    await prisma.adminJobState.upsert({
      where: { key: COLISSIMO_AUTO_SYNC_KEY },
      update: { lastRunAt: date },
      create: { key: COLISSIMO_AUTO_SYNC_KEY, lastRunAt: date },
    });
  } catch (err) {
    console.error(
      "[AUTO_SYNC_ERROR] setLastColissimoAutoSyncAt failed:",
      err instanceof Error ? err.message : err
    );
  }
}
