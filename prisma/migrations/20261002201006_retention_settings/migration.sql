-- CreateTable
CREATE TABLE "RetentionSetting" (
    "key" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionSetting_pkey" PRIMARY KEY ("key")
);
