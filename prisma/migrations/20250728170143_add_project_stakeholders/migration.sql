/*
  Warnings:

  - You are about to drop the column `isPrimary` on the `contacts` table. All the data in the column will be lost.
  - You are about to drop the column `budget` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "isPrimary";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "budget";

-- CreateTable
CREATE TABLE "project_stakeholders" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_stakeholders_projectId_idx" ON "project_stakeholders"("projectId");

-- CreateIndex
CREATE INDEX "project_stakeholders_contactId_idx" ON "project_stakeholders"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "project_stakeholders_projectId_contactId_key" ON "project_stakeholders"("projectId", "contactId");

-- CreateIndex
CREATE INDEX "attachments_rfiId_idx" ON "attachments"("rfiId");

-- CreateIndex
CREATE INDEX "attachments_createdAt_idx" ON "attachments"("createdAt");

-- CreateIndex
CREATE INDEX "contacts_active_idx" ON "contacts"("active");

-- CreateIndex
CREATE INDEX "email_logs_rfiId_idx" ON "email_logs"("rfiId");

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- CreateIndex
CREATE INDEX "email_logs_success_idx" ON "email_logs"("success");

-- CreateIndex
CREATE INDEX "responses_rfiId_idx" ON "responses"("rfiId");

-- CreateIndex
CREATE INDEX "responses_authorId_idx" ON "responses"("authorId");

-- CreateIndex
CREATE INDEX "responses_createdAt_idx" ON "responses"("createdAt");

-- CreateIndex
CREATE INDEX "rfis_priority_idx" ON "rfis"("priority");

-- CreateIndex
CREATE INDEX "rfis_urgency_idx" ON "rfis"("urgency");

-- CreateIndex
CREATE INDEX "rfis_createdById_idx" ON "rfis"("createdById");

-- CreateIndex
CREATE INDEX "rfis_dateSent_idx" ON "rfis"("dateSent");

-- CreateIndex
CREATE INDEX "rfis_dateReceived_idx" ON "rfis"("dateReceived");

-- CreateIndex
CREATE INDEX "rfis_createdAt_idx" ON "rfis"("createdAt");

-- CreateIndex
CREATE INDEX "rfis_status_priority_urgency_idx" ON "rfis"("status", "priority", "urgency");

-- CreateIndex
CREATE INDEX "rfis_projectId_status_idx" ON "rfis"("projectId", "status");

-- CreateIndex
CREATE INDEX "rfis_clientId_status_idx" ON "rfis"("clientId", "status");

-- CreateIndex
CREATE INDEX "rfis_dateNeededBy_status_idx" ON "rfis"("dateNeededBy", "status");

-- AddForeignKey
ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
