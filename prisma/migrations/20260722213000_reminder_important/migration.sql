-- Keep existing flagged reminders while adopting the clearer Important name.
ALTER TABLE "reminder" RENAME COLUMN "flagged" TO "important";

-- Priority is no longer part of the reminder experience.
ALTER TABLE "reminder" DROP COLUMN "priority";
DROP TYPE "ReminderPriority";
