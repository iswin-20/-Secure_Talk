"use server";

// GIF scraper — extracts real GIF URLs from Tenor search pages
// Uses browser-mimicking headers to avoid bot detection

export interface GifResult {
  id: string;
  url: string;
  preview: string;
  description: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "DNT": "1",
};

async function fetchTenorSearch(q: string): Promise<string> {
  const safeQ = q.trim().replace(/\s+/g, "-");
  const res = await fetch(`https://tenor.com/search/${encodeURIComponent(safeQ)}-gifs`, { headers: HEADERS });
  return res.text();
}

function extractGifUrls(html: string, q: string, limit = 24): GifResult[] {
  // Extract GIF URLs from the HTML — pattern: media*.tenor.com/<id>/<name>.gif
  const gifPattern = /https:\/\/media[0-9]?\.tenor\.com\/[^"'\s]+\.gif/gi;
  
  // Also try to parse the base64 JSON if present
  let results: GifResult[] = [];
  
  // First, try extracting from base64 JSON (richer)
  const jsonMatch = html.match(/<script id="data"[^>]*>([^<]+)<\/script>/);
  if (jsonMatch) {
    try {
      const decoded = atob(jsonMatch[1]);
      const start = decoded.indexOf("{");
      if (start >= 0) {
        const data = JSON.parse(decoded.slice(start));
        const items = data?.results?.results || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = items.slice(0, limit).map((r: any) => ({
          id: r.id || "",
          url: r.media_formats?.gif?.url || r.media_formats?.mediumgif?.url || r.media_formats?.tinygif?.url || "",
          preview: r.media_formats?.tinygif?.url || "",
          description: r.content_description || q,
        })).filter((g: GifResult) => g.url);
      }
    } catch {}
  }
  
  // If JSON parsing failed, fallback to regex
  if (results.length === 0) {
    const matches = html.match(gifPattern) || [];
    const seen = new Set<string>();
    for (const url of matches) {
      if (!url.includes("AAAAM") && !url.includes("tinygif")) continue; // tinygif size
      const clean = url.replace(/\/tinygif\//, "/gif/").replace(/\/nanogif\//, "/gif/");
      if (seen.has(clean)) continue;
      seen.add(clean);
      results.push({ id: String(results.length), url, preview: url, description: q });
    }
  }
  
  return results.slice(0, limit);
}

export async function searchGifs(q: string, limit: number = 24): Promise<GifResult[]> {
  if (!q.trim()) return [];
  try {
    const html = await fetchTenorSearch(q);
    const results = extractGifUrls(html, q, limit);
    if (results.length > 0) return results;
  } catch {}
  return [];
}
