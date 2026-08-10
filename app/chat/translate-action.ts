'use server';

/**
 * Translate text using Google Translate API (unofficial, free tier)
 */
export async function translateText(
  text: string,
  targetLang: string = 'zh-CN',
): Promise<{ translation?: string; error?: string }> {
  if (!text?.trim()) return { error: 'No text to translate' };
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();
    
    // Parse the response: [[["translated text","original",...]],...]
    const translation = data?.[0]?.map((item: string[]) => item[0]).join('') || '';
    if (!translation) return { error: 'Translation failed' };
    
    return { translation };
  } catch (e) {
    console.error('Translate error:', e);
    return { error: 'Translation service unavailable' };
  }
}
