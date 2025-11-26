import cv from "opencv.js";
import sharp from "sharp";
import { cleanCurve } from "./cleanCurve.js";
import { makeHSVRange } from "./hsvRange.js";

export async function digitizeTrack(imagePath, region) {
  // ---- SAFE CROP ----
  const image = sharp(imagePath);
  const meta  = await image.metadata();

  const safe = {
    left: Math.max(0, region.left),
    top: Math.max(0, region.top),
    width: Math.min(region.width, meta.width - region.left),
    height: Math.min(region.height, meta.height - region.top),
  };

  if (safe.width <= 0 || safe.height <= 0) {
    console.log("⚠️ Track area keluar PNG:", region);
    return [];
  }

  // ---- LOAD & CROP ----
  const { data, info } = await image
    .extract(safe)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mat = new cv.Mat(info.height, info.width, cv.CV_8UC3);
  mat.data.set(data);

  // ---- HSV CONVERT ----
  const hsv = new cv.Mat();
  cv.cvtColor(mat, hsv, cv.COLOR_BGR2HSV);

  const h = hsv.rows;
  const w = hsv.cols;

  // ---- ALWAYS SAFE HSV RANGE ----
  const green  = makeHSVRange(h, w, [35, 40, 40], [90, 255, 255]);
  const red1   = makeHSVRange(h, w, [0, 60, 60], [10, 255, 255]);
  const red2   = makeHSVRange(h, w, [170, 60, 60],[180,255,255]);
  const maroon = makeHSVRange(h, w, [160,40,40], [179,120,120]);
  const yellow = makeHSVRange(h, w, [15,60,60], [35,255,255]);
  const blue   = makeHSVRange(h, w, [90,40,40], [140,255,255]);

  // ---- MASKS (ALL SAME SIZE GUARANTEED) ----
  let greenMask  = new cv.Mat();
  let redMask1   = new cv.Mat();
  let redMask2   = new cv.Mat();
  let yellowMask = new cv.Mat();
  let blueMask   = new cv.Mat();
  let maroonMask = new cv.Mat();

  cv.inRange(hsv, green.lower, green.upper, greenMask);
  cv.inRange(hsv, red1.lower, red1.upper, redMask1);
  cv.inRange(hsv, red2.lower, red2.upper, redMask2);
  cv.inRange(hsv, yellow.lower, yellow.upper, yellowMask);
  cv.inRange(hsv, blue.lower, blue.upper, blueMask);
  cv.inRange(hsv, maroon.lower, maroon.upper, maroonMask);

  // ---- CANNY ALWAYS VALID ----
  let gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_BGR2GRAY);

  let canny = new cv.Mat();
  cv.Canny(gray, canny, 50, 150);

  // ---- MERGE ALL MASKS SAFELY ----
  let combined = new cv.Mat.zeros(h, w, cv.CV_8UC1);

  cv.addWeighted(combined, 1, redMask1,   1, 0, combined);
  cv.addWeighted(combined, 1, redMask2,   1, 0, combined);
  cv.addWeighted(combined, 1, greenMask,  1, 0, combined);
  cv.addWeighted(combined, 1, yellowMask, 1, 0, combined);
  cv.addWeighted(combined, 1, blueMask,   1, 0, combined);
  cv.addWeighted(combined, 1, maroonMask, 1, 0, combined);

  // Tambah deteksi garis hitam (ROP, chromatograph)
  cv.addWeighted(combined, 1, canny, 1, 0, combined);

  // ---- EXTRACT POINTS ----
  let points = [];
  const maskData = combined.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (maskData[y * w + x] !== 0) {
        points.push({ x, y });
      }
    }
  }

  const cleaned = cleanCurve(points);

  // ---- CLEANUP ----
  [
    mat, hsv, gray, canny,
    greenMask, redMask1, redMask2,
    yellowMask, blueMask, maroonMask,
    combined
  ].forEach(m => m.delete?.());

  // DELETE HSV RANGE mats
  [green, red1, red2, maroon, yellow, blue].forEach(r => {
    r.lower.delete();
    r.upper.delete();
  });

  return cleaned;
}
