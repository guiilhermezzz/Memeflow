import { useEffect, useState, useRef } from "react";
import { VideoCardFeed } from "@/components/VideoCard";
import type { Video } from "@/lib/mock-data";
import { useAppStore } from "@/stores";
import { useAuthStore } from "@/stores";

export default function HomePage() {
  const { videos } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const publicVideos = videos.filter((video) => video.status === "public");
  const displayVideos = publicVideos;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface px-4 py-10">
        <div className="w-full max-w-2xl rounded-[2rem] border border-border-color bg-surface-alt p-8 text-center shadow-xl shadow-primary/10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-2xl shadow-primary/30">
            <span className="text-2xl font-bold">MF</span>
          </div>
          <h2 className="text-3xl font-extrabold text-on-surface sm:text-4xl">Bem-vindo ao MemeFlow</h2>
          <p className="mt-4 text-base leading-7 text-on-surface-muted">
            Assista e compartilhe os melhores memes em um feed leve, rápido e bonito.
          </p>
          <a
            href="#/login"
            className="mt-8 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark"
          >
            Entrar agora
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-surface text-on-surface">
      <div className="h-[100dvh] w-full">
        {/* Fullscreen vertical feed */}
        <div id="home-feed" className="h-full w-full overflow-y-auto snap-y snap-mandatory">
          <FeedList videos={displayVideos} />
        </div>
      </div>
    </main>
  );
}

// FeedList component: handles active index and passes isActive to VideoCardFeed
function FeedList({ videos }: { videos: Video[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries: any) => {
      // pick the entry with largest intersectionRatio
      let best: any | null = null;
      entries.forEach((entry: any) => {
        if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
      });
      if (best && best.isIntersecting) {
        const idx = Number((best.target as HTMLElement).dataset.index);
        if (Number.isFinite(idx)) setActiveIndex(idx);
      }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });

    const children = Array.from(el.querySelectorAll("[data-index]"));
    children.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full">
      {videos.map((video, idx) => (
        <div key={video.id} data-index={idx} className="snap-start h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-3.5rem)]">
          <VideoCardFeed video={video} isActive={idx === activeIndex} />
        </div>
      ))}
    </div>
  );
}
