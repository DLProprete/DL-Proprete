-- CreateTable
CREATE TABLE "ClientPortalToken" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_tokenHash_key" ON "ClientPortalToken"("tokenHash");
