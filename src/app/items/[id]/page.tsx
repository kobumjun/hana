import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) return notFound();

  // 🔥 환경별 baseUrl 처리
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://hana-taupe.vercel.app"
      : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/items/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return notFound();

  const data = await res.json();
  const item = data.item;

  if (!item) return notFound();

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{item.name}</h1>

      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          style={{ width: "100%", marginTop: 20, borderRadius: 12 }}
        />
      )}

      <div style={{ marginTop: 20, fontSize: 22, fontWeight: 900 }}>
        {item.price}원
      </div>

      {item.description && (
        <div style={{ marginTop: 16, fontSize: 16, lineHeight: 1.6 }}>
          {item.description}
        </div>
      )}
    </div>
  );
}