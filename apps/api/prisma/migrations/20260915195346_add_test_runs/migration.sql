-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TestResultStatus" AS ENUM ('NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED');

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "status" "TestResultStatus" NOT NULL DEFAULT 'NOT_RUN',
    "notes" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestRun_projectId_idx" ON "TestRun"("projectId");

-- CreateIndex
CREATE INDEX "TestRun_createdById_idx" ON "TestRun"("createdById");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_idx" ON "TestResult"("testRunId");

-- CreateIndex
CREATE INDEX "TestResult_testCaseId_idx" ON "TestResult"("testCaseId");

-- CreateIndex
CREATE INDEX "TestResult_executedById_idx" ON "TestResult"("executedById");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_testRunId_testCaseId_key" ON "TestResult"("testRunId", "testCaseId");

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
