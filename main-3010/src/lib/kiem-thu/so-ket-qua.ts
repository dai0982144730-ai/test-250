// ============================================================
// so-ket-qua.ts — CHỈ CHẠY PHÍA SERVER (node:fs). Client chỉ import
// `kich-ban-chung.ts` và `kich-ban.ts` (file thuần) — luật 10.
//
// ⭐ LƯU RA FILE, KHÔNG PHẢI localStorage.
// Bản pháp lý lưu kết quả test vào localStorage của trình duyệt. Ở đây cố ý
// làm khác, vì mục đích Mr. Đại nói rõ: "lưu lại để tôi bảo AI vào đó đọc và
// làm theo nội dung tôi test". localStorage thì AI không đọc được — nó nằm
// trong trình duyệt chứ không phải file trên máy. Thêm nữa ảnh chụp màn hình
// dán vào sẽ làm localStorage đầy rất nhanh.
//
// Cây thư mục:
//   data/kiem-thu/<dự án>/ket-qua.json     ← sổ máy đọc
//   data/kiem-thu/<dự án>/anh/<tên>.png    ← ảnh dán từ Snipping Tool
//   data/kiem-thu/<dự án>/BAO-CAO-TEST.md  ← bản cho AI đọc, sinh lại mỗi lần ghi
//
// File .md là thứ Mr. Đại trỏ AI vào: nó gom sẵn bài nào không đạt, lý do,
// ảnh kèm và câu lệnh nhờ sửa — khỏi phải mở JSON.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { CAC_TAB, timBai } from "./kich-ban";
import {
  SO_RONG,
  TRAN_ANH,
  DUOI_ANH_DAN,
  type KetQuaBai,
  type SoKetQuaTest,
  type VanDePhatSinh,
} from "./kich-ban-chung";
import { sanitizeProjectId } from "@/lib/projects";
import { fmtNum } from "@/lib/format";

function thuMuc(projectId: string): string {
  return path.join(gocDuLieu(), "kiem-thu", sanitizeProjectId(projectId) ?? "default");
}
function fileSo(projectId: string): string {
  return path.join(thuMuc(projectId), "ket-qua.json");
}
function thuMucAnh(projectId: string): string {
  return path.join(thuMuc(projectId), "anh");
}

export function docSo(projectId: string): SoKetQuaTest {
  try {
    const raw = fs.readFileSync(fileSo(projectId), "utf8").replace(/^﻿/, "");
    const j = JSON.parse(raw) as Partial<SoKetQuaTest>;
    return {
      bai: j.bai ?? {},
      phatSinh: Array.isArray(j.phatSinh) ? j.phatSinh : [],
      capNhatLuc: j.capNhatLuc ?? "",
    };
  } catch {
    // Chưa có sổ hoặc sổ hỏng — trả sổ rỗng, KHÔNG ném lỗi làm hỏng cả màn
    return { ...SO_RONG, bai: {}, phatSinh: [] };
  }
}

function ghiSo(projectId: string, so: SoKetQuaTest): void {
  fs.mkdirSync(thuMuc(projectId), { recursive: true });
  so.capNhatLuc = new Date().toISOString();
  fs.writeFileSync(fileSo(projectId), JSON.stringify(so, null, 2), "utf8");
  vietBaoCao(projectId, so);
}

/** Chấm một bài — chấm lại thì ghi đè, giữ đúng một bản ghi cho mỗi bài */
export function chamBai(projectId: string, ma: string, kq: Omit<KetQuaBai, "luc">): SoKetQuaTest {
  const so = docSo(projectId);
  so.bai[ma] = { ...kq, luc: new Date().toISOString() };
  ghiSo(projectId, so);
  return so;
}

/** Bỏ chấm một bài — bấm lại nút đang chọn thì gỡ, khỏi phải xoá tay */
export function boCham(projectId: string, ma: string): SoKetQuaTest {
  const so = docSo(projectId);
  delete so.bai[ma];
  ghiSo(projectId, so);
  return so;
}

export function themPhatSinh(
  projectId: string,
  v: Omit<VanDePhatSinh, "id" | "luc">
): SoKetQuaTest {
  const so = docSo(projectId);
  so.phatSinh.push({
    ...v,
    id: `PS-${Date.now().toString(36)}`,
    luc: new Date().toISOString(),
  });
  ghiSo(projectId, so);
  return so;
}

export function suaPhatSinh(
  projectId: string,
  id: string,
  v: Partial<Pick<VanDePhatSinh, "ten" | "prompt" | "anh">>
): SoKetQuaTest {
  const so = docSo(projectId);
  const i = so.phatSinh.findIndex((x) => x.id === id);
  if (i >= 0) so.phatSinh[i] = { ...so.phatSinh[i], ...v };
  ghiSo(projectId, so);
  return so;
}

export function xoaPhatSinh(projectId: string, id: string): SoKetQuaTest {
  const so = docSo(projectId);
  so.phatSinh = so.phatSinh.filter((x) => x.id !== id);
  ghiSo(projectId, so);
  return so;
}

/**
 * Lưu một ảnh dán. Trả về TÊN FILE để ghi vào sổ.
 * Chỉ nhận ảnh, chỉ nhận dưới trần cỡ — không nhận file lạ đội lốt.
 */
export function luuAnh(projectId: string, duoi: string, du_lieu: Buffer): string {
  const d = duoi.toLowerCase().replace(/^\./, "");
  if (!DUOI_ANH_DAN.includes(d)) throw new Error(`Chỉ nhận ảnh (${DUOI_ANH_DAN.join(", ")}).`);
  if (du_lieu.length > TRAN_ANH) {
    throw new Error(`Ảnh nặng ${fmtNum(du_lieu.length / 1024 / 1024, 1)} MB, quá mức cho phép 5 MB.`);
  }
  fs.mkdirSync(thuMucAnh(projectId), { recursive: true });
  const ten = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${d}`;
  fs.writeFileSync(path.join(thuMucAnh(projectId), ten), du_lieu);
  return ten;
}

export function docAnh(projectId: string, ten: string): Buffer | null {
  // Chặn đường dẫn leo thư mục — tên ảnh do client gửi lên
  if (!/^[a-z0-9-]+\.[a-z]{3,4}$/i.test(ten)) return null;
  try {
    return fs.readFileSync(path.join(thuMucAnh(projectId), ten));
  } catch {
    return null;
  }
}

/**
 * Viết bản báo cáo tiếng Việt cho AI đọc.
 *
 * Đây là điểm mấu chốt của cả tính năng: Mr. Đại test xong chỉ cần bảo
 * "đọc data/kiem-thu/<dự án>/BAO-CAO-TEST.md rồi sửa" là AI có đủ ngữ cảnh —
 * bài nào hỏng, hỏng thế nào, ảnh ở đâu, và câu lệnh Mr. Đại muốn.
 */
function vietBaoCao(projectId: string, so: SoKetQuaTest): void {
  const d: string[] = [];
  const khongDat = Object.entries(so.bai).filter(([, k]) => k.trangThai === "khong-dat");
  const dat = Object.entries(so.bai).filter(([, k]) => k.trangThai === "dat");

  d.push("# KẾT QUẢ TEST — AGENT TIẾN ĐỘ");
  d.push("");
  d.push("> File này do phần mềm tự ghi mỗi lần chấm một bài. **Đừng sửa tay.**");
  d.push("> Mr. Đại trỏ AI vào đây để sửa code theo đúng thứ đã test.");
  d.push("");
  d.push(`- Dự án: \`${sanitizeProjectId(projectId)}\``);
  d.push(`- Cập nhật lúc: ${so.capNhatLuc}`);
  d.push(`- Đã chấm **${Object.keys(so.bai).length}** bài — đạt ${dat.length}, **không đạt ${khongDat.length}**`);
  d.push(`- Vấn đề phát sinh ngoài kịch bản: **${so.phatSinh.length}**`);
  d.push("");

  if (khongDat.length > 0) {
    d.push("## ⛔ Bài KHÔNG ĐẠT — cần sửa");
    d.push("");
    for (const [ma, k] of khongDat) {
      const t = timBai(ma);
      d.push(`### ${ma} — ${t?.bai.ten ?? "(không rõ tên bài)"}`);
      if (t) {
        d.push(`*Tab ${t.tab.ten}. Mong đợi: ${t.bai.mongDoi}*`);
      }
      d.push("");
      if (k.ghiChu) {
        d.push("**Gặp phải:**");
        d.push("");
        d.push(k.ghiChu);
        d.push("");
      }
      if (k.prompt) {
        d.push("**Mr. Đại muốn sửa thế nào:**");
        d.push("");
        d.push("> " + k.prompt.split("\n").join("\n> "));
        d.push("");
      }
      if (k.anh && k.anh.length > 0) {
        d.push("**Ảnh chụp màn hình:**");
        d.push("");
        for (const a of k.anh) d.push(`- \`data/kiem-thu/${sanitizeProjectId(projectId)}/anh/${a}\``);
        d.push("");
      }
    }
  }

  if (so.phatSinh.length > 0) {
    d.push("## 🔧 Vấn đề phát sinh ngoài kịch bản");
    d.push("");
    for (const v of so.phatSinh) {
      d.push(`### ${v.id} — ${v.ten}`);
      d.push("");
      if (v.prompt) {
        d.push("> " + v.prompt.split("\n").join("\n> "));
        d.push("");
      }
      for (const a of v.anh) d.push(`- \`data/kiem-thu/${sanitizeProjectId(projectId)}/anh/${a}\``);
      d.push("");
    }
  }

  if (dat.length > 0) {
    d.push("## ✅ Bài đã đạt");
    d.push("");
    for (const [ma] of dat) {
      const t = timBai(ma);
      d.push(`- ${ma} — ${t?.bai.ten ?? ""}`);
    }
    d.push("");
  }

  const chuaCham = CAC_TAB.flatMap((t) => t.bai)
    .filter((b) => !so.bai[b.ma])
    .map((b) => b.ma);
  if (chuaCham.length > 0) {
    d.push(`## ⏳ Chưa chấm (${chuaCham.length} bài)`);
    d.push("");
    d.push(chuaCham.join(" · "));
    d.push("");
  }

  fs.mkdirSync(thuMuc(projectId), { recursive: true });
  fs.writeFileSync(path.join(thuMuc(projectId), "BAO-CAO-TEST.md"), d.join("\n"), "utf8");
}
