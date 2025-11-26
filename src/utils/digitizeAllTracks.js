import { digitizeTrack } from "./digitizeTrack.js";
import { pixelToDepth } from "./pixelToDepth.js";
import { TRACKS } from "../config/tracks.js";

export async function digitizeAllTracks(pngPath, depthScale) {
  const logs = {};

  for (const key in TRACKS) {
    const t = TRACKS[key];

    // 1. Digitize
    const points = await digitizeTrack(pngPath, {
      left: t.x,
      top: t.y,
      width: t.width,
      height: t.height,
    });

    // 2. Map pixel → depth + value
    const rows = pixelToDepth(points, depthScale, {
      min: t.min,
      max: t.max,
      width: t.width
    });

    logs[key] = rows;
  }

  return logs;
}
