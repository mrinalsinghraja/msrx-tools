import type { FileOp } from "../file-types";

import { addImageToVideo, addTextToVideo, hideVideoRegion, videoThumbnail, videoToGif } from "./frames";
import { addAudioToVideo, changeVideoSpeed, loopVideo, mergeVideos } from "./assemble";
import {
  changeVideoVolume,
  compressVideo,
  convertVideo,
  cropVideo,
  flipVideo,
  muteVideo,
  resizeVideo,
  rotateVideo,
  trimVideo,
  videoToAudio,
} from "./ops";

/**
 * The video engine's op table.
 *
 * Imported only when a video tool actually runs — Mediabunny plus the GIF
 * encoder is the largest chunk on the site after the PDF engine, and someone
 * formatting JSON should never download it.
 */
export const VIDEO_OPS: Record<string, FileOp> = {
  trimVideo,
  cropVideo,
  resizeVideo,
  rotateVideo,
  flipVideo,
  compressVideo,
  convertVideo,
  muteVideo,
  changeVideoVolume,
  videoToAudio,
  videoThumbnail,
  videoToGif,
  addImageToVideo,
  addTextToVideo,
  hideVideoRegion,
  mergeVideos,
  loopVideo,
  changeVideoSpeed,
  addAudioToVideo,
  // A recording arrives as a file like any other, so exporting one is the same
  // pass as converting one. Giving it its own name keeps the recorder pages
  // honest about what they do rather than borrowing another tool's label.
  exportVideoRecording: convertVideo,
};

export function getVideoOp(name: string): FileOp | undefined {
  return VIDEO_OPS[name];
}

export {
  addAudioToVideo,
  addImageToVideo,
  addTextToVideo,
  changeVideoSpeed,
  changeVideoVolume,
  compressVideo,
  convertVideo,
  cropVideo,
  flipVideo,
  hideVideoRegion,
  loopVideo,
  mergeVideos,
  muteVideo,
  resizeVideo,
  rotateVideo,
  trimVideo,
  videoThumbnail,
  videoToAudio,
  videoToGif,
};
