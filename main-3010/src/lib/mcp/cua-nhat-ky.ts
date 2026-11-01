// ============================================================
// BA CỬA NHẬT KÝ CHO AGENT QUAN SÁT — phần MÁY CHỦ (26/09/2026)
//
// Đọc sổ `data/nhat-ky-hoi-agent.jsonl` của CHÍNH app này (docNhatKy đã quy mã
// agent về chuẩn A04, mới nhất trước) rồi giao cho phần thuần
// `lib/nhat-ky/cua-quan-sat.ts` cộng/cắt trang, bọc vào khuôn MCP mục 3.
// File giống hệt ở 4 app Next (base · hopdong · main · tiendo).
//
// Server-only (docNhatKy đụng node:fs).
// ============================================================

import { docNhatKy } from "@/lib/nhat-ky/so";
import {
  ganDaySo,
  hoiThoaiSo,
  tongHopSo,
  type DongSoQs,
  type KetQuaCua,
} from "@/lib/nhat-ky/cua-quan-sat";
import { thanhCong, thatBai, type KhuonTra } from "./khuon";

export type LoaiCuaNhatKy = "nhat_ky_tong_hop" | "nhat_ky_gan_day" | "hoi_thoai_gan_day";

function docSo(): DongSoQs[] {
  return docNhatKy({}).map((d) => ({
    thoiDiem: String(d.thoiDiem),
    agentHoi: String(d.agentHoi ?? ""),
    agentTraLoi: String(d.agentTraLoi ?? ""),
    congCu: String(d.congCu ?? ""),
    thamSo: d.thamSo,
    ketQua: String(d.ketQua ?? ""),
    miliGiay: typeof d.miliGiay === "number" ? d.miliGiay : null,
    nguonDan: d.nguonDan,
    traLoiGon: d.traLoiGon,
    lyDoGoi: d.lyDoGoi,
    loi: d.loi,
    soToken: d.soToken,
    duAn: d.duAn,
    // Khuôn sổ bản 2 (7.1) — dòng cũ không có, để undefined (cửa trả null)
    phienBanSo: d.phienBanSo,
    maLuot: d.maLuot,
    maChuoi: d.maChuoi,
    vai: d.vai,
    loaiLuot: d.loaiLuot,
    maLoi: d.maLoi,
    bam: d.bam,
    traLoi: d.traLoi,
    biCat: d.biCat,
    traGon: d.traGon,
  }));
}

function boc(kq: KetQuaCua, tenSo: string): KhuonTra {
  if (!kq.ok) return thatBai(kq.ma_loi, kq.thong_diep);
  return thanhCong(kq.du_lieu, [
    {
      loai: "nhat-ky-hoi-agent",
      ma: "core.nhat_ky_hoi_agent",
      file_goc: "data/nhat-ky-hoi-agent.jsonl",
      vi_tri: kq.vi_tri,
      thoi_diem_trich: new Date().toISOString(),
      trang_thai: `Sổ append-only của ${tenSo} · ${kq.tong_ca_so.toLocaleString("vi-VN")} dòng đọc được`,
    },
  ]);
}

/** Chạy một trong ba cửa. `tenSo` = tên tiếng Việt của agent chủ sổ */
export function chayCuaNhatKy(loai: LoaiCuaNhatKy, thamSo: Record<string, unknown>, tenSo: string): KhuonTra {
  try {
    const dong = docSo();
    const kq =
      loai === "nhat_ky_tong_hop"
        ? tongHopSo(dong, thamSo, tenSo)
        : loai === "nhat_ky_gan_day"
          ? ganDaySo(dong, thamSo, tenSo)
          : hoiThoaiSo(dong, thamSo, tenSo);
    return boc(kq, tenSo);
  } catch (e) {
    return thatBai("LOI_NOI_BO", `Không đọc được sổ hỏi–đáp của ${tenSo}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
