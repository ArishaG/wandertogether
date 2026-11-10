CREATE TABLE IF NOT EXISTS "trip_invitations" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "trip_id" varchar(36) NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "invited_by" varchar(36) REFERENCES "user"("id") ON DELETE SET NULL,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_by" varchar(36) REFERENCES "user"("id") ON DELETE SET NULL,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "trip_invitations_trip_email_idx" ON "trip_invitations" ("trip_id", "email");
