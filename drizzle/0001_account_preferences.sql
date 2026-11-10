CREATE TABLE "account_preferences" (
  "user_id" varchar(36) PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "preferences" json NOT NULL
);
