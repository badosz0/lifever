-- D1 executes migrations inside a transaction, where `foreign_keys=OFF`
-- cannot be changed. Defer checks until the table rebuild is complete instead.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "lifever_calendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "lifever_calendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

CREATE TABLE "new_calendar_category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    CONSTRAINT "calendar_category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_category_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "lifever_calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_calendar_category" (
    "id",
    "name",
    "color",
    "position",
    "createdAt",
    "updatedAt",
    "userId",
    "calendarId"
)
SELECT
    "id",
    "name",
    "color",
    "position",
    "createdAt",
    "updatedAt",
    "userId",
    'default-' || "userId"
FROM "calendar_category";

CREATE TABLE "new_calendar_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    CONSTRAINT "calendar_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calendar_event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "new_calendar_category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "calendar_event_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "lifever_calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_calendar_event" (
    "id",
    "title",
    "startAt",
    "endAt",
    "location",
    "notes",
    "alertsEnabled",
    "allDay",
    "createdAt",
    "updatedAt",
    "userId",
    "categoryId",
    "calendarId"
)
SELECT
    "id",
    "title",
    "startAt",
    "endAt",
    "location",
    "notes",
    "alertsEnabled",
    false,
    "createdAt",
    "updatedAt",
    "userId",
    "categoryId",
    'default-' || "userId"
FROM "calendar_event";

DROP TABLE "calendar_event";
DROP TABLE "calendar_category";
ALTER TABLE "new_calendar_category" RENAME TO "calendar_category";
ALTER TABLE "new_calendar_event" RENAME TO "calendar_event";

CREATE TABLE "google_calendar_connection" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "encryptedRefreshToken" TEXT NOT NULL,
    "calendarListSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "google_calendar_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "google_calendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "googleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "accessRole" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "google_calendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "user_preferences"
ADD COLUMN "calendarSourceConfiguration" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "lifever_calendar_userId_position_idx"
ON "lifever_calendar"("userId", "position");

CREATE INDEX "calendar_event_userId_startAt_idx"
ON "calendar_event"("userId", "startAt");

CREATE INDEX "calendar_event_categoryId_idx"
ON "calendar_event"("categoryId");

CREATE INDEX "calendar_category_calendarId_position_idx"
ON "calendar_category"("calendarId", "position");

CREATE INDEX "calendar_event_calendarId_startAt_idx"
ON "calendar_event"("calendarId", "startAt");

CREATE UNIQUE INDEX "google_calendar_userId_googleId_key"
ON "google_calendar"("userId", "googleId");

CREATE INDEX "google_calendar_userId_position_idx"
ON "google_calendar"("userId", "position");

PRAGMA foreign_keys=ON;
