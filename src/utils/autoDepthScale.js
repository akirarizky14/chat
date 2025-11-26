import sharp from "sharp";

export async function autoDepthScale(pngPath, config) {
  const { startDepth, endDepth, trackTop, trackBottom } = config;

  const metadata = await sharp(pngPath).metadata();
  const pngHeight = metadata.height;

  const trackHeightPx = trackBottom - trackTop;
  const depthRange = endDepth - startDepth;

  const scale = depthRange / trackHeightPx; // meter per pixel

  return {
    start: startDepth,
    end: endDepth,
    top: trackTop,
    bottom: trackBottom,
    height: trackHeightPx,
    scale,
    pngHeight
  };
}
