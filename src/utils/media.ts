import { v4 as uuid } from 'uuid';
import type { MediaFile } from '../types';

export async function createMediaFile(file: File): Promise<MediaFile> {
  const url = URL.createObjectURL(file);
  const type = getMediaType(file);
  const id = uuid();

  const duration = await getMediaDuration(url, type);
  const thumbnail = type === 'video' ? await generateThumbnail(url) : undefined;

  const result: MediaFile = {
    id,
    name: file.name,
    type,
    url,
    duration,
    file,
    thumbnail,
  };

  if (type === 'video') {
    const dims = await getVideoDimensions(url);
    result.width = dims.width;
    result.height = dims.height;
    result.hasAudio = await checkVideoHasAudio(url);
  }

  return result;
}

function getMediaType(file: File): 'video' | 'audio' | 'image' {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  // Fallback based on extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext ?? '')) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext ?? '')) return 'audio';
  return 'image';
}

function getMediaDuration(url: string, type: string): Promise<number> {
  return new Promise((resolve) => {
    if (type === 'image') {
      resolve(5); // default 5s for images
      return;
    }
    const el = type === 'video' ? document.createElement('video') : document.createElement('audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      resolve(el.duration);
    };
    el.onerror = () => resolve(0);
    el.src = url;
  });
}

function getVideoDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => resolve({ width: 1920, height: 1080 });
    video.src = url;
  });
}

function checkVideoHasAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      // audioTracks is a Chromium-only extension not in the standard TS DOM types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioTracks = (video as any).audioTracks as { length: number } | undefined;
      if (audioTracks && audioTracks.length > 0) {
        resolve(true);
      } else if (audioTracks && audioTracks.length === 0) {
        resolve(false);
      } else {
        // API unavailable — assume audio present to preserve existing behaviour
        resolve(true);
      }
    };
    video.onerror = () => resolve(true);
    video.src = url;
  });
}

function generateThumbnail(url: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;

    const drawFrame = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 160, 90);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve('');
      }
    };

    // After metadata loads, seek to 1s (or 10% for short clips); draw after seek
    video.oncanplay = () => {
      const seekTo = video.duration > 1 ? 1 : video.duration * 0.1;
      if (seekTo > 0) {
        video.currentTime = seekTo;
      } else {
        drawFrame();
      }
    };

    video.onseeked = drawFrame;
    video.onerror = () => resolve('');
    video.src = url;
  });
}
