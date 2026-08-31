-- Growth-ready domain tables. Current production remains a single store (id = 1).
CREATE TABLE "Store" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'active',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai', "address" TEXT, "phone" TEXT, "settings" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL
);
INSERT INTO "Store" ("id", "code", "name", "updatedAt") VALUES (1, 'default', '默认门店', CURRENT_TIMESTAMP);
CREATE TABLE "BilliardTable" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "storeId" INTEGER NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "tableType" TEXT NOT NULL DEFAULT 'standard', "status" TEXT NOT NULL DEFAULT 'available', "hourlyRate" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "BilliardTable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "OpenSession" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "storeId" INTEGER NOT NULL, "tableId" INTEGER NOT NULL, "userId" INTEGER,
  "startedAt" DATETIME NOT NULL, "endedAt" DATETIME, "status" TEXT NOT NULL DEFAULT 'active', "minutes" INTEGER NOT NULL DEFAULT 0,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0, "source" TEXT NOT NULL DEFAULT 'manual', "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OpenSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OpenSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "BilliardTable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PointRule" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "storeId" INTEGER NOT NULL, "name" TEXT NOT NULL,
  "pointsPerMinute" INTEGER NOT NULL DEFAULT 1, "effectiveFrom" DATETIME NOT NULL, "effectiveTo" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'active', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "PointRule" ("storeId", "name", "pointsPerMinute", "effectiveFrom") VALUES (1, '默认积分规则', 1, CURRENT_TIMESTAMP);
CREATE TABLE "AuditLog" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "storeId" INTEGER NOT NULL, "actorType" TEXT NOT NULL, "actorId" INTEGER,
  "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" INTEGER, "requestId" TEXT, "details" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "username" TEXT NOT NULL, "password" TEXT NOT NULL, "storeId" INTEGER NOT NULL DEFAULT 1, "lastLoginAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO "new_Admin" ("id","username","password","createdAt") SELECT "id","username","password","createdAt" FROM "Admin";
DROP TABLE "Admin"; ALTER TABLE "new_Admin" RENAME TO "Admin"; CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
CREATE TABLE "new_User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "password" TEXT NOT NULL DEFAULT '123456', "points" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT '正常', "storeId" INTEGER NOT NULL DEFAULT 1, "email" TEXT, "avatarUrl" TEXT, "notes" TEXT, "lastActiveAt" DATETIME, "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO "new_User" ("id","name","phone","password","points","status","joinedAt") SELECT "id","name","phone","password","points","status","joinedAt" FROM "User";
DROP TABLE "User"; ALTER TABLE "new_User" RENAME TO "User"; CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone"); CREATE INDEX "User_storeId_status_idx" ON "User"("storeId","status");
CREATE TABLE "new_PkMatch" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "challengerId" INTEGER NOT NULL, "opponentId" INTEGER NOT NULL, "stake" INTEGER NOT NULL, "date" TEXT NOT NULL, "time" TEXT NOT NULL, "pairKey" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT '已预约', "winnerId" INTEGER, "note" TEXT, "resultNote" TEXT, "storeId" INTEGER NOT NULL DEFAULT 1, "createdById" INTEGER, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "settledAt" DATETIME, CONSTRAINT "PkMatch_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "PkMatch_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "PkMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE);
INSERT INTO "new_PkMatch" ("id","challengerId","opponentId","stake","date","time","pairKey","status","winnerId","note","createdAt","settledAt") SELECT "id","challengerId","opponentId","stake","date","time","pairKey","status","winnerId","note","createdAt","settledAt" FROM "PkMatch";
DROP TABLE "PkMatch"; ALTER TABLE "new_PkMatch" RENAME TO "PkMatch"; CREATE INDEX "PkMatch_date_status_idx" ON "PkMatch"("date","status"); CREATE INDEX "PkMatch_storeId_status_idx" ON "PkMatch"("storeId","status"); CREATE UNIQUE INDEX "PkMatch_date_time_pairKey_key" ON "PkMatch"("date","time","pairKey");
CREATE TABLE "new_PointRecord" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "userId" INTEGER NOT NULL, "amount" INTEGER NOT NULL, "before" INTEGER NOT NULL, "after" INTEGER NOT NULL, "note" TEXT, "operationId" TEXT, "storeId" INTEGER NOT NULL DEFAULT 1, "source" TEXT NOT NULL DEFAULT 'manual', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PointRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
INSERT INTO "new_PointRecord" ("id","userId","amount","before","after","note","operationId","createdAt") SELECT "id","userId","amount","before","after","note","operationId","createdAt" FROM "PointRecord";
DROP TABLE "PointRecord"; ALTER TABLE "new_PointRecord" RENAME TO "PointRecord"; CREATE UNIQUE INDEX "PointRecord_operationId_key" ON "PointRecord"("operationId"); CREATE INDEX "PointRecord_userId_createdAt_idx" ON "PointRecord"("userId","createdAt"); CREATE INDEX "PointRecord_storeId_createdAt_idx" ON "PointRecord"("storeId","createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code"); CREATE INDEX "Store_status_idx" ON "Store"("status"); CREATE INDEX "BilliardTable_storeId_status_idx" ON "BilliardTable"("storeId","status"); CREATE UNIQUE INDEX "BilliardTable_storeId_code_key" ON "BilliardTable"("storeId","code"); CREATE INDEX "OpenSession_storeId_status_idx" ON "OpenSession"("storeId","status"); CREATE INDEX "OpenSession_userId_startedAt_idx" ON "OpenSession"("userId","startedAt"); CREATE INDEX "PointRule_storeId_status_effectiveFrom_idx" ON "PointRule"("storeId","status","effectiveFrom"); CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId","createdAt"); CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType","entityId");
