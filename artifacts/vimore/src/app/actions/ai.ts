'use server';

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
const GEMINI_MODEL = 'gemini-2.5-flash';

async function callGemini(systemPrompt: string, userPrompt: string, maxTokens = 400): Promise<string | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    });
    const text = result.response.text().trim();
    return text || null;
  } catch (err) {
    console.error('[Gemini callGemini error]', err);
    return null;
  }
}

export async function aiTranslatePostAction({
  postContent,
  targetLanguage = 'en',
}: {
  postContent: string;
  targetLanguage?: string;
}) {
  if (!postContent?.trim()) return { translation: postContent };

  const targetLang = (targetLanguage || 'en').split('-')[0].toLowerCase();

  const result = await callGemini(
    `You are a professional translator with deep knowledge of African languages, dialects, and cultural nuances. Translate the given text into ${targetLang === 'en' ? 'fluent English' : targetLang}. Preserve the original tone, slang, local expressions, and register. Return ONLY the translated text with no explanations or quotes.`,
    postContent,
    300
  );
  if (result) return { translation: result };

  try {
    const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(postContent.slice(0, 500))}&langpair=auto|${targetLang}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated: string = data.responseData.translatedText;
        if (!translated.toUpperCase().startsWith('MYMEMORY WARNING') && translated !== postContent) {
          return { translation: translated };
        }
      }
    }
  } catch { /* fall through to original */ }

  return { translation: postContent };
}

function smartCaptionFallback(content: string): string {
  const lower = content.toLowerCase();
  const topicData: Record<string, { emoji: string; tags: string[] }> = {
    food:       { emoji: '🍽️', tags: ['#FoodVibes', '#TasteOfLife', '#Foodie', '#EatWell'] },
    music:      { emoji: '🎵', tags: ['#MusicLife', '#ViMoreSounds', '#NowPlaying', '#MusicVibes'] },
    travel:     { emoji: '✈️', tags: ['#TravelMode', '#Wanderlust', '#ExploreMore', '#AdventureAwaits'] },
    love:       { emoji: '❤️', tags: ['#LoveLife', '#Grateful', '#Blessed', '#HeartFull'] },
    fitness:    { emoji: '💪', tags: ['#GrindMode', '#FitLife', '#WorkoutVibes', '#HealthFirst'] },
    nature:     { emoji: '🌿', tags: ['#NatureVibes', '#OutdoorLife', '#EarthBeautiful', '#NatureLovers'] },
    fashion:    { emoji: '👗', tags: ['#StyleVibes', '#FashionForward', '#OOTD', '#TrendAlert'] },
    creator:    { emoji: '🎬', tags: ['#ContentCreator', '#ViMoreCreator', '#CreateEveryDay', '#CreatorLife'] },
    money:      { emoji: '💰', tags: ['#Hustle', '#MoneyMoves', '#Grind', '#WealthMindset'] },
    motivation: { emoji: '🚀', tags: ['#Mindset', '#GrowthMode', '#LevelUp', '#KeepGoing'] },
  };
  const detectTopic = (): string => {
    if (/eat|food|cook|meal|delicious|recipe|hungry|restaurant/.test(lower)) return 'food';
    if (/music|song|beat|track|listen|sound|artist|rapper|singer/.test(lower)) return 'music';
    if (/trip|travel|journey|road|destination|country|flight|hotel/.test(lower)) return 'travel';
    if (/love|heart|miss|together|relationship|couple/.test(lower)) return 'love';
    if (/gym|workout|run|exercise|training|fitness|push|lift/.test(lower)) return 'fitness';
    if (/nature|forest|mountain|beach|ocean|river|green|tree/.test(lower)) return 'nature';
    if (/fashion|style|outfit|wear|dress|clothes|ootd/.test(lower)) return 'fashion';
    if (/money|cash|earn|income|business|hustle|rich|wealth/.test(lower)) return 'money';
    if (/goal|dream|success|hustle|grind|motivat|inspir|level/.test(lower)) return 'motivation';
    return 'creator';
  };
  const topic = detectTopic();
  const { emoji, tags } = topicData[topic];
  const templates = [
    `${content} ${emoji}\n\n${tags.slice(0, 3).join(' ')} #ViMore`,
    `${emoji} ${content}\n\nDrop a 🔥 if you relate!\n${tags.slice(0, 2).join(' ')} #ViMore`,
    `${content}\n\nWhat do you think? ${emoji}\n${tags.slice(0, 3).join(' ')} #ViMoreCreator`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

export async function aiGenerateCaptionAction({ content, hasMedia = false }: { content: string; hasMedia?: boolean }) {
  if (!content?.trim()) return { caption: content };
  const systemPrompt = `You are an expert social media content writer for ViMore, a creator platform popular in Africa and globally.
Enhance the given post caption to be more engaging, authentic, and viral-ready.
Rules:
- Keep the core message but make it more captivating
- Add 2-4 relevant emojis naturally within the text
- Add 3-5 relevant hashtags at the end — one must be #ViMore
- Keep caption body under 220 characters (before hashtags)
- Use a confident, relatable voice — not overly formal or corporate
- Do NOT add quotes, labels, or any prefix like "Enhanced:" around the output
- Return ONLY the final caption text with hashtags at the bottom, nothing else`;
  const userPrompt = hasMedia
    ? `Enhance this caption for a post with photo/video: "${content}"`
    : `Enhance this caption: "${content}"`;
  const result = await callGemini(systemPrompt, userPrompt, 300);
  return { caption: result || smartCaptionFallback(content) };
}

export async function aiSuggestCaptionsFromImagesAction({
  imageBase64,
  mimeType,
  isVideo = false,
}: {
  imageBase64: string;
  mimeType: string;
  isVideo?: boolean;
}): Promise<{ captions: string[] }> {
  const fallback = [
    "Capturing moments worth remembering ✨ #ViMore",
    "Living in the moment 🔥 #ViMoreCreator",
    "Every picture tells a story 📸 #ViMore",
  ];
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return { captions: fallback };
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: `You are a social media caption expert for ViMore, a creator platform popular in Africa and globally. Generate exactly 3 short, engaging captions for the given ${isVideo ? 'video thumbnail' : 'image'}. Each caption should be on its own line, no numbering, no bullets, no quotes. Each must include 2-3 relevant emojis and 2-3 hashtags (one must be #ViMore). Keep each caption under 180 characters including hashtags.`,
    });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: `Generate 3 engaging social media captions for this ${isVideo ? 'video' : 'photo'}, one per line.` },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.9,
      },
    });
    const text = result.response.text().trim();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    const captions = lines.slice(0, 3);
    if (captions.length < 1) return { captions: fallback };
    while (captions.length < 3) captions.push(fallback[captions.length]);
    return { captions };
  } catch (err) {
    console.error('[Gemini vision caption error]', err);
    return { captions: fallback };
  }
}

export async function aiSuggestHashtagsAction({ content }: { content: string }): Promise<{ hashtags: string[] }> {
  const fallback = ['#ViMore', '#ViMoreCreator', '#AfricanCreator', '#ContentCreator', '#Trending', '#CreateEveryDay'];
  if (!content?.trim()) return { hashtags: fallback };
  const result = await callGemini(
    `You are a social media hashtag expert for ViMore, a creator platform popular in Africa and globally. Generate exactly 8 highly relevant, trending hashtags for the given post content. Each hashtag must start with #. Return ONLY the hashtags separated by spaces on one line, no explanations, no numbering.`,
    `Post content: "${content.slice(0, 300)}"`,
    80
  );
  if (!result) return { hashtags: fallback };
  const tags = result.match(/#[\w]+/g)?.slice(0, 8) || [];
  if (tags.length < 3) return { hashtags: fallback };
  if (!tags.some(t => t.toLowerCase() === '#vimore')) tags.splice(0, 0, '#ViMore');
  return { hashtags: tags.slice(0, 8) };
}

export async function aiAnalyzeVibeAction({
  posts,
  totalLikes,
  totalUnlikes,
  recentPosts,
  totalUsers,
}: {
  posts: number;
  totalLikes: number;
  totalUnlikes: number;
  recentPosts: number;
  totalUsers: number;
}) {
  const sentiment = totalLikes + totalUnlikes > 0
    ? Math.round((totalLikes / (totalLikes + totalUnlikes)) * 100)
    : 72;
  const velocity = recentPosts > 20 ? 'HIGH' : recentPosts > 5 ? 'MEDIUM' : recentPosts > 0 ? 'LOW' : 'IDLE';
  const engagementRate = posts > 0 ? Math.round((totalLikes / posts) * 10) / 10 : 0;
  const systemPrompt = `You are a social media analytics expert. Based on platform metrics, give a direct 2-sentence insight on platform health and one specific actionable recommendation. Be concise and data-driven. No fluff.`;
  const userPrompt = `Platform: ViMore. Metrics: ${totalUsers} total users, ${posts} total posts, ${totalLikes} total likes, ${totalUnlikes} total dislikes, ${recentPosts} posts in last 24h, sentiment ${sentiment}%, engagement rate ${engagementRate} likes/post, velocity status: ${velocity}.`;
  const insight = await callGemini(systemPrompt, userPrompt, 150);
  const defaultInsights: Record<string, string> = {
    HIGH: `Network velocity is strong at ${recentPosts} posts today — creators are highly active. Sentiment stands at ${sentiment}%, signalling healthy community engagement. Consider boosting trending posts to amplify organic reach.`,
    MEDIUM: `Steady content flow with ${recentPosts} posts today and ${sentiment}% positive sentiment. Engagement is stable across the network. Launch a creator challenge to spike activity and attract new followers.`,
    LOW: `Low content velocity detected (${recentPosts} posts today) while ${sentiment}% sentiment remains positive — users are happy but quiet. Push a targeted notification to re-engage dormant creators and offer featured placement incentives.`,
    IDLE: `Platform is in idle state with no recent posts. Seed new content from top creators and trigger a broadcast notification campaign to re-activate your user base urgently.`,
  };
  return { sentiment, velocity, engagementRate, insight: insight || defaultInsights[velocity] };
}
