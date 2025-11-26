import express from "express";
import { digitizeGR, digitizeALL } from "../controllers/digitizer.controller.js";

const router = express.Router();

router.post("/gr", digitizeGR);
router.post("/all", digitizeALL);

export default router;
