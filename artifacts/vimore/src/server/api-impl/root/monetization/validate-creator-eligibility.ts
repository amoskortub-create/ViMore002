import { NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { validateCreatorEligibility } from '@/lib/ld-monetization';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const creatorUserId = String(body?.creatorUserId || '');
    const minimumFollowers = Number(body?.minimumFollowers ?? 1000);
    if (!creatorUserId || ![1000, 10000].includes(minimumFollowers)) {
      return NextResponse.json({ error: 'creatorUserId and a valid eligibility threshold are required.' }, { status: 400 });
    }
    const creator = await getAdminDatabases().getDocument(DATABASE_ID, 'users', creatorUserId);
    const followerCount = Number(creator.followers_count ?? creator.followersCount ?? 0);

    return NextResponse.json({
      eligible: validateCreatorEligibility(followerCount, minimumFollowers),
      creatorUserId,
      followerCount,
      minimumFollowers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Invalid eligibility payload.' }, { status: 400 });
  }
}
