"use client";
// Sửa THÔNG TIN một mẫu Word: tên, kỳ, đơn vị lập, nơi nhận mặc định, đang dùng; xoá mẫu chưa có báo cáo gửi theo.
// Mr. Đại chốt 01/10/2026: phần khai kỹ thuật cũ (ô nhập gắn mã, bảng sinh việc, mục bắt buộc, tải file mẫu thẳng) BỎ khỏi màn này —
// cấu trúc mẫu (chương / bảng / cột) chỉ khai qua nút "Cập nhật" (🤖 đọc → người duyệt → kiểm tra → lưu bản mới). Hai đường khai
// song song thì lệch nhau (luật 7), và với mẫu đã khai theo nghĩa, sửa ở đây còn bị máy âm thầm bỏ (quan-ly-mau.ts kiemTraDinhNghia).
import { useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import type { MauWord } from "@/lib/types";
import { NutChinh, NutPhu, ThongDiep, goiApi } from "@/components/gui/chung";

const o = "rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-accent";

export function SuaMau({
  mau,
  donVi,
  duocSua,
  soBaoCaoDaGui,
  onDaLuu,
  onDaXoa,
}: {
  mau: MauWord;
  donVi: { id: string; ten: string }[];
  duocSua: boolean;
  /** null = đang tải */
  soBaoCaoDaGui: number | null;
  onDaLuu: (m: MauWord, thongDiep: string) => void;
  onDaXoa: (thongDiep: string) => void;
}) {
  const [ten, setTen] = useState(mau.ten);
  const [donViLap, setDonViLap] = useState(mau.don_vi_lap ?? "");
  const [guiDen, setGuiDen] = useState(mau.gui_den_mac_dinh ?? "");
  const [loaiKy, setLoaiKy] = useState(mau.loai_ky);
  const [active, setActive] = useState(mau.active);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [hoiXoa, setHoiXoa] = useState(false);

  async function luu() {
    setDang(true);
    setLoi(null);
    try {
      const m = await goiApi<MauWord>(
        `/api/mau-word/${encodeURIComponent(mau.ma)}`,
        { ten, don_vi_lap: donViLap || null, gui_den_mac_dinh: guiDen || null, loai_ky: loaiKy, active },
        "PUT",
      );
      onDaLuu(m, `Đã lưu mẫu ${m.ten}${m.active ? "" : " — đang ngừng dùng, không ai nộp được báo cáo theo mẫu này"}.`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  async function xoa() {
    setDang(true);
    setLoi(null);
    try {
      const r = await goiApi<{ luat_tat: number; ban_nhap: number }>(`/api/mau-word/${encodeURIComponent(mau.ma)}`, undefined, "DELETE");
      onDaXoa(
        `Đã xoá mẫu "${mau.ten}".` +
          (r.ban_nhap ? ` ${r.ban_nhap} bản nháp theo mẫu này thành file thường.` : "") +
          (r.luat_tat ? ` Đã xử lý ${r.luat_tat} luật kiểm tra áp cho mẫu này.` : ""),
      );
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
      setHoiXoa(false);
    } finally {
      setDang(false);
    }
  }

  const khoa = !duocSua;
  return (
    <div className="space-y-4">
      {loi ? <ThongDiep loai="loi" onDong={() => setLoi(null)}>{loi}</ThongDiep> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-xs text-text-muted">
          Tên mẫu
          <input value={ten} onChange={(e) => setTen(e.target.value)} disabled={khoa} className={`mt-1 block w-full ${o}`} />
        </label>
        <label className="text-xs text-text-muted">
          Loại kỳ
          <select value={loaiKy} onChange={(e) => setLoaiKy(e.target.value as MauWord["loai_ky"])} disabled={khoa} className={`mt-1 block w-full ${o}`}>
            <option value="tuan">Tuần</option>
            <option value="thang">Tháng</option>
            <option value="quy">Quý</option>
            <option value="tu_do">Tự do</option>
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Đơn vị lập
          <select value={donViLap} onChange={(e) => setDonViLap(e.target.value)} disabled={khoa} className={`mt-1 block w-full ${o}`}>
            <option value="">Mẫu chung</option>
            {donVi.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          Nơi nhận mặc định (khi file không ghi dòng &quot;Gửi:&quot;)
          <select value={guiDen} onChange={(e) => setGuiDen(e.target.value)} disabled={khoa} className={`mt-1 block w-full ${o}`}>
            <option value="">Theo luồng báo cáo</option>
            {donVi.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </select>
        </label>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={khoa} /> Đang dùng
        <span className="text-xs text-text-muted">— bỏ tích là ngừng dùng: không ai nộp được báo cáo theo mẫu này, báo cáo cũ vẫn đọc được</span>
      </label>
      <p className="text-xs text-text-muted">
        Chương, bảng, cột của mẫu: dùng nút <b className="text-text-secondary">Cập nhật</b> ở danh sách mẫu (🤖 đọc file Word → bạn duyệt → máy kiểm tra → lưu bản mới).
      </p>

      {duocSua ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <NutChinh onClick={() => void luu()} disabled={dang}>{dang && !hoiXoa ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu</NutChinh>
          {/* Xoá chỉ HIỆN với mẫu chưa có báo cáo gửi theo (3004: không bấm được thì ẩn — luật 17 ngoại lệ) */}
          {soBaoCaoDaGui === 0 ? (
            hoiXoa ? (
              <>
                <span className="text-sm text-text">Xoá hẳn mẫu &quot;{mau.ten}&quot; và mọi bản file của nó? Không lấy lại được.</span>
                <NutPhu nguyHiem onClick={() => void xoa()} disabled={dang}>{dang ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Xoá hẳn</NutPhu>
                <NutPhu onClick={() => setHoiXoa(false)} disabled={dang}>Thôi</NutPhu>
              </>
            ) : (
              <NutPhu onClick={() => setHoiXoa(true)} disabled={dang} title="Mẫu chưa có báo cáo nào gửi theo nên xoá được">
                <Trash2 size={14} /> Xoá mẫu
              </NutPhu>
            )
          ) : soBaoCaoDaGui ? (
            <span className="text-xs text-text-muted">Đã có {soBaoCaoDaGui} báo cáo gửi theo mẫu này — không xoá được, chỉ ngừng dùng.</span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-text-muted">Chỉ người có quyền Quản lý mẫu báo cáo mới sửa được. Bạn vẫn xem và tải mẫu.</p>
      )}
    </div>
  );
}
