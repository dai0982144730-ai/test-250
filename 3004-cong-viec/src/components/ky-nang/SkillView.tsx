"use client";

// ============================================================
// KỸ NĂNG AI — lấy nguyên màn "Skill AI của tôi" của agent tiến độ (LOI-DUNG-CHUNG mục 5),
// đúng 4 khối: cách dùng · nạp .skill · tự soạn/nhờ AI · bảng kỹ năng đang có.
// SCI công việc: 3 kho — HỆ THỐNG (cài sẵn, không xoá) · CHUNG (quyền ky_nang.them_chung) ·
// RIÊNG (mỗi người tự thêm). Lỗi API đọc `loi`.
// ============================================================

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { SectionCard, InfoBox, Pill } from "./khung";
import { PhanTrang, usePhanTrang } from "@/components/layout/PhanTrang";
import type { KyNangTomTat, PhamViSkill } from "@/lib/skill/ky-nang";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export function SkillView({ choPhepGhi, duocSuaChung }: { choPhepGhi: boolean; duocSuaChung: boolean }) {
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
      const j = (await r.json()) as { ok: boolean; skill?: KyNangTomTat[]; message?: string; loi?: string };
      if (j.ok && j.skill) setDs(j.skill);
      else setBao({ ok: false, loi: j.loi ?? j.message ?? "Không đọc được danh sách kỹ năng." });
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
        ok?: boolean;
        message?: string;
        loi?: string;
        skill?: KyNangTomTat[];
      };
      if (j.loi) setBao({ ok: false, loi: j.loi });
      else if (j.message) setBao({ ok: j.ok === true, loi: j.message });
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
      {/* ===== Khối 1 — cách dùng (đúng chữ demo) ===== */}
      {/* Mr. Đại 02/10: dòng cách dùng màu trắng (3D nền đen — trước chữ gần đen, không đọc được) + giải thích bổ sung */}
      <div className="rounded border border-accent/40 p-3 text-[12px] leading-relaxed text-text">
        <b>Cách dùng kỹ năng trong khung chat:</b> gõ <code className="text-accent">/tên-kỹ-năng</code> + khoảng trắng + câu hỏi
        (gõ <code className="text-accent">/</code> là hiện danh sách để chọn). Ví dụ:{" "}
        <code className="text-accent">/hoi-so-cai việc nào của SCI E&amp;C sắp trễ?</code> ·{" "}
        <code className="text-accent">/kiem-tra-mau</code> kèm file Word kẹp vào ô chat.
        <div className="mt-2 space-y-1 text-[11.5px] text-text-secondary">
          <div>
            <b className="text-text">Kỹ năng là gì?</b> Là một bản hướng dẫn viết sẵn cho Trợ lý AI: làm việc gì, đọc dữ liệu nào, trả
            lời theo khuôn nào. Gọi kỹ năng thì AI làm đúng việc đó, không phải đoán ý.
          </div>
          <div>
            <b className="text-text">Kỹ năng có sẵn của hệ thống:</b>{" "}
            <code className="text-accent">/lam-bao-cao</code> làm báo cáo tuần/tháng của đơn vị mình từ báo cáo kỳ trước, hỏi chỗ thiếu,
            ra file Word đúng mẫu kèm nút Nộp · <code className="text-accent">/tong-hop-bao-cao</code> như trên nhưng gộp thêm báo cáo
            các đơn vị dưới đã nộp · <code className="text-accent">/hoi-so-cai</code> hỏi việc trong sổ cái ·{" "}
            <code className="text-accent">/tom-tat</code> tóm tắt một báo cáo (kẹp file hoặc nói tên) ·{" "}
            <code className="text-accent">/trich-cong-viec</code> trích bảng việc từ một báo cáo ·{" "}
            <code className="text-accent">/kiem-tra-mau</code> soát một file Word như lúc nộp, chỉ lỗi và cách sửa.
          </div>
          <div>
            <b className="text-text">Gõ thế nào cũng được:</b> có dấu hay không dấu, viết tắt tên đơn vị (P.KT&amp;VH, nm nam xe…). Chỗ nào
            AI không chắc thì nó hỏi lại một câu, không tự đoán.
          </div>
          <div>
            <b className="text-text">Xin file:</b> thêm chữ &quot;ra excel / ra word / làm slide&quot; vào câu hỏi — AI tra số liệu thật trước
            rồi mới dựng file, link tải nằm ngay trong câu trả lời.
          </div>
          <div>
            <b className="text-text">Kỹ năng của tôi / kỹ năng chung:</b> tự viết thêm kỹ năng ở hai khung bên dưới. Kỹ năng riêng chỉ
            mình bạn thấy; kỹ năng chung cả công ty dùng (cần quyền).
          </div>
          <div className="text-text-muted">
            Gọi đích danh là ÉP dùng đúng kỹ năng đó. Không gõ lệnh thì trợ lý tự chọn kỹ năng hợp với câu hỏi theo phần mô tả.
          </div>
        </div>
      </div>

      {bao && (
        <div className={`text-[11.5px] ${bao.ok ? "text-green" : "text-red"}`}>{bao.loi}</div>
      )}

      {choPhepGhi && <KhaiHuongDan ma="ky-nang-them" uuTien={0} />}
      {choPhepGhi && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ===== Khối 2 — nạp file .skill ===== */}
          <SectionCard
            title="Nạp kỹ năng từ file .skill"
            subtitle=".skill/.zip — một thư mục gốc chứa SKILL.md (khai name: + description:), tối đa 20 MB, 200 file. Cùng tên = ghi đè. Dùng được ngay."
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
              <ChonPhamVi phamVi={phamVi} setPhamVi={setPhamVi} duocSuaChung={duocSuaChung} />
            </div>
          </SectionCard>

          {/* ===== Khối 3 — tự soạn / nhờ AI viết ===== */}
          <SectionCard
            title="Viết hướng dẫn ngay trên web / nhờ AI sắp lại"
            subtitle="Dán nội dung là xong — thiếu khai báo thì bấm nhờ AI sắp lại thành kỹ năng chuẩn, xem rồi mới lưu. Không phải sửa code."
          >
            <div className="space-y-2">
              <textarea
                className={`${O} h-28 resize-y font-mono`}
                placeholder={"---\nname: bao-cao-tuan\ndescription: >-\n  Kỹ năng làm gì, khi nào dùng…\n---\n\n# Hướng dẫn…\n\n(hoặc dán chữ thô rồi bấm Nhờ AI sắp lại)"}
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
                  Lưu kỹ năng
                </button>
                <button
                  type="button"
                  disabled={dangGui}
                  onClick={async () => {
                    const j = await goi({ hanhDong: "nho-ai", noiDungTho: noiDung });
                    if (j && typeof j.noiDung === "string") {
                      setNoiDung(j.noiDung);
                      setBao({ ok: true, loi: "AI đã sắp lại — xem rồi bấm Lưu kỹ năng." });
                    }
                  }}
                  className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary hover:border-accent/40 hover:text-text disabled:opacity-40"
                >
                  {dangGui ? "Đang xử lý…" : "🤖 Nhờ AI sắp lại"}
                </button>
                <ChonPhamVi phamVi={phamVi} setPhamVi={setPhamVi} duocSuaChung={duocSuaChung} />
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ===== Khối 4 — skill đang có ===== */}
      <SectionCard title="Kỹ năng đang có" subtitle={`${ds.length} kỹ năng — hệ thống + kho chung + kho riêng của bạn`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] uppercase tracking-wider text-text-muted">
                <th className="py-1.5 pr-2">Kỹ năng</th>
                <th className="py-1.5 pr-2">Phạm vi</th>
                <th className="py-1.5 pr-2">Mô tả</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {pt.phan.map((s) => (
                <Fragment key={`${s.phamVi}-${s.slug}`}>
                  <tr className="border-b border-border-light align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <code className="text-[11.5px] text-accent">/{s.slug}</code>
                      {s.nguon === "he-thong" && (
                        <div className="text-[9.5px] text-text-muted">hệ thống — không xoá được</div>
                      )}
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <Pill tone={s.nguon === "he-thong" ? "accent" : s.phamVi === "chung" ? "green" : "muted"}>
                        {s.nguon === "he-thong" ? "hệ thống" : s.phamVi === "chung" ? "chung — cả công ty" : "riêng — của tôi"}
                      </Pill>
                    </td>
                    <td className="py-2 pr-2 text-[11.5px] text-text-secondary">{s.moTa}</td>
                    <td className="py-2 whitespace-nowrap text-right">
                      <a
                        href={`/chat?skill=${s.slug}`}
                        className="mr-2 text-[10.5px] font-semibold text-accent hover:text-accent-hover"
                        title="Mở trợ lý với kỹ năng này điền sẵn"
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
                      {choPhepGhi && s.nguon !== "he-thong" && (s.phamVi === "rieng" || duocSuaChung) && (
                        <button
                          type="button"
                          disabled={dangGui}
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
                    Chưa có kỹ năng nào — 5 kỹ năng hệ thống sẽ tự cài khi máy chủ đọc được thư mục
                    skills-he-thong.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PhanTrang trang={pt.trang} soTrang={pt.soTrang} tong={pt.tong} onDoi={pt.doiTrang} donVi="skill" />
      </SectionCard>

      <InfoBox title="📐 Nguyên tắc kỹ năng — LOI-DUNG-CHUNG mục 5">
        <b>Màn của LÕI</b> — cùng một bộ code "Skill AI" với các agent SCI. Kỹ năng <b>hệ thống</b> cài
        sẵn, không ai xoá được; kho <b>chung</b> do người có quyền «Thêm kỹ năng AI vào kho chung» thêm,
        cả công ty dùng; kho <b>riêng</b> mỗi người tự thêm cho mình.
        <br />
        File .skill là ZIP kiểu Claude Cowork: <code>SKILL.md</code> + <code>references/</code> +{" "}
        <code>assets/</code>, giải nén vào <code>.claude/skills/</code> nơi Claude CLI tự dò. Chặn zip-bomb
        (20 MB / 200 file), chặn đường dẫn thoát ra ngoài (zip-slip). Mỗi lần thêm kỹ năng đều ghi vào Lịch sử.
        <br />
        Nhờ AI sắp nội dung thô thì AI chỉ SẮP LẠI, <b>người xem rồi mới lưu</b>.
      </InfoBox>
    </div>
  );
}

function ChonPhamVi({
  phamVi,
  setPhamVi,
  duocSuaChung,
}: {
  phamVi: PhamViSkill;
  setPhamVi: (v: PhamViSkill) => void;
  duocSuaChung: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {(
        [
          ["rieng", "riêng — của tôi"],
          ["chung", "chung — cả công ty"],
        ] as const
      ).map(([k, nhan]) => (
        <button
          key={k}
          type="button"
          disabled={k === "chung" && !duocSuaChung}
          title={k === "chung" && !duocSuaChung ? "Cần quyền «Thêm kỹ năng AI vào kho chung»" : undefined}
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
