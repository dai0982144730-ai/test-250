// ============================================================
// GIỜ VIỆT NAM — file THUẦN (luật 10), dùng chung cho nhịp báo cáo sáng,
// Cài đặt, luật động.
//
// ⭐ 24/09: tách ra từ `lib/hen-gio/model.ts` — bộ hẹn giờ đó là của Agent
// tiến độ (quét tối 20:00 · vòng đêm 21:00 · phân tích T2) chạy trên bản CHÉP
// dữ liệu tiến độ, đã gỡ khỏi Main theo chốt Mr. Đại 24/09. Chỉ phép đổi múi
// giờ này là Main dùng thật.
// ============================================================

/** Giờ VN từ một mốc Date — trả {ngay ISO, gio "HH:MM", thu 0–6} */
export function gioVn(luc: Date): { ngay: string; gio: string; thu: number } {
  // Asia/Ho_Chi_Minh = UTC+7 cố định, không đổi giờ mùa
  const t = new Date(luc.getTime() + 7 * 3600000);
  return {
    ngay: t.toISOString().slice(0, 10),
    gio: t.toISOString().slice(11, 16),
    thu: t.getUTCDay(),
  };
}
