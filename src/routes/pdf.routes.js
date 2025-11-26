import express from "express";
import multer from "multer";
import { uploadPDF } from "../controllers/pdf.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/upload", upload.single("file"), uploadPDF);

export default router;
