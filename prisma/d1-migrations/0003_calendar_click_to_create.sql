-- Existing profiles keep the current calendar interaction by default.
ALTER TABLE "user_preferences"
ADD COLUMN "calendarClickToCreate" BOOLEAN NOT NULL DEFAULT true;
