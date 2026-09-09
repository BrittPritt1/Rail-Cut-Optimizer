import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dimensionsRouter from "./dimensions";
import cuttingRouter from "./cutting";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dimensionsRouter);
router.use(cuttingRouter);

export default router;
