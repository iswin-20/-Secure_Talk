"use server";

// Fetch Tenor search results page and extract GIF URLs
// Tenor search page: https://tenor.com/search/{query}-gifs
// GIF host: media.tenor.com

const GIF_PATTERN = /https:\/\/media\d?\.tenor\.com\/[^\s"']+(?:gif|mp4)/gi;

export interface GifResult {
  id: string;
  url: string;
  preview: string;
  description: string;
}

async function fetchWithFallback(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  return res.text();
}

export async function searchGifs(q: string, limit = 20): Promise<GifResult[]> {
  if (!q.trim()) return [];
  try {
    const safeQ = q.trim().replace(/\s+/g, "-");
    const html = await fetchWithFallback(`https://tenor.com/search/${encodeURIComponent(safeQ)}-gifs`);
    const matches = html.match(GIF_PATTERN) || [];
    
    // Filter to unique, collect up to limit
    const seen = new Set<string>();
    const results: GifResult[] = [];
    for (const url of matches) {
      const cleanUrl = url.replace(/\/(tinygif|nanogif|gif|minigif)\//, "/gif/");
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);
      // Use a smaller preview where possible
      const preview = cleanUrl.replace(/\/gif\//, "/tinygif/");
      results.push({ 
        id: String(results.length), 
        url: cleanUrl, 
        preview, 
        description: q 
      });
      if (results.length >= limit) break;
    }
    return results;
  } catch {
    return [];
  }
}
