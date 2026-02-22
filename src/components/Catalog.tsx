"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
  description?: string | null;
  created_at?: string;
};

const CONTACT_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE || "010-7771-7711";

const CATEGORIES = ["전체", "수산물", "육류", "과일", "기타"] as const;
type CategoryTab = (typeof CATEGORIES)[number];

function formatPrice(v: number) {
  try {
    return new Intl.NumberFormat("ko-KR").format(v);
  } catch {
    return String(v);
  }
}

function normalizeCategory(raw?: string | null): Exclude<
  CategoryTab,
  "전체"
> {
  const c = (raw ?? "").trim();
  if (c === "수산물" || c === "육류" || c === "과일") return c;
  return "기타";
}

export default function Catalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryTab>("전체");

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) throw new Error("items fetch failed");
      const data = await res.json();
      const list: Item[] = Array.isArray(data) ? data : data.items ?? [];
      setItems(list);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "전체") return items;
    if (activeTab === "기타") {
      return items.filter(
        (it) => normalizeCategory(it.category) === "기타"
      );
    }
    return items.filter(
      (it) => normalizeCategory(it.category) === activeTab
    );
  }, [items, activeTab]);

  const telHref = `tel:${CONTACT_PHONE.replaceAll("-", "")}`;
  const smsHref = `sms:${CONTACT_PHONE.replaceAll("-", "")}`;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f5f8" }}>
      <header
        style={{
          background:
            "linear-gradient(90deg, #0b1530 0%, #0a1d3a 60%, #0b1530 100%)",
          color: "white",
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              하나유통 샘플 카탈로그
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>문의 </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#fbbf24",
                }}
              >
                {CONTACT_PHONE}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={telHref}
              style={{
                background: "#2e7d32",
                color: "white",
                padding: "10px 12px",
                borderRadius: 10,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              전화
            </a>
            <a
              href={smsHref}
              style={{
                background: "#1e40af",
                color: "white",
                padding: "10px 12px",
                borderRadius: 10,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              문자
            </a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {CATEGORIES.map((c) => {
            const active = activeTab === c;
            return (
              <button
                key={c}
                onClick={() => setActiveTab(c)}
                style={{
                  background: active ? "#0b1530" : "white",
                  color: active ? "white" : "#0b1530",
                  border: "1px solid #d5dbe5",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div>등록된 샘플이 없습니다.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((it) => {
              const showCategory = normalizeCategory(it.category);

              return (
                <Link
                  key={it.id}
                  href={`/items/${it.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {it.image_url ? (
                      <img
                        src={it.image_url}
                        alt={it.name}
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          background: "#f2f4f7",
                        }}
                      />
                    )}

                    <div style={{ padding: 10 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.name}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 16,
                          fontWeight: 900,
                        }}
                      >
                        {formatPrice(it.price || 0)}원
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: "#888",
                        }}
                      >
                        {showCategory}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}