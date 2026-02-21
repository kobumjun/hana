import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Next.js 15: params is Promise
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const patch: any = {};

  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.price !== undefined) patch.price = Math.floor(Number(body.price ?? 0));
  if (body.category !== undefined) patch.category = String(body.category).trim();

  // ✅ description도 업데이트 가능하게 (원하면 빼도 됨)
  if (body.description !== undefined)
    patch.description = String(body.description).trim() || null;

  if (body.image_url !== undefined)
    patch.image_url = body.image_url ? String(body.image_url) : null;

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("items")
    .update(patch)
    .eq("id", id)
    .select("id,name,price,category,description,image_url,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { error } = await sb.from("items").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}