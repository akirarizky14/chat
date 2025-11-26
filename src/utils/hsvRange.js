import cv from "opencv.js";

export function makeHSVRange(rows, cols, lowerArr, upperArr) {
  const lower = new cv.Mat(rows, cols, cv.CV_8UC3);
  const upper = new cv.Mat(rows, cols, cv.CV_8UC3);

  lower.setTo(new cv.Scalar(lowerArr[0], lowerArr[1], lowerArr[2], 255));
  upper.setTo(new cv.Scalar(upperArr[0], upperArr[1], upperArr[2], 255));

  return { lower, upper };
}
