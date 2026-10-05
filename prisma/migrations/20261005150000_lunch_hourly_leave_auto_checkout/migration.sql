-- Additive only: new nullable/defaulted columns, no existing data rewritten.
-- Existing breaks become type 'break'; existing leave stays full-day (times NULL).

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "autoCheckedOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttendanceBreak" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'break';

-- AlterTable
ALTER TABLE "Leave" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "startTime" TEXT;
