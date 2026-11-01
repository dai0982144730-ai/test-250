// ============================================================
// cua-vao.ts — CỬA VÀO cổng /api/mcp/socai: xác thực khóa → quyền công cụ → chạy → ghi lượt đọc.
// Nhận HAI kiểu gọi trên cùng một địa chỉ:
//   1. Kiểu SCI (như /api/mcp/tiendo của agent tiến độ):
//        POST { cong_cu, tham_so?, agent_goi?, ly_do_goi? } → khuôn HOP-DONG-KET-NOI mục 3
//   2. MCP chuẩn JSON-RPC 2.0 (Streamable HTTP, trả JSON): initialize · tools/list · tools/call · ping
// Tách khỏi route để test được không cần Next (tests/unit/mcp-*.test.ts). Server-only.
// ============================================================

import { tx, type Q } from "@/lib/db";
import { chayCongCu, DANH_MUC_CONG_CU, MA_CONG } from "./cong-socai";
import { duocDungCongCu, ghiLuotDoc, khoaTuHeader, xacThucKhoa, type KhoaAgent } from "./khoa-agent";
import { PHIEN_BAN_HOP_DONG, thatBai, type KhuonTra } from "./khuon";

export interface TraLoiHttp {
  status: number;
  body: unknown;
}

const PHIEN_BAN_MCP = "2025-03-26";

/** Công cụ nào khóa này được thấy (tools/list chỉ bày đúng phần được gọi) */
export function congCuThayDuoc(k: KhoaAgent): typeof DANH_MUC_CONG_CU {
  return DANH_MUC_CONG_CU.filter((c) => duocDungCongCu(k.cong_cu, c.ten));
}

/** Chạy một công cụ cho một khóa đã xác thực: kiểm quyền công cụ + ghi lượt đọc (gộp) */
export async function chayChoKhoa(q: Q, k: KhoaAgent, congCu: string, thamSo: Record<string, unknown>): Promise<KhuonTra> {
  if (!duocDungCongCu(k.cong_cu, congCu)) {
    return thatBai("KHONG_CO_QUYEN", `Khóa "${k.ten}" không được gọi công cụ ${congCu}. Được phép: ${k.cong_cu.join(", ")}.`);
  }
  const kq = await chayCongCu(q, congCu, thamSo);
  if (congCu !== "suc_khoe" && congCu !== "nang_luc") {
    try {
      // Ghi lịch sử phải trong giao dịch (chuỗi băm) — tách khỏi q đọc
      await tx((t) => ghiLuotDoc(t, k, congCu));
    } catch {
      /* ghi sổ hỏng không hỏng câu trả lời */
    }
  }
  return kq;
}

function thamSoTu(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function rpcLoi(id: unknown, code: number, message: string, status = 200): TraLoiHttp {
  return { status, body: { jsonrpc: "2.0", id: id ?? null, error: { code, message } } };
}

async function xuLyJsonRpc(q: Q, k: KhoaAgent, body: Record<string, unknown>): Promise<TraLoiHttp> {
  const id = body.id;
  const method = typeof body.method === "string" ? body.method : "";
  const params = thamSoTu(body.params);
  // Thông báo (không có id) → không trả nội dung
  if (id === undefined && method.startsWith("notifications/")) return { status: 202, body: null };
  switch (method) {
    case "initialize":
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : PHIEN_BAN_MCP,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: `docflow-${MA_CONG}`, version: PHIEN_BAN_HOP_DONG },
            instructions: "Cổng chỉ đọc sổ cái SCI công việc. Tên trường cố định: xem docs/SO-CAI-CHO-AGENT.md.",
          },
        },
      };
    case "ping":
      return { status: 200, body: { jsonrpc: "2.0", id, result: {} } };
    case "tools/list":
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: { tools: congCuThayDuoc(k).map((c) => ({ name: c.ten, description: c.mo_ta, inputSchema: c.input_schema })) },
        },
      };
    case "tools/call": {
      const ten = typeof params.name === "string" ? params.name : "";
      if (ten === "") return rpcLoi(id, -32602, "Thiếu params.name");
      const kq = await chayChoKhoa(q, k, ten, thamSoTu(params.arguments));
      return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(kq) }], structuredContent: kq, isError: !kq.ok },
        },
      };
    }
    default:
      return rpcLoi(id, -32601, `Không có phương thức "${method}"`);
  }
}

/**
 * Xử lý một yêu cầu tới cổng. `headers` chỉ cần get(); `body` là JSON đã parse
 * (null nếu body hỏng).
 */
export async function xuLyYeuCauMcp(q: Q, headers: { get(ten: string): string | null }, body: unknown): Promise<TraLoiHttp> {
  const laRpc = body !== null && typeof body === "object" && !Array.isArray(body) && (body as Record<string, unknown>).jsonrpc === "2.0";
  const xt = await xacThucKhoa(q, khoaTuHeader(headers.get("authorization"), headers.get("x-api-key")));
  if (!xt.ok) {
    return laRpc
      ? rpcLoi((body as Record<string, unknown>).id, -32001, xt.ly_do, 401)
      : { status: 401, body: thatBai("KHONG_CO_QUYEN", xt.ly_do) };
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { status: 200, body: thatBai("KHONG_HIEU_YEU_CAU", "Body phải là JSON object.") };
  }
  const b = body as Record<string, unknown>;
  if (laRpc) return xuLyJsonRpc(q, xt.khoa, b);

  const congCu = typeof b.cong_cu === "string" ? b.cong_cu.trim() : "";
  if (congCu === "") return { status: 200, body: thatBai("KHONG_HIEU_YEU_CAU", "Thiếu `cong_cu`. Gọi nang_luc để xem danh mục.") };
  // Kiểu SCI: luôn HTTP 200 kể cả ok:false ("không bao giờ ném ngoại lệ ra ngoài biên MCP")
  return { status: 200, body: await chayChoKhoa(q, xt.khoa, congCu, thamSoTu(b.tham_so)) };
}

/** Xác thực cho API REST /api/v1 — trả khóa hoặc câu lỗi */
export async function xacThucRest(q: Q, headers: { get(ten: string): string | null }, congCu: string): Promise<{ ok: true; khoa: KhoaAgent } | { ok: false; status: number; loi: string }> {
  const xt = await xacThucKhoa(q, khoaTuHeader(headers.get("authorization"), headers.get("x-api-key")));
  if (!xt.ok) return { ok: false, status: 401, loi: xt.ly_do };
  if (!duocDungCongCu(xt.khoa.cong_cu, congCu)) return { ok: false, status: 403, loi: `Khóa "${xt.khoa.ten}" không được gọi ${congCu}.` };
  return { ok: true, khoa: xt.khoa };
}
