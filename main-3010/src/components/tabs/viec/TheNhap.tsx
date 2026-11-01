"use client";

// ============================================================
// THẺ NHÁP GIAO VIỆC — một thẻ «máy / AI soạn sẵn, chưa gửi đi đâu cả»
//
// Tách khỏi ViecView 01/11/2026 (Mr. Đại: «đã có nháp sao không mở luôn tại chỗ bung ra mà phải chuyển tab»):
// MỘT thẻ dùng ở hai chỗ — khung «Agent AI đề xuất giao việc» của Việc của tôi, và bung tại chỗ trên thẻ issue ở
// màn Cảnh báo. Không vẽ bản thứ hai (luật 7): sửa thẻ ở đây là cả hai chỗ đổi theo.
// Thẻ không tự gọi mạng — nơi dùng truyền onGiao / onSua / onBo.
// ============================================================

import { useState, type CSSProperties } from "react";
import ONhapNgay from "@/components/common/ONhapNgay";
import { hanDaQua, maNhanTuGoiY, nguonViecCua, type NguoiNhanCV, type NhapHien } from "@/lib/chung/viec-cong-viec-kieu";
import { TEN_AGENT_HOI_TRUNG } from "@/lib/chung/hoi-trung-kieu";
import { LY_DO_CHAN } from "@/lib/quyen";
import { ngayTrongChu } from "@/lib/ngay-hien";
import { NUT, NUT_CHINH } from "./chung";
import { OChonNoiNhan } from "./OChonNoiNhan";

/** "dd/mm/yyyy" (LLM gợi ý) | "yyyy-mm-dd" → "dd/mm/yyyy" để hiện; rỗng → "" */
export function hanHien(han?: string | null): string {
  const s = (han ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

export function TheNhap({
  n,
  ds,
  loiDs,
  maNhan,
  onChonNhan,
  duocGhi,
  dang,
  onGiao,
  onSua,
  onBo,
  lop = "",
  style,
}: {
  n: NhapHien;
  ds: NguoiNhanCV | null;
  loiDs: string | null;
  /** Người / đơn vị đang chọn trên ô nhận (chưa chọn tay → người máy gợi ý) */
  maNhan: string;
  onChonNhan: (ma: string) => void;
  duocGhi: boolean;
  dang: boolean;
  /** `han` = hạn mới (ISO) người chọn ngay trên thẻ khi hạn cũ đã qua; không có = giữ hạn của nháp */
  onGiao: (han?: string) => void;
  onSua: () => void;
  onBo: () => void;
  /** Lớp thêm cho khung thẻ (đang sửa, đang tô viền…) */
  lop?: string;
  style?: CSSProperties;
}) {
  const goiY = maNhanTuGoiY(ds, n.giaoCho);
  const han = hanHien(n.han);
  const hanQua = hanDaQua(n.han);
  // 01/11/2026 (Mr. Đại duyệt): hạn đã qua → chọn hạn mới NGAY trên thẻ (ô dd/mm/yyyy cạnh ô người nhận), không phải mở Sửa.
  // Máy KHÔNG tự dời hạn (luật 40 — giá trị máy điền không được trông như người đã khai).
  const homNay = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  const [hanMoi, setHanMoi] = useState("");
  const conQuaHan = hanQua && !(hanMoi && hanMoi >= homNay);
  // Lý do nút Giao mờ — viết RA MÀN bằng chữ (điện thoại không rê chuột được để đọc title)
  const lyDoMo = !duocGhi
    ? LY_DO_CHAN.ghi
    : !maNhan && loiDs
      ? `Chưa giao được: ${loiDs}`
      : !maNhan && conQuaHan
        ? `Chưa giao được: chọn người nhận, và hạn ${han} đã qua — chọn hạn mới`
        : !maNhan
          ? "Chưa giao được: chọn người hoặc đơn vị nhận"
          : conQuaHan
            ? `Chưa giao được: hạn ${han} đã qua — chọn hạn mới`
            : "";
  const tenNhanCua = (ma: string) => ds?.don_vi.find((d) => d.id === ma)?.ten ?? ds?.nguoi.find((x) => x.id === ma)?.ten ?? "";
  const tenDuAnCua = (ma: string) => ds?.du_an?.find((d) => d.id === ma)?.ten ?? ma;
  return (
    <div className={`the-nhap flex flex-col${lop}`} style={style} data-gt="viec:the-nhap">
      {/* Một HÀNG như danh sách khu phải (Mr. Đại 09/10): khối chữ không chia cột, hàng cách nhau bằng gạch ngang hết bề rộng */}
      <div className="o-trinh-bay min-h-0 flex-1 overflow-y-auto text-[11.5px] leading-[17px] text-text-secondary">
        {n.hoiTrung?.muon && n.hoiTrung.trung ? (
          // Luật 33 — lượt hỏi ngầm sau khi soạn thấy trùng: GẮN CỜ, người xem rồi quyết Giao hay Bỏ (Q3 chốt 04/10)
          <div className="truncate text-[10.5px] font-bold text-yellow" title={n.hoiTrung.tomTat}>
            ⚠ Hỏi muộn thấy trùng — 🤖 {n.hoiTrung.tomTat}
          </div>
        ) : (
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
            {n.nguonSoan === "may" ? "Máy soạn sẵn từ issue" : "🤖 AI soạn sẵn"} — chưa gửi đi đâu cả
            {n.agent ? ` · agent ${TEN_AGENT_HOI_TRUNG[n.agent] ?? n.agent}` : ""}
          </div>
        )}
        <div className="ten-viec" title={n.ten}>
          <b>Tên việc:</b> {n.ten}
        </div>
        <div className="truncate">
          <b className="text-text">Giao cho:</b>{" "}
          {goiY ? <b className="text-text">{tenNhanCua(goiY)}</b> : <span className="text-text-muted">{n.nguonSoan === "may" ? "máy chưa biết ai" : "AI chưa chọn"} — chọn ở ô bên dưới</span>}
        </div>
        <div className="truncate">
          <b className="text-text">Hạn:</b> {han || "chưa có"}
          {hanQua && <b className="text-red"> — đã qua, bấm Sửa chọn hạn mới</b>} · <b className="text-text">Thuộc dự án:</b> {n.maDuAn ? tenDuAnCua(n.maDuAn) : "không thuộc dự án nào"}
        </div>
        <div title={ngayTrongChu(n.moTa)}>
          {/* Ngày ISO trong câu máy soạn ("trước 2026-10-10") → dd/mm/yyyy (E32 — kiểm độc lập 10/10) */}
          <b className="text-text">Kết quả cần có:</b> {ngayTrongChu(n.moTa) || "—"}
        </div>
        <div className="truncate text-text-muted" title={n.hoiTrung?.tomTat}>
          Nguồn:{" "}
          {nguonViecCua(n) === "cay-viec"
            ? `Cây việc & đường găng${n.tieuDeIssue ? ` — ${n.tieuDeIssue}` : ""}`
            : n.tuIssue
              ? `issue ${n.tuIssue}${n.tieuDeIssue ? ` ${n.tieuDeIssue}` : ""}`
              : "yêu cầu trong chat"}{" "}
          · soạn {new Date(n.luc).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          {/* Luật 33 — kết quả hỏi trùng trước khi soạn */}
          {n.vanSoan
            ? " · người chọn soạn riêng dù 🤖 AI báo trùng"
            : n.hoiTrung && !n.hoiTrung.muon
              ? n.hoiTrung.chuaHoiDuoc?.length
                ? ` · chưa hỏi được agent ${n.hoiTrung.chuaHoiDuoc.map((a) => TEN_AGENT_HOI_TRUNG[a] ?? a).join(", ")}`
                : " · đã hỏi các agent — không trùng"
              : ""}
        </div>
      </div>
      {/* Ngoài ô: chọn người nhận + 3 nút */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <OChonNoiNhan className="flex-1" ds={ds} loiDs={loiDs} value={maNhan} disabled={!duocGhi || dang} onChange={onChonNhan} />
        {hanQua && (
          <ONhapNgay
            value={hanMoi}
            onChange={setHanMoi}
            min={homNay}
            disabled={!duocGhi || dang}
            className="w-[108px] shrink-0"
          />
        )}
        <button
          type="button"
          className={NUT_CHINH}
          data-lenh="viec.gui-nhap"
          data-gia-tri={n.ten}
          disabled={lyDoMo !== "" || dang}
          title={lyDoMo || "Giao sang agent Công việc — thành việc thật bên đó"}
          onClick={() => onGiao(hanQua ? hanMoi : undefined)}
        >
          {dang ? "Đang giao…" : "Giao việc"}
        </button>
        <button
          type="button"
          className={NUT}
          data-lenh="viec.sua-nhap"
          data-gia-tri={n.ten}
          disabled={!duocGhi || dang}
          title={duocGhi ? `Mở ô giao việc, ${n.nguonSoan === "may" ? "máy" : "AI"} đã điền sẵn` : LY_DO_CHAN.ghi}
          onClick={onSua}
        >
          Sửa
        </button>
        <button
          type="button"
          className={NUT}
          data-lenh="viec.bo-nhap"
          data-gia-tri={n.ten}
          disabled={!duocGhi || dang}
          title={duocGhi ? (n.agent && n.agent !== "main" ? `Bỏ qua — agent ${TEN_AGENT_HOI_TRUNG[n.agent] ?? n.agent} ghi người bỏ, máy không soạn lại` : n.chung ? "Bỏ qua — máy không soạn lại việc cho issue này" : "Bỏ qua — xoá nháp này") : LY_DO_CHAN.ghi}
          onClick={onBo}
        >
          Bỏ qua
        </button>
      </div>
      {lyDoMo && duocGhi && <div className="mt-1 text-[11px] text-yellow">{lyDoMo}</div>}
    </div>
  );
}
