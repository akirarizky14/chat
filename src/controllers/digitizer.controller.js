import { digitizeTrack } from "../utils/digitizeTrack.js";
import { pixelToDepth } from "../utils/pixelToDepth.js";
import { TRACKS } from "../config/tracks.js";
import { DEPTH_SCALE ,DEPTH_CONFIG} from "../config/depthScale.js";
import { insertAllToDB } from "../utils/insertAllToDB.js";
import { autoDepthScale } from "../utils/autoDepthScale.js";
// ---- DIGITIZE GR ----
export async function digitizeGR(req, res) {
  try {
    const { png_path, well_id } = req.body;

    const t = TRACKS.GR;

    const points = await digitizeTrack(png_path, {
      left: t.x,
      top: t.y,
      width: t.width,
      height: t.height,
    });

    const rows = pixelToDepth(points, DEPTH_SCALE, {
      min: t.min,
      max: t.max,
      width: t.width,
    });

    res.json({ success: true, GR_points: rows.length, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// ---- DIGITIZE ALL TRACKS ----
export async function digitizeALL(req, res) {
  try {
    const { png_path, well_id } = req.body;

    // 🔥 HITUNG DEPTH SCALE OTOMATIS
    const depthScale = await autoDepthScale(png_path, DEPTH_CONFIG);

    const logs = {};

    for (const key in TRACKS) {
      const t = TRACKS[key];

      const points = await digitizeTrack(png_path, {
        left: t.x,
        top: t.y,
        width: t.width,
        height: t.height,
      });

      const rows = pixelToDepth(points, depthScale, {
        min: t.min,
        max: t.max,
        width: t.width,
      });

      logs[key] = rows;
    }

    await insertAllToDB(well_id, logs);

    res.json({
      success: true,
      message: "All tracks digitized using AUTO-DEPTH and inserted to DB",
      tracks: Object.keys(logs),
      depthScale
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}