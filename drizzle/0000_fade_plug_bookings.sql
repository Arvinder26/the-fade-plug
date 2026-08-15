CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`manage_token_hash` text NOT NULL,
	`manage_token_nonce` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`service_id` text NOT NULL,
	`service_name` text NOT NULL,
	`service_price_cents` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`location` text NOT NULL,
	`suburb` text,
	`travel_fee_cents` integer DEFAULT 0 NOT NULL,
	`appointment_date` text NOT NULL,
	`start_minutes` integer NOT NULL,
	`end_minutes` integer NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`total_cents` integer NOT NULL,
	`deposit_cents` integer NOT NULL,
	`processing_fee_cents` integer DEFAULT 0 NOT NULL,
	`balance_cents` integer NOT NULL,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`notes` text,
	`marketing_consent` integer DEFAULT false NOT NULL,
	`reference_image_key` text,
	`cancellation_deadline` text NOT NULL,
	`reschedule_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);
--> statement-breakpoint
CREATE INDEX `bookings_email_reference_idx` ON `bookings` (`email`,`reference`);
--> statement-breakpoint
CREATE INDEX `bookings_appointment_idx` ON `bookings` (`appointment_date`,`start_minutes`);
--> statement-breakpoint
CREATE TABLE `booking_slots` (
	`appointment_date` text NOT NULL,
	`slot_minutes` integer NOT NULL,
	`booking_id` text NOT NULL,
	PRIMARY KEY(`appointment_date`, `slot_minutes`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `booking_slots_booking_idx` ON `booking_slots` (`booking_id`);
--> statement-breakpoint
CREATE TABLE `processed_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_action_locks` (
	`key` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`request_count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `request_rate_limits_reset_idx` ON `request_rate_limits` (`reset_at`);
