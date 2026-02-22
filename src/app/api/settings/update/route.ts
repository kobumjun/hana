import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const catalog_title = String(body.catalog_title ?? "").trim();
  const contact_phone = String(body.contact_phone ?? "").trim();

  if (!catalog_title || !contact_phone) {
    return NextResponse.json(
      { error: "catalog_title & contact_phone required" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: row, error: pickErr } = await supabase
    .from("site_settings")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pickErr) return NextResponse.json({ error: pickErr.message }, { status: 500 });

  if (!row?.id) {
    const { error: insErr } = await supabase.from("site_settings").insert({
      catalog_title,
      contact_phone,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { error: upErr } = await supabase
    .from("site_settings")
    .update({
      catalog_title,
      contact_phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}