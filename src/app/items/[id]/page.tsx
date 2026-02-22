"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) return notFound();

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

  const images: string[] =
    item.image_urls && item.image_urls.length
      ? item.image_urls
      : item.image_url
      ? [item.image_url]
      : [];

  return (
    <ItemDetailClient item={item} images={images} />
  );
}

/* ------------------------------
   🔥 클라이언트 슬라이드 컴포넌트
--------------------------------*/
function ItemDetailClient({
  item,
  images,
}: {
  item: any;
  images: string[];
}) {
  const [index, setIndex] = useState(0);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{item.name}</h1>

      {images.length > 0 && (
        <div style={{ position: "relative", marginTop: 20 }}>
          <img
            src={images[index]}
            alt={item.name}
            style={{
              width: "100%",
              borderRadius: 12,
              objectFit: "cover",
            }}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={() =>
                  setIndex((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1
                  )
                }
                style={{
                  position: "absolute",
                  left: 10,
                  top: "45%",
                  background: "rgba(0,0,0,0.5)",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ‹
              </button>

              <button
                onClick={() =>
                  setIndex((prev) =>
                    prev === images.length - 1 ? 0 : prev + 1
                  )
                }
                style={{
                  position: "absolute",
                  right: 10,
                  top: "45%",
                  background: "rgba(0,0,0,0.5)",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
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