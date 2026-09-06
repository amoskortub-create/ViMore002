import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabases, DATABASE_ID } from "@/lib/appwrite-server";
import { getSessionUser } from "@/lib/session";
import { ID, Query } from "node-appwrite";

const COLLECTION_ID = "native_push_tokens";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );

    const { token, platform = "android" } = await req.json();
    if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
      return NextResponse.json(
        { error: "Invalid FCM token." },
        { status: 400 },
      );
    }
    if (platform !== "android") {
      return NextResponse.json(
        { error: "Unsupported platform." },
        { status: 400 },
      );
    }

    const db = getAdminDatabases();
    const existing = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("token", token),
      Query.limit(1),
    ]);
    const data = {
      user_id: session.userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    };

    if (existing.total > 0) {
      await db.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        existing.documents[0].$id,
        data,
      );
    } else {
      await db.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        ...data,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.warn(
      "[push/native-subscribe] storage failed:",
      error?.message || error,
    );
    return NextResponse.json(
      { error: "Native push token storage is not configured." },
      { status: 503 },
    );
  }
}
