export function pixelToDepth(points, depthScale, track) {
  const rows = [];

  const { start, scale, top } = depthScale;

  for (const p of points) {
    const depth = start + (p.y - top) * scale;

    if (depth < 0) continue;

    const value = track.min + (p.x / track.width) * (track.max - track.min);

    rows.push({
      depth: Number(depth.toFixed(2)),
      value: Number(value.toFixed(5))
    });
  }
  return rows;
}
