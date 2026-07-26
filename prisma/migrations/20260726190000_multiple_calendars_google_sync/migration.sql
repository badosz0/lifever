-- Native calendars
CREATE TABLE "lifever_calendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "lifever_calendar_pkey" PRIMARY KEY ("id")
);

INSERT INTO "lifever_calendar" (
    "id",
    "name",
    "color",
    "position",
    "visible",
    "userId"
)
SELECT
    'default-' || "id",
    'Personal',
    '#3B82F6',
    0,
    true,
    "id"
FROM "user";

ALTER TABLE "calendar_event"
ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "calendarId" TEXT;

ALTER TABLE "calendar_category"
ADD COLUMN "calendarId" TEXT;

UPDATE "calendar_category"
SET "calendarId" = 'default-' || "userId";

ALTER TABLE "calendar_category"
ALTER COLUMN "calendarId" SET NOT NULL;

UPDATE "calendar_event"
SET "calendarId" = 'default-' || "userId";

ALTER TABLE "calendar_event"
ALTER COLUMN "calendarId" SET NOT NULL;

-- Google Calendar connection and discovered calendars
CREATE TABLE "google_calendar_connection" (
    "userId" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "calendarListSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "google_calendar_connection_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "google_calendar" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "accessRole" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "google_calendar_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_preferences"
ADD COLUMN "calendarSourceConfiguration" JSONB NOT NULL DEFAULT '{}';

DROP INDEX "calendar_category_userId_position_idx";

CREATE INDEX "lifever_calendar_userId_position_idx"
ON "lifever_calendar"("userId", "position");

CREATE INDEX "calendar_category_calendarId_position_idx"
ON "calendar_category"("calendarId", "position");

CREATE INDEX "calendar_event_calendarId_startAt_idx"
ON "calendar_event"("calendarId", "startAt");

CREATE UNIQUE INDEX "google_calendar_userId_googleId_key"
ON "google_calendar"("userId", "googleId");

CREATE INDEX "google_calendar_userId_position_idx"
ON "google_calendar"("userId", "position");

ALTER TABLE "lifever_calendar"
ADD CONSTRAINT "lifever_calendar_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_event"
ADD CONSTRAINT "calendar_event_calendarId_fkey"
FOREIGN KEY ("calendarId") REFERENCES "lifever_calendar"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_category"
ADD CONSTRAINT "calendar_category_calendarId_fkey"
FOREIGN KEY ("calendarId") REFERENCES "lifever_calendar"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_calendar_connection"
ADD CONSTRAINT "google_calendar_connection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_calendar"
ADD CONSTRAINT "google_calendar_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
