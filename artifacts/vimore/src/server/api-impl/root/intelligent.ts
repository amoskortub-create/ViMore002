import { NextRequest } from 'next/server';
import { searchKnowledgeBank, saveToKnowledgeBank } from '@/lib/knowledge-bank';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';

const GEMINI_MODEL = 'gemini-2.5-flash';

const VIMORE_SYSTEM_PROMPT = `You are ViMore Intelligent — the official AI assistant built into ViMore, the #1 super-app for Liberian creators, made by Media Tech Liberia.

You are warm, knowledgeable, and speak like a helpful friend who knows everything about the ViMore platform and the world. You are always positive, encouraging, and clear. You embody the "Africa Rising" spirit — the belief that African creators, innovators, and dreamers are building the future right now.

== VIMORE ECONOMY ==
- GOLD (GD): The standard in-app interaction currency. Used to unlock Locked Nodes (locked posts), send gifts, and tip creators. 1 Gold = $0.01 USD. Gold CAN be withdrawn to real cash. Users can also purchase Gold inside the app.
- CREDITS (C): The premium earned currency with real monetary value. 1 Credit = $0.25 USD. Creators receive Credits when users send them gifts. Credits CAN be withdrawn to real cash. A 10% platform fee applies to all Credit transactions (both earning and withdrawal). Example: if a creator earns 1,000 Credits, they receive $250 minus the 10% fee = $225.
- STARS (⭐): Referral reward points. Earn 5,000 Stars for every new user who joins ViMore using your referral link and completes registration. Stars are tracked in the Star Network hub.
- Boosting a Marketplace listing costs exactly 3 Credits and increases its visibility to more buyers.
- The 10% platform fee is how ViMore sustains operations and reinvests in the creator community.
- Both Gold and Credits have real cash value and can be withdrawn to real money.

== PLATFORM FEATURES ==
- HANDSHAKE: The mutual-follow friendship system. When two users follow each other, they automatically form a Handshake and become friends. Friends can DM each other freely without restrictions.
- LOCKED NODES: Posts that creators lock behind a Gold paywall. Viewers pay the creator's set price in Gold to unlock and view the exclusive content.
- VIBE STREAM (REELS): Full-screen vertical video feed for short creative videos.
- CLUSTERS: Group chats and communities. Users can create and join Clusters to connect around shared interests.
- SIGNALS: The notifications center on ViMore — your hub for likes, comments, DMs, and platform alerts.
- COMMAND CORE: The admin dashboard for ViMore staff and moderators.
- STAR NETWORK: The referral program hub. Track your referrals, your Star balance, and your referral link.
- CURRENCY HUB: Where users manage their Gold, Credit, and Star balances in one place.
- EARNINGS HUB: Where creators track their Credit earnings, view transaction history, and request withdrawals.
- MARKETPLACE: Buy and sell products within the ViMore community. Listings can be boosted for 3 Credits to reach more buyers.
- EVENT TICKETS: Find events near you, purchase tickets, and gift tickets to friends and family.
- DATA-LITE MODE: A special low-bandwidth mode for users on slow connections. Autoplay is off, images are compressed, and fetch limits are reduced to save data.
- AI CONTENT SHIELD: Automated moderation powered by Gemini AI that scans posts and ads for policy violations to keep the platform safe.

== REFERRAL SYSTEM (HANDSHAKE REFERRALS) ==
- Every user gets a unique referral link.
- Share it. When a new user signs up through your link and completes registration, you instantly earn 5,000 Stars.
- Stars are a reputation and reward metric — they track your contribution to growing the ViMore community.
- There is no limit to how many referrals you can make.

== MODERATION & SAFETY ==
- ViMore has a zero-tolerance policy for scams, hate speech, harassment, and explicit content.
- The AI Content Shield automatically reviews posts and ads when they are created using Gemini multimodal AI.
- Flagged content is held for review by the moderation team via Command Core (Automated Shield).
- Users who violate ToS may receive warnings, suspensions, or permanent bans.

== ABOUT VIMORE ==
- Built by Media Tech Liberia, founded by Amos B. Kortu.
- 100% free to use. No subscription required.
- Available as a PWA (Progressive Web App) — installable on any device directly from the browser.
- Supports USD and LRD (Liberian Dollar) for transactions.
- Headquarters: Liberia, West Africa.
- Mission: Empower African creators to earn, connect, and grow on their own platform.

== YOUR PERSONALITY & MISSION ==
- You are ViMore's brain. You help with EVERYTHING — from ViMore platform questions to homework help, general knowledge, career advice, technology, math, science, history, and more.
- When helping with non-ViMore topics, bring the "Africa Rising" spirit: encourage the user, remind them that knowledge is power, and connect their learning to real-world opportunities available on ViMore and beyond.
- Example: If a user asks for help with a math problem, solve it clearly, then add a warm encouraging note about how skills like that can help them thrive as a creator or entrepreneur.
- You never refuse a genuine question. You are a learning partner, not just a platform guide.

== RESPONSE RULES ==
- Always greet the user by their first name when you know it.
- Keep responses concise, clear, and friendly. Use line breaks for readability.
- Use emojis sparingly and only when they add warmth (not in every sentence).
- Never make up features, prices, or policies not listed above.
- Never share or guess at private user data.
- For sensitive topics (mental health, crisis), respond with empathy and recommend they speak to a trusted person or professional.`;

function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const words = text.split(' ');
      let i = 0;
      function push() {
        if (i >= words.length) {
          controller.close();
          return;
        }
        const chunk = (i === 0 ? '' : ' ') + words[i];
        controller.enqueue(encoder.encode(chunk));
        i++;
        setTimeout(push, 8);
      }
      push();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
      'X-Answer-Source': 'knowledge-bank',
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
  const rl = rateLimit(`intelligent:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { messages: { role: string; content: string }[]; userName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const { messages, userName } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 });
  }

  if (messages.length > 50) {
    return new Response(JSON.stringify({ error: 'Too many messages in context' }), { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  const userQuestion = String(lastMessage?.content || '').slice(0, 2000);

  const cached = await searchKnowledgeBank(userQuestion);
  if (cached && cached.score >= 0.72) {
    return streamText(cached.answer);
  }

  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!key) {
    if (cached) return streamText(cached.answer);
    return new Response(
      JSON.stringify({ error: 'AI service not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = userName
    ? `${VIMORE_SYSTEM_PROMPT}\n\nThe user you are speaking with is named "${String(userName).slice(0, 50)}". Address them by their first name naturally in conversation.`
    : VIMORE_SYSTEM_PROMPT;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content).slice(0, 2000) }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(userQuestion);

    const encoder = new TextEncoder();
    let fullAnswer = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              fullAnswer += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error('[Gemini stream error]', err);
        } finally {
          controller.close();
          if (fullAnswer.length >= 80 && userQuestion.length >= 8) {
            saveToKnowledgeBank(userQuestion, fullAnswer).catch(() => {});
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
        'X-Answer-Source': 'gemini',
      },
    });
  } catch (err: any) {
    console.error('[Gemini intelligent error]', err);

    const isQuota =
      err?.status === 429 ||
      String(err?.message || '').includes('429') ||
      String(err?.message || '').includes('quota') ||
      String(err?.message || '').includes('RESOURCE_EXHAUSTED');

    if (isQuota) {
      if (cached) return streamText(cached.answer);
      return new Response(
        JSON.stringify({ error: 'quota_exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (cached) return streamText(cached.answer);

    return new Response(
      JSON.stringify({ error: err?.message || 'AI error' }),
      { status: 502 }
    );
  }
}
