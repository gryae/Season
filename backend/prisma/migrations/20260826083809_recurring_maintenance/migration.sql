-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('RUN_HOURS', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "TimeFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "MaintenanceSchedule" ADD COLUMN     "nextDueDate" TIMESTAMP(3),
ADD COLUMN     "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'RUN_HOURS',
ADD COLUMN     "timeFrequency" "TimeFrequency",
ADD COLUMN     "timeInterval" INTEGER,
ALTER COLUMN "intervalRunHours" DROP NOT NULL,
ALTER COLUMN "targetRunHours" DROP NOT NULL;
