// MỘT DÒNG DẪN SANG AGENT QUAN SÁT — server component, cho các đường cũ
// (/nhat-ky, /quan-sat). Mr. Đại chốt 26/09/2026: nhật ký hỏi–đáp và sức khoẻ
// agent chỉ còn xem ở MỘT nơi — Agent quan sát. Địa chỉ đọc từ danh bạ agent.

import { Header } from "@/components/layout/Header";
import { CAU_DAN_QUAN_SAT, diaChiQuanSat } from "@/lib/dia-chi-quan-sat";

export function DanSangQuanSat() {
  const kq = diaChiQuanSat();
  return (
    <>
      <Header title="Agent quan sát" />
      <div className="p-5 text-[13px] text-text-secondary">
        {CAU_DAN_QUAN_SAT}
        {kq.ok ? (
          <>
            {" — "}
            <a href={kq.diaChi} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
              mở {kq.ten} ↗
            </a>{" "}
            <span className="text-text-muted">({kq.diaChi})</span>
          </>
        ) : (
          <> — chưa mở được: {kq.lyDo}</>
        )}
      </div>
    </>
  );
}
