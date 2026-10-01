-- Adds batches (Campaign -> Batch -> Prospect) and per-message sequence steps
-- to the outreach module.
--
-- Purely ADDITIVE: no table is dropped or rebuilt, so every existing
-- campaign, prospect, message and tracking event is preserved (unlike the
-- previous outreach migration). Existing prospects are backfilled into a
-- "Batch 1" per campaign, and existing messages default to step 1 (Email 1).

-- Campaign: suggested gaps between sequence emails (days)
ALTER TABLE "Campaign" ADD COLUMN "email2DelayDays" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Campaign" ADD COLUMN "email3DelayDays" INTEGER NOT NULL DEFAULT 4;

-- Template: which sequence email this template is (1-3), or NULL
ALTER TABLE "Template" ADD COLUMN "sequenceStep" INTEGER;

-- OutreachMessage: which sequence email this message was sent as
ALTER TABLE "OutreachMessage" ADD COLUMN "step" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Batch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Batch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_campaignId_name_key" ON "Batch"("campaignId", "name");
CREATE INDEX "Batch_campaignId_idx" ON "Batch"("campaignId");

-- Prospect: optional batch membership (NULL = Unassigned)
ALTER TABLE "Prospect" ADD COLUMN "batchId" INTEGER REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Prospect_batchId_idx" ON "Prospect"("batchId");

-- Backfill: every campaign that already has prospects gets a "Batch 1"
-- holding them, so nothing shows up as Unassigned after upgrading.
INSERT INTO "Batch" ("campaignId", "name", "createdAt", "updatedAt")
SELECT DISTINCT "campaignId", 'Batch 1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Prospect";

UPDATE "Prospect"
SET "batchId" = (
  SELECT "Batch"."id" FROM "Batch"
  WHERE "Batch"."campaignId" = "Prospect"."campaignId" AND "Batch"."name" = 'Batch 1'
);
