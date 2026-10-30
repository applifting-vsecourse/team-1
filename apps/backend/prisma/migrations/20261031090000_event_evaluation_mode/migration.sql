-- US-101: how the event evaluates applications. Existing events keep the current behaviour (automatic).
CREATE TYPE "evaluation_mode" AS ENUM ('AUTOMATIC', 'MANUAL');

ALTER TABLE "event" ADD COLUMN "evaluationMode" "evaluation_mode" NOT NULL DEFAULT 'AUTOMATIC';
