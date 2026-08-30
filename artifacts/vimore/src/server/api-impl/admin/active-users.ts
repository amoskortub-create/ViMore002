import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

const COL_ID = 'user_activity';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== 'SUPER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDatabases();
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Paginate through all docs (up to 5000)
    let allDocs: any[] = [];
    let cursor: string | undefined;
    do {
      const queries: string[] = [Query.limit(500), Query.orderDesc('last_seen')];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const page = await db.listDocuments(DATABASE_ID, COL_ID, queries);
      allDocs = allDocs.concat(page.documents);
      cursor = page.documents.length === 500 ? page.documents[page.documents.length - 1].$id : undefined;
      if (allDocs.length >= 5000) break;
    } while (cursor);

    // DAU — unique users today
    const dauSet = new Set<string>();
    for (const doc of allDocs) {
      if (doc.session_date === today) dauSet.add(doc.user_id);
    }

    // MAU — unique users in last 30 days
    const mauSet = new Set<string>();
    for (const doc of allDocs) {
      if (doc.last_seen >= thirtyDaysAgo) mauSet.add(doc.user_id);
    }

    // Build per-user latest record (IP + last_seen)
    const userMap = new Map<string, { username: string; ip_address: string; last_seen: string; user_agent: string }>();
    for (const doc of allDocs) {
      const existing = userMap.get(doc.user_id);
      if (!existing || doc.last_seen > existing.last_seen) {
        userMap.set(doc.user_id, {
          username: doc.username,
          ip_address: doc.ip_address,
          last_seen: doc.last_seen,
          user_agent: doc.user_agent || '',
        });
      }
    }

    const userList = Array.from(userMap.entries())
      .map(([user_id, info]) => ({ user_id, ...info }))
      .sort((a, b) => b.last_seen.localeCompare(a.last_seen));

    // Daily breakdown for chart (last 14 days)
    const dailyMap = new Map<string, Set<string>>();
    for (const doc of allDocs) {
      if (!dailyMap.has(doc.session_date)) dailyMap.set(doc.session_date, new Set());
      dailyMap.get(doc.session_date)!.add(doc.user_id);
    }

    const dailyChart: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dailyChart.push({ date: d, count: dailyMap.get(d)?.size ?? 0 });
    }

    return NextResponse.json({
      dau: dauSet.size,
      mau: mauSet.size,
      totalTracked: userMap.size,
      userList,
      dailyChart,
    });
  } catch (err: any) {
    console.error('[ActiveUsers] Error:', err?.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
