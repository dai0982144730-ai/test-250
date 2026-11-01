// ============================================================
// CHẶN TÀI KHOẢN NHÀ THẦU Ở MAIN (Mr. Đại chốt 18/10/2026) — chỉ máy chủ (đọc danh bạ agent từ tệp).
// Nhà thầu chỉ dùng agent Tiến độ + agent Nghiệm thu (quyen.ts AGENT_CHO_NHA_THAU). Ở Main: đăng nhập bị từ chối,
// phiên nhà thầu (đăng nhập ở Tiến độ / Nghiệm thu — cookie chung) mở trang Main thì thấy câu chặn + link sang hai agent kia.
// Địa chỉ lấy từ DANH BẠ AGENT như dãy link agent (lien-ket-agent.ts) — không gắn cứng cổng.
// ============================================================
import { docDanhBaAgent } from "@/lib/cai-dat-base";
import { timAgent, type KhaiAgent } from "@/lib/danh-ba-agent";
import { dungDayAgent, type LienKetAgent } from "@/lib/lien-ket-agent";
import { AGENT_CHO_NHA_THAU, CAU_CHAN_NHA_THAU } from "@/lib/quyen";

/** Link sang các agent nhà thầu được vào (địa chỉ null = chưa đưa lên hoạt động) */
export function lienKetChoNhaThau(hostTrang: string | null | undefined): LienKetAgent[] {
  let danhBa: KhaiAgent[] = [];
  try {
    danhBa = docDanhBaAgent();
  } catch {
    // đọc không được → link hiện «chưa đưa lên hoạt động»
  }
  return dungDayAgent((ma) => timAgent(danhBa, ma), hostTrang).filter((a) => AGENT_CHO_NHA_THAU.includes(a.ma));
}

/** Câu chặn một dòng kèm địa chỉ — cho câu báo ở màn đăng nhập */
export function cauChanNhaThau(hostTrang: string | null | undefined): string {
  const ds = lienKetChoNhaThau(hostTrang)
    .map((a) => `${a.ten}: ${a.diaChi ?? "chưa đưa lên hoạt động"}`)
    .join(" · ");
  return `${CAU_CHAN_NHA_THAU} Đăng nhập tại ${ds}.`;
}

const thoat = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Trang HTML gọn hiện thay trang Main khi phiên là nhà thầu */
export function trangChanNhaThau(hostTrang: string | null | undefined, ten: string): string {
  const link = lienKetChoNhaThau(hostTrang)
    .map((a) =>
      a.diaChi
        ? `<a href="${thoat(a.diaChi)}" style="display:inline-block;margin:4px 8px 4px 0;padding:8px 14px;border:1px solid #C2724F;border-radius:4px;color:#C2724F;font-weight:700;text-decoration:none">${thoat(a.ten)} →</a>`
        : `<span style="display:inline-block;margin:4px 8px 4px 0;color:#78716c">${thoat(a.ten)} — chưa đưa lên hoạt động</span>`,
    )
    .join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Main — tài khoản nhà thầu</title></head>
<body style="margin:0;background:#FAF9F7;font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:12vh auto;padding:0 16px">
<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#78716c;font-weight:700">Agent Main</div>
<h1 style="font-size:20px;margin:6px 0 10px">${thoat(ten)} — ${thoat(CAU_CHAN_NHA_THAU)}</h1>
<p style="font-size:14px;line-height:1.5;color:#44403c">Agent Main dành cho người của công ty. Mời mở một trong hai agent dưới đây.</p>
<div>${link}</div>
<button onclick="fetch('/api/auth/logout',{method:'POST'}).finally(()=>location.href='/login')" style="margin-top:18px;background:none;border:1px solid #d6d3d1;border-radius:4px;padding:6px 12px;font-size:13px;color:#44403c;cursor:pointer">Đăng xuất</button>
</div></body></html>`;
}
