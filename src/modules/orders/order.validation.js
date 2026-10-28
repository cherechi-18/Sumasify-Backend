import { z } from "zod";

const orderStatuses = [
"awaiting_payment",
"payment_review",
"paid",
"in_fulfilment",
"completed",
"payment_rejected",
"cancelled",
"expired",
];

export const orderListQuerySchema = z.object({
page: z.coerce
.number()
.int("Page must be a whole number")
.min(1, "Page must be at least 1")
.default(1),

pagesize: z.coerce
.number()
.int("Page size must be a whole number")
.min(1, "Page size must be at least 1")
.max(50, "Page size cannot exceed 50")
.default(20),

status: z
.enum(orderStatuses)
.optional(),
});

export const orderIdSchema = z.object({
orderid: z.string().uuid("Invalid order ID"),
});