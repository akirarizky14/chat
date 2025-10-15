import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "redis";

dotenv.config();

// 🧠 Inisialisasi Redis
const redis = createClient({ url: "redis://127.0.0.1:6379" });
redis.on("error", (err) => console.error("Redis error:", err));
await redis.connect();
console.log("✅ Connected to Redis");

// 🧠 Inisialisasi OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🧠 Fungsi utama streaming GPT langsung
async function streamChat({
  message,
  model = "gpt-5-nano",
  context = "active wells",
  restriction = "Can't answer outside active wells scope.",
  reasoning = false,
  allow_external = true,
  user_id = "183151",
  conversations = 3,
}) {
  console.log(`\n🧠 User: ${message}`);
  console.log(`⚙️ Model: ${model} | Context: ${context}`);
  console.log(`👤 User ID: ${user_id}`);

  const start = Date.now();

  // 🔹 Ambil memory dari Redis
  const memoryKey = `memory:${user_id}`;
  const chatMemory = [];
  const pastChats = await redis.lRange(memoryKey, -conversations * 2, -1);

  if (pastChats.length) {
    for (let i = 0; i < pastChats.length; i += 2) {
      chatMemory.push({ role: "user", content: pastChats[i] });
      if (pastChats[i + 1])
        chatMemory.push({ role: "assistant", content: pastChats[i + 1] });
    }
  }
  console.log(`🧩 Loaded ${chatMemory.length / 2} previous turns from Redis memory`);

  // 🔹 Setup system role
  let systemRole = `
  You are an AI assistant specialized in CRM well data.
  Stay within the provided context: "${context}".
  If user asks something outside this context, respond: "${restriction}".`;

  if (reasoning) {
    systemRole += `
    Always explain your reasoning briefly (how you interpret the question, which data/tables you check, and what logic you follow),
    then give your final answer.`;
  }

  if (allow_external) {
    systemRole += `
    If CRM data is missing, you may use external references (domain knowledge or open data context) to fill missing gaps.
    Mention clearly: "External Reference: ..."`;
  }

  // 🔹 Load snapshot dari Redis
  let combinedData = "";
  if (context.toLowerCase().includes("active wells")) {
    const snapshot = await redis.get("snapshot:crm_wells:latest10");
    if (!snapshot) {
      console.log("⚠️ No cached well data found in Redis.");
      return;
    }

    const wells = JSON.parse(snapshot);
    combinedData = wells
      .slice(0, 5)
      .map(
        (w, i) =>
          `${i + 1}. ${w.well_name} — Operation: ${w.operation_status || "N/A"}, ` +
          `Depth: ${w.current_depth || "N/A"}, Updated: ${w.updated_at}`
      )
      .join("\n");
  }

  // 🔹 Build prompt input
  const input = [
    { role: "system", content: systemRole },
    ...chatMemory,
    { role: "user", content: `User question: ${message}\n\nDatabase snapshot:\n${combinedData}` },
  ];

  // 🔥 Stream langsung
  const stream = await openai.responses.stream({ model, input });

  let full = "";
  console.log("\n💬 GPT Response:\n");
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      process.stdout.write(event.delta); // tampilkan real-time di terminal
      full += event.delta;
    } else if (event.type === "response.completed") {
      console.log(`\n\n✅ Stream selesai dalam ${(Date.now() - start) / 1000}s`);

      // 🔹 Simpan memory ke Redis
      await redis
        .multi()
        .rPush(memoryKey, message, full)
        .lTrim(memoryKey, -conversations * 2, -1)
        .exec();
    }
  }
}

// 🚀 Jalankan contoh
await streamChat({
  message: "Show me which wells are active right now.",
  reasoning: true,
  allow_external: true,
});
