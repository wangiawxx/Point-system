-- Immutable operation identifiers make point writes idempotent.
ALTER TABLE "PointRecord" ADD COLUMN "operationId" TEXT;

-- SQLite requires recreating the table to add the pair-level unique constraint.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PkMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "challengerId" INTEGER NOT NULL,
    "opponentId" INTEGER NOT NULL,
    "stake" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '已预约',
    "winnerId" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    CONSTRAINT "PkMatch_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PkMatch_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PkMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PkMatch" ("challengerId", "createdAt", "date", "id", "note", "opponentId", "pairKey", "settledAt", "stake", "status", "time", "winnerId")
SELECT "challengerId", "createdAt", "date", "id", "note", "opponentId",
       CASE WHEN "challengerId" < "opponentId" THEN CAST("challengerId" AS TEXT) || ':' || CAST("opponentId" AS TEXT)
            ELSE CAST("opponentId" AS TEXT) || ':' || CAST("challengerId" AS TEXT) END,
       "settledAt", "stake", "status", "time", "winnerId"
FROM "PkMatch";
DROP TABLE "PkMatch";
ALTER TABLE "new_PkMatch" RENAME TO "PkMatch";
CREATE INDEX "PkMatch_date_status_idx" ON "PkMatch"("date", "status");
CREATE UNIQUE INDEX "PkMatch_date_time_pairKey_key" ON "PkMatch"("date", "time", "pairKey");
CREATE UNIQUE INDEX "PointRecord_operationId_key" ON "PointRecord"("operationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
