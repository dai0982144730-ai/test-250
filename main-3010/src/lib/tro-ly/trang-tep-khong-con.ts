// ============================================================
// TRANG «TỆP KHÔNG CÒN» — link tải tệp Trợ lý làm trong chat (/api/tro-ly/xuat/tai) mà tệp đã tự xoá
//
// Vì sao là trang HTML chứ không phải JSON: khung chat vẽ link tải thành <a href> thường → người bấm được trình duyệt
// mở thẳng. Trước 17/10/2026 cửa này trả {"ok":false,"message":…} → người dùng thấy một trang mã trần (kiểm độc lập lần 7).
// Đo 17/10: câu "làm lại file" KHÔNG kích bộ xuất tệp (phatHienYDinhXuat cần chữ "xuất…" + loại tệp) → hướng dẫn gõ
// "xuất lại file Word" (đã đo: nhận ý định + ra docx).
// Hàm dựng trang không đụng đĩa, không đụng phiên đăng nhập.
// ============================================================

import { SO_NGAY_GIU_TEP_XUAT } from "./xuat-theo-yeu-cau";

const thoat = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Trang HTML tiếng Việt, mã 404 — dùng khi tra mã tải không ra tệp */
export function trangTepKhongCon(): Response {
  const tieuDe = `Tệp đã quá ${SO_NGAY_GIU_TEP_XUAT} ngày nên đã tự xoá`;
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${thoat(tieuDe)}</title>
<style>
  body { margin: 0; background: #FAF9F7; color: #1c1917; font: 15px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 560px; margin: 12vh auto 0; padding: 0 20px; }
  h1 { font-size: 19px; margin: 0 0 10px; }
  p { margin: 0 0 10px; }
  .phu { color: #78716c; font-size: 13px; }
  a { color: #C2724F; }
</style>
</head>
<body>
<main>
  <h1>${thoat(tieuDe)}</h1>
  <p>Tệp Trợ lý làm trong chat chỉ giữ ${SO_NGAY_GIU_TEP_XUAT} ngày kể từ lúc tạo, có tải hay chưa cũng tự xoá.</p>
  <p>Muốn có lại: mở lại phiên chat đó, gõ <strong>${thoat('"xuất lại file Word"')}</strong> (hoặc Excel, PDF… đúng loại tệp cần) để Trợ lý làm lại.</p>
  <p class="phu">Link sai mã cũng hiện trang này.</p>
  <p><a href="/">Về trang chính</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
