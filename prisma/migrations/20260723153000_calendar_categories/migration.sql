-- CreateTable
CREATE TABLE "calendar_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "calendar_category_pkey" PRIMARY KEY ("id")
);

-- Add the new relation before removing the legacy color field.
ALTER TABLE "calendar_event" ADD COLUMN "categoryId" TEXT;

-- Give every existing account the same curated starting palette.
INSERT INTO "calendar_category" (
    "id",
    "name",
    "color",
    "position",
    "createdAt",
    "updatedAt",
    "userId"
)
SELECT
    'calendar_category_' || md5(users."id" || ':' || palette.key),
    palette.name,
    palette.color,
    palette.position,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    users."id"
FROM "user" AS users
CROSS JOIN (
    VALUES
        ('blue', 'Work', '#3b82f6', 0),
        ('violet', 'Focus', '#8b5cf6', 1),
        ('orange', 'Personal', '#f97316', 2),
        ('green', 'Health', '#10b981', 3),
        ('pink', 'Planning', '#ec4899', 4),
        ('red', 'Important', '#ef4444', 5)
) AS palette(key, name, color, position);

-- Preserve every event's previous visual identity during the migration.
UPDATE "calendar_event" AS event
SET "categoryId" = 'calendar_category_' || md5(
    event."userId" || ':' ||
    CASE
        WHEN event."color" IN ('blue', 'violet', 'orange', 'green', 'pink', 'red')
            THEN event."color"
        ELSE 'blue'
    END
);

ALTER TABLE "calendar_event" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "calendar_event" DROP COLUMN "color";

-- CreateIndex
CREATE INDEX "calendar_category_userId_position_idx" ON "calendar_category"("userId", "position");

-- CreateIndex
CREATE INDEX "calendar_event_categoryId_idx" ON "calendar_event"("categoryId");

-- AddForeignKey
ALTER TABLE "calendar_category" ADD CONSTRAINT "calendar_category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "calendar_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
