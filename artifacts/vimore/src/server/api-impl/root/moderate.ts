import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const GEMINI_MODEL = 'gemini-2.5-flash';

const ALLOWED_COLLECTIONS = new Set([
  'posts',
  'reels',
  'ad_campaigns',
  'marketplace_listings',
  'comments',
]);

const MODERATION_SYSTEM = `You are the ViMore Content Safety AI — a strict, accurate, and fair content moderator for ViMore, a social platform built for African creators.

Analyze the provided content (text and/or image) against ViMore's Terms of Service.

VIOLATIONS TO FLAG:
- Scams, fraud, phishing, or financial deception (fake giveaways, pyramid schemes, advance-fee fraud)
- Hate speech, racism, tribalism, ethnic targeting, or discrimination of any kind
- Harassment, threats, targeted abuse, or doxxing
- ANY statement that references killing, harming, or hurting people — even if phrased casually, as slang, or mixed with positive language. When in doubt about violence toward people, flag it.
- Explicit sexual content, nudity, or sexual solicitation
- Graphic violence or gore
- Spam or coordinated inauthentic behavior
- Impersonation of real people, public figures, or organizations
- Promotion of illegal activities (drug sales, weapons trafficking, etc.)
- Misleading or dangerous health misinformation

Respond with a JSON object in exactly this shape:
{"flagged": boolean, "reason": string, "severity": "low" | "medium" | "high"}

If content is safe: {"flagged": false, "reason": "", "severity": "low"}
If content violates policy: {"flagged": true, "reason": "concise explanation for admin review (under 120 chars)", "severity": "low" | "medium" | "high"}

Be accurate. Cultural expressions, slang, and debate are NOT violations. Output ONLY the JSON object.`;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) return null;
    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString('base64');
    return { data, mimeType };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rl = rateLimit(`moderate:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('[Moderate] GEMINI_API_KEY is not set');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  let body: { docId: string; collection: string; text: string; userId: string; mediaUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { docId, collection, text, userId, mediaUrl } = body;

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: 'Invalid collection.' }, { status: 400 });
  }

  if (!docId || typeof docId !== 'string' || docId.length > 64) {
    return NextResponse.json({ error: 'Invalid docId.' }, { status: 400 });
  }

  if (!text?.trim() && !mediaUrl) return NextResponse.json({ flagged: false });

  let modResult: { flagged: boolean; reason: string; severity: string } | null = null;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: MODERATION_SYSTEM,
    });

    const textPart = {
      text: `Analyze this content for policy violations:\n\nText: "${(text || '').slice(0, 1500)}"`,
    };
    const parts: any[] = [textPart];

    if (mediaUrl && typeof mediaUrl === 'string') {
      const imageData = await fetchImageAsBase64(mediaUrl);
      if (imageData) {
        parts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });
      }
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });

    let raw = '';
    try {
      raw = result.response.text().trim();
    } catch (safetyErr) {
      console.warn('[Moderate] Gemini safety filter blocked response (content likely very graphic) for doc:', docId);
      modResult = {
        flagged: true,
        reason: 'Content blocked by AI safety filter — likely graphic or harmful',
        severity: 'high',
      };
    }

    if (!modResult && raw) {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed.flagged === 'boolean') {
          modResult = {
            flagged: parsed.flagged,
            reason: String(parsed.reason || ''),
            severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'low',
          };
        } else {
          console.error('[Moderate] Unexpected JSON shape from Gemini:', jsonStr);
        }
      } catch (parseErr) {
        console.error('[Moderate] Failed to parse Gemini response as JSON. Raw output:', raw);
      }
    }

    if (!modResult) {
      console.warn('[Moderate] Could not parse Gemini response — treating as safe. Doc:', docId);
      return NextResponse.json({ flagged: false });
    }

    if (!modResult.flagged) {
      return NextResponse.json({ flagged: false });
    }

    console.log(`[Moderate] Content FLAGGED — doc: ${docId}, severity: ${modResult.severity}, reason: ${modResult.reason}`);

  } catch (err: any) {
    console.error('[Moderate] Gemini API call failed:', err?.message || err);
    return NextResponse.json({ flagged: false });
  }

  const APPWRITE_ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
  const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
  const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';
  const API_KEY = process.env.APPWRITE_API_KEY;

  if (!API_KEY) {
    console.warn(
      '[Moderate] APPWRITE_API_KEY is not set — content was flagged but report cannot be created.',
      `Doc: ${docId}, Reason: ${modResult!.reason}`
    );
    return NextResponse.json({ flagged: true, reason: modResult!.reason, severity: modResult!.severity });
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': PROJECT_ID,
    'X-Appwrite-Key': API_KEY,
  };

  const reportId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [patchRes, reportRes] = await Promise.allSettled([
    fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collection}/documents/${docId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ data: { status: 'pending_review' } }),
    }),
    fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/admin_reports/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentId: reportId,
        data: {
          doc_id: docId,
          collection_name: collection,
          reason: modResult!.reason,
          severity: modResult!.severity,
          reported_at: new Date().toISOString(),
          status: 'open',
          user_id: userId,
          content_preview: (text || '').slice(0, 300),
          has_media: !!mediaUrl,
        },
      }),
    }),
  ]);

  if (patchRes.status === 'rejected') {
    console.error('[Moderate] Failed to patch post status:', (patchRes as any).reason);
  } else {
    const patchResponse = (patchRes as any).value;
    if (!patchResponse.ok) {
      const patchBody = await patchResponse.text().catch(() => '');
      console.error(`[Moderate] Appwrite PATCH returned ${patchResponse.status}:`, patchBody);
    }
  }

  if (reportRes.status === 'rejected') {
    console.error('[Moderate] Failed to create admin report:', (reportRes as any).reason);
  } else {
    const reportResponse = (reportRes as any).value;
    if (!reportResponse.ok) {
      const reportBody = await reportResponse.text().catch(() => '');
      console.error(`[Moderate] Appwrite report creation returned ${reportResponse.status}:`, reportBody);
    } else {
      console.log('[Moderate] Admin report created. Report ID:', reportId);
    }
  }

  return NextResponse.json({ flagged: true, reason: modResult!.reason, severity: modResult!.severity });
}
