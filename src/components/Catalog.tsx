"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
  description?: string | null;
  created_at?: string;
};

const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "010-7771-7711";

// 고객 요청 기준 카테고리(+추천상품)
const CATEGORIES = ["전체", "추천상품", "수산물", "육류", "과일", "기타"] as const;
type CategoryTab = (typeof CATEGORIES)[number];

function formatPrice(v: number) {
  try {
    return new Intl.NumberFormat("ko-KR").format(v);
  } catch {
    return String(v);
  }
}

export default function Catalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<CategoryTab>("전체");

  // 폼 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<string>("추천상품");
  const [description, setDescription] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (activeTab === "전체") return items;
    return items.filter((it) => it.category === activeTab);
  }, [items, activeTab]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) throw new Error("items fetch failed");
      const data = await res.json();
      // data 형태가 { items: [...] } 또는 [...] 일 수 있어서 방어
      const list: Item[] = Array.isArray(data) ? data : data.items ?? [];
      // 최신순 정렬
      list.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")).reverse();
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

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice(0);
    setCategory("추천상품");
    setDescription("");
    setFile(null);
  }

  // ✅ 업로드 → publicUrl 반환 (업로드 API가 publicUrl / url 어떤 키로 줘도 대응)
  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!file) return null;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    // 업로드 실패 내용 최대한 보여주기
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("upload failed: " + (t || res.statusText));
    }

    const data = await res.json().catch(() => ({}));
    // ✅ 여기 핵심: publicUrl 우선, 없으면 url도 허용
    const url: string | null = data?.publicUrl ?? data?.url ?? null;

    if (!url) {
      throw new Error("upload response has no url/publicUrl");
    }
    return url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert("상품명을 입력해주세요.");
    if (!category.trim()) return alert("카테고리를 선택해주세요.");

    setSaving(true);
    try {
      // ✅ 1) 업로드 먼저(선택)
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadImageIfNeeded();

      // ✅ 2) 업로드 결과 포함해서 DB 저장
      const payload: any = {
        name: name.trim(),
        price: Number.isFinite(price) ? Number(price) : 0,
        category,
        // description은 항상 보내자(빈 값이면 null)
        description: description?.trim() || null,
        // 수정일 때 파일을 안 고르면 image_url 안 보내서 기존 유지
        ...(imageUrl ? { image_url: imageUrl } : {}),
      };

      if (editingId) {
        const res = await fetch(`/api/items/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error("update failed: " + (t || res.statusText));
        }
      } else {
        const res = await fetch(`/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error("create failed: " + (t || res.statusText));
        }
      }

      await fetchItems();
      const wasEditing = Boolean(editingId);
      resetForm();
      alert(wasEditing ? "수정 완료" : "등록 완료");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "저장 중 오류");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(it: Item) {
    setEditingId(it.id);
    setName(it.name || "");
    setPrice(it.price ?? 0);
    setCategory(it.category || "추천상품");
    setDescription(it.description || "");
    setFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeItem(id: string) {
    if (!confirm("삭제할까요?")) return;
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error("delete failed: " + (t || res.statusText));
      }
      await fetchItems();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "삭제 중 오류");
    }
  }

  const telHref = `tel:${CONTACT_PHONE.replaceAll("-", "")}`;
  const smsHref = `sms:${CONTACT_PHONE.replaceAll("-", "")}`;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f5f8" }}>
      {/* 상단 배너 */}
      <header
        style={{
          background: "linear-gradient(90deg, #0b1530 0%, #0a1d3a 60%, #0b1530 100%)",
          color: "white",
          padding: "22px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>
              하나유통 샘플 카탈로그
            </div>
            <div style={{ opacity: 0.85, marginTop: 6, fontSize: 15 }}>
              샘플명 / 사진 / 가격
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right", marginRight: 6 }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>문의/주문</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{CONTACT_PHONE}</div>
            </div>

            <a
              href={telHref}
              style={{
                background: "#2e7d32",
                color: "white",
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              전화
            </a>
            <a
              href={smsHref}
              style={{
                background: "#1e40af",
                color: "white",
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              문자
            </a>
            <button
              onClick={fetchItems}
              style={{
                background: "white",
                color: "#0b1530",
                border: "0",
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 14px 40px" }}>
        {/* 카테고리 탭 */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "14px 0 14px" }}>
          {CATEGORIES.map((c) => {
            const active = activeTab === c;
            return (
              <button
                key={c}
                onClick={() => setActiveTab(c)}
                style={{
                  background: active ? "#0b1530" : "white",
                  color: active ? "white" : "#0b1530",
                  border: active ? "1px solid #0b1530" : "1px solid #d5dbe5",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* 등록/수정 폼 */}
        <section
          style={{
            background: "white",
            border: "1px solid #e3e8f2",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {editingId ? "샘플 수정" : "샘플 등록"}
            </div>

            {editingId ? (
              <button
                onClick={resetForm}
                type="button"
                style={{
                  background: "#eef2ff",
                  color: "#1e3a8a",
                  border: "1px solid #c7d2fe",
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                수정 취소
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.6fr 0.7fr",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>상품명</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 활광어"
                  style={{
                    width: "100%",
                    padding: "12px 12px",
                    borderRadius: 10,
                    border: "1px solid #d7deea",
                    fontSize: 16,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>가격(숫자)</div>
                <input
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value || 0))}
                  type="number"
                  min={0}
                  style={{
                    width: "100%",
                    padding: "12px 12px",
                    borderRadius: 10,
                    border: "1px solid #d7deea",
                    fontSize: 16,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>카테고리</div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 12px",
                    borderRadius: 10,
                    border: "1px solid #d7deea",
                    fontSize: 16,
                    fontWeight: 800,
                    outline: "none",
                    background: "white",
                  }}
                >
                  {CATEGORIES.filter((x) => x !== "전체").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>간단 소개글(상품평)</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 거래처 참고용 / 당일 손질 가능 / 신선도 최상"
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 10,
                  border: "1px solid #d7deea",
                  fontSize: 16,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>샘플 사진(선택)</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 15 }}
              />
              <div style={{ marginTop: 6, fontSize: 13, color: "#667085" }}>
                * 사진은 선택 후 저장하면 업로드됩니다.
              </div>
            </div>

            <button
              disabled={saving}
              type="submit"
              style={{
                marginTop: 14,
                width: "100%",
                background: saving ? "#9aa4b2" : "#6d28d9",
                color: "white",
                border: "0",
                padding: "14px 14px",
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 900,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "저장 중..." : editingId ? "수정 저장" : "저장"}
            </button>
          </form>
        </section>

        {/* 목록 */}
        <section style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>등록된 샘플</div>
            <div style={{ fontSize: 14, color: "#667085" }}>
              {activeTab === "전체" ? `총 ${items.length}개` : `${activeTab} ${filtered.length}개`}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            {loading ? (
              <div
                style={{
                  background: "white",
                  border: "1px solid #e3e8f2",
                  borderRadius: 14,
                  padding: 18,
                  color: "#667085",
                }}
              >
                불러오는 중...
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  background: "white",
                  border: "1px solid #e3e8f2",
                  borderRadius: 14,
                  padding: 18,
                  color: "#667085",
                }}
              >
                등록된 샘플이 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {filtered.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      background: "white",
                      border: "1px solid #e3e8f2",
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    {it.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image_url}
                        alt={it.name}
                        style={{ width: "100%", height: 180, objectFit: "cover", background: "#f2f4f7" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: 180, background: "#f2f4f7", display: "flex", alignItems: "center", justifyContent: "center", color: "#98a2b3", fontWeight: 800 }}>
                        이미지 없음
                      </div>
                    )}

                    <div style={{ padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{it.name}</div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "#eef2ff",
                            color: "#3730a3",
                            height: "fit-content",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {it.category}
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 16, fontWeight: 900 }}>
                        {formatPrice(it.price || 0)}원
                      </div>

                      {it.description ? (
                        <div style={{ marginTop: 8, fontSize: 14, color: "#344054", lineHeight: 1.45 }}>
                          {it.description}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                          onClick={() => startEdit(it)}
                          style={{
                            flex: 1,
                            border: "1px solid #d0d5dd",
                            background: "white",
                            padding: "10px 12px",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => removeItem(it.id)}
                          style={{
                            flex: 1,
                            border: "1px solid #fecaca",
                            background: "#fff1f2",
                            color: "#b91c1c",
                            padding: "10px 12px",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: "#667085" }}>
            * 등록/수정/삭제는 이 페이지에서 바로 가능합니다.
          </div>
        </section>
      </main>
    </div>
  );
}