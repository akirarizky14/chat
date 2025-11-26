import { db } from "../config/db.js";

export async function insertAllToDB(well_id, logs) {

  // ========================================
  // MERGE LWD PER DEPTH
  // ========================================
  let LWD = {};

  function mergeLWD(curve, key) {
    if (!curve) return;
    for (const row of curve) {
      const d = row.depth;
      if (!LWD[d]) LWD[d] = { well_id, depth: d };

      LWD[d][key] = row.value;
    }
  }

  mergeLWD(logs.GR,   "gr");
  mergeLWD(logs.P16H, "p16h");
  mergeLWD(logs.P28H, "p28h");
  mergeLWD(logs.P40H, "p40h");
  mergeLWD(logs.TNPH, "tnph");
  mergeLWD(logs.RHOB, "rhob");

  const LWD_rows = Object.values(LWD);

  // Bulk values format
  const LWD_values = LWD_rows.map(r => [
    r.well_id,
    r.depth,
    r.gr   ?? null,
    r.p16h ?? null,
    r.p28h ?? null,
    r.p40h ?? null,
    r.tnph ?? null,
    r.rhob ?? null
  ]);


  // ========================================
  // INSERT LWD (MERGED)
  // ========================================
  if (LWD_values.length > 0) {
    await db.query(`
      INSERT INTO petronas_staging.well_log_lwd
        (well_id, depth, gr, p16h, p28h, p40h, tnph, rhob)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        gr = VALUES(gr),
        p16h = VALUES(p16h),
        p28h = VALUES(p28h),
        p40h = VALUES(p40h),
        tnph = VALUES(tnph),
        rhob = VALUES(rhob)
    `, [LWD_values]);
  }


  // ========================================
  // MERGE MLU PER DEPTH
  // ========================================
  let MLU = {};

  function mergeMLU(curve, key) {
    if (!curve) return;
    for (const row of curve) {
      const d = row.depth;
      if (!MLU[d]) MLU[d] = { well_id, depth: d };

      MLU[d][key] = row.value;
    }
  }

  mergeMLU(logs.TG,    "tg");
  mergeMLU(logs.C1_C5, "c1_c5");
  mergeMLU(logs.IC4,   "ic4");
  mergeMLU(logs.NC4,   "nc4");
  mergeMLU(logs.IC5,   "ic5");
  mergeMLU(logs.NC5,   "nc5");
  mergeMLU(logs.ROP,   "rop");

  const MLU_rows = Object.values(MLU);

  const MLU_values = MLU_rows.map(r => [
    r.well_id,
    r.depth,
    r.tg    ?? null,
    r.c1_c5 ?? null,
    r.ic4   ?? null,
    r.nc4   ?? null,
    r.ic5   ?? null,
    r.nc5   ?? null,
    r.rop   ?? null
  ]);


  // ========================================
  // INSERT MLU (MERGED)
  // ========================================
  if (MLU_values.length > 0) {
    await db.query(`
      INSERT INTO petronas_staging.well_log_mlu
        (well_id, depth, tg, c1_c5, ic4, nc4, ic5, nc5, rop)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        tg = VALUES(tg),
        c1_c5 = VALUES(c1_c5),
        ic4 = VALUES(ic4),
        nc4 = VALUES(nc4),
        ic5 = VALUES(ic5),
        nc5 = VALUES(nc5),
        rop = VALUES(rop)
    `, [MLU_values]);
  }

  return true;
}
