// controllers/chat.controller.js
import OpenAI from "openai";
import { db } from "../config/db.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handleChat = async (req, res) => {
  try {
    const {
      message,
      model = "gpt-5-nano",
      user_id = "guest",
      mode = "general"
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // 1️⃣ INSERT user message dulu
    await db.query(
      `INSERT INTO ai_logs (user_id, user_message, mode)
       VALUES (?, ?, ?)`,
      [user_id, message, mode]
    );

    // 2️⃣ Ambil history (10 terakhir)
    const [rows] = await db.query(
      `SELECT user_message, ai_answer
       FROM ai_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [user_id]
    );

    //  Format menjadi messages untuk OpenAI
    const chatHistory = [];
    rows.reverse().forEach(row => {
      if (row.user_message) {
        chatHistory.push({
          role: "user",
          content: row.user_message
        });
      }
      if (row.ai_answer) {
        chatHistory.push({
          role: "assistant",
          content: row.ai_answer
        });
      }
    });

    // 3️⃣ OpenAI call
    const completion = await openai.chat.completions.create({
      model,
      messages: chatHistory,
    });

    const reply = completion.choices?.[0]?.message?.content || "No reply";

    // 4️⃣ Update baris terakhir → tambah ai_answer
    await db.query(
      `UPDATE ai_logs
       SET ai_answer = ?
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [reply, user_id]
    );

    res.json({
      success: true,
      reply,
    });

  } catch (err) {
    console.error("❌ Chat Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
