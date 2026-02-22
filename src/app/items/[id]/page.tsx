import { notFound } from "next/navigation";

type Props = {
  params: { id: string };
};

export default async function ItemDetailPage({ params }: Props) {

  const { id } = await params;   // ← 이게 핵심

  if (!id) return notFound();

  const res = await fetch(`http://localhost:3000/api/items/${id}`, {
    cache: "no-store",
  });

  const data = await res.json();
  const item = data.item;

  if (!item) return notFound();

  return (
    <div style={{ padding: 40 }}>
      <h1>{item.name}</h1>

      {item.image_url && (
        <img src={item.image_url} style={{ width: 300 }} />
      )}

      <div style={{ fontSize: 22, fontWeight: 700 }}>
        {item.price}원
      </div>

      <div>{item.description}</div>
    </div>
  );
}