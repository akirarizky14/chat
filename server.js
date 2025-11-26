// import express from "express";
// import dotenv from "dotenv";
// import OpenAI from "openai";
// import mysql from "mysql2/promise";
// import multer from "multer";
// import { execFile } from "child_process";
// import fs from "fs";

// dotenv.config();
// const app = express();
// app.use(express.json());
// const upload = multer({ storage: multer.memoryStorage() });

// const db = await mysql.createConnection({
//   host: process.env.db_host,
//   user: process.env.db_user,
//   password: process.env.db_password,
//   database: process.env.db_database,
// });

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// app.post("/pdf-to-png", upload.single("file"), async (req, res) => {
//   try {
//     const pdfBuffer = req.file.buffer;

//     const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
//     const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
//     const page = await pdf.getPage(1);

//     const viewport = page.getViewport({ scale: 3 });
//     const canvasFactory = new pdfjsLib.NodeCanvasFactory();
//     const canvasAndContext = canvasFactory.create(
//       viewport.width,
//       viewport.height
//     );
//     const renderContext = {
//       canvasContext: canvasAndContext.context,
//       viewport: viewport,
//       canvasFactory,
//     };

//     await page.render(renderContext).promise;

//     const pngBuffer = canvasAndContext.canvas.toBuffer();

//     fs.writeFileSync("log_page.png", pngBuffer);

//     res.json({ success: true, message: "PNG created", file: "log_page.png" });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


// app.listen(5001, () =>
//   console.log("🚀 Server ready on http://localhost:5001")
// );
import app from "./src/app.js";

app.listen(5001, () =>
  console.log("🚀 Server running at http://localhost:5001")
);
