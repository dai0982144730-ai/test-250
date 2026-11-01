// ============================================================
// GIỜ VIỆT NAM — file THUẦN, dùng chung cho mọi việc chạy theo nhịp.
//
// 13/09: tách ra khỏi `lib/hen-gio/model.ts` (bộ hẹn giờ của Agent tiến độ đã
// dọn theo lệnh Mr. Đại), vì việc THẬT của Agent Base vẫn cần giờ VN:
//   • gán WBS ban đêm (lib/gan-wbs/gan-wbs.ts)
//   (con quan sát đêm đã tắt ở Base 22/09 — F09, vai đó của Main)
// ============================================================

/** Giờ VN hiện tại từ một mốc Date — trả {ngay ISO, gio "HH:MM", thu 0–6} */
export function gioVn(luc: Date): { ngay: string; gio: string; thu: number } {
  // Asia/Ho_Chi_Minh = UTC+7 cố định, không đổi giờ mùa
  const t = new Date(luc.getTime() + 7 * 3600000);
  return {
    ngay: t.toISOString().slice(0, 10),
    gio: t.toISOString().slice(11, 16),
    thu: t.getUTCDay(),
  };
}
