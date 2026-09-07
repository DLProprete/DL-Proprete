-- AlterTable
ALTER TABLE "User" DROP COLUMN "maxEndTime",
DROP COLUMN "minStartTime",
DROP COLUMN "noWorkWeekdays",
ADD COLUMN     "scheduleExceptions" JSONB NOT NULL DEFAULT '[]';

