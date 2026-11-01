"use client";
// Nhóm "Thông báo, email" — phần chạy thật: trạng thái gửi thư (SMTP / chế độ thử / chưa cấu hình), gửi thư thử tới tôi,
// hàng đợi thư chờ / lỗi (thử lại). Chỉ quản trị viên hoặc người có quyền cau_hinh.sua (API trả 403 thì ẩn cả khung).
import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw, Send } from "lucide-react";
import { HopLoi, LoiApi, Nut, goiApi, ngayGio } from "@/components/layout/giao-dien";
import { NHAN_LOAI_THONG_BAO } from "@/lib/cau-hinh/bieu-mau";

interface TrangThaiEmail {
  che_do: "smtp" | "thu" | "chua_cau_hinh";
  da_cau_hinh: boolean;
  mo_ta: string;
  thieu: string[];
  may_chu: string | null;
  cong: number;
  bao_mat: string;
  tai_khoan: string | null;
  co_mat_khau: boolean;
  nguoi_gui: string | null;
  thu_muc_thu: string | null;
}

interface DongHangDoi {
  id: number;
  den: string;
  loai: string;
  tieu_de: string;
  trang_thai: "cho" | "dang_gui" | "da_gui" | "loi";
  so_lan_thu: number;
  loi_cuoi: string | null;
  tao_luc: string;
  da_gui_luc: string | null;
}

const NHAN_TRANG_THAI: Record<DongHangDoi["trang_thai"], { nhan: string; lop: string }> = {
  cho: { nhan: "Chờ gửi", lop: "text-yellow" },
  dang_gui: { nhan: "Đang gửi", lop: "text-blue" },
  da_gui: { nhan: "Đã gửi", lop: "text-green" },
  loi: { nhan: "Lỗi", lop: "text-red" },
};

const NHAN_CHE_DO: Record<TrangThaiEmail["che_do"], { nhan: string; lop: string }> = {
  smtp: { nhan: "Đang gửi thật qua SMTP", lop: "border-green/40 text-green" },
  thu: { nhan: "Chế độ thử (không gửi thật)", lop: "border-yellow/40 text-yellow" },
  chua_cau_hinh: { nhan: "Chưa cấu hình email", lop: "border-red/40 text-red" },
};

/** phienBan: phiên bản nhóm thong_bao đang lưu — đổi thì tải lại trạng thái (vừa lưu SMTP xong thấy ngay). */
export function KhungEmail({ bao, daDoi, phienBan }: { bao: (chu: string, tot?: boolean) => void; daDoi: boolean; phienBan: number }) {
  const [tt, setTt] = useState<TrangThaiEmail | null>(null);
  const [thu, setThu] = useState<DongHangDoi[]>([]);
  const [dem, setDem] = useState<Record<string, number>>({});
  const [loc, setLoc] = useState<"chua_xong" | "loi" | "da_gui" | "">("chua_xong");
  const [an, setAn] = useState(false); // không có quyền → ẩn
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const r = await goiApi<{ thu: DongHangDoi[]; dem: Record<string, number>; trang_thai: TrangThaiEmail }>(
        `/api/email/hang-doi?gioi_han=100${loc === "loi" || loc === "da_gui" ? `&trang_thai=${loc}` : ""}`,
      );
      setTt(r.trang_thai);
      setThu(loc === "chua_xong" ? r.thu.filter((t) => t.trang_thai !== "da_gui") : r.thu);
      setDem(r.dem ?? {});
      setLoi(null);
    } catch (e) {
      if (e instanceof LoiApi && e.status === 403) setAn(true);
      else setLoi(e instanceof Error ? e.message : "Không tải được trạng thái email");
    }
  }, [loc]);
  useEffect(() => {
    void tai();
  }, [tai, phienBan]);

  async function guiThu() {
    setDang("thu");
    try {
      const r = await goiApi<{ ok: boolean; den: string; loi: string | null; thu_id: number | null }>("/api/email/thu", { body: {} });
      if (r.ok) bao(`Đã gửi thư thử tới ${r.den}${tt?.che_do === "thu" ? " (chế độ thử: thư ghi ra thư mục, không gửi thật)" : ""}`);
      else bao(`Không gửi được thư thử: ${r.loi ?? "lỗi không rõ"}`, false);
      await tai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không gửi được thư thử", false);
    } finally {
      setDang(null);
    }
  }

  async function thuLai(ids: number[] | "tat_ca_loi") {
    setDang(ids === "tat_ca_loi" ? "tat_ca" : `t${ids[0]}`);
    try {
      const r = await goiApi<{ da_dua_ve_hang_cho: number }>("/api/email/hang-doi", { body: { thu_lai: ids } });
      bao(`Đã đưa ${r.da_dua_ve_hang_cho} thư về hàng chờ — bộ gửi sẽ gửi lại ở lượt tới`);
      await tai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không thử lại được", false);
    } finally {
      setDang(null);
    }
  }

  async function guiNgay() {
    setDang("gui_ngay");
    try {
      await goiApi("/api/email/hang-doi", { body: { gui_ngay: true } });
      bao("Đã chạy bộ gửi một lượt");
      await tai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không chạy được bộ gửi", false);
    } finally {
      setDang(null);
    }
  }

  if (an) return null;
  const cd = tt ? NHAN_CHE_DO[tt.che_do] : null;

  return (
    <div className="mb-5 rounded border border-border bg-bg p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-text">
          <Mail className="h-4 w-4 text-accent" /> Gửi email
          {cd && <span className={`rounded-sm border px-1.5 py-0.5 text-[10.5px] font-semibold ${cd.lop}`}>{cd.nhan}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Nut nho kieu="nhat" onClick={() => void tai()} title="Tải lại">
            <RefreshCw className="h-3.5 w-3.5" />
          </Nut>
          <Nut nho disabled={dang !== null || !tt?.da_cau_hinh} onClick={() => void guiThu()} title={tt?.da_cau_hinh ? undefined : "Cấu hình máy chủ gửi thư trước"}>
            <Send className="h-3.5 w-3.5" /> {dang === "thu" ? "Đang gửi…" : "Gửi thư thử tới tôi"}
          </Nut>
        </div>
      </div>
      <HopLoi loi={loi} />
      {!tt && !loi && <p className="text-[11.5px] text-text-muted">Đang kiểm tra cấu hình gửi thư…</p>}
      {tt && (
        <div className="space-y-0.5 text-[11.5px] text-text-secondary">
          <div>{tt.mo_ta}</div>
          {tt.nguoi_gui && (
            <div>
              Người gửi: <span className="text-text">{tt.nguoi_gui}</span>
            </div>
          )}
          {tt.che_do === "smtp" && tt.tai_khoan && <div>Mật khẩu SMTP: {tt.co_mat_khau ? "đã đặt trong .env.local (SMTP_PASS)" : "CHƯA đặt — thêm SMTP_PASS vào .env.local"}</div>}
          {tt.thu_muc_thu && <div>Thư thử ghi vào: <code className="text-text">{tt.thu_muc_thu}</code></div>}
          {daDoi && <div className="text-yellow">Bạn đang có thay đổi chưa lưu — trạng thái trên là theo cấu hình đã lưu.</div>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-light pt-2.5">
        <span className="text-[11px] font-semibold text-text-secondary">Hàng đợi thư</span>
        <span className="text-[10.5px] text-text-muted">
          chờ {dem.cho ?? 0} · đang gửi {dem.dang_gui ?? 0} · lỗi <span className={dem.loi ? "font-bold text-red" : ""}>{dem.loi ?? 0}</span> · đã gửi {dem.da_gui ?? 0}
        </span>
        <select
          className="ml-auto rounded-sm border border-border bg-bg px-1.5 py-0.5 text-[11px] text-text-secondary outline-none focus:border-accent"
          value={loc}
          onChange={(e) => setLoc(e.target.value as typeof loc)}
        >
          <option value="chua_xong">Chờ và lỗi</option>
          <option value="loi">Chỉ thư lỗi</option>
          <option value="da_gui">Đã gửi</option>
          <option value="">Tất cả</option>
        </select>
        {(dem.loi ?? 0) > 0 && (
          <Nut nho disabled={dang !== null} onClick={() => void thuLai("tat_ca_loi")}>
            <RefreshCw className="h-3 w-3" /> Thử lại mọi thư lỗi
          </Nut>
        )}
        {(dem.cho ?? 0) > 0 && (
          <Nut nho disabled={dang !== null || !tt?.da_cau_hinh} onClick={() => void guiNgay()}>
            <Send className="h-3 w-3" /> {dang === "gui_ngay" ? "Đang gửi…" : "Gửi ngay"}
          </Nut>
        )}
      </div>
      {thu.length === 0 ? (
        <p className="mt-2 text-[11px] text-text-muted">Không có thư nào{loc === "chua_xong" ? " đang chờ hay bị lỗi" : ""}.</p>
      ) : (
        <div className="scroll-thin mt-2 max-h-[280px] overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Gửi đến · tiêu đề</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Lúc</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {thu.map((t) => (
                <tr key={t.id}>
                  <td className="max-w-[320px]">
                    <div className="truncate text-text">{t.den}</div>
                    <div className="truncate text-[10.5px] text-text-muted" title={t.tieu_de}>
                      {t.tieu_de}
                    </div>
                  </td>
                  <td className="text-[11px]">{t.loai === "thu" ? "Thư thử" : NHAN_LOAI_THONG_BAO[t.loai] ?? t.loai}</td>
                  <td>
                    <span className={`text-[11px] font-semibold ${NHAN_TRANG_THAI[t.trang_thai]?.lop ?? ""}`}>{NHAN_TRANG_THAI[t.trang_thai]?.nhan ?? t.trang_thai}</span>
                    {t.so_lan_thu > 0 && <span className="ml-1 text-[10px] text-text-muted">({t.so_lan_thu} lần)</span>}
                    {t.loi_cuoi && (
                      <div className="max-w-[260px] truncate text-[10.5px] text-red" title={t.loi_cuoi}>
                        {t.loi_cuoi}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-[11px]">{ngayGio(t.da_gui_luc ?? t.tao_luc)}</td>
                  <td className="text-right">
                    {t.trang_thai === "loi" && (
                      <Nut nho kieu="nhat" disabled={dang !== null} onClick={() => void thuLai([t.id])}>
                        Thử lại
                      </Nut>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
