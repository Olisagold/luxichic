import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json();
  // TODO: handle Telegram update
  void update;

  return NextResponse.json({ ok: true });
}
