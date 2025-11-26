import express from "express";
import pdfRoutes from "./routes/pdf.routes.js";
import digitizerRoutes from "./routes/digitizer.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();
app.use(express.json());

app.use("/pdf", pdfRoutes);
app.use("/digitize", digitizerRoutes);
app.use("/chat", chatRoutes);

export default app;
