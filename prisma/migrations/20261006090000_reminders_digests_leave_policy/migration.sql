-- Additive only: new columns have defaults or are nullable, new tables are empty.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_CANCELLED';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "teamsConversationId" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "checkInReminderTime" TEXT NOT NULL DEFAULT '10:00',
ADD COLUMN "checkOutReminderTime" TEXT NOT NULL DEFAULT '19:00',
ADD COLUMN "digestsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "morningDigestTime" TEXT NOT NULL DEFAULT '10:30',
ADD COLUMN "eveningDigestTime" TEXT NOT NULL DEFAULT '20:00',
ADD COLUMN "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];

-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: number existing tasks within each day's plan by creation time.
UPDATE "DailyTask" t
SET "position" = o.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "attendanceId" ORDER BY "createdAt", "id") - 1 AS rn
  FROM "DailyTask"
) o
WHERE t."id" = o."id";

-- CreateTable
CREATE TABLE "ScheduledSend" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledSend_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "leaveType" TEXT NOT NULL,
    "annualDays" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("leaveType")
);
