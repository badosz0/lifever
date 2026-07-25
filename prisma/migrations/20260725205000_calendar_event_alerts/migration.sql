-- Existing and newly created events receive the requested default alert pair.
ALTER TABLE "calendar_event"
ADD COLUMN "alertsEnabled" BOOLEAN NOT NULL DEFAULT true;
