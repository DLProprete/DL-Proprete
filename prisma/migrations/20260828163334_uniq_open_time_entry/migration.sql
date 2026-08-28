-- Un seul TimeEntry OPEN par agent à la fois (règle métier, non exprimable
-- en Prisma schema — voir docs/ARCHITECTURE.md section 2).
CREATE UNIQUE INDEX "uniq_open_time_entry" ON "TimeEntry"("userId") WHERE "status" = 'OPEN';
