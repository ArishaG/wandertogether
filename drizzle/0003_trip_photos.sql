CREATE TABLE "trip_photos" (
	"trip_id" varchar(36) NOT NULL,
	"day" date NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"jpeg" text NOT NULL,
	CONSTRAINT "trip_photos_trip_id_day_user_id_pk" PRIMARY KEY("trip_id","day","user_id")
);
--> statement-breakpoint
ALTER TABLE "trip_photos" ADD CONSTRAINT "trip_photos_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_photos" ADD CONSTRAINT "trip_photos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
