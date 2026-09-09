import { Router, type IRouter } from "express";
import {
  CalculateCutPlanBody,
  CalculateCutPlanResponse,
} from "@workspace/api-zod";
import { CutPlanOptimizer } from "../lib/cut-plan-optimizer";

const router: IRouter = Router();
const optimizer = new CutPlanOptimizer();

router.post("/cut-plans", (req, res): void => {
  const parsed = CalculateCutPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const plan = optimizer.calculate(parsed.data.requests);
    res.json(CalculateCutPlanResponse.parse(plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate cut plan";
    res.status(400).json({ error: message });
  }
});

export default router;