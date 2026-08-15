import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  manageTokenHash: text("manage_token_hash").notNull(),
  manageTokenNonce: text("manage_token_nonce").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  servicePriceCents: integer("service_price_cents").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  location: text("location", { enum: ["studio", "mobile"] }).notNull(),
  suburb: text("suburb"),
  travelFeeCents: integer("travel_fee_cents").notNull().default(0),
  appointmentDate: text("appointment_date").notNull(),
  startMinutes: integer("start_minutes").notNull(),
  endMinutes: integer("end_minutes").notNull(),
  status: text("status", { enum: ["pending_payment", "confirmed", "cancelled", "expired"] }).notNull().default("pending_payment"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  totalCents: integer("total_cents").notNull(),
  depositCents: integer("deposit_cents").notNull(),
  processingFeeCents: integer("processing_fee_cents").notNull().default(0),
  balanceCents: integer("balance_cents").notNull(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  notes: text("notes"),
  marketingConsent: integer("marketing_consent", { mode: "boolean" }).notNull().default(false),
  referenceImageKey: text("reference_image_key"),
  cancellationDeadline: text("cancellation_deadline").notNull(),
  rescheduleCount: integer("reschedule_count").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [
  uniqueIndex("bookings_reference_unique").on(table.reference),
  index("bookings_email_reference_idx").on(table.email, table.reference),
  index("bookings_appointment_idx").on(table.appointmentDate, table.startMinutes),
]);

export const bookingSlots = sqliteTable("booking_slots", {
  appointmentDate: text("appointment_date").notNull(),
  slotMinutes: integer("slot_minutes").notNull(),
  bookingId: text("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
}, table => [
  primaryKey({ columns: [table.appointmentDate, table.slotMinutes] }),
  index("booking_slots_booking_idx").on(table.bookingId),
]);

export const processedWebhookEvents = sqliteTable("processed_webhook_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: integer("processed_at").notNull(),
});

export const bookingActionLocks = sqliteTable("booking_action_locks", {
  key: text("key").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

export const requestRateLimits = sqliteTable("request_rate_limits", {
  key: text("key").primaryKey(),
  requestCount: integer("request_count").notNull(),
  resetAt: integer("reset_at").notNull(),
}, table => [
  index("request_rate_limits_reset_idx").on(table.resetAt),
]);
