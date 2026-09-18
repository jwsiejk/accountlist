-- CreateTable
CREATE TABLE "ImapPollCursor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mailbox" TEXT NOT NULL,
    "uidValidity" INTEGER NOT NULL,
    "lastUid" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ImapPollCursor_mailbox_key" ON "ImapPollCursor"("mailbox");
