import 'server-only';

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const DB = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'vimoreprod';
const COLLECTION = 'ai_knowledge_bank';
const SIMILARITY_THRESHOLD = 0.50;
const MAX_FETCH = 100;
const MIN_ANSWER_LENGTH = 80;

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can','shall',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','mine','yours','hers','ours','theirs',
  'this','that','these','those','what','how','when','where','why','which','who','whom',
  'and','or','but','nor','so','yet','for','neither','either',
  'in','on','at','to','for','of','with','by','from','about','into','through',
  'during','before','after','above','below','between','among','up','down','out',
  'not','no','yes','just','also','only','very','too','quite','rather','really',
  'if','then','else','because','since','while','although','though','unless',
  'get','got','go','goes','went','come','came','make','made','give','gave',
  'take','took','know','knew','think','thought','want','need','use','say','said',
  'there','here','now','then','still','already','always','never','often','well',
  'like','more','most','some','any','all','each','every','both','same','other',
  'new','old','good','bad','big','small','first','last','long','little','own',
  'right','next','few','many','much','such','than','one','two','three',
  'please','tell','show','help','explain','describe','give','list',
  'me','can','could','would','should','what','about','does','did',
]);

export function extractKeywords(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/['\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const unique = [...new Set(words)];

  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      bigrams.push(`${words[i]}_${words[i + 1]}`);
    }
  }

  return [...new Set([...unique, ...bigrams])];
}

export function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (/diamond|gold|star\b|withdraw|earn|currency|payment|cash|wallet|balance|tip|gift|reward|transaction|fee/.test(t)) return 'economy';
  if (/handshake|follow|friend|\bdm\b|direct message|chat|cluster|group|community|vibe stream/.test(t)) return 'social';
  if (/lock|unlock|node|post|reel|vibe|stream|content|video|photo|caption|media|creator/.test(t)) return 'content';
  if (/marketplace|sell|buy|listing|boost|product|item|shop|vendor/.test(t)) return 'marketplace';
  if (/referral|star network|invite|link|refer|signup|refer/.test(t)) return 'referral';
  if (/account|login|password|register|profile|verify|sign|username|email|biometric|security/.test(t)) return 'account';
  if (/moderate|report|ban|violat|policy|rule|safe|content shield|suspend/.test(t)) return 'moderation';
  if (/ticket|event|concert|show|venue/.test(t)) return 'events';
  if (/data.lite|bandwidth|slow|connection|offline|compress/.test(t)) return 'connectivity';
  if (/vimore|media tech|liberia|africa|platform|feature|app|amos|intelligent/.test(t)) return 'platform';
  if (/math|calculat|algebra|geometry|calculus|equation|formula|number|percentage|fraction|statistic/.test(t)) return 'math';
  if (/science|biology|chemistry|physics|nature|animal|plant|cell|atom|energy|gravity/.test(t)) return 'science';
  if (/history|war|country|nation|president|king|queen|leader|empire|revolution|colonial/.test(t)) return 'history';
  if (/code|program|develop|software|javascript|python|html|css|algorithm|database|api/.test(t)) return 'technology';
  if (/health|medical|doctor|disease|symptom|diet|exercise|body|nutrition|mental|therapy/.test(t)) return 'health';
  if (/business|entrepreneur|startup|marketing|finance|invest|profit|strategy|brand|customer/.test(t)) return 'business';
  if (/cook|recipe|food|ingredient|meal|bake|fry|boil|spice|cuisine/.test(t)) return 'food';
  if (/music|song|beat|artist|album|lyrics|genre|instrument|rhythm/.test(t)) return 'music';
  if (/sport|football|basketball|soccer|athlete|team|game|match|tournament|coach/.test(t)) return 'sports';
  if (/language|grammar|english|french|spanish|word|sentence|translate|meaning|vocabulary/.test(t)) return 'language';
  if (/law|legal|right|court|judge|crime|justice|regulation|constitution/.test(t)) return 'law';
  if (/religion|faith|god|pray|church|mosque|bible|quran|spiritual|believe/.test(t)) return 'religion';
  if (/environment|climate|weather|pollution|recycle|planet|ecosystem|carbon|ocean/.test(t)) return 'environment';
  return 'general';
}

function scoreMatch(queryKw: string[], docKw: string[]): number {
  if (!queryKw.length || !docKw.length) return 0;
  const docSet = new Set(docKw);
  const intersection = queryKw.filter(k => docSet.has(k)).length;
  if (intersection === 0) return 0;

  const precision = intersection / queryKw.length;
  const recall = intersection / docKw.length;
  const f1 = (2 * precision * recall) / (precision + recall);

  const union = new Set([...queryKw, ...docKw]).size;
  const jaccard = intersection / union;

  return f1 * 0.65 + jaccard * 0.35;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': PROJECT,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY || '',
  };
}

export async function searchKnowledgeBank(question: string): Promise<{ answer: string; score: number; fromCache: true } | null> {
  if (!process.env.APPWRITE_API_KEY) return null;

  const queryKw = extractKeywords(question);
  if (queryKw.length < 2) return null;

  const category = detectCategory(question);

  try {
    const res = await fetch(
      `${ENDPOINT}/databases/${DB}/collections/${COLLECTION}/documents?limit=${MAX_FETCH}`,
      { headers: getHeaders(), cache: 'no-store' }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const docs: any[] = data.documents || [];
    if (!docs.length) return null;

    let bestScore = 0;
    let bestDoc: any = null;

    for (const doc of docs) {
      const docKw: string[] = doc.keywords || [];
      let score = scoreMatch(queryKw, docKw);
      if (score === 0) continue;

      if (doc.category === category) score *= 1.3;
      if ((doc.usage_count || 0) > 10) score *= 1.15;
      else if ((doc.usage_count || 0) > 3) score *= 1.07;
      score *= (0.6 + (doc.quality_score || 0.5) * 0.4);

      if (score > bestScore) {
        bestScore = score;
        bestDoc = doc;
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD && bestDoc) {
      updateUsage(bestDoc.$id, bestDoc.usage_count || 0).catch(() => {});
      return { answer: bestDoc.answer, score: bestScore, fromCache: true };
    }

    return null;
  } catch {
    return null;
  }
}

async function updateUsage(docId: string, currentCount: number): Promise<void> {
  try {
    await fetch(`${ENDPOINT}/databases/${DB}/collections/${COLLECTION}/documents/${docId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        data: {
          usage_count: currentCount + 1,
          last_used_at: new Date().toISOString(),
        },
      }),
    });
  } catch {
    // silent
  }
}

export async function saveToKnowledgeBank(question: string, answer: string): Promise<void> {
  if (!process.env.APPWRITE_API_KEY) return;
  if (!question?.trim() || question.trim().length < 8) return;
  if (!answer || answer.length < MIN_ANSWER_LENGTH) return;

  try {
    const questionKw = extractKeywords(question);
    const answerKw = extractKeywords(answer);
    const combined = [...new Set([...questionKw, ...answerKw])].slice(0, 30);

    const category = detectCategory(question + ' ' + answer);
    const isViMore = /vimore|diamond|gold|\bstar\b|handshake|cluster|signal|locked node|earnings hub|currency hub|command core|star network|media tech liberia/i.test(question + ' ' + answer);

    const qualityScore = Math.min(1,
      (Math.log10(Math.max(answer.length, 10)) / Math.log10(10000)) * 0.55 +
      (Math.min(combined.length / 30, 1)) * 0.45
    );

    const docId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const normalized = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    await fetch(`${ENDPOINT}/databases/${DB}/collections/${COLLECTION}/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        documentId: docId,
        data: {
          question: question.slice(0, 2000),
          question_normalized: normalized.slice(0, 2000),
          answer: answer.slice(0, 10000),
          keywords: combined,
          category,
          topic_tags: [...new Set([category, isViMore ? 'vimore' : 'world'])].slice(0, 10),
          language: 'en',
          is_vimore_specific: isViMore,
          usage_count: 0,
          quality_score: Math.round(qualityScore * 1000) / 1000,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
      }),
    });
  } catch {
    // Never disrupt the main chat flow
  }
}
