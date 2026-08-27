import type { FileOp } from "../file-types";

import {
  blurRegion,
  compressImage,
  convertImage,
  cropImage,
  faviconSet,
  filterImage,
  memeGenerator,
  removeSolidBackground,
  resizeImage,
  rotateImage,
  stripMetadata,
  watermarkImage,
} from "./ops";

/**
 * Every image op, keyed by the `op` name in the tool registry.
 *
 * Imported dynamically, though it costs almost nothing: these run on the
 * browser's own canvas, so the whole engine is a few kilobytes of code rather
 * than a WASM download.
 */
export const IMAGE_OPS: Record<string, FileOp> = {
  resizeImage,
  compressImage,
  convertImage,
  cropImage,
  rotateImage,
  watermarkImage,
  filterImage,
  blurRegion,
  memeGenerator,
  removeSolidBackground,
  faviconSet,
  stripMetadata,
};

export function getImageOp(name: string): FileOp | undefined {
  return IMAGE_OPS[name];
}

export {
  blurRegion,
  compressImage,
  convertImage,
  cropImage,
  faviconSet,
  filterImage,
  memeGenerator,
  removeSolidBackground,
  resizeImage,
  rotateImage,
  stripMetadata,
  watermarkImage,
};
