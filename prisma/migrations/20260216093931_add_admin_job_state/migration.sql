-- CreateTable
CREATE TABLE "AdminJobState" (
    "key" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminJobState_pkey" PRIMARY KEY ("key")
);
