"use client";

// ============================================================
// SKILL AI CỦA TÔI — demo view `v-skill` · LOI-DUNG-CHUNG mục 5 · loi-skill
// Port giao diện từ bản chạy thật phaply (FormKyNang + trang ky-nang-ai),
// theo đúng 4 khối của demo: cách dùng · nạp .skill · tự soạn/nhờ AI ·
// bảng skill đang có (cột Phạm vi: chung — 5 agent / riêng agent này).
// ============================================================

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { SectionCard, InfoBox } from "@/components/common/SectionCard";
import { Pill } from "@/components/common/StatusBadge";
import { PhanTrang, usePhanTrang } from "@/components/common/PhanTrang";
import type { KyNangTomTat, PhamViSkill } from "@/lib/skill/ky-nang";
import { LY_DO_CHAN } from "@/lib/quyen";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export function SkillView({ choPhepGhi }: { choPhepGhi: boolean }) {
  const [ds, setDs] = useState<KyNangTomTat[]>([]);
  const [bao, setBao] = useState<{ ok: boolean; loi: string } | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [noiDung, setNoiDung] = useState("");
  const [phamVi, setPhamVi] = useState<PhamViSkill>("rieng");
  const [xemSlug, setXemSlug] = useState<string | null>(null);
  const [xemNoiDung, setXemNoiDung] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pt = usePhanTrang(ds); // 30 skill một trang (E40)

  const nap = useCallback(async () => {
    try {
      const r = await fetch("/api/skill");
      const j = (await r.json()) as { ok: boolean; skill?: KyNangTomTat[]; message?: string };
      if (j.ok && j.skill) setDs(j.skill);
      else setBao({ ok: false, loi: j.message ?? "Không đọc được danh sách skill." });
    } catch {
      setBao({ ok: false, loi: "Không gọi được máy chủ." });
    }
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  async function goi(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setDangGui(true);
    setBao(null);
    try {
      const r = await fetch("/api/skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as Record<string, unknown> & {
        ok: boolean;
        message?: string;
        skill?: KyNangTomTat[];
      };
      if (j.message) setBao({ ok: j.ok, loi: j.message });
      if (j.ok && j.skill) setDs(j.skill);
      return j.ok ? j : null;
    } catch {
      setBao({ ok: false, loi: "Không gọi được máy chủ." });
      return null;
    } finally {
      setDangGui(false);
    }
  }

  async function napFile(f: File): Promise<void> {
    const buf = new Uint8Array(await f.arrayBuffer());
    let b64 = "";
    // Chuyển từng khúc — file 20MB mà String.fromCharCode cả cục là tràn stack
    for (let i = 0; i < buf.length; i += 0x8000) {
      b64 += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + 0x8000)));
    }
    await goi({ hanhDong: "nap-zip", duLieuBase64: btoa(b64), phamVi });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function xuat(slug: string): Promise<void> {
    const j = await goi({ hanhDong: "xuat", slug });
    const b64 = j?.duLieuBase64;
    if (typeof b64 !== "string") return;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.skill`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function xem(slug: string): Promise<void> {
    if (xemSlug === slug) {
      setXemSlug(null);
      return;
    }
    const j = await goi({ hanhDong: "doc", slug });
    if (j && typeof j.noiDung === "string") {
      setXemSlug(slug);
      setXemNoiDung(j.noiDung);
    }
  }

  const O =
    "w-full rounded-sm border border-border bg-bg2 px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent";

  return (
    <div className="space-y-4">
      <KhaiHuongDan ma="skill-ai" />
      {/* ===== Khối 1 — cách dùng (đúng chữ demo) ===== */}
      <div className="rounded border border-accent/40 bg-accent-soft p-3 text-[12px] leading-relaxed">
        <b>Cách dùng skill trong chat:</b> skill <b>chỉ chạy khi gọi đích danh</b> — gõ{" "}
        <code>/tên-skill</code> + khoảng trắng + câu hỏi. Ví dụ:{" "}
        <code>/soat-tien-do-dien-gio tuần này vi phạm P04 không?</code>
        <div className="mt-1 text-[10.5px] text-text-muted">
          Không gõ lệnh → AI trả lời bình thường, không skill nào chiếm câu hỏi.
        </div>
      </div>

      {bao && (
        <div className={`text-[11.5px] ${bao.ok ? "text-green" : "text-red"}`}>{bao.loi}</div>
      )}

      {!choPhepGhi && <p className="text-[11.5px] text-text-muted">{LY_DO_CHAN.ghi}</p>}
      {/* Người xem: cả khối nạp hiện MỜ, mọi ô/nút bị khoá (luật 17 — không ẩn) */}
      <fieldset disabled={!choPhepGhi} title={choPhepGhi ? undefined : LY_DO_CHAN.ghi} className="min-w-0 disabled:opacity-50">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ===== Khối 2 — nạp file .skill ===== */}
          <SectionCard
            title="Nạp skill từ file .skill"
            subtitle=".skill/.zip — một thư mục gốc chứa SKILL.md (khai name: + description:), tối đa 20 MB. Cùng tên = ghi đè."
          >
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept=".skill,.zip"
                disabled={dangGui}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void napFile(f);
                }}
                className="block w-full text-[12px] text-text-secondary file:mr-3 file:rounded-sm file:border file:border-accent/50 file:bg-accent-soft file:px-3 file:py-1.5 file:text-[11.5px] file:font-semibold file:text-accent"
              />
              <ChonPhamVi phamVi={phamVi} setPhamVi={setPhamVi} />
            </div>
          </SectionCard>

          {/* ===== Khối 3 — tự soạn / nhờ AI viết ===== */}
          <SectionCard
            title="Tự soạn / nhờ AI viết"
            subtitle="Dán nội dung là xong — thiếu khai báo thì bấm nhờ AI sắp lại thành skill chuẩn, xem rồi mới lưu."
          >
            <div className="space-y-2">
              <textarea
                className={`${O} h-28 resize-y font-mono`}
                placeholder={"---\nname: ten-skill\ndescription: >-\n  Skill làm gì, khi nào dùng…\n---\n\n# Hướng dẫn…\n\n(hoặc dán chữ thô rồi bấm Nhờ AI sắp lại)"}
                value={noiDung}
                onChange={(e) => setNoiDung(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={dangGui}
                  onClick={() => void goi({ hanhDong: "luu-noi-dung", noiDung, phamVi })}
                  className="rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent disabled:opacity-40"
                >
                  Lưu skill
                </button>
                <button
                  type="button"
                  disabled={dangGui}
                  onClick={async () => {
                    const j = await goi({ hanhDong: "nho-ai", noiDungTho: noiDung });
                    if (j && typeof j.noiDung === "string") {
                      setNoiDung(j.noiDung);
                      setBao({ ok: true, loi: "AI đã sắp lại — xem rồi bấm Lưu skill." });
                    }
                  }}
                  className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary hover:border-accent/40 hover:text-text disabled:opacity-40"
                >
                  {dangGui ? "Đang xử lý…" : "🤖 Nhờ AI sắp lại"}
                </button>
                <ChonPhamVi phamVi={phamVi} setPhamVi={setPhamVi} />
              </div>
            </div>
          </SectionCard>
        </div>
      </fieldset>

      {/* ===== Khối 4 — skill đang có ===== */}
      <SectionCard title="Skill đang có" subtitle={`${ds.length} skill — kho chung + kho riêng của bạn`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] uppercase tracking-wider text-text-muted">
                <th className="py-1.5 pr-2">Skill</th>
                <th className="py-1.5 pr-2">Phạm vi</th>
                <th className="py-1.5 pr-2">Mô tả</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {pt.phan.map((s) => (
                // key phải nằm ở phần tử NGOÀI CÙNG của mỗi vòng lặp. Trước
                // đây key đặt trên <tr> bên trong <> nên React không nhận —
                // bộ e2e bắt được cảnh báo này 05/09.
                <Fragment key={s.slug}>
                  <tr className="border-b border-border-light align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <code className="text-[11.5px] text-accent">/{s.slug}</code>
                      {s.nguon === "he-thong" && (
                        <div className="text-[9.5px] text-text-muted">hệ thống — không xoá được</div>
                      )}
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <Pill tone={s.phamVi === "chung" ? "green" : "muted"}>
                        {s.phamVi === "chung" ? "chung — 5 agent" : "riêng agent này"}
                      </Pill>
                    </td>
                    <td className="py-2 pr-2 text-[11.5px] text-text-secondary">{s.moTa}</td>
                    <td className="py-2 whitespace-nowrap text-right">
                      <a
                        href={`/chat?skill=${s.slug}`}
                        className="mr-2 text-[10.5px] font-semibold text-accent hover:text-accent-hover"
                        title="Mở trợ lý với skill này điền sẵn"
                      >
                        ▶ Chạy
                      </a>
                      <button
                        type="button"
                        onClick={() => void xem(s.slug)}
                        className="mr-2 text-[10.5px] font-semibold text-accent hover:text-accent-hover"
                      >
                        {xemSlug === s.slug ? "Thu" : "Xem"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void xuat(s.slug)}
                        className="mr-2 text-[10.5px] font-semibold text-text-secondary hover:text-text"
                      >
                        ⬇ .skill
                      </button>
                      {s.nguon !== "he-thong" && (
                        <button
                          type="button"
                          disabled={dangGui || !choPhepGhi}
                          title={choPhepGhi ? undefined : LY_DO_CHAN.ghi}
                          onClick={() => void goi({ hanhDong: "xoa", slug: s.slug, phamVi: s.phamVi })}
                        data-lenh="skill.quan-ly"
                        data-gia-tri="xoá"
                        data-wbs={s.slug}
                          className="text-[10.5px] font-semibold text-red hover:opacity-80"
                        >
                          Xoá
                        </button>
                      )}
                    </td>
                  </tr>
                  {xemSlug === s.slug && (
                    <tr className="border-b border-border-light bg-bg2">
                      <td colSpan={4} className="p-3">
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-[10.5px] text-text-secondary">
                          {xemNoiDung}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {ds.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-5 text-center text-[12px] text-text-muted">
                    Chưa có skill nào — hai skill hệ thống sẽ tự cài khi máy chủ đọc được thư mục
                    skills-he-thong.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PhanTrang trang={pt.trang} soTrang={pt.soTrang} tong={pt.tong} onDoi={pt.doiTrang} donVi="skill" />
      </SectionCard>

      <InfoBox title="📐 Nguyên tắc skill — LOI-DUNG-CHUNG mục 5 · loi-skill">
        <b>Màn của LÕI</b> — port từ bản chạy thật phaply (SCIPhaply-github), một bộ code dùng
        chung 5 agent. Mỗi tài khoản một bộ skill; skill <b>phạm vi: chung</b> cả 5 agent thấy —
        một kho, một định dạng, không phải nạp năm lần.
        <br />
        File .skill là ZIP kiểu Claude Cowork: <code>SKILL.md</code> +{" "}
        <code>references/</code> + <code>assets/</code>, giải nén vào{" "}
        <code>.claude/skills/</code> nơi Claude CLI tự dò. Chặn zip-bomb (20 MB / 200 file),
        chặn đường dẫn thoát ra ngoài.
        <br />
        AI chỉ áp skill khi <b>người gọi đích danh</b> <code>/tên-skill</code> — không tự chọn
        skill. Nhờ AI sắp nội dung thô thì AI chỉ SẮP LẠI, <b>người xem rồi mới lưu</b>.
      </InfoBox>
    </div>
  );
}

function ChonPhamVi({
  phamVi,
  setPhamVi,
}: {
  phamVi: PhamViSkill;
  setPhamVi: (v: PhamViSkill) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {(
        [
          ["rieng", "riêng agent này"],
          ["chung", "chung — 5 agent"],
        ] as const
      ).map(([k, nhan]) => (
        <button
          key={k}
          type="button"
          onClick={() => setPhamVi(k)}
          className={`rounded-sm border px-2 py-0.5 font-semibold transition ${
            phamVi === k
              ? "border-accent/50 bg-accent-soft text-accent"
              : "border-border bg-surface text-text-secondary hover:border-accent/40"
          }`}
        >
          {nhan}
        </button>
      ))}
    </div>
  );
}
