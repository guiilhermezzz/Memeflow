import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  return `${Math.floor(diffDays / 30)}mês`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const EMBED_VIDEO_TYPES = [
  "youtube",
  "vimeo",
  "tiktok",
  "instagram",
  "twitter",
  "facebook",
  "linkedin",
  "reddit",
  "pinterest",
  "snapchat",
  "threads",
  "twitch",
] as const;

export type EmbedVideoType = (typeof EMBED_VIDEO_TYPES)[number];

export function isEmbedSourceType(type: string): boolean {
  return EMBED_VIDEO_TYPES.includes(type as EmbedVideoType);
}

export function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSupportedVideoUrl(url: string): boolean {
  const mediaSource = getMediaSource(url);
  return mediaSource.type !== "unsupported" && Boolean(mediaSource.src);
}

function getYouTubeVideoId(parsedUrl: URL): string | null {
  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.replace(/^\/+/, "");

  if (hostname === "youtu.be" || hostname.endsWith(".youtu.be")) {
    const id = pathname.split("/")[0];
    return id || null;
  }

  if (hostname.includes("youtube.com") || hostname.includes("youtube-nocookie.com")) {
    const queryId = parsedUrl.searchParams.get("v");
    if (queryId) return queryId;

    const shortsMatch = pathname.match(/^shorts\/([^/?#]+)/i);
    if (shortsMatch?.[1]) return shortsMatch[1];

    const embedMatch = pathname.match(/^embed\/([^/?#]+)/i);
    if (embedMatch?.[1]) return embedMatch[1];
  }

  return null;
}

function getTikTokVideoId(parsedUrl: URL): string | null {
  const pathname = parsedUrl.pathname.replace(/^\/+/, "");
  const segments = pathname.split("/").filter(Boolean);

  const videoIndex = segments.findIndex((segment) => segment.toLowerCase() === "video");
  if (videoIndex >= 0 && segments[videoIndex + 1] && /^\d+$/.test(segments[videoIndex + 1])) {
    return segments[videoIndex + 1];
  }

  const match = pathname.match(/(?:^|\/)video\/(\d+)/i);
  return match?.[1] || null;
}

export async function resolveTikTokVideoUrl(videoUrl: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_RAPIDAPI_KEY?.trim();
  if (!apiKey || !videoUrl) return null;

  try {
    const response = await fetch("https://tiktok-video-downloader-api.p.rapidapi.com/user/khaby.lame?url=" + encodeURIComponent(videoUrl), {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "tiktok-video-downloader-api.p.rapidapi.com",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.video || data?.download_url || data?.url || null;
  } catch {
    return null;
  }
}

function getFacebookEmbedUrl(url: string): string {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;
}

function getInstagramEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/(p|reel|tv)\/([^/?#]+)/i);

    if (match?.[2]) {
      const kind = match[1].toLowerCase();
      const slug = match[2];
      return `https://www.instagram.com/${kind}/${slug}/embed/captioned/`;
    }
  } catch {
    // Ignore invalid URLs and fall back to a generic embed URL.
  }

  return "https://www.instagram.com/embed/";
}

export function getMediaSource(url: string): { type: "direct" | "youtube" | "vimeo" | "tiktok" | "instagram" | "twitter" | "facebook" | "linkedin" | "reddit" | "pinterest" | "snapchat" | "threads" | "twitch" | "unsupported"; src?: string; mimeType?: string } {
  if (!url) return { type: "unsupported" };

  const trimmed = url.trim();

  if (trimmed.startsWith("blob:")) {
    return { type: "direct", src: trimmed };
  }

  const directMatch = trimmed.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i);

  if (directMatch) {
    const ext = directMatch[1].toLowerCase();
    const mimeType = ext === "mp4"
      ? "video/mp4"
      : ext === "webm"
        ? "video/webm"
        : ext === "ogg"
          ? "video/ogg"
          : ext === "mov" || ext === "m4v"
            ? "video/mp4"
            : undefined;

    return { type: "direct", src: trimmed, mimeType };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    const youtubeVideoId = getYouTubeVideoId(parsed);
    if (youtubeVideoId) {
      return {
        type: "youtube",
        src: `https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&controls=1&showinfo=0&iv_load_policy=3&autohide=1&autoplay=1&mute=0`,
      };
    }

    if (hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      if (videoId) {
        return {
          type: "vimeo",
          src: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&playsinline=1&controls=1&autoplay=1&muted=0`,
        };
      }
    }

    if (hostname.includes("tiktok.com") || hostname.includes("vm.tiktok.com") || hostname.includes("vt.tiktok.com")) {
      const videoId = getTikTokVideoId(parsed);
      if (videoId) {
        return {
          type: "tiktok",
          src: `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1&loop=1&muted=0&controls=0&playsinline=1&hideLogo=1&hideRelated=1&sourceType=embed&appId=1234567890`,
        };
      }

      return {
        type: "tiktok",
        src: trimmed,
      };
    }

    if (hostname.includes("facebook.com") || hostname.includes("fb.watch") || hostname.includes("m.facebook.com")) {
      return {
        type: "facebook",
        src: getFacebookEmbedUrl(trimmed),
      };
    }

    if (hostname.includes("instagram.com")) {
      const instagramMatch = parsed.pathname.match(/\/(p|reel|tv)\/([^/?#]+)/i);
      if (instagramMatch?.[2]) {
        return {
          type: "instagram",
          src: getInstagramEmbedUrl(trimmed),
        };
      }
      return { type: "unsupported" };
    }

    if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
      const statusMatch = parsed.pathname.match(/\/status\/(\d+)/i);
      if (statusMatch?.[1]) {
        return {
          type: "twitter",
          src: `https://platform.twitter.com/widgets/tweet.html?dnt=1&url=${encodeURIComponent(trimmed)}`,
        };
      }
      return { type: "unsupported" };
    }

    if (hostname.includes("linkedin.com")) {
      const postMatch = parsed.pathname.match(/\/posts\//i);
      if (postMatch) {
        return {
          type: "linkedin",
          src: trimmed,
        };
      }
      return { type: "unsupported" };
    }

    if (hostname.includes("reddit.com") || hostname.includes("redd.it")) {
      return {
        type: "reddit",
        src: trimmed,
      };
    }

    if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) {
      return {
        type: "pinterest",
        src: trimmed,
      };
    }

    if (hostname.includes("snapchat.com") || hostname.includes("snap.com")) {
      return {
        type: "snapchat",
        src: trimmed,
      };
    }

    if (hostname.includes("threads.net")) {
      return {
        type: "threads",
        src: trimmed,
      };
    }

    if (hostname.includes("twitch.tv") || hostname.includes("kick.com")) {
      return {
        type: "twitch",
        src: trimmed,
      };
    }
  } catch {
    // Ignore invalid URLs and fall back to unsupported.
  }

  return { type: "unsupported" };
}

export const CATEGORIES = [
  "Reações",
  "Humor Negro",
  "Sátira",
  "Memes Clássicos",
  "Fail",
  "Dublagem",
  "Paródia",
  "Animais",
  "Programação",
  "Escola",
  "Trabalho",
  "Relacionamento",
  "Outros",
] as const;

export const HUMOR_STYLES = [
  "Ironia",
  "Sarcasmo",
  "Nonsense",
  "Autodepreciativo",
  "Pastelão",
  "Inteligente",
  "Absurdo",
  "Reflexivo",
] as const;

export const GRADIENTS = [
  "linear-gradient(135deg, #7C3AED, #EC4899)",
  "linear-gradient(135deg, #EC4899, #FACC15)",
  "linear-gradient(135deg, #3B82F6, #8B5CF6)",
  "linear-gradient(135deg, #10B981, #3B82F6)",
  "linear-gradient(135deg, #F59E0B, #EF4444)",
  "linear-gradient(135deg, #6366F1, #EC4899)",
  "linear-gradient(135deg, #14B8A6, #6366F1)",
  "linear-gradient(135deg, #F43F5E, #7C3AED)",
  "linear-gradient(135deg, #8B5CF6, #06B6D4)",
  "linear-gradient(135deg, #F97316, #EC4899)",
  "linear-gradient(135deg, #22C55E, #14B8A6)",
  "linear-gradient(135deg, #A855F7, #F43F5E)",
] as const;
