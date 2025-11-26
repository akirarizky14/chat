import { db } from "../config/db.js";

export async function insertLWD(well_id, dataset) {
  for (const row of dataset) {
    await db.execute(
      `INSERT INTO petronas_staging.well_log_lwd 
       (well_id, depth, gr) VALUES (?, ?, ?)`,
      [well_id, row.depth, row.value]
    );
  }
}
