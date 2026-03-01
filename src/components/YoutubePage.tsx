"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getVideoId } from "@/lib/youtube";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  class Player {
    constructor(element: HTMLElement | string, options: { videoId: string; events?: { onStateChange?: (e: { data: number }) => void } });
    getCurrentTime(): number;
    getPlayerState(): number;
    pauseVideo(): void;
    destroy(): void;
  }
  const PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

const REPORT_INTERVAL_MS = 30000;

function loadYoutubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      if (window.YT?.Player) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
}

export function YoutubePage() {
  const [config, setConfig] = useState<{
    allowed_urls?: string[];
    video_ids?: string[];
    daily_limit_minutes: number;
  } | null>(null);
  const [usage, setUsage] = useState<{ today_seconds: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [overMessage, setOverMessage] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<Array<{ id: string; title: string; thumbnailUrl: string }>>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionSecondsRef = useRef(0);
  const reportTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playingSinceRef = useRef<number | null>(null);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/youtube/config");
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
    } else {
      setConfig({ allowed_urls: [], video_ids: [], daily_limit_minutes: 30 });
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    const res = await fetch("/api/youtube/usage");
    if (res.ok) {
      const data = await res.json();
      setUsage(data);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchUsage();
  }, [fetchConfig, fetchUsage]);

  const reportWatched = useCallback(async () => {
    const sec = sessionSecondsRef.current;
    if (sec <= 0) return;
    sessionSecondsRef.current = 0;
    await fetch("/api/youtube/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds: sec }),
    });
    await fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (!config || !usage) return;
    const limitSeconds = config.daily_limit_minutes * 60;
    if (usage.today_seconds >= limitSeconds) {
      setLimitReached(true);
      setOverMessage(`本日の視聴時間が上限（${config.daily_limit_minutes}分）に達しました`);
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
        if (playingSinceRef.current !== null) {
          sessionSecondsRef.current += (Date.now() - playingSinceRef.current) / 1000;
          playingSinceRef.current = null;
        }
      }
    } else {
      setLimitReached(false);
      setOverMessage(null);
    }
  }, [config, usage]);

  useEffect(() => {
    if (!selectedId || !containerRef.current) return;
    let player: YT.Player | null = null;

    loadYoutubeAPI().then(() => {
      if (!containerRef.current || !window.YT?.Player) return;
      player = new window.YT.Player(containerRef.current, {
        videoId: selectedId,
        events: {
          onStateChange(e: { data: number }) {
            if (e.data === window.YT.PlayerState.PLAYING) {
              playingSinceRef.current = Date.now();
            } else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
              if (playingSinceRef.current !== null) {
                sessionSecondsRef.current += (Date.now() - playingSinceRef.current) / 1000;
                playingSinceRef.current = null;
              }
            }
          },
        },
      });
      playerRef.current = player;
    });

    reportTimerRef.current = setInterval(() => {
      if (playingSinceRef.current !== null) {
        sessionSecondsRef.current += (Date.now() - playingSinceRef.current) / 1000;
        playingSinceRef.current = Date.now();
      }
      reportWatched();
    }, REPORT_INTERVAL_MS);

    return () => {
      if (reportTimerRef.current) {
        clearInterval(reportTimerRef.current);
        reportTimerRef.current = null;
      }
      if (playingSinceRef.current !== null) {
        sessionSecondsRef.current += (Date.now() - playingSinceRef.current) / 1000;
        playingSinceRef.current = null;
      }
      reportWatched();
      if (player?.destroy) player.destroy();
      playerRef.current = null;
    };
  }, [selectedId, reportWatched]);

  const uniqueIds = Array.from(
    new Set(
      config?.video_ids?.length
        ? config.video_ids
        : (config?.allowed_urls ?? []).map((u) => getVideoId(u)).filter((id): id is string => id !== null)
    )
  );

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setVideoDetails([]);
      setLoadingVideos(false);
      return;
    }
    setLoadingVideos(true);
    fetch("/api/youtube/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: uniqueIds }),
    })
      .then((r) => (r.ok ? r.json() : { videos: [] }))
      .then((d) => {
        setVideoDetails(d?.videos ?? []);
        setLoadingVideos(false);
      })
      .catch(() => {
        setVideoDetails([]);
        setLoadingVideos(false);
      });
  }, [uniqueIds.join(",")]);

  const displayList =
    videoDetails.length > 0
      ? videoDetails
      : uniqueIds.map((id) => ({
          id,
          title: `https://youtu.be/${id}`,
          thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        }));

  const remainingMinutes = config && usage
    ? Math.max(0, config.daily_limit_minutes - Math.floor(usage.today_seconds / 60))
    : null;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
      <div className="flex-none px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[var(--text)]">Youtube</h2>
        {remainingMinutes !== null && (
          <p className="text-chat-sm text-[var(--text-muted)]">
            本日の残り 約{remainingMinutes}分
          </p>
        )}
      </div>

      {limitReached && overMessage && (
        <div className="flex-none px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-chat-sm">
          {overMessage}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {config === null || (uniqueIds.length > 0 && loadingVideos) ? (
          <p className="text-chat-sm text-[var(--text-muted)] text-center py-12">
            読み込み中…
          </p>
        ) : uniqueIds.length === 0 ? (
          <p className="text-chat-sm text-[var(--text-muted)] text-center py-8">
            許可された動画がありません。設定でURLを追加してください
          </p>
        ) : (
          <div className="space-y-4">
            <div className="aspect-video w-full max-w-2xl mx-auto bg-black rounded-xl overflow-hidden">
              <div ref={containerRef} className="w-full h-full" />
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {displayList.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    disabled={limitReached}
                    className={`w-full text-left rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedId === v.id
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
                        : "border-[var(--border)] hover:border-[var(--accent)] hover:opacity-90"
                    } ${limitReached ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="aspect-video bg-[var(--border)] relative">
                      <img
                        src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="p-2 text-chat-xs font-medium text-[var(--text)] line-clamp-2">
                      {v.title}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
