"use client";
// Danh sách điều kiện kiểm tra (đúng bảng "Hệ thống kiểm tra những gì"): đạt ✓, chặn !, cảnh báo, thông tin, AI góp ý.
// Mỗi dòng lỗi ghi rõ ô / bảng / dòng để người gửi sửa đúng chỗ, kèm tên luật + huy hiệu Code/AI + mức (bộ luật động).
import { useState } from "react";
import { AlertTriangle, Check, Info, Sparkles, X } from "lucide-react";
import type { KyBaoCao, LoiKiemTra, MauWord } from "@/lib/types";
import type { CachKiem, LoiLuat } from "@/lib/luat/types";
import { ngayVN } from "@/components/gui/chung";
import { HuyHieuMuc } from "@/components/luat/chung";

export interface KetQuaHienThi {
  dat: boolean;
  mau_ma: string | null;
  ky_bao_cao?: KyBaoCao;
  o_nhap: Record<string, string>;
  gui_den: string[];
  cong_viec: { ten: string; ket_thuc?: string; ket_thuc_sau?: unknown; nguon_bang: string }[];
  loi: LoiLuat[];
  tu_do?: boolean;
  mau?: MauWord | null;
  du_doan?: { hanh_dong: string }[];
  so_cai_chua_san_sang?: string;
  /** Luật + phiên bản luật đã dùng khi kiểm (bộ luật động) */
  luat_da_dung?: { id: string; ma: string; phien_ban: number; cach_kiem: CachKiem; muc: LoiKiemTra["muc"] }[];
}

/** Thứ tự hiển thị + nhãn khi đạt (tên luật thật nằm trong cấu hình luat_kiem_tra). */
const NHOM: { ma: string[]; ten: string; khiDat: (k: KetQuaHienThi, tenNoi: (id: string) => string) => string | null; ai?: boolean }[] = [
  {
    ma: ["dung_mau"],
    ten: "Đúng mẫu",
    khiDat: (k) => (k.mau ? `${k.mau.ten} · đủ ${k.mau.dinh_nghia.muc_bat_buoc.length} mục, không mất ô nhập` : k.tu_do ? "Gửi tự do, không theo mẫu" : null),
  },
  {
    ma: ["ky_bao_cao"],
    ten: "Kỳ báo cáo",
    khiDat: (k) =>
      k.ky_bao_cao
        ? `${k.ky_bao_cao.loai === "thang" ? "Tháng" : k.ky_bao_cao.loai === "quy" ? "Quý" : "Tuần"} ${k.ky_bao_cao.so ?? ""}/${k.ky_bao_cao.nam ?? ""} (${ngayVN(k.ky_bao_cao.tu)} – ${ngayVN(k.ky_bao_cao.den)})`
        : null,
  },
  { ma: ["nguoi_lap"], ten: "Người lập, người kiểm soát", khiDat: (k) => [k.o_nhap.nguoi_lap, k.o_nhap.nguoi_kiem_soat].filter(Boolean).join(" · ") || null },
  { ma: ["gui_den"], ten: "Gửi đến", khiDat: (k, t) => (k.gui_den.length ? k.gui_den.map(t).join(", ") : null) },
  {
    ma: ["ten_viec", "ngay_hop_le", "ngay_trong"],
    ten: "Công việc",
    khiDat: (k) => {
      const n = k.cong_viec.length;
      if (!n) return k.tu_do ? "Không sinh việc" : "Không có việc trong chương Kết quả và kế hoạch việc";
      const khongNgay = k.cong_viec.filter((c) => !c.ket_thuc && !c.ket_thuc_sau).length;
      return `${n} việc${khongNgay ? ` · ${khongNgay} việc thiếu ngày kết thúc` : " · đều có hạn"}`;
    },
  },
  { ma: ["viec_trung"], ten: "Trùng việc trong sổ cái", khiDat: (k) => (k.so_cai_chua_san_sang ? null : k.cong_viec.length ? "Không trùng việc đang mở" : null) },
  { ma: ["noi_dung_ai"], ten: "AI góp ý nội dung", khiDat: () => "Không thấy mục trống", ai: true },
];

/** Tên các mục máy kiểm ĐẠT (không lỗi nào) — trang Gửi báo cáo gom thành một dòng xám "Đạt n mục: …". */
export function mucDat(kq: KetQuaHienThi): string[] {
  if (!kq.mau && !kq.tu_do) return [];
  const loiBangViec = kq.loi.some((l) => (l.muc === "chan" || l.muc === "canh_bao") && l.luat !== "viec_trung" && !!l.vi_tri?.bang);
  return NHOM.filter((n) => !n.ai && !kq.loi.some((l) => n.ma.includes(l.luat)) && !(n.ten === "Công việc" && loiBangViec) && n.khiDat(kq, (x) => x)).map((n) => n.ten);
}

/** Tên cột dễ đọc khi bảng không có cột đó (vd việc lấy từ bảng Kiến nghị: hạn / người làm nằm trong câu chữ). */
const TEN_COT: Record<string, string> = {
  ket_thuc: "Kết thúc (hạn)",
  bat_dau: "Bắt đầu",
  phu_trach: "Người phụ trách",
  ten: "Công việc",
  ma_viec: "Mã việc",
  du_an: "Dự án",
};

export function viTri(l: Pick<LoiKiemTra, "vi_tri">, mau?: MauWord | null): string {
  const v = l.vi_tri;
  if (!v) return "";
  if (v.bang) {
    // Nhãn bảng / cột thật nếu định nghĩa mẫu có (dinh_nghia.bang[].cot)
    const bangDu = (mau?.dinh_nghia as { bang?: { tag: string; nhan?: string; cot?: { tag: string; nhan: string }[] }[] } | undefined)?.bang;
    const b = mau?.dinh_nghia.bang_cong_viec.find((x) => x.tag === v.bang)?.nhan ?? bangDu?.find((x) => x.tag === v.bang)?.nhan ?? v.bang;
    const cot = v.cot ? (bangDu?.find((x) => x.tag === v.bang)?.cot?.find((c) => c.tag === v.cot)?.nhan ?? TEN_COT[v.cot] ?? v.cot) : "";
    return `Bảng "${b}"${v.dong ? `, dòng ${v.dong}` : ""}${cot ? `, cột "${cot}"` : ""}`;
  }
  if (v.tag?.startsWith("muc:")) return `Mục "${v.tag.slice(4)}"`;
  if (v.tag === "mau_ma") return "Tiêu đề đầu trang (dấu nhận mẫu)";
  if (v.tag) return `Ô "${mau?.dinh_nghia.o_nhap.find((o) => o.tag === v.tag)?.nhan ?? v.tag}"`;
  return "";
}

const BIEU_TUONG = {
  ok: <Check size={13} />,
  chan: <X size={13} />,
  canh_bao: <AlertTriangle size={13} />,
  goi_y: <Info size={13} />,
  ai: <Sparkles size={13} />,
};
const MAU = { ok: "border-green text-green", chan: "border-red text-red", canh_bao: "border-yellow text-yellow", goi_y: "border-blue text-blue", ai: "border-accent text-accent" };

export function KetQuaKiemTra({
  kq,
  tenNoiNhan = (x) => x,
  tenLuat,
  anChanCanhBao = false,
}: {
  kq: KetQuaHienThi;
  /** Lỗi chặn / cảnh báo đã hiện ở khung "Sửa lỗi" (BuocSuaLoi) → không liệt kê lại ở đây (một vấn đề một nơi) */
  anChanCanhBao?: boolean;
  tenNoiNhan?: (id: string) => string;
  /** Tên luật theo mã (lấy từ bộ luật) khi lỗi chưa mang ten_luat */
  tenLuat?: (ma: string) => string | undefined;
}) {
  const [moDat, setMoDat] = useState(false);
  const dong: { loai: keyof typeof MAU; ten: string; phu?: string; chi_tiet: string; vi_tri?: string; loi?: LoiLuat }[] = [];
  const daDung = new Set<LoiKiemTra>();
  const ten = (l: LoiLuat) => l.ten_luat ?? tenLuat?.(l.luat);
  // Chưa nhận ra mẫu thì các mục khác chưa hề được kiểm — không được hiện ✓ "đạt"
  const chuaNhanMau = !kq.mau && !kq.tu_do;
  for (const n of NHOM) {
    const loi = kq.loi.filter((l) => n.ma.includes(l.luat));
    loi.forEach((l) => daDung.add(l));
    if (loi.length === 0) {
      // Nhóm AI không có dòng "đạt": AI góp ý thật chạy ở bước 3 · Soát nội dung, bước 2 chưa biết AI thấy gì
      if (chuaNhanMau || n.ai) continue;
      const d = n.khiDat(kq, tenNoiNhan);
      if (d) dong.push({ loai: n.ai ? "ai" : "ok", ten: n.ten, chi_tiet: d });
      continue;
    }
    for (const l of loi) {
      const t = ten(l);
      dong.push({ loai: n.ai ? "ai" : l.muc, ten: n.ten, phu: t && t !== n.ten ? t : undefined, chi_tiet: l.thong_diep, vi_tri: viTri(l, kq.mau), loi: l });
    }
  }
  for (const l of kq.loi) if (!daDung.has(l)) dong.push({ loai: l.muc, ten: ten(l) ?? l.luat, chi_tiet: l.thong_diep, vi_tri: viTri(l, kq.mau), loi: l });
  if (chuaNhanMau)
    dong.push({ loai: "goi_y", ten: "Các mục khác", chi_tiet: "Chưa kiểm (kỳ báo cáo, người lập, gửi đến, công việc, luật AI) — cần nhận ra mẫu trước" });
  const soChan = kq.loi.filter((l) => l.muc === "chan").length;
  // Mục đạt gom thành một dòng (bấm để xem); lỗi, cảnh báo, gợi ý luôn hiện đủ — danh sách ngắn, không bị cuộn dài
  const dat = dong.filter((d) => d.loai === "ok");
  const conLai = dong.filter((d) => d.loai !== "ok" && !(anChanCanhBao && d.loi && (d.loi.muc === "chan" || d.loi.muc === "canh_bao")));

  return (
    <div>
      <div className={`mb-3 flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ${kq.dat ? "border-green text-green" : "border-red text-red"}`}>
        {kq.dat ? <Check size={16} /> : <X size={16} />}
        {kq.dat
          ? "Đủ điều kiện bắt buộc — gửi được"
          : anChanCanhBao
            ? `Chưa đạt: ${soChan} lỗi chặn gửi — xem vì sao và sửa ngay ở khung “Sửa lỗi”`
            : `Chưa đạt: ${soChan} lỗi chặn gửi, sửa đúng các ô dưới đây rồi tải lại bản đã sửa`}
      </div>
      {dat.length > 0 && (
        <button
          type="button"
          onClick={() => setMoDat((x) => !x)}
          className="mb-1.5 flex w-full items-center gap-2.5 rounded-sm border border-border-light px-2.5 py-2 text-left text-sm hover:bg-white/[0.02]"
        >
          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${MAU.ok}`}>{BIEU_TUONG.ok}</span>
          <span className="min-w-0 flex-1 truncate text-text-secondary">
            <b className="text-text">Đạt {dat.length} mục:</b> {dat.map((d) => d.ten).join(" · ")}
          </span>
          <span className="shrink-0 text-[11px] text-text-muted">{moDat ? "thu gọn" : "xem"}</span>
        </button>
      )}
      <ul className="space-y-1.5">
        {[...(moDat ? dat : []), ...conLai].map((d, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-sm border border-border-light px-2.5 py-2">
            <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${MAU[d.loai]}`}>{BIEU_TUONG[d.loai]}</span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium text-text">
                {d.ten}
                {d.phu ? <span className="font-normal text-text-muted"> · {d.phu}</span> : null}
              </div>
              <div className="text-xs text-text-secondary">{d.chi_tiet}</div>
              {d.vi_tri ? <div className="mt-0.5 text-[11px] text-text-muted">Vị trí: {d.vi_tri}</div> : null}
            </div>
            {d.loi ? (
              <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                <HuyHieuMuc muc={d.loi.muc} nho />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {kq.so_cai_chua_san_sang ? <p className="mt-2 text-xs text-text-muted">Sổ cái chưa trả lời được phần dự đoán việc trùng ({kq.so_cai_chua_san_sang}).</p> : null}
    </div>
  );
}
