CREATE TABLE `trip` (
	`id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`trip_type` varchar(32) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'Planning',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip` ADD CONSTRAINT `trip_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;