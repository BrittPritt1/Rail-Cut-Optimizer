import { createInsertSchema } from "drizzle-zod";
import { real, serial, timestamp, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const dimensionsTable = pgTable("dimensions", {
  id: serial("id").primaryKey(),
  length: real("length").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDimensionSchema = createInsertSchema(dimensionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDimension = z.infer<typeof insertDimensionSchema>;
export type Dimension = typeof dimensionsTable.$inferSelect;