import { NextRequest, NextResponse } from "next/server";
const BOT_API = "http://16.171.145.190:8080";
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const res = await fetch(`${BOT_API}/${path}`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data);
}