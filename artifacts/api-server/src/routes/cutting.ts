import { Router, type IRouter } from "express";
import {
  CalculateCutPlanBody,
  CalculateCutPlanResponse,
} from "@workspace/api-zod";
import { db, dimensionsTable } from "@workspace/db";
import { CutPlanOptimizer } from "../lib/cut-plan-optimizer";

const router: IRouter = Router();
const optimizer = new CutPlanOptimizer();

router.post("/cut-plans", async (req, res): Promise<void> => {
  const parsed = CalculateCutPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const dimensions = await db
      .select({ length: dimensionsTable.length })
      .from(dimensionsTable);
    const plan = optimizer.calculate(
      parsed.data.requests,
      dimensions.map((dimension) => dimension.length),
    );
    res.json(CalculateCutPlanResponse.parse(plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate cut plan";
    res.status(400).json({ error: message });
  }
});

export default router;