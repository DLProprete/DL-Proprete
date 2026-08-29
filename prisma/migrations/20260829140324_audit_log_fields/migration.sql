/*
  Warnings:

  - You are about to drop the column `actorId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entity` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `entityType` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropIndex
DROP INDEX "AuditLog_entity_entityId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actorId",
DROP COLUMN "entity",
DROP COLUMN "payload",
ADD COLUMN     "actorUserId" TEXT,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "summary" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
