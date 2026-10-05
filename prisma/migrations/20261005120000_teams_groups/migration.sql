-- Additive only: no existing column or row is dropped or rewritten.

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "botServiceUrl" TEXT,
ADD COLUMN     "botTenantId" TEXT;

-- CreateTable
CREATE TABLE "TeamsGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamsGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamsGroup_conversationId_key" ON "TeamsGroup"("conversationId");

-- CreateIndex
CREATE INDEX "_EmployeeGroups_B_index" ON "_EmployeeGroups"("B");

-- AddForeignKey
ALTER TABLE "_EmployeeGroups" ADD CONSTRAINT "_EmployeeGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeGroups" ADD CONSTRAINT "_EmployeeGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "TeamsGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: every ID in the legacy comma-separated Settings.commonGroupId becomes a
-- default TeamsGroup. No employee has groups assigned yet, so everyone falls back to the
-- defaults - announcements keep going to exactly the same chats as before this migration.
INSERT INTO "TeamsGroup" ("id", "name", "conversationId", "isDefault", "isActive", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'Common group ' || ROW_NUMBER() OVER (ORDER BY ids.first_pos),
    ids.conversation_id,
    true,
    true,
    CURRENT_TIMESTAMP
FROM (
    SELECT TRIM(part) AS conversation_id, MIN(pos) AS first_pos
    FROM "Settings",
         unnest(string_to_array("commonGroupId", ',')) WITH ORDINALITY AS t(part, pos)
    WHERE "Settings"."id" = 'default' AND TRIM(part) <> ''
    GROUP BY TRIM(part)
) AS ids
ON CONFLICT ("conversationId") DO NOTHING;
