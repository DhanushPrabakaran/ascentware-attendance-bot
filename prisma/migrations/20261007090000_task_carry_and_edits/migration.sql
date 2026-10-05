-- Additive only: a nullable column on DailyTask and a new, empty TaskEdit table.

-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN "carriedFromId" TEXT;

-- CreateTable
CREATE TABLE "TaskEdit" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskEdit_taskId_idx" ON "TaskEdit"("taskId");

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_carriedFromId_fkey" FOREIGN KEY ("carriedFromId") REFERENCES "DailyTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEdit" ADD CONSTRAINT "TaskEdit_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEdit" ADD CONSTRAINT "TaskEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
