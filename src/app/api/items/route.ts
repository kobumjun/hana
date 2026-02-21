import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

export async function GET() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("items")
    .select("id,name,price,category,description,image_url,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const body = await req.json().catch(() => ({}));

  const name = (body.name ?? "").trim();
  const price = Number(body.price ?? 0);
  const category = (body.category ?? "").trim();
  const description = (body.description ?? "").trim();
  const image_url = (body.image_url ?? null) as string | null;

  if (!name || !category) {
    return NextResponse.json(
      { error: "name & category required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("items")
    .insert([{ name, price, category, description, image_url }])
    .select("id,name,price,category,description,image_url,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}