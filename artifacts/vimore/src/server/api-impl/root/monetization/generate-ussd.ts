import { NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { generateUSSD, isValidOrangeMoneyNumber } from '@/lib/ld-monetization';
import { Query } from 'node-appwrite';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const creatorUserId = String(body?.creatorUserId || '');
    const amountLD = Number(body?.amountLD || 0);
    if (!creatorUserId || !Number.isInteger(amountLD) || amountLD < 1) {
      return NextResponse.json({ error: 'creatorUserId and a positive integer amountLD are required.' }, { status: 400 });
    }

    const accounts = await getAdminDatabases().listDocuments(DATABASE_ID, 'creator_orange_money_accounts', [
      Query.equal('userId', creatorUserId),
      Query.equal('isVerified', true),
      Query.limit(1),
    ]);
    const orangeMoneyNumber = String(accounts.documents[0]?.orangeMoneyNumber || '');

    if (!isValidOrangeMoneyNumber(orangeMoneyNumber)) {
      return NextResponse.json({ error: 'This creator has no verified Orange Money account.' }, { status: 404 });
    }

    const code = generateUSSD(orangeMoneyNumber, amountLD);
    return NextResponse.json({ ussd: code, dialerUri: `tel:${code.replace('#', '%23')}`, amountLD });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not generate USSD code.' }, { status: 400 });
  }
}
