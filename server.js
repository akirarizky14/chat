import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import mysql from "mysql2/promise";

dotenv.config();
const app = express();
app.use(express.json());

const db = await mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_database,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  const {
    message,
    model = "gpt-5-nano",
    context = "general",
    restriction = "none",
    reasoning = false,
    allow_external = false,
    user_id = "guest",
    conversations = 3
  } = req.body;

  console.log(`\n🧠 User: ${message}`);
  console.log(`⚙️ Model: ${model} | Context: ${context} | Reasoning: ${reasoning}`);
  console.log(`🔒 Restriction: ${restriction} | 🌐 External Allowed: ${allow_external}`);
  console.log(`👤 User ID: ${user_id}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const start = Date.now();
  let externalRefs = null;
  let reasoningTrace = "";

  try {
    const [memoryRows] = await db.execute(
      `SELECT user_message, ai_answer FROM ai_logs WHERE user_id = ? ORDER BY id DESC LIMIT ${conversations};`,
      [user_id]
    );

    const chatMemory = memoryRows
      .reverse()
      .map((r) => [
        { role: "user", content: r.user_message },
        { role: "assistant", content: r.ai_answer },
      ])
      .flat();

    console.log(`🧩 Loaded ${chatMemory.length / 2} previous turns for memory`);

    // 🧠 SYSTEM ROLE
    let systemRole = `
      You are an AI assistant specialized in CRM well data.
      Stay within the provided context: "${context}".
      If user asks something outside this context, respond: "${restriction}".
    `;

    if (reasoning) {
      systemRole += `
Always explain your reasoning briefly (how you interpret the question, which data/tables you check, and what logic you follow),
then give your final answer.`;
    }

    if (allow_external) {
      systemRole += `
If the CRM database snapshot lacks required fields or details,
you may use external references (domain knowledge or open data context) to fill missing gaps.
Always mention them clearly in your answer as "External Reference: ...".`;
    } else {
      systemRole += `
Do not use any external references. If data is missing, respond:
"This data is not available in the current database snapshot."`;
    }

    // 🧩 Load DB data jika context = "active wells"
    let combinedData = "";
    if (context.toLowerCase().includes("active wells")) {
      const [dragRows] = await db.execute(`SELECT * FROM crm_dragdrop_wells ORDER BY id DESC;`);

      const startIndex = dragRows.findIndex((r) => r.order_id === 1);
      const track =
        startIndex !== -1 ? dragRows.slice(0, startIndex + 1).reverse() : dragRows.slice(0, 10);

      const wellIds = [...new Set(track.map((r) => r.well_id))];
      // 🧩 Ambil data wells tapi hanya kolom penting
      const [wells] = wellIds.length
        ? await db.query(
            `SELECT well_name, operation_status, current_depth, culmulative_cost, updated_at
            FROM crm_wells 
            WHERE well_id IN (${wellIds.map((id) => `'${id}'`).join(",")});`
          )
        : [[]];

      // 🧹 Format data biar lebih mudah dipahami GPT (tanpa id, tapi deskriptif)
      const readableWells = wells.map((w, i) => ({
        name: w.well_name || `Unknown Well ${i + 1}`,
        operation: w.operation_status || "No operation info",
        current_depth: w.current_depth ?? "N/A",
        cost: w.culmulative_cost ? `$${Number(w.culmulative_cost).toLocaleString()}` : "N/A",
        last_updated: w.updated_at || "Unknown",
      }));

      // 🧾 Susun data gabungan dengan teks yang lebih natural
      combinedData = `
      Active Wells Snapshot (based on latest dragdrop order):

      ${readableWells
        .map(
          (w, i) => 
            `${i + 1}. ${w.name} Operation: ${w.operation}, ` +
            `Depth: ${w.current_depth}/${w.target_depth}, Cost: ${w.cost}, Updated: ${w.last_updated}`
        )
        .join("\n")}
      `;
    }

    // 💬 Build prompt input dengan memory
    const input = [
      { role: "system", content: systemRole },
      ...chatMemory, // 🧠 Tambahkan memory sebelumnya
      {
        role: "user",
        content: `User question: ${message}\n\nDatabase snapshot:\n${combinedData}`,
      },
    ];

    // 🔥 STREAM RESPONSE
    const stream = await openai.responses.stream({
      model,
      input,
    });

    let full = "";
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        res.write(event.delta);
        process.stdout.write(event.delta);
        full += event.delta;
      } else if (event.type === "response.completed") {
        res.end();
        console.log("\n\n✅ Stream selesai.");
        console.log(`🕒 Total waktu: ${((Date.now() - start) / 1000).toFixed(2)}s`);

        // 🔍 Deteksi reasoning
        if (reasoning) {
          reasoningTrace = full.includes("Step-by-step")
            ? full.split("Step-by-step reasoning:")[1]?.split("Answer:")[0]?.trim() || ""
            : "";
        }

        // 🔍 Deteksi external reference
        if (full.includes("External Reference:")) {
          const match = full.match(/External Reference:(.*?)(?:\n|$)/g);
          externalRefs = match ? match.join(", ") : null;
        }

        // 🧾 Simpan log ke DB (lengkap dengan memory & refs)
        await db.execute(
          `INSERT INTO ai_logs (user_id, user_message, intent_context, context_query, ai_reasoning, ai_answer, mode, external_sources)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            message,
            context,
            combinedData,
            reasoningTrace || (reasoning ? "enabled" : "disabled"),
            full,
            model,
            externalRefs,
          ]
        );
      }
    }
  } catch (err) {
    console.error("❌ Error:", err);
    res.write(`Error: ${err.message}`);
    res.end();
  }
});



app.listen(5001, () => console.log("🚀 Server running on http://localhost:5001"));
