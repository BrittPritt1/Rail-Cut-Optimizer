import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  CreateDimensionBody,
  CreateDimensionResponse,
  DeleteDimensionParams,
  ListDimensionsResponse,
} from "@workspace/api-zod";
import { db, dimensionsTable } from "@workspace/db";
import { requireAdmin } from "../lib/admin-auth";

const router: IRouter = Router();

router.get("/dimensions", async (_req, res): Promise<void> => {
  const dimensions = await db
    .select()
    .from(dimensionsTable)
    .orderBy(asc(dimensionsTable.length));

  res.json(ListDimensionsResponse.parse(dimensions));
});

router.post("/dimensions", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateDimensionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dimension] = await db
    .insert(dimensionsTable)
    .values({ length: parsed.data.length })
    .returning();

  res.status(201).json(CreateDimensionResponse.parse(dimension));
});

router.delete("/dimensions/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = DeleteDimensionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [deleted] = await db
    .delete(dimensionsTable)
    .where(eq(dimensionsTable.id, parsed.data.id))
    .returning({ id: dimensionsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;