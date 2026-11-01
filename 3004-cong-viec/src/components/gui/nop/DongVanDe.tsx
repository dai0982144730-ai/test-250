"use client";
// ============================================================
// MỘT KIỂU DÒNG VẤN ĐỀ cho bước 2 (Sửa lỗi) và bước 3 (Soát nội dung) — Mr. Đại chốt 29/09/2026.
// VẤN ĐỀ: nội dung (chữ thường) + dòng xám nhỏ (mức · vị trí) | ĐỀ XUẤT: "nên sửa thành …" (sửa được trước khi duyệt)
// | DUYỆT: Đồng ý · Bỏ qua. Bỏ mọi ký hiệu trang trí (✨, chip AI / Gợi ý / CODE); 🤖 chỉ đứng trước chữ đề xuất do AI
// viết (luật 19, Mr. Đại chọn giữ đúng một chỗ này). CSS: phong.css khối "TRANG GỬI BÁO CÁO".
// ============================================================
import type { ReactNode } from "react";

export type MucVanDe = "chan" | "canh_bao" | "goi_y";
export const TEN_MUC: Record<MucVanDe, string> = { chan: "Chặn gửi", canh_bao: "Cảnh báo", goi_y: "Gợi ý" };

export function DauBangVanDe() {
  return (
    <div className="bvd-dau">
      <span>Vấn đề</span>
      <span>Đề xuất</span>
      <span className="text-right">Duyệt</span>
    </div>
  );
}

export function DongVanDe({
  noiDung,
  muc,
  phu,
  deXuat,
  duyet,
  daQuyet,
}: {
  noiDung: ReactNode;
  muc?: MucVanDe;
  /** vị trí / nguồn — chữ xám nhỏ sau mức */
  phu?: ReactNode;
  deXuat?: ReactNode;
  duyet?: ReactNode;
  /** đã đồng ý / bỏ qua / đã sửa: chữ nhạt đi */
  daQuyet?: boolean;
}) {
  return (
    <div className={`bvd-dong${daQuyet ? " da-quyet" : ""}`}>
      <div>
        <div className="nd">{noiDung}</div>
        {muc || phu ? (
          <div className="phu">
            {muc ? <span className={`m-${muc}`}>{TEN_MUC[muc]}</span> : null}
            {muc && phu ? " · " : null}
            {phu}
          </div>
        ) : null}
      </div>
      <div className="dx">{deXuat ?? <span className="text-text-muted">—</span>}</div>
      <div className="dy">{duyet ?? <span className="text-text-muted">—</span>}</div>
    </div>
  );
}

/** Ô đề xuất "nên sửa thành" — chữ sửa được trước khi duyệt. laAi: chữ do AI viết → 🤖 đứng trước. */
export function ODeXuat({
  cu,
  giaTri,
  onDoi,
  laAi,
  khoa,
  ghiChu,
}: {
  /** chữ đang có trong ô (không truyền = không biết) */
  cu?: string;
  giaTri: string;
  onDoi: (v: string) => void;
  laAi?: boolean;
  khoa?: boolean;
  /** dòng xám dưới ô (vd 🤖 vì sao) */
  ghiChu?: ReactNode;
}) {
  return (
    <>
      {cu !== undefined ? <div className="cu">Đang ghi: {cu.trim() || "(trống)"}</div> : null}
      <div className="cu">{laAi ? "🤖 Nên sửa thành:" : "Sửa thành:"}</div>
      <textarea
        rows={Math.min(5, Math.max(1, Math.ceil((giaTri.length || 1) / 55)))}
        value={giaTri}
        disabled={khoa}
        placeholder="Gõ chữ mới cho ô này…"
        onChange={(e) => onDoi(e.target.value)}
      />
      {ghiChu ? <div className="cu mt-1">{ghiChu}</div> : null}
    </>
  );
}

/** Nút Đồng ý / Bỏ qua của một dòng; đã quyết thì hiện chữ + "đổi". */
export function NutDuyet({
  quyet,
  onDongY,
  onBoQua,
  onDoi,
  choDongY = true,
  choBoQua = true,
  lyDoKhoa,
  dangGhi,
  nhanDongY = "Đồng ý",
}: {
  quyet?: "dong_y" | "bo_qua" | null;
  onDongY: () => void;
  onBoQua?: () => void;
  /** bỏ quyết định đã chọn */
  onDoi?: () => void;
  choDongY?: boolean;
  choBoQua?: boolean;
  lyDoKhoa?: string;
  dangGhi?: boolean;
  nhanDongY?: string;
}) {
  if (quyet)
    return (
      <>
        <span className={quyet === "dong_y" ? "ok" : "text-text-muted"}>{quyet === "dong_y" ? "Đã đồng ý" : "Đã bỏ qua"}</span>
        {onDoi ? (
          <button type="button" className="lk" onClick={onDoi}>
            đổi
          </button>
        ) : null}
      </>
    );
  return (
    <>
      <button type="button" className="nn chinh" disabled={!choDongY || dangGhi} title={!choDongY ? lyDoKhoa : undefined} onClick={onDongY}>
        {dangGhi ? "Đang ghi…" : nhanDongY}
      </button>
      {onBoQua && choBoQua ? (
        <button type="button" className="nn" disabled={dangGhi} onClick={onBoQua}>
          Bỏ qua
        </button>
      ) : null}
    </>
  );
}
