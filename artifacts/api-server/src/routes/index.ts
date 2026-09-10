import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dimensionsRouter from "./dimensions";
import cuttingRouter from "./cutting";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dimensionsRouter);
router.use(cuttingRouter);
router.use(adminRouter);

export default router;
