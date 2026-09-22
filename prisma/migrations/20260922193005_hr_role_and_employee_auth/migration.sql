/*
  Warnings:

  - You are about to drop the column `adminEmail` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `adminPasswordHash` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `adminUsername` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HR';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "hrEmail" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "adminEmail",
DROP COLUMN "adminPasswordHash",
DROP COLUMN "adminUsername";
