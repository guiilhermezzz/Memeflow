import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Eye,
} from "lucide-react";
import { useAppStore } from "@/stores";
import { useAuthStore } from "@/stores";
import { cn, formatCount, timeAgo, getInitials, getMediaSource, isEmbedSourceType, resolveTikTokVideoUrl } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import type { Video } from "@/lib/mock-data";

interface VideoCardFeedProps {
  video: Video;
  isActive?: boolean;
}

export function VideoCardFeed({ video, isActive = false }: VideoCardFeedProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { likedVideos, savedVideos, followedUsers, toggleLike, toggleSave, toggleFollow, incrementViews, getUserById } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [resolvedTikTokUrl, setResolvedTikTokUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userToggleRef = useRef(false);
  const pausedPositionRef = useRef(0);

  const videoUser = getUserById(video.user_id);
  const mediaSource = getMediaSource(video.video_url);
  const isEmbedSource = isEmbedSourceType(mediaSource.type);
  const nativeVideoSource = mediaSource.type === "tiktok" && resolvedTikTokUrl
    ? { type: "direct" as const, src: resolvedTikTokUrl, mimeType: "video/mp4" }
    : mediaSource;
  const embedSrc = (() => {
    if (!mediaSource.src) return mediaSource.src;

    const url = new URL(mediaSource.src);
    url.searchParams.delete("autoplay");

    if (mediaSource.type === "instagram") {
      url.searchParams.set("controls", "1");
      url.searchParams.set("mute", "1");
      url.searchParams.set("muted", "1");
      return url.toString();
    }

    if (mediaSource.type === "tiktok") {
      url.searchParams.set("muted", "1");
      return url.toString();
    }

    return url.toString();
  })();
  const isLiked = likedVideos.has(video.id);
  const isSaved = savedVideos.has(video.id);
  const isFollowed = followedUsers.has(video.user_id);
  const isOwnVideo = user?.id === video.user_id;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 500);
    toggleLike(video.id);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSave(video.id);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnVideo) toggleFollow(video.user_id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.origin + "/video/" + video.id,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin + "/video/" + video.id);
    }
  };

  const handlePlayToggle = useCallback(() => {
    userToggleRef.current = true;

    if (nativeVideoSource.type !== "direct") {
      if (!isPlaying) {
        setIsPlaying(true);
        incrementViews(video.id);
      } else {
        setIsPlaying(false);
      }
      return;
    }

    const element = videoRef.current;
    if (!element) {
      setIsPlaying(!isPlaying);
      if (!isPlaying) incrementViews(video.id);
      return;
    }

    if (element.paused) {
      const resumeFrom = Number.isFinite(pausedPositionRef.current) ? pausedPositionRef.current : element.currentTime;
      if (resumeFrom > 0 && Math.abs(element.currentTime - resumeFrom) > 0.2) {
        element.currentTime = resumeFrom;
      }
      element.play().catch(() => {});
      setIsPlaying(true);
      incrementViews(video.id);
    } else {
      pausedPositionRef.current = element.currentTime;
      element.pause();
      setIsPlaying(false);
    }
  }, [incrementViews, isPlaying, nativeVideoSource.type, video.id]);

  useEffect(() => {
    setMediaAspectRatio(null);
    setResolvedTikTokUrl(null);

    if (mediaSource.type !== "tiktok" || !video.video_url) return;

    let isMounted = true;
    resolveTikTokVideoUrl(video.video_url).then((resolvedUrl) => {
      if (isMounted) {
        setResolvedTikTokUrl(resolvedUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [video.video_url, mediaSource.type]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const visible = entry.isIntersecting && entry.intersectionRatio > 0.6;
        if (!visible) {
          // pause direct videos when leaving view
          if (nativeVideoSource.type === "direct" && videoRef.current) {
            try { videoRef.current.pause(); } catch {}
          }
          return;
        }

      });
    }, { threshold: [0.25, 0.6] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isActive, nativeVideoSource.type, isEmbedSource, isPlaying, incrementViews, video.id]);

  useEffect(() => {
    if (!isActive) {
      if (isPlaying) {
        setIsPlaying(false);
      }
      userToggleRef.current = false;
    }
  }, [isActive, isPlaying]);

  useEffect(() => {
    if (!isActive) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const interactiveTags = ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "LABEL"];

      if (interactiveTags.includes(target?.tagName ?? "")) return;

      if (event.code === "Space" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        handlePlayToggle();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handlePlayToggle, isActive]);

  useEffect(() => {
    if (nativeVideoSource.type !== "direct" || !videoRef.current) return;
    if (hasVideoError) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, video.video_url, hasVideoError, nativeVideoSource.type]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-3.5rem)] snap-start shrink-0 overflow-hidden cursor-pointer"
      onClick={handlePlayToggle}
      onKeyDown={(event) => {
        if (event.code === "Space" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          handlePlayToggle();
        }
      }}
      role="button"
      tabIndex={0}
      style={{ aspectRatio: mediaAspectRatio ? `${mediaAspectRatio}` : "9 / 16" }}
    >
      {/* Video Background */}
      {video.video_url && !hasVideoError && mediaSource.type === "direct" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            key={video.video_url}
            ref={videoRef}
            className="h-full w-full object-contain"
            loop
            playsInline
            muted={!isActive}
            poster={video.thumbnail_url || undefined}
            preload="auto"
            autoPlay={isPlaying}
            onPlay={() => {
              const currentTime = videoRef.current?.currentTime ?? 0;
              pausedPositionRef.current = currentTime;
              setIsPlaying(true);
            }}
            onPause={() => {
              pausedPositionRef.current = videoRef.current?.currentTime ?? pausedPositionRef.current;
              setIsPlaying(false);
            }}
            onError={() => setHasVideoError(true)}
            onLoadedData={() => setHasVideoError(false)}
            onLoadedMetadata={(event) => {
              const ratio = event.currentTarget.videoWidth / event.currentTarget.videoHeight;
              if (Number.isFinite(ratio) && ratio > 0) {
                setMediaAspectRatio(ratio);
              }
            }}
          >
            <source
              src={nativeVideoSource.src}
              {...(nativeVideoSource.mimeType ? { type: nativeVideoSource.mimeType } : {})}
            />
          </video>
        </div>
      ) : video.video_url && !hasVideoError && isEmbedSource && isActive ? (
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            className="h-full w-full border-0"
            src={embedSrc}
            title={video.title}
            allow="fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox"
            style={{ objectFit: "cover", aspectRatio: "9 / 16" }}
            onLoad={() => setHasVideoError(false)}
            onError={() => setHasVideoError(true)}
          />
          <div className="pointer-events-none absolute inset-0 bg-black/5" />
        </div>
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-1000"
          style={{
            background: video.thumbnail_url ? `url(${video.thumbnail_url}) center/cover no-repeat` : video.gradient,
            backgroundSize: video.thumbnail_url ? "cover" : "200% 200%",
            animation: isPlaying ? (video.thumbnail_url ? "none" : "gradient-shift 8s ease infinite") : "none",
          }}
        >
          {isActive && isEmbedSource && hasVideoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center text-white">
              <p className="text-sm font-semibold">Este link não pôde ser reproduzido aqui</p>
              <p className="text-xs text-white/70 mt-2">O conteúdo pode estar restrito pela plataforma ou não ser compatível com o player.</p>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-16 sm:right-20 p-3 sm:p-4 md:p-6 max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-5rem)]">
        {/* User */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            fallback={videoUser ? getInitials(videoUser.full_name) : "?"}
            size="sm"
            isOnline={true}
          />
          <div>
            <p className="text-sm font-bold text-white">@{videoUser?.username}</p>
          </div>
          {!isOwnVideo && (
            <button
              onClick={handleFollow}
              className={cn(
                "ml-2 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                isFollowed
                  ? "bg-white/20 text-white border border-white/40"
                  : "bg-primary text-white shadow-lg"
              )}
            >
              {isFollowed ? "Seguindo" : "Seguir"}
            </button>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-base md:text-lg font-bold text-white mb-1 cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/video/" + video.id);
          }}
        >
          {video.title}
        </h3>

        {/* Description */}
        <p className="text-xs md:text-sm text-white/70 line-clamp-2 mb-2">{video.description}</p>

        {/* Category & Time */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
            {video.category}
          </span>
          <span className="text-[10px] text-white/50">{timeAgo(video.created_at)}</span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="absolute right-2 sm:right-3 md:right-4 bottom-20 sm:bottom-24 md:bottom-28 flex flex-col items-center gap-3 sm:gap-4">
        {/* Like */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1 cursor-pointer group"
        >
          <div className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center transition-all bg-black/30 backdrop-blur-sm group-hover:bg-black/40",
            likeAnim && "animate-heart-beat"
          )}>
            <Heart
              className={cn("h-6 w-6 transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-white")}
            />
          </div>
          <span className="text-[9px] sm:text-[10px] text-white font-medium">{formatCount(video.likes_count)}</span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/video/" + video.id);
          }}
          className="flex flex-col items-center gap-1 cursor-pointer group"
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm group-hover:bg-black/40">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-[9px] sm:text-[10px] text-white font-medium">{formatCount(video.comments_count)}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 cursor-pointer group"
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm group-hover:bg-black/40">
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-[9px] sm:text-[10px] text-white font-medium">Compartilhar</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex flex-col items-center gap-1 cursor-pointer group"
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm group-hover:bg-black/40">
            <Bookmark className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-colors", isSaved ? "text-accent fill-accent" : "text-white")} />
          </div>
          <span className="text-[9px] sm:text-[10px] text-white font-medium">Salvar</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-[9px] sm:text-[10px] text-white font-medium">{formatCount(video.views_count)}</span>
        </div>
      </div>
    </div>
  );
}

// ============ GRID VIDEO CARD ============
interface VideoCardGridProps {
  video: Video;
}

export function VideoCardGrid({ video }: VideoCardGridProps) {
  const navigate = useNavigate();
  const { getUserById } = useAppStore();
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUser = getUserById(video.user_id);
  const mediaSource = getMediaSource(video.video_url);
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);
  const hasAutoPlayedRef = useRef(false);
  const isEmbedSource = isEmbedSourceType(mediaSource.type);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [video.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const vis = entry.isIntersecting && entry.intersectionRatio > 0.5;
        if (!vis) return;
        if (isEmbedSource && !hasAutoPlayedRef.current) {
          setShowEmbed(true);
          hasAutoPlayedRef.current = true;
        }
      });
    }, { threshold: [0, 0.5, 1] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isEmbedSource]);

  return (
    <button
      ref={containerRef}
      onClick={() => navigate("/video/" + video.id)}
      className="group relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer w-full text-left"
    >
      {/* Thumbnail */}
      {video.video_url && !hasVideoError && mediaSource.type === "direct" ? (
        <video
          ref={videoRef}
          key={video.video_url}
          className="absolute inset-0 h-full w-full object-contain bg-black transition-transform duration-500 group-hover:scale-110"
          loop
          playsInline
          muted
          poster={video.thumbnail_url || undefined}
          preload="metadata"
          onError={() => setHasVideoError(true)}
          onLoadedData={() => setHasVideoError(false)}
        >
          <source
            src={mediaSource.src}
            {...(mediaSource.mimeType ? { type: mediaSource.mimeType } : {})}
          />
        </video>
      ) : isEmbedSource && showEmbed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
          {/* Render iframe for embed sources when visible to allow autoplay attempts (muted) */}
          {mediaSource.src && (
            <iframe
              className="h-full w-full border-0"
              src={(() => {
                try {
                  const u = new URL(mediaSource.src!);
                  u.searchParams.delete("autoplay");
                  u.searchParams.set("muted", "1");
                  return u.toString();
                } catch {
                  return mediaSource.src!;
                }
              })()}
              title={video.title}
              allow="fullscreen; picture-in-picture; clipboard-write"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox"
              style={{ objectFit: "cover", aspectRatio: "9 / 16" }}
              onLoad={() => setHasVideoError(false)}
              onError={() => setHasVideoError(true)}
            />
          )}
        </div>
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
          style={{
            background: video.thumbnail_url ? `url(${video.thumbnail_url}) center/cover no-repeat` : video.gradient,
            backgroundSize: "cover",
          }}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Duration badge */}
      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
        0:{String(((video.id.charCodeAt(video.id.length - 1) % 50) + 10)).padStart(2, '0')}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <h4 className="text-xs font-bold text-white line-clamp-2 mb-1">{video.title}</h4>
        <div className="flex items-center gap-1.5">
          <Avatar fallback={videoUser ? getInitials(videoUser.full_name) : "?"} size="sm" className="!h-5 !w-5 !text-[8px]" />
          <span className="text-[10px] text-white/70">@{videoUser?.username}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-white/60 flex items-center gap-0.5">
            <Eye className="h-3 w-3" /> {formatCount(video.views_count)}
          </span>
          <span className="text-[10px] text-white/60 flex items-center gap-0.5">
            <Heart className="h-3 w-3" /> {formatCount(video.likes_count)}
          </span>
        </div>
      </div>
    </button>
  );
}
