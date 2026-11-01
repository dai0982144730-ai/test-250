"use client";

// ============================================================
// MỘT BẢNG CỦA BÁO CÁO THÁNG trên màn hình
//
// ⭐ 13/10/2026 (KE-HOACH/22, Mr. Đại): bảng nhiều dự án bày theo HÀNG tên dự án thay cho CỘT dự án —
//    "dự án nọ nối tiếp dự án kia thì không gian trình bày sẽ nhiều hơn". Số cộng của dự án nằm ngay ở
//    hàng tên dự án; có cột cộng được thì hàng TỔNG CỘNG đứng trên cùng (luật 34); cột chưa có số nào
//    thì không vẽ, gom tên về một dòng dưới bảng (luật 22). Cách bày dùng chung với bản Word: `trinhBayBang`.
// ============================================================

import { useState } from "react";
import { ChuSuaDuoc } from "./ChuSuaDuoc";
import { khoaO } from "@/lib/bao-cao-thang/sua-tay";
import {
  CAU_GIAI_THICH_NGAY_ANH_HUONG,
  DAU_TRONG,
  hienO,
  moTaNguonO,
  ngayAnhHuongNangNhat,
  trinhBayBang,
  type Bang,
  type CotBang,
  type HangIn,
  type OSo,
} from "@/lib/bao-cao-thang/model";

function O({ o, dam }: { o: OSo | undefined; dam?: boolean }) {
  if (!o) {
    return <span className="text-text-muted">{DAU_TRONG}</span>;
  }
  return (
    <span title={moTaNguonO(o)} className={o.coSo ? "text-text" : "cursor-help text-text-muted"}>
      {hienO(o)}
    </span>
  );
}

// Viền nhạt C8D0DC như bảng trong file Word mẫu của công ty (28/10/2026); một độ đậm — nhấn bằng nền và màu, không in đậm
const O_KE = "border border-[#C8D0DC]/40 px-2 py-1.5 align-top";

/** Số cột đầu mà chữ của hàng (tên dự án / TỔNG CỘNG) chiếm: từ đầu tới hết cột khoá đầu tiên */
function soCotNhan(cot: CotBang[]): number {
  const i = cot.findIndex((c) => c.laKhoa);
  return i < 0 ? 1 : i + 1;
}

function HangNhom({ h, cot }: { h: HangIn; cot: CotBang[] }) {
  const n = soCotNhan(cot);
  return (
    <tr className="bg-bg2">
      <td colSpan={n} className={`${O_KE} text-text`}>
        {h.nhan}
      </td>
      {cot.slice(n).map((c) => {
        const o = h.o[c.khoa];
        return (
          <td key={c.khoa} className={O_KE}>
            {o && o.coSo ? <O o={o} dam /> : null}
          </td>
        );
      })}
    </tr>
  );
}

/** Bảng dài thì cắt (Mr. Đại 28/10): báo cáo toàn công ty 5 dòng, báo cáo một dự án 10 dòng; bấm «Xem thêm» mới bung. Bảng cố định (Bảng 3) không cắt. */
export const GIOI_HAN_CONG_TY = 5;
export const GIOI_HAN_MOT_DU_AN = 10;

export function BangBaoCao({
  bang,
  tenDuAn,
  gioiHan,
  suaTay,
  coGhi = false,
  luuSua,
}: {
  /** Chữ người đã sửa tay (khoá → chữ) + hàm lưu: ô 🤖 có nút «✎ Sửa» (Mr. Đại 28/10) */
  suaTay?: Record<string, string>;
  coGhi?: boolean;
  luuSua?: (khoa: string, chu: string) => void;
  bang: Bang;
  tenDuAn: (ma: string) => string;
  /** undefined = không cắt */
  gioiHan?: number;
}) {
  const [moNguon, setMoNguon] = useState(false);
  const [moHet, setMoHet] = useState(false);
  const oNang = bang.ma === "B10" ? ngayAnhHuongNangNhat(bang) : null;
  const bay = trinhBayBang(bang, tenDuAn);
  // Chỉ đếm dòng dữ liệu; hàng tổng đứng đầu luôn giữ, hàng tên dự án chỉ giữ khi còn dòng dữ liệu của nó được hiện
  const laDuLieu = (h: (typeof bay.hang)[number]) => h.kieu !== "tong-cong" && h.kieu !== "du-an" && h.kieu !== "dem";
  const tongDuLieu = bay.hang.filter(laDuLieu).length;
  const cat = gioiHan !== undefined && !moHet && tongDuLieu > gioiHan;
  const hangHien = (() => {
    if (!cat) return bay.hang;
    let dem = 0;
    const ra: typeof bay.hang = [];
    for (let i = 0; i < bay.hang.length; i++) {
      const h = bay.hang[i]!;
      if (laDuLieu(h)) {
        if (dem >= (gioiHan as number)) continue;
        dem++;
        ra.push(h);
      } else if (h.kieu === "du-an") {
        const ke = bay.hang[i + 1];
        if (dem < (gioiHan as number) && ke && laDuLieu(ke)) ra.push(h);
      } else ra.push(h);
    }
    return ra;
  })();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-normal text-text">
          <span className="text-accent">Bảng {bang.soHieu}</span> — {bang.ten}
        </h3>
        <button
          type="button"
          onClick={() => setMoNguon((v) => !v)}
          className="rounded-sm border border-border px-2 py-0.5 text-[10.5px] text-text-secondary hover:bg-bg2"
        >
          {moNguon ? "Ẩn nguồn từng cột" : "Xem nguồn từng cột"}
        </button>
      </div>

      {moNguon && (
        <ul className="rounded-sm border border-border bg-bg2 px-3 py-2 text-[11px] text-text-secondary">
          {bang.cot.map((c) => (
            <li key={c.khoa}>
              <span className="text-text">{c.nhan}</span> ← {c.anhXa.maAgent} · {c.anhXa.congCu}
              {(c.congCuKhac ?? []).map((k) => ` · ${k}`).join("")}
              {c.laLlm && <span className="text-text-muted"> (🤖 do LLM soạn)</span>}
            </li>
          ))}
        </ul>
      )}

      {bay.hang.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#003366]">
                {bay.cot.map((c) => (
                  <th
                    key={c.khoa}
                    className="border border-[#C8D0DC]/40 px-2 py-1.5 text-left font-bold text-white"
                    title={`${c.anhXa.maAgent} · ${c.anhXa.congCu}`}
                  >
                    {c.nhan}
                    {c.laLlm && " 🤖"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hangHien.map((h, i) => {
                if (h.kieu === "tong-cong" || h.kieu === "du-an") return <HangNhom key={`${h.kieu}-${i}`} h={h} cot={bay.cot} />;
                if (h.kieu === "dem") {
                  return (
                    <tr key={`dem-${i}`}>
                      <td colSpan={bay.cot.length} className={`${O_KE} text-text-secondary`}>
                        {h.nhan}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={h.dong?.khoa ?? i}>
                    {bay.cot.map((c) => (
                      <td key={c.khoa} className={O_KE}>
                        {bay.nhom && c.tuSinh && c.khoa === "tt" ? (
                          <span className="text-text">{h.stt}</span>
                        ) : c.laLlm && luuSua && h.dong && !h.dong.laDongGiuCho && !h.dong.loai ? (
                          <ChuSuaDuoc
                            hien={<O o={h.o[c.khoa]} />}
                            chuSua={suaTay?.[khoaO(bang.ma, h.dong.khoa, c.khoa)]}
                            chuBanDau={h.o[c.khoa]?.coSo ? hienO(h.o[c.khoa]!) : ""}
                            coGhi={coGhi}
                            luu={(chu) => luuSua(khoaO(bang.ma, h.dong!.khoa, c.khoa), chu)}
                          />
                        ) : (
                          <O o={h.o[c.khoa]} />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cat && (
        <button
          type="button"
          onClick={() => setMoHet(true)}
          className="text-[12px] font-bold text-[#f97316] hover:underline"
        >
          Xem thêm {tongDuLieu - (gioiHan as number)} dòng ▾
        </button>
      )}
      {gioiHan !== undefined && moHet && tongDuLieu > gioiHan && (
        <button type="button" onClick={() => setMoHet(false)} className="text-[12px] font-bold text-[#f97316] hover:underline">
          Thu gọn ▴
        </button>
      )}

      {bang.lyDoTrong && <p className="text-[11px] text-text-muted">Bảng chưa có dòng nào — {bang.lyDoTrong}</p>}

      {bay.cotAn.length > 0 && (
        <p className="text-[11px] text-text-muted">Chưa có số liệu nên không vẽ cột: {bay.cotAn.join(" · ")}.</p>
      )}

      {bang.ma === "B10" && bay.hang.length > 0 && (
        <p className="text-[11px] text-text-secondary">
          <span className="text-text">Số ngày ảnh hưởng nặng nhất: {oNang ? hienO(oNang) : DAU_TRONG}</span> — {CAU_GIAI_THICH_NGAY_ANH_HUONG}
        </p>
      )}

      {bang.ma !== "B10" &&
        bang.ghiChuDuoiBang.map((g) => (
          <p key={g} className="text-[11px] leading-relaxed text-text-muted">
            {g}
          </p>
        ))}
      {bang.ma === "B10" &&
        bang.ghiChuDuoiBang
          .filter((g) => g !== CAU_GIAI_THICH_NGAY_ANH_HUONG)
          .map((g) => (
            <p key={g} className="text-[11px] leading-relaxed text-text-muted">
              {g}
            </p>
          ))}
    </div>
  );
}
