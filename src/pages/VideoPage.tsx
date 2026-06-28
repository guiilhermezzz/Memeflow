import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Eye,
  ArrowLeft,
  Send,
  MoreVertical,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuthStore } from "@/stores";
import { useAppStore } from "@/stores";
import { VideoCardGrid } from "@/components/VideoCard";
import { Avatar, Badge, Button, Card, Separator } from "@/components/ui";
import { cn, formatCount, timeAgo, getInitials, getMediaSource, isEmbedSourceType, resolveTikTokVideoUrl } from "@/lib/utils";

export default function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { videos, likedVideos, savedVideos, comments, toggleLike, toggleSave, addComment, incrementViews, getUserById } = useAppStore();
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [resolvedTikTokUrl, setResolvedTikTokUrl] = useState<string | null>(null);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const video = videos.find((v) => v.id === id);
  if (!video) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <h2 className="text-xl font-bold text-on-surface mb-2">Vídeo não encontrado</h2>
        <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
      </div>
    );
  }

  const videoUser = getUserById(video.user_id);
  const mediaSource = getMediaSource(video.video_url);
  const isEmbedSource = isEmbedSourceType(mediaSource.type);
  const nativeVideoSource = mediaSource.type === "tiktok" && resolvedTikTokUrl
    ? { type: "direct" as const, src: resolvedTikTokUrl, mimeType: "video/mp4" }
    : mediaSource;
  const [isPlaying, setIsPlaying] = useState(false);
  const pausedPositionRef = useRef(0);
  const userToggleRef = useRef(false);

  const handlePlayToggle = useCallback(() => {
    userToggleRef.current = true;

    if (nativeVideoSource.type !== "direct") {
      setIsPlaying((p) => {
        const next = !p;
        if (next && video) incrementViews(video.id);
        return next;
      });
      return;
    }

    const el = videoRef.current;
    if (!el) {
      setIsPlaying((p) => {
        const next = !p;
        if (next && video) incrementViews(video.id);
        return next;
      });
      return;
    }

    if (el.paused) {
      const resumeFrom = Number.isFinite(pausedPositionRef.current) ? pausedPositionRef.current : el.currentTime;
      if (resumeFrom > 0 && Math.abs(el.currentTime - resumeFrom) > 0.2) {
        el.currentTime = resumeFrom;
      }
      el.play().catch(() => {});
      setIsPlaying(true);
      if (video) incrementViews(video.id);
    } else {
      pausedPositionRef.current = el.currentTime;
      el.pause();
      setIsPlaying(false);
    }
  }, [incrementViews, nativeVideoSource.type, video]);
  const embedSrc = (() => {
    if (!mediaSource.src) return mediaSource.src;

    const url = new URL(mediaSource.src);

    if (mediaSource.type === "instagram") {
      url.searchParams.set("autoplay", "1");
      url.searchParams.set("controls", "1");
      url.searchParams.set("mute", "1");
      url.searchParams.set("muted", "1");
      return url.toString();
    }

    if (mediaSource.type === "tiktok") {
      url.searchParams.set("muted", isPlaying ? "0" : "1");
      url.searchParams.set("autoplay", "1");
      return url.toString();
    }

    return mediaSource.src;
  })();
  const isLiked = likedVideos.has(video.id);
  const isSaved = savedVideos.has(video.id);
  const videoComments = comments.filter((c) => c.video_id === video.id);
  const relatedVideos = videos.filter((v) => v.id !== video.id && v.status === "public").slice(0, 6);

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
    if (!nativeVideoSource.src || !videoRef.current) return;
    if (hasVideoError) return;

    const onPlay = () => {
      if (!hasStartedPlayback) {
        setHasStartedPlayback(true);
        incrementViews(video.id);
      }
    };

    const videoEl = videoRef.current;
    videoEl.addEventListener("play", onPlay);

    return () => {
      videoEl.removeEventListener("play", onPlay);
    };
  }, [hasStartedPlayback, hasVideoError, incrementViews, nativeVideoSource.src, video.id]);

  const handleLike = () => toggleLike(video.id);
  const handleSave = () => toggleSave(video.id);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleComment = () => {
    if (!commentText.trim() || !user) return;
    addComment(video.id, commentText.trim());
    setCommentText("");
  };

  const visibleComments = showAllComments ? videoComments : videoComments.slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in px-2 sm:px-4">
      {/* Back button */}
      <div className="px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 pb-6">
        {/* Video Player */}
        <div className="flex-1">
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden mx-auto lg:mx-0 max-h-[min(70dvh,42rem)] bg-black"
            style={{ aspectRatio: mediaAspectRatio ? `${mediaAspectRatio}` : "9 / 16" }}
            onClick={handlePlayToggle}
            onKeyDown={(event) => {
              if (event.code === "Space" || event.key === " " || event.key === "Spacebar") {
                event.preventDefault();
                handlePlayToggle();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {video.video_url && !hasVideoError && nativeVideoSource.type === "direct" ? (
              <video
                key={video.video_url}
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-contain bg-black cursor-pointer"
                poster={video.thumbnail_url || undefined}
                playsInline
                loop
                preload="auto"
                autoPlay={isPlaying}
                onClick={handlePlayToggle}
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
            ) : video.video_url && !hasVideoError && isEmbedSource && isPlaying ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
                <iframe
                  className="h-full w-full border-0"
                  src={embedSrc}
                  title={video.title}
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
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
                className="absolute inset-0 cursor-pointer"
                style={{
                  background: video.gradient,
                  backgroundSize: "200% 200%",
                  animation: isPlaying ? "gradient-shift 8s ease infinite" : "none",
                }}
                onClick={handlePlayToggle}
              >
                {isEmbedSource && hasVideoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center text-white">
                    <p className="text-sm font-semibold">Este link não pôde ser reproduzido aqui</p>
                    <p className="text-xs text-white/70 mt-2">O conteúdo pode estar restrito pela plataforma ou não ser compatível com o player.</p>
                  </div>
                )}
              </div>
            )}

            {/* Play/Pause */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            {/* Views */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/70 text-xs pointer-events-none">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(video.views_count)} visualizações
            </div>
          </div>

          {/* Action Buttons (mobile) */}
          <div className="flex items-center justify-around gap-2 mt-4 lg:hidden">
            <button onClick={handleLike} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className={cn("h-12 w-12 rounded-full flex items-center justify-center transition-all", isLiked ? "bg-red-500/10" : "bg-surface-alt")}>
                <Heart className={cn("h-6 w-6", isLiked ? "text-red-500 fill-red-500" : "text-on-surface-muted")} />
              </div>
              <span className="text-xs text-on-surface-muted">{formatCount(video.likes_count)}</span>
            </button>
            <button onClick={() => document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" })} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className="h-12 w-12 rounded-full flex items-center justify-center bg-surface-alt">
                <MessageCircle className="h-6 w-6 text-on-surface-muted" />
              </div>
              <span className="text-xs text-on-surface-muted">{formatCount(video.comments_count)}</span>
            </button>
            <button onClick={handleShare} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className="h-12 w-12 rounded-full flex items-center justify-center bg-surface-alt">
                <Share2 className="h-6 w-6 text-on-surface-muted" />
              </div>
              <span className="text-xs text-on-surface-muted">Compartilhar</span>
            </button>
            <button onClick={handleSave} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className={cn("h-12 w-12 rounded-full flex items-center justify-center transition-all", isSaved ? "bg-accent/10" : "bg-surface-alt")}>
                <Bookmark className={cn("h-6 w-6", isSaved ? "text-accent fill-accent" : "text-on-surface-muted")} />
              </div>
              <span className="text-xs text-on-surface-muted">Salvar</span>
            </button>
          </div>
        </div>

        {/* Info & Comments Panel */}
        <div className="flex-1 min-w-0">
          {/* Video Info */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar fallback={videoUser ? getInitials(videoUser.full_name) : "?"} size="md" isOnline />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface">{videoUser?.full_name}</p>
                <p className="text-xs text-on-surface-muted">@{videoUser?.username}</p>
              </div>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover cursor-pointer">
                <MoreVertical className="h-4 w-4 text-on-surface-muted" />
              </button>
            </div>

            <h1 className="text-lg font-bold text-on-surface mb-2">{video.title}</h1>
            <p className="text-sm text-on-surface-muted mb-3">{video.description}</p>

            <div className="flex flex-wrap items-center gap-2">
              <Badge>{video.category}</Badge>
              <span className="text-xs text-on-surface-muted">{timeAgo(video.created_at)}</span>
              <span className="text-xs text-on-surface-muted flex items-center gap-1">
                <Eye className="h-3 w-3" /> {formatCount(video.views_count)} views
              </span>
            </div>

            {/* Action buttons (desktop) */}
            <Separator className="my-3" />
            <div className="hidden lg:flex items-center gap-3">
              <Button
                variant={isLiked ? "secondary" : "outline"}
                size="sm"
                onClick={handleLike}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-white")} />
                {formatCount(video.likes_count)}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
              <Button
                variant={isSaved ? "accent" : "outline"}
                size="sm"
                onClick={handleSave}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                Salvar
              </Button>
              <button className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover text-on-surface-muted cursor-pointer">
                <Flag className="h-4 w-4" />
              </button>
            </div>
          </Card>

          {/* Comments */}
          <Card className="p-4" id="comments-section">
            <h3 className="text-sm font-bold text-on-surface mb-3">
              Comentários ({videoComments.length})
            </h3>

            {/* Comment Input */}
            {user ? (
              <div className="flex items-center gap-3 mb-4">
                <Avatar fallback={getInitials(user.full_name)} size="sm" />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Adicione um comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    className="flex-1 h-10 rounded-xl border-2 border-border-color bg-surface-alt px-3 text-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white disabled:opacity-30 hover:bg-primary-dark transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-xl bg-surface-alt text-center">
                <p className="text-xs text-on-surface-muted">
                  <button onClick={() => navigate("/login")} className="text-primary font-medium cursor-pointer">Faça login</button> para comentar
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {visibleComments.map((comment) => {
                const commentUser = getUserById(comment.user_id);
                const replies = comments.filter((c) => c.parent_id === comment.id);
                return (
                  <div key={comment.id}>
                    <div className="flex items-start gap-3">
                      <Avatar
                        fallback={commentUser ? getInitials(commentUser.full_name) : "?"}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-on-surface">
                            @{commentUser?.username}
                          </span>
                          <span className="text-[10px] text-on-surface-muted">
                            {timeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-muted mt-0.5">{comment.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <button className="text-xs text-on-surface-muted hover:text-primary transition-colors cursor-pointer">
                            Curtir
                          </button>
                          <button className="text-xs text-on-surface-muted hover:text-primary transition-colors cursor-pointer">
                            Responder
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Replies */}
                    {replies.map((reply) => {
                      const replyUser = getUserById(reply.user_id);
                      return (
                        <div key={reply.id} className="ml-10 mt-2 flex items-start gap-3">
                          <Avatar fallback={replyUser ? getInitials(replyUser.full_name) : "?"} size="sm" className="!h-7 !w-7 !text-[9px]" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-on-surface">@{replyUser?.username}</span>
                              <span className="text-[10px] text-on-surface-muted">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-xs text-on-surface-muted mt-0.5">{reply.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {videoComments.length > 5 && (
              <button
                onClick={() => setShowAllComments(!showAllComments)}
                className="flex items-center gap-1 mt-3 text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Ver mais {videoComments.length - 5} comentários
                  </>
                )}
              </button>
            )}
          </Card>

          {/* Related Videos */}
          <div className="mt-4">
            <h3 className="text-sm font-bold text-on-surface mb-3">Vídeos Relacionados</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {relatedVideos.map((v) => (
                <VideoCardGrid key={v.id} video={v} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
