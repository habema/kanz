import type { Media } from '@kanz/api-client-react';
// Built-in media; the host can replace each one from /setup.
import defaultKanzImage from '@/assets/kanz.png';
import defaultKashkoolImage from '@/assets/kashkool.jpg';
import defaultMusic from '@/assets/background.mp3';

// The media to use: uploads from the setup page, else the built-in files. A
// كنز or كشكول opens with its picture; video mode needs an uploaded video
// (there is no built-in one) and shows the picture until there is one.
export function resolveMedia(media: Media = {}) {
  return {
    logo: media.logo,
    kanz: {
      mode: media.kanzMode === 'video' && media.kanzVideo ? ('video' as const) : ('image' as const),
      image: media.kanzImage ?? defaultKanzImage,
      video: media.kanzVideo,
    },
    kashkool: {
      mode: media.kashkoolMode === 'video' && media.kashkoolVideo ? ('video' as const) : ('image' as const),
      image: media.kashkoolImage ?? defaultKashkoolImage,
      video: media.kashkoolVideo,
    },
    music: media.music ?? defaultMusic,
  };
}
export type Celebration = ReturnType<typeof resolveMedia>['kanz'];

// Uploads are absolute (/api/media/…); built-in files are relative to the site.
export const mediaUrl = (url: string) =>
  /^(\/|https?:|blob:|data:)/.test(url) ? url : `${import.meta.env.BASE_URL}${url}`;
