import { Router } from "express";

import swingRouter from "./swing";
import fvgRouter from "./fair-value-gap";

const router = Router();
export default router;

router.use('fvgs', fvgRouter);
router.use('swings', swingRouter);