-- Retire cross-account access while preserving notes, calendars, and projects.
DROP TABLE IF EXISTS "resource_invite";
DROP TABLE IF EXISTS "resource_share";
