import { Router, type IRouter } from "express";

const router: IRouter = Router();

const cache = new Map<string, { duration: string; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#\s]+)/,
    /youtu\.be\/([^?&#\s]+)/,
    /youtube\.com\/embed\/([^?&#\s]+)/,
    /youtube\.com\/shorts\/([^?&#\s]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const sec = parseInt(m[3] ?? "0", 10);
  if (h > 0) {
    return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${min}:${String(sec).padStart(2, "0")}`;
}

router.get("/youtube-duration", async (req, res) => {
  const url = req.query.url as string | undefined;
  if (!url) {
    res.status(400).json({ error: "url query param required" });
    return;
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    res.status(400).json({ error: "Not a valid YouTube URL" });
    return;
  }

  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    res.json({ duration: cached.duration, videoId });
    return;
  }

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await response.text();

    const match =
      html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/) ||
      html.match(/"approxDurationMs":"(\d+)"/) ||
      html.match(/"lengthSeconds":"(\d+)"/);

    let duration = "";
    if (match?.[1]) {
      if (match[1].startsWith("PT")) {
        duration = parseDuration(match[1]);
      } else if (/^\d+$/.test(match[1])) {
        const totalSec = Math.round(parseInt(match[1], 10) / 1000);
        const h = Math.floor(totalSec / 3600);
        const min = Math.floor((totalSec % 3600) / 60);
        const sec = totalSec % 60;
        duration =
          h > 0
            ? `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
            : `${min}:${String(sec).padStart(2, "0")}`;
      }
    }

    cache.set(videoId, { duration, fetchedAt: Date.now() });
    res.json({ duration, videoId });
  } catch {
    res.status(502).json({ error: "Failed to fetch YouTube metadata" });
  }
});

export default router;
