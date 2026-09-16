-- CreateTable
CREATE TABLE "AgentSiteCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "occurredOn" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSiteCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSiteCheckIn_siteId_userId_occurredOn_idx" ON "AgentSiteCheckIn"("siteId", "userId", "occurredOn");

-- AddForeignKey
ALTER TABLE "AgentSiteCheckIn" ADD CONSTRAINT "AgentSiteCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSiteCheckIn" ADD CONSTRAINT "AgentSiteCheckIn_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSiteCheckIn" ADD CONSTRAINT "AgentSiteCheckIn_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
