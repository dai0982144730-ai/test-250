// ============================================================
// KHO MA TRẬN GỌI — đọc/ghi trên đĩa. SERVER-ONLY (node:fs).
//
// File `data/ma-tran-goi.json` KHÔNG chứa bí mật (chỉ có bật/tắt theo cặp mã
// agent) nên để đuôi `.json` bình thường và cho vào git cùng `data/` như
// quyết định 30/08 trong `.gitignore`. Khác hẳn kho cấu hình chung — chỗ đó
// có khoá API nên phải đặt đuôi `.log` để bị chặn.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import {
  MA_TRAN_RONG,
  datO,
  dungMaTran,
  duocGoiKhong,
  type BangMaTran,
  type KetQuaChan,
  type MaTranGoi,
} from "./model";

const TEN_FILE = "ma-tran-goi.json";

function duongDan(): string {
  return path.join(gocDuLieu(), TEN_FILE);
}

export function docMaTran(): MaTranGoi {
  try {
    const tho = fs.readFileSync(duongDan(), "utf8").replace(/^﻿/, "");
    const d = JSON.parse(tho) as Partial<MaTranGoi>;
    const o: Record<string, boolean> = {};
    if (d.o && typeof d.o === "object") {
      for (const [k, v] of Object.entries(d.o as Record<string, unknown>)) {
        o[k] = v === true;
      }
    }
    return { o, macDinhChoGoi: d.macDinhChoGoi !== false };
  } catch {
    return { ...MA_TRAN_RONG, o: {} };
  }
}

export function ghiMaTran(mt: MaTranGoi): MaTranGoi {
  const p = duongDan();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(mt, null, 2), "utf8");
  return mt;
}

/** Tích/bỏ tích một ô rồi lưu ngay — màn hình không có nút Lưu riêng cho từng ô */
export function datOVaLuu(agentGoi: string, agentDuocGoi: string, bat: boolean): MaTranGoi {
  return ghiMaTran(datO(docMaTran(), agentGoi, agentDuocGoi, bat));
}

/**
 * Bảng đầy đủ cho màn hình: hàng/cột từ Danh bạ agent, bật/tắt từ ma trận.
 * Số agent hoàn toàn do Danh bạ quyết — hàm này không biết hệ có mấy con.
 * 26/09 (Mr. Đại chốt): KHÔNG còn đọc sổ nhật ký để đếm lượt — số lượt gọi thật
 * xem ở Agent quan sát.
 */
export function bangHienTai(): BangMaTran {
  return dungMaTran(docDanhBaAgent(), docMaTran());
}

/**
 * Cửa chặn dùng ở cổng MCP: đọc thẳng ma trận + danh bạ trên đĩa.
 * Tách khỏi `duocGoiKhong` thuần để phần thuần vẫn test được không cần đĩa.
 */
export function duocGoiKhongTuKho(agentGoi: string, agentDuocGoi: string): KetQuaChan {
  return duocGoiKhong(agentGoi, agentDuocGoi, docMaTran(), docDanhBaAgent());
}
