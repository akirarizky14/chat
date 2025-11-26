export function cleanCurve(points) {
  const byDepth = {};

  // group by Y (depth)
  for (const p of points) {
    if (!byDepth[p.y]) byDepth[p.y] = [];
    byDepth[p.y].push(p.x);
  }

  const cleaned = [];

  for (const y in byDepth) {
    const xs = byDepth[y];

    // pick median X (best for noisy curves)
    xs.sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    const x = xs[mid];

    cleaned.push({
      x,
      y: parseInt(y)
    });
  }

  return cleaned;
}
