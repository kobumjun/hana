"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  price: number;
  category: string;

  // ✅ 기존 호환(대표 1장)
  image_url?: string | null;

  // ✅ 신규(여러 장)
  image_urls?: string[] | null;

  description?: string | null;
  created_at?: string;
};

const DEFAULT_CONTACT_PHONE =
  process.env.NEXT_PUBLIC_CONTACT_PHONE || "010-7771-7711";
const DEFAULT_BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME || "하나유통 샘플 카탈로그";

const CATEGORIES = ["전체", "수산물", "육류", "과일", "기타"] as const;
type CategoryTab = (typeof CATEGORIES)[number];

function formatPrice(v: number) {
  try {
    return new Intl.NumberFormat("ko-KR").format(v);
  } catch {
    return String(v);
  }
}

/** ✅ 목록 카드용: 대표 1장 + 슬라이드 */
function ItemCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(Math.max(idx, 0), Math.max(urls.length - 1, 0));

  useEffect(() => {
    setIdx((prev) => Math.min(prev, Math.max(urls.length - 1, 0)));
  }, [urls.length]);

  if (!urls.length) return null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 180,
        background: "#f2f4f7",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[safeIdx]}
        alt={alt}
        style={{
          width: "100%",
          height: 180,
          objectFit: "cover",
          background: "#f2f4f7",
        }}
      />

      {urls.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => setIdx((v) => (v - 1 + urls.length) % urls.length)}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              fontWeight: 900,
            }}
            aria-label="이전"
            title="이전"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => setIdx((v) => (v + 1) % urls.length)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              fontWeight: 900,
            }}
            aria-label="다음"
            title="다음"
          >
            ›
          </button>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 8,
              display: "flex",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {urls.map((_, i) => {
              const active = i === safeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    border: active ? "0" : "1px solid rgba(0,0,0,0.22)",
                    background: active
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  aria-label={`슬라이드 ${i + 1}`}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function AdminCatalog() {
  // ✅ 배너(카탈로그 제목/전화번호) 설정
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [contactPhone, setContactPhone] = useState(DEFAULT_CONTACT_PHONE);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ✅ 상품 관리(기존 기능 유지)
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<CategoryTab>("전체");

  // 폼 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<string>("기타");
  const [description, setDescription] = useState<string>("");

  // ✅ 여러 장 업로드
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ 수정 시 기존 이미지 유지(데이터 날아가는 거 방지)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (activeTab === "전체") return items;
    return items.filter((it) => it.category === activeTab);
  }, [items, activeTab]);

  // =========================
  // ✅ Settings API
  // =========================
  async function fetchSettings() {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setBrandName(data?.catalog_title ?? DEFAULT_BRAND_NAME);
      setContactPhone(data?.contact_phone ?? DEFAULT_CONTACT_PHONE);
    } catch (e) {
      console.error(e);
      setBrandName(DEFAULT_BRAND_NAME);
      setContactPhone(DEFAULT_CONTACT_PHONE);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const payload = {
        catalog_title: brandName?.trim() || DEFAULT_BRAND_NAME,
        contact_phone: contactPhone?.trim() || DEFAULT_CONTACT_PHONE,
      };

      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error("settings update failed: " + (t || res.statusText));
      }

      alert("배너 저장 완료");
      await fetchSettings(); // 저장 후 값 재반영
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "배너 저장 중 오류");
    } finally {
      setSettingsSaving(false);
    }
  }

  // =========================
  // ✅ Items API (기존)
  // =========================
  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/items", { cache: "no-store" });
      if (!res.ok) throw new Error("items fetch failed");
      const data = await res.json();
      const list: Item[] = Array.isArray(data) ? data : data.items ?? [];
      list
        .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
        .reverse();
      setItems(list);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
    fetchItems();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice(0);
    setCategory("기타");
    setDescription("");
    setFiles([]);
    setExistingImageUrls([]);
  }

  // ✅ 여러 장 업로드
  async function uploadImagesIfNeeded(): Promise<string[]> {
    if (!files.length) return [];

    const urls: string[] = [];

    for (const f of files) {
      const form = new FormData();
      form.append("file", f);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error("upload failed: " + (t || res.statusText));
      }

      const data = await res.json().catch(() => ({}));
      const url: string | null = data?.publicUrl ?? data?.url ?? null;
      if (!url) throw new Error("upload response no url");

      urls.push(url);
    }

    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert("상품명을 입력해주세요.");
    if (!category.trim()) return alert("카테고리를 선택해주세요.");

    setSaving(true);
    try {
      // 1) 새 파일 업로드
      const newUrls = await uploadImagesIfNeeded();

      // 2) (수정 시) 기존 이미지 + 새 이미지 합치기
      const imageUrls = [...(existingImageUrls || []), ...(newUrls || [])];

      // 3) 대표 1장 = 첫 번째 (요청대로)
      const coverUrl = imageUrls.length ? imageUrls[0] : null;

      const payload: any = {
        name: name.trim(),
        price: Number.isFinite(price) ? Number(price) : 0,
        category,
        description: description?.trim() || null,
        ...(imageUrls.length ? { image_urls: imageUrls, image_url: coverUrl } : {}),
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
    setCategory(it.category || "기타");
    setDescription(it.description || "");
    setFiles([]);

    // ✅ 기존 이미지들 로드(있으면 유지)
    const urlsFromItem =
      (Array.isArray(it.image_urls) && it.image_urls.filter(Boolean)) ||
      (it.image_url ? [it.image_url] : []);
    setExistingImageUrls(urlsFromItem as string[]);

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

  return (
    <div style={{ minHeight: "100vh", background: "#f3f5f8" }}>
      <header
        style={{
          background:
            "linear-gradient(90deg, #0b1530 0%, #0a1d3a 60%, #0b1530 100%)",
          color: "white",
          padding: "14px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {brandName} (관리자)
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              문의: {contactPhone}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                await fetchSettings();
                await fetchItems();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: "0",
                background: "rgba(255,255,255,0.92)",
                color: "#0b1530",
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="새로고침"
            >
              ⟳
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "14px 12px 40px",
        }}
      >
        {/* ✅ 배너 설정 (기존 기능 유지) */}
        <section
          style={{
            background: "white",
            border: "1px solid #e3e8f2",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>상단 배너 설정</div>
            <div style={{ fontSize: 13, color: "#667085" }}>
              {settingsLoading ? "불러오는 중..." : "관리자에서 바로 수정 가능"}
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                카탈로그 제목
              </div>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="예: 하나유통 샘플 카탈로그"
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
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                문의 전화번호
              </div>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="예: 010-7771-7711"
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
          </div>

          <button
            disabled={settingsSaving}
            onClick={saveSettings}
            style={{
              marginTop: 12,
              width: "100%",
              background: settingsSaving ? "#9aa4b2" : "#0b1530",
              color: "white",
              border: "0",
              padding: "12px 14px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 900,
              cursor: settingsSaving ? "not-allowed" : "pointer",
            }}
          >
            {settingsSaving ? "저장 중..." : "배너 저장"}
          </button>
        </section>

        {/* 카테고리 탭 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            margin: "8px 0 12px",
          }}
        >
          {CATEGORIES.map((c) => {
            const active = activeTab === c;
            return (
              <button
                key={c}
                onClick={() => setActiveTab(c)}
                style={{
                  background: active ? "#0b1530" : "white",
                  color: active ? "white" : "#0b1530",
                  border: active
                    ? "1px solid #0b1530"
                    : "1px solid #d5dbe5",
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 14,
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
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
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                  상품명
                </div>
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
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                  가격(숫자)
                </div>
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
                <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                  카테고리
                </div>
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
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                간단 소개글(상품평)
              </div>
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

            {/* ✅ 여기만 '여러 장'으로 변경 */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
                샘플 사진(여러 장 가능)
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles(list);
                }}
                style={{ fontSize: 15 }}
              />

              <div style={{ marginTop: 6, fontSize: 13, color: "#667085" }}>
                * 사진은 선택 후 저장하면 업로드됩니다.
                {editingId ? " (기존 사진은 유지 + 새 사진 추가)" : null}
              </div>

              {/* (선택) 수정 중일 때 현재 저장된 이미지 미리보기 */}
              {editingId && existingImageUrls.length ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#344054", marginBottom: 8 }}>
                    현재 저장된 사진(대표=첫 번째)
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {existingImageUrls.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${u}-${i}`}
                        src={u}
                        alt={`existing-${i}`}
                        style={{
                          width: 88,
                          height: 62,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: i === 0 ? "2px solid #6d28d9" : "1px solid #e3e8f2",
                          background: "#f2f4f7",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>등록된 샘플</div>
            <div style={{ fontSize: 14, color: "#667085" }}>
              {activeTab === "전체"
                ? `총 ${items.length}개`
                : `${activeTab} ${filtered.length}개`}
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
                {filtered.map((it) => {
                  const urls =
                    (Array.isArray(it.image_urls) && it.image_urls.filter(Boolean)) ||
                    (it.image_url ? [it.image_url] : []);

                  return (
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
                      {urls.length ? (
                        <ItemCarousel urls={urls as string[]} alt={it.name} />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: 180,
                            background: "#f2f4f7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#98a2b3",
                            fontWeight: 800,
                          }}
                        >
                          이미지 없음
                        </div>
                      )}

                      <div style={{ padding: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              lineHeight: 1.2,
                            }}
                          >
                            {it.name}
                          </div>
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
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 14,
                              color: "#344054",
                              lineHeight: 1.45,
                            }}
                          >
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
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}