ALTER TABLE "user_preferences"
ADD COLUMN "appConfiguration" JSONB NOT NULL DEFAULT '{}'::jsonb;
