import { pdfToPng } from "../utils/pdfToPng.js";
import fs from "fs";

export async function uploadPDF(req, res) {
  try {
    const buffer = req.file.buffer;
    const output = `uploads/png/${Date.now()}.png`;

    await pdfToPng(buffer, output);

    res.json({
      success: true,
      png: output
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
