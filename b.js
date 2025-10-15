import mysql from "mysql2/promise";
import { createClient } from "redis";

const db = await mysql.createConnection({
  host: "rm-d9jbp95575wybt40bzo.mysql.ap-southeast-5.rds.aliyuncs.com",
  user: "root",
  password: "wxjV8Rxy3BTW",
  database: "petronas_staging",
});

const redis = createClient({ url: "redis://127.0.0.1:6379" });
redis.on("error", (err) => console.error("Redis error:", err));
await redis.connect();

console.log("✅ Connected to MySQL & Redis");

// Ambil 10 data terbawah dari crm_wells
const [rows] = await db.query(`
  SELECT well_id, well_name, operation_status, current_depth, updated_at
  FROM crm_wells
  ORDER BY well_id DESC
  LIMIT 10;
`);

// Simpan tiap well sebagai key terpisah
for (const row of rows) {
  const key = `well:${row.well_id}`;
  await redis.set(key, JSON.stringify(row));
  console.log(`💾 Cached ${key} (${row.well_name})`);
}

// Simpan semua sekaligus juga ke snapshot
await redis.set("snapshot:crm_wells:latest10", JSON.stringify(rows));

console.log("🎉 Successfully cached 10 latest wells to Redis!");

await redis.quit();
await db.end();
