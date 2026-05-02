/**
 * YouTubePlayer — shared component for the LMS
 *
 * • Detects YouTube URLs (youtube.com/watch?v=, youtu.be/, shorts/, embed/)
 * • Builds embed URL with full native controls (progress bar, volume, fullscreen)
 * • Renders a fully responsive 16:9 iframe
 * • Falls back to `fallbackContent` for non-YouTube URLs
 */

type Props = {
  url: string;
  fallbackContent?: React.ReactNode;
};

export function extractYouTubeId(url: string): string | null {
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

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "1",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    fs: "1",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function YouTubePlayer({ url, fallbackContent }: Props) {
  if (!isYouTubeUrl(url)) {
    return <>{fallbackContent ?? null}</>;
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return <>{fallbackContent ?? null}</>;
  }

  const embedUrl = buildYouTubeEmbedUrl(videoId);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16/9" }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="YouTube video player"
      />
    </div>
  );
}
