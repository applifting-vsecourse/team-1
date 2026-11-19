-- US-560: a new event starts with the evaluation mode not chosen yet. Existing events keep
-- their mode and are not blocked (published ones, ones with an application).
ALTER TABLE "event" ADD COLUMN "evaluationModePending" BOOLEAN NOT NULL DEFAULT false;
