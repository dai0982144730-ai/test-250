// ============================================================
// cay-viec/khong-can-giao.ts — SỔ "VIỆC NÀY KHÔNG CẦN GIAO TRONG AGENT CÔNG VIỆC" (chép sổ wbs-khong-can-giao-base của agent Base,
// Mr. Đại chốt 10/09/2026). Không phải đầu việc nào cũng giao qua agent Công việc — có việc chạy theo hợp đồng khoán gọn, đơn
// vị ngoài làm, điều hành bằng văn bản… Với những mã đó câu hỏi "đã có ai được giao chưa" là vô nghĩa.
// Người bấm mới ghi; AI không tự thêm. Ăn vào đúng một chỗ: thẻ ④ và bộ đếm nút găng trống (lib/cay-viec/thuan.ts).
// Khác Base: sổ chia THEO DỰ ÁN (Base một sổ chung vì mỗi lần chỉ một dự án). CHỈ SERVER — đụng node:fs (luật 10).
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { doiMaCu } from "@/lib/du-an-main-thuan";

export interface DongKhongCanGiao {
  du_an: string;
  wbs: string;
  nguoi: string;
  luc: string;
  ly_do: string;
}

const tep = () => thuMucDuLieu("cay-viec", "wbs-khong-can-giao.json");

function doc(): DongKhongCanGiao[] {
  try {
    const t = tep();
    if (!fs.existsSync(t)) return [];
    const j = JSON.parse(fs.readFileSync(t, "utf8")) as unknown;
    return Array.isArray(j) ? (j as DongKhongCanGiao[]) : [];
  } catch {
    return [];
  }
}

function ghi(ds: DongKhongCanGiao[]): void {
  const t = tep();
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, JSON.stringify(ds, null, 2) + "\n", "utf8");
}

export function tapKhongCanGiao(duAn: string): Set<string> {
  // dòng ghi trước 03/10 mang mã cũ (da-hv…) — so theo mã ngắn Main (6g.6)
  const ma = doiMaCu(duAn);
  return new Set(doc().filter((d) => doiMaCu(d.du_an) === ma).map((d) => d.wbs));
}

/** Bấm đánh dấu. Có rồi thì thôi, không ghi trùng. */
export function danhDauKhongCanGiao(duAn: string, wbs: string, nguoi: string, lyDo = ""): void {
  const ds = doc();
  if (ds.some((d) => d.du_an === duAn && d.wbs === wbs)) return;
  ds.push({ du_an: duAn, wbs, nguoi, luc: new Date().toISOString(), ly_do: lyDo });
  ghi(ds);
}

/** Bỏ đánh dấu — trả nút về diện phải giao */
export function boDanhDauKhongCanGiao(duAn: string, wbs: string): void {
  ghi(doc().filter((d) => !(d.du_an === duAn && d.wbs === wbs)));
}
