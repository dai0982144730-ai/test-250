// ============================================================
// CỬA NỘI BỘ — request có đến từ chính máy này không (Host 127.0.0.1 /
// localhost / ::1). Thuần, không node:fs. Dùng cho /api/noi-bo/* (middleware
// bỏ qua nhánh này, route tự chặn).
// ============================================================

export function laMayNay(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  return host === "127.0.0.1" || host === "localhost" || host === "[::1]";
}
