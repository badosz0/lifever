CREATE TABLE "kanban_project" (
    "id" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "kanban_project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_share" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "resource_share_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_invite" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipientId" TEXT,

    CONSTRAINT "resource_invite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kanban_project_ownerId_updatedAt_idx"
ON "kanban_project"("ownerId", "updatedAt");

CREATE UNIQUE INDEX "resource_share_resourceType_resourceId_userId_key"
ON "resource_share"("resourceType", "resourceId", "userId");

CREATE INDEX "resource_share_ownerId_resourceType_idx"
ON "resource_share"("ownerId", "resourceType");

CREATE INDEX "resource_share_userId_resourceType_idx"
ON "resource_share"("userId", "resourceType");

CREATE UNIQUE INDEX "resource_invite_resourceType_resourceId_email_key"
ON "resource_invite"("resourceType", "resourceId", "email");

CREATE INDEX "resource_invite_email_status_createdAt_idx"
ON "resource_invite"("email", "status", "createdAt");

CREATE INDEX "resource_invite_ownerId_resourceType_resourceId_idx"
ON "resource_invite"("ownerId", "resourceType", "resourceId");

ALTER TABLE "kanban_project"
ADD CONSTRAINT "kanban_project_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_share"
ADD CONSTRAINT "resource_share_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_share"
ADD CONSTRAINT "resource_share_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_invite"
ADD CONSTRAINT "resource_invite_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resource_invite"
ADD CONSTRAINT "resource_invite_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
