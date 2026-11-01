"use client";

// ============================================================
// MỘT THẺ ISSUE trên màn của Main — PLAN-MAIN-AGENT 8b
//
// Thẻ này KHÔNG có nút đóng issue (luật A.4.5): issue chỉ đóng khi ĐIỀU KIỆN
// ĐÓNG hết vi phạm, và điều kiện đó in ngay trên thẻ để ai đọc cũng kiểm được.
// Main lại càng không đóng hộ ai: issue là của agent chủ, Main chỉ nhìn và
// xếp nhóm (chốt BC — nhìn cả 5, ghi chỉ của mình).
// ============================================================

import { SectionCard } from "@/components/common/SectionCard";
import { DanNguon } from "@/components/common/DanNguon";
import { Pill, type Tone } from "@/components/common/StatusBadge";
import {
  NHAN_MUC_DO,
  NHAN_NHOM,
  hienSo,
  hienTien,
  iconIssue,
  nhomChinhCuaIssue,
  type IssueMain,
  type MucDoIssue,
  MA_MAIN,
} from "@/lib/issue-main/model";

function tone(m: MucDoIssue): Tone {
  return m === "do" ? "red" : m === "vang" ? "yellow" : "green";
}

import { useState } from "react";
// MA_MAIN lấy từ model (file thuần) — KHÔNG import gom.ts vào client, nó kéo node:fs (luật 10)
import type { NutThe } from "./IssueMainView";
import { LY_DO_CHAN } from "@/lib/quyen";
import { ngayTrongChu } from "@/lib/ngay-hien";

export function TheIssueCard({
  i,
  lyDoChon,
  nutThe,
  trongChiTiet = false,
}: {
  i: IssueMain;
  lyDoChon?: string;
  /** 01/11/2026: thẻ nằm trong «Chi tiết ▾» của thẻ gọn — bỏ dòng đầu, lý do AI và 3 câu chú thích lặp (thẻ gọn đã có / ở Hướng dẫn) */
  trongChiTiet?: boolean;
  /** Có thì thẻ Main giữ sổ hiện nút 🙈/🗑 (DX- hiện Duyệt/Bác) — 6e.3 + chốt BC */
  nutThe?: NutThe;
}) {
  const [moXoa, setMoXoa] = useState(false);
  const [lyDoXoa, setLyDoXoa] = useState("");
  const [lyDoBac, setLyDoBac] = useState("");
  // Ba nút CHỈ trên issue do chính Main giữ sổ — issue của agent khác thì
  // ẩn/xoá ở agent đó (chốt BC; demo mục "chỉ dùng được trên issue của chính nó")
  const cuaMain = i.agentChu === MA_MAIN;
  const laDeXuat = i.id.startsWith("DX-");
  // Nút hiện trên mọi thẻ Main giữ sổ; không qua cửa "ghi" thì cả cụm MỜ kèm lý do (luật 17)
  const coNut = nutThe !== undefined && cuaMain && !i.daDong;
  const khoaNut = nutThe !== undefined && !nutThe.choPhepGhi;
  const vien =
    i.mucDo === "do" ? "border-l-red" : i.mucDo === "vang" ? "border-l-yellow" : "border-l-green";
  const icon = iconIssue(i);

  return (
    <SectionCard title="">
      <div className={`border-l-2 pl-3 ${vien}`}>
        {!trongChiTiet && <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {/* Icon đứng TRƯỚC nội dung — 🤖 là thứ LLM sinh, 👤 là người thêm.
              Đây là cách DUY NHẤT phân biệt issue Main tự sinh với issue của
              bốn agent kia; chốt BE bỏ tab riêng cho chúng. */}
          {icon !== "" && (
            <span
              title={i.doLlmSinh ? "Nội dung do LLM sinh" : "Do người thêm tay"}
              className="text-[13px]"
            >
              {icon}
            </span>
          )}
          <Pill tone={tone(i.mucDo)}>{NHAN_MUC_DO[i.mucDo]}</Pill>
          <span className="font-mono text-[10px] text-text-muted">{i.id}</span>
          <b className="text-[12.5px] text-text">{ngayTrongChu(i.tieuDe)}</b>
          <Pill tone="muted">{i.tenAgentChu}</Pill>
          {i.daDong && <Pill tone="muted">Đã đóng — chỉ đọc</Pill>}
          {i.an && <Pill tone="muted">🙈 Đang ẩn — vẫn đếm vào tổng</Pill>}
        </div>}

        {lyDoChon && !trongChiTiet && (
          <p className="mb-2 rounded-sm border border-accent/30 bg-accent-soft px-2.5 py-1.5 text-[11.5px] leading-relaxed text-text">
            <b>🤖 Vì sao việc này cần anh xem:</b> {lyDoChon}
          </p>
        )}

        {i.moTa !== "" && (
          <p className="mb-2 text-[11.5px] leading-relaxed text-text-secondary">{ngayTrongChu(i.moTa)}</p>
        )}

        {i.tomTatChoLanhDao && (
          <p className="mb-2 text-[11.5px] leading-relaxed text-text">
            <b>🤖 Tóm tắt cho lãnh đạo:</b> {i.tomTatChoLanhDao}
          </p>
        )}

        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          {/* A.4.3 — thiếu số thì "—", KHÔNG hiện 0 cho đủ chỗ */}
          <div className="rounded-sm bg-bg2 px-2.5 py-1.5 text-[11px]">
            <span className="text-text-muted">Số ngày ảnh hưởng: </span>
            <b className={i.soNgayAnhHuong !== null ? "text-red" : "text-text-muted"}>
              {hienSo(i.soNgayAnhHuong, "ngày")}
            </b>
          </div>
          <div className="rounded-sm bg-bg2 px-2.5 py-1.5 text-[11px]">
            <span className="text-text-muted">Tiền ảnh hưởng: </span>
            <b className={i.tienAnhHuongVnd !== null ? "text-text" : "text-text-muted"}>
              {hienTien(i.tienAnhHuongVnd)}
            </b>
          </div>
          <div className="rounded-sm bg-bg2 px-2.5 py-1.5 text-[11px]">
            <span className="text-text-muted">Nguồn: </span>
            <span className="text-[10.5px]">
              <DanNguon text={i.nguonDuLieu} />
            </span>
          </div>
        </div>

        {(i.soNgayAnhHuong === null || i.tienAnhHuongVnd === null) && !trongChiTiet && (
          <p className="mb-2 text-[10.5px] text-text-muted">
            Ô ghi “—” là <b>chưa có số liệu</b>: agent chủ chưa trả về con số kèm nguồn. Main{" "}
            <b>không ước số</b> — số trên thẻ phải là số agent chủ đã tính (mục 8b.7).
          </p>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10.5px]">
          {!trongChiTiet && <Pill tone="blue">Nhóm chính: {NHAN_NHOM[nhomChinhCuaIssue(i)]}</Pill>}
          {i.nhomPhu.length > 0 && !trongChiTiet && (
            <span className="text-text-muted">
              Nhóm phụ: {i.nhomPhu.map((n) => NHAN_NHOM[n]).join(" · ")} — ở các tab đó thẻ này
              chỉ hiện MỘT DÒNG TRỎ và <b>không tính vào số đếm</b>, nên tổng không đếm trùng.
            </span>
          )}
        </div>

        {/* ── 🙈 ẨN · 🗑 XOÁ (6e.3) / Duyệt · Bác cho thẻ DX- — chỉ thẻ Main giữ sổ ── */}
        {coNut && (
          <fieldset
            disabled={khoaNut}
            title={khoaNut ? LY_DO_CHAN.ghi : undefined}
            className="mb-2 min-w-0 space-y-2 disabled:opacity-50"
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={nutThe!.dangGui}
                onClick={() => void nutThe!.goi({ hanhDong: "an", id: i.id, an: !i.an })}
                data-lenh="issue-main.an-issue"
                data-wbs={i.id}
                title={
                  i.an
                    ? "Bỏ ẩn — thẻ hiện lại bình thường"
                    : "Ẩn: issue ĐÚNG nhưng để xử sau. Vẫn nằm trong sổ và VẪN ĐẾM vào tổng."
                }
                className="rounded-sm border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-accent"
              >
                {i.an ? "🙉 Bỏ ẩn" : "🙈 Ẩn"}
              </button>
              {!laDeXuat && !moXoa && (
                <button
                  type="button"
                  onClick={() => setMoXoa(true)}
                  data-lenh="issue-main.mo-form-xoa"
                  data-wbs={i.id}
                  title="Xoá nghĩa là issue SAI. Issue ĐÚNG mà muốn xử sau thì bấm 🙈 Ẩn."
                  className="rounded-sm border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-red/80 hover:text-red"
                >
                  🗑 Xoá
                </button>
              )}
              {laDeXuat && (
                <>
                  <button
                    type="button"
                    disabled={nutThe!.dangGui}
                    onClick={() => void nutThe!.goi({ hanhDong: "duyet", id: i.id })}
                    data-lenh="alerts.duyet-ai"
                    data-wbs={i.id}
                    className="rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent"
                  >
                    Duyệt — vào sổ
                  </button>
                  <input
                    data-lenh="alerts.ly-do-bac-bo"
                    data-wbs={i.id}
                    value={lyDoBac}
                    onChange={(e) => setLyDoBac(e.target.value)}
                    placeholder="Lý do bác bỏ (bắt buộc)"
                    className="flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-[11.5px]"
                  />
                  <button
                    type="button"
                    disabled={nutThe!.dangGui}
                    onClick={() => void nutThe!.goi({ hanhDong: "bac-bo", id: i.id, lyDo: lyDoBac })}
                    data-lenh="alerts.bac-bo-ai"
                    // G8 "kèm lý do": trợ lý truyền lý do ở giaTri, bộ chạy điền ô này trước khi bấm
                    data-dien-truoc="alerts.ly-do-bac-bo"
                    data-wbs={i.id}
                    className="rounded-sm border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
                  >
                    Bác bỏ
                  </button>
                </>
              )}
            </div>
            {moXoa && (
              <div className="space-y-1.5 rounded-sm border border-red/30 p-2.5">
                <div className="text-[11px] text-text-secondary">
                  Xoá nghĩa là issue <b>SAI</b> — lý do vào <b>Sổ đã bác</b>, bộ sinh{" "}
                  <b>không sinh lại</b>. Issue đúng mà chỉ muốn xử sau thì bấm 🙈 Ẩn.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={lyDoXoa}
                    onChange={(e) => setLyDoXoa(e.target.value)}
                    placeholder="Vì sao issue này sai? (bắt buộc)"
                    className="flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-[11.5px]"
                  />
                  <button
                    type="button"
                    disabled={nutThe!.dangGui}
                    onClick={() => void nutThe!.goi({ hanhDong: "xoa", id: i.id, lyDo: lyDoXoa })}
                    data-lenh="issue-main.xoa-issue"
                    data-wbs={i.id}
                    className="rounded-sm border border-red/50 px-2.5 py-1 text-[11px] font-semibold text-red disabled:opacity-50"
                  >
                    Xoá và ghi vào Sổ đã bác
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMoXoa(false); setLyDoXoa(""); }}
                    className="rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
                  >
                    Thôi
                  </button>
                </div>
              </div>
            )}
          </fieldset>
        )}

        {/* A.4.5 — điều kiện đóng in ngay trên thẻ, và KHÔNG có nút đóng */}
        <div className="rounded-sm border border-border bg-bg2 px-2.5 py-1.5 text-[11px] leading-relaxed text-text-secondary">
          <b className="text-text">Điều kiện đóng:</b> {i.dieuKienDong}
          {!trongChiTiet && (
            <>
              <br />
              <span className="text-text-muted">
                Màn này <b>không có nút đóng issue</b> — issue chỉ đóng khi điều kiện trên hết vi
                phạm, và việc đóng thuộc về {i.tenAgentChu}.
              </span>
            </>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * DÒNG TRỎ ở tab nhóm PHỤ — bổ sung 04/09.
 * Cố ý mảnh, không phải thẻ đầy đủ: một issue một chỗ, chỗ khác chỉ TRỎ tới.
 */
export function DongTro({
  i,
  onMoNhomChinh,
}: {
  i: IssueMain;
  onMoNhomChinh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[11px]">
      <span className="text-text-muted">↪</span>
      {iconIssue(i) !== "" && <span>{iconIssue(i)}</span>}
      <span className="font-mono text-[10px] text-text-muted">{i.id}</span>
      <span className="text-text-secondary">{ngayTrongChu(i.tieuDe)}</span>
      <span className="text-text-muted">
        · {hienSo(i.soNgayAnhHuong, "ngày")} · nhóm chính {NHAN_NHOM[nhomChinhCuaIssue(i)]}
      </span>
      <button
        type="button"
        onClick={onMoNhomChinh}
        data-lenh="issue-main.mo-nhom-chinh"
        data-wbs={i.id}
        title="Thẻ đầy đủ nằm ở tab nhóm chính — bấm để sang đó"
        className="ml-auto rounded-sm border border-border px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
      >
        Mở ở nhóm chính →
      </button>
    </div>
  );
}
