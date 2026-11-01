"use client";
// KIỂM SOÁT SỔ CÁI (Cài đặt → Riêng của agent → Rà soát sổ cái; trang Issue → tab "Thiếu trong sổ cái"):
// mọi báo cáo ĐÃ GỬI đã vào sổ cái đủ việc chưa, dòng nào thiếu và VÌ SAO. Mở ra là thấy kết quả lần rà soát gần nhất
// (hệ thống tự rà soát hằng ngày); "Rà soát ngay" đọc lại mọi báo cáo; "Bổ sung" ghi các dòng thiếu vào sổ cái.
// Mr. Đại chốt 29/09: CHỈ đối chiếu bằng máy — bỏ phần "AI đọc phần chữ tự do" (việc AI tìm ngoài bảng nay người nộp quyết
// ngay ở bước 4 lúc gửi; đo 4 ngày: 0/63 đề xuất được chọn, 150 tin báo lặp). Mở từ menu tên người → "Rà soát sổ cái".
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, SearchCheck } from "lucide-react";
import { HopLoi, Nut, goiApi, ngay, ngayGio } from "@/components/layout/giao-dien";
import type { KetQuaRaSoat } from "@/lib/so-cai/ra-soat";
import { moXemTep } from "@/components/dinh-kem/DinhKem";

const TEN_BANG: Record<string, string> = {
  bang_cong_viec: "Kết quả và kế hoạch việc",
  bang_ke_hoach: "Kế hoạch",
  bang_kien_nghi: "Kiến nghị",
  bang_su_co: "Sự cố",
  bang_canh_bao: "Cảnh báo hồ sơ",
  bang_gpmb: "GPMB",
  bang_tien_do_tk: "Tiến độ thiết kế",
  bang_an_toan: "An toàn — hành động",
};

const TEN_HANH_DONG: Record<string, string> = {
  tao_moi: "việc mới",
  de: "cập nhật việc cũ",
  khong_dung: "ghi vào việc cũ (bản không dùng)",
  dong_viec: "đóng việc",
  vao_so_xong: "vào sổ ở trạng thái đã xong (lần nạp đầu)",
};
const CACH_CHAY: Record<string, string> = { tu_dong: "tự động hằng ngày", bam_tay: "bấm tay", bo_sung: "sau khi bổ sung" };

export function RaSoatSoCai({ bao, sauKhi }: { bao: (c: string, tot?: boolean) => void; sauKhi?: (kq: KetQuaRaSoat) => void }) {
  const [kq, setKq] = useState<KetQuaRaSoat | null>(null);
  const [daNap, setDaNap] = useState(false);
  const [dang, setDang] = useState<"xem" | "ghi" | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  // Mr. Đại 02/10: "bấm rà soát ngay không thấy điều gì xảy ra" — kết quả giống lần trước thì màn không đổi. Bấm xong luôn
  // nói kết quả ngay cạnh nút (cả khi ổn: "ổn" cũng là thông tin).
  const [vuaXong, setVuaXong] = useState<{ chu: string; tot: boolean } | null>(null);

  useEffect(() => {
    goiApi<{ ket_qua: KetQuaRaSoat | null }>("/api/so-cai/ra-soat?moi_nhat=1")
      .then((r) => setKq(r.ket_qua))
      .catch((e) => setLoi(e instanceof Error ? e.message : "Không đọc được kết quả rà soát"))
      .finally(() => setDaNap(true));
  }, []);

  async function chay(ghi: boolean) {
    if (ghi && !window.confirm(`Bổ sung ${kq?.so_thieu ?? 0} việc thiếu vào sổ cái? Việc có vẻ trùng sẽ gộp vào việc giống nhất.`)) return;
    setDang(ghi ? "ghi" : "xem");
    setLoi(null);
    setVuaXong(null);
    const t0 = Date.now();
    try {
      const r = await goiApi<KetQuaRaSoat>("/api/so-cai/ra-soat", ghi ? { method: "POST" } : undefined);
      setKq(r);
      sauKhi?.(r);
      const thieu = r.tai_lieu.reduce((s, t) => s + t.thieu.filter((d) => !d.cong_viec_id).length, 0);
      const gio = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const giay = Math.max(1, Math.round((Date.now() - t0) / 1000));
      const chu = ghi
        ? `Đã bổ sung ${r.so_bo_sung} việc vào sổ cái (${gio}).`
        : `Đã rà soát xong lúc ${gio} (${giay} giây): đọc lại ${r.so_tai_lieu} báo cáo đã gửi, ${r.so_viec} dòng việc — ` +
          (thieu || r.so_loi_ghi_so
            ? `còn thiếu ${thieu} việc trong sổ cái${r.so_loi_ghi_so ? `, ${r.so_loi_ghi_so} lỗi ghi sổ` : ""} (xem danh sách bên dưới).`
            : "sổ cái đủ, không thiếu việc nào.");
      setVuaXong({ chu, tot: !thieu && !r.so_loi_ghi_so });
      bao(chu, !thieu && !r.so_loi_ghi_so);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không rà soát được");
    } finally {
      setDang(null);
    }
  }

  const daBoSung = kq?.cach_chay === "bo_sung";
  const conThieu = kq ? kq.tai_lieu.reduce((s, t) => s + t.thieu.filter((d) => !d.cong_viec_id).length, 0) : 0;
  const coThieu = kq?.tai_lieu.filter((t) => t.thieu.some((d) => !d.cong_viec_id || daBoSung) || t.loi) ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded border border-border bg-surface p-4 text-[12.5px] text-text-secondary">
        <p>
          Code đối chiếu <b>mọi báo cáo đã gửi</b> (gửi, gửi lại, file kèm khi chuyển tiếp — tải thẳng lên thư mục không tính) với sổ cái, từng dòng việc,
          bằng quy tắc lấy việc hiện tại (không dùng AI). Hệ thống tự rà soát <b>hằng ngày</b> (cùng giờ nhắc việc) và sau mỗi lần đổi
          quy tắc / cài đặt; còn thiếu thì tự bổ sung rồi báo quản trị — không thiếu thì không báo;
          sau mỗi lần gửi cũng tự đối chiếu, dòng vừa gửi mà sổ cái không ghi thì báo ngay.
        </p>
        <p className="mt-2">
          Lý do thiếu: <span className="text-yellow">quy tắc mới</span> — lúc gửi hệ thống chưa lấy việc ở dòng/bảng đó, nay đã lấy được (bấm Bổ sung);{" "}
          <span className="text-red">lỗi ghi sổ</span> — lúc gửi đã đọc được mà sổ cái không ghi, cần kiểm tra hệ thống.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Nut kieu="chinh" onClick={() => void chay(false)} disabled={!!dang}>
            {dang === "xem" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />} Rà soát ngay
          </Nut>
          {kq && conThieu > 0 && (
            <Nut onClick={() => void chay(true)} disabled={!!dang}>
              {dang === "ghi" && <Loader2 className="h-4 w-4 animate-spin" />} Bổ sung {conThieu} việc thiếu vào sổ cái
            </Nut>
          )}
          {dang === "xem" && <span className="text-[12px] text-text-muted">Đang đọc lại mọi báo cáo đã gửi…</span>}
          {kq?.luc && !dang && (
            <span className="text-[11.5px] text-text-muted">
              Lần rà soát gần nhất: {ngayGio(kq.luc)} ({CACH_CHAY[kq.cach_chay ?? ""] ?? kq.cach_chay})
            </span>
          )}
        </div>
        {vuaXong && (
          <div className={`mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold ${vuaXong.tot ? "text-green" : "text-yellow"}`}>
            {vuaXong.tot ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {vuaXong.chu}
          </div>
        )}
      </div>
      <HopLoi loi={loi} />
      {daNap && !kq && !loi && <div className="text-[12.5px] text-text-muted">Chưa rà soát lần nào — bấm "Rà soát ngay".</div>}
      {kq && (
        <div className="rounded border border-border bg-surface p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-text-secondary">
            <span>
              <b className="text-text">{kq.so_tai_lieu}</b> báo cáo đã gửi
            </span>
            <span>
              <b className="text-text">{kq.so_viec}</b> dòng việc
            </span>
            {daBoSung && (
              <span className="text-green">
                đã bổ sung <b>{kq.so_bo_sung}</b> việc
              </span>
            )}
            <span className={conThieu ? "text-yellow" : "text-green"}>
              còn thiếu trong sổ cái: <b>{conThieu}</b>
            </span>
            {kq.so_loi_ghi_so > 0 && (
              <span className="text-red">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                lỗi ghi sổ: <b>{kq.so_loi_ghi_so}</b>
              </span>
            )}
            {kq.so_cho_quyet_dinh > 0 && (
              <span>
                <b className="text-text">{kq.so_cho_quyet_dinh}</b> dòng Form 0 chờ TGĐ quyết định (vào sổ khi TGĐ giao việc)
              </span>
            )}
          </div>
          {!coThieu.length && (
            <div className="mt-3 flex items-center gap-2 text-[12.5px] text-green">
              <CheckCircle2 className="h-4 w-4" /> Sổ cái đã nhận đủ việc của mọi báo cáo đã gửi.
            </div>
          )}
          {coThieu.map((t) => (
            <div key={t.tai_lieu_id} className="mt-3 border-t border-border pt-3">
              <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
                <button
                  type="button"
                  onClick={() => moXemTep(t.tai_lieu_id, t.ten, "tai_lieu", t.thieu.map((d) => d.ten))}
                  className="text-left font-semibold text-text hover:underline"
                  title="Mở báo cáo — khung cam là các dòng còn thiếu trong sổ cái"
                >
                  {t.ten}
                </button>
                <span className="text-text-muted">
                  bản {t.phien_ban} · gửi {ngay(t.ngay_gui)} · {t.da_co}/{t.so_viec} việc đã vào sổ
                </span>
              </div>
              {t.loi && <div className="mt-1 text-[12px] text-red">Không đọc lại được: {t.loi}</div>}
              <ul className="mt-1 space-y-1">
                {t.thieu.map((d) => (
                  <li key={`${d.nguon_bang}:${d.dong_so}:${d.y_so ?? 1}`} className="text-[12px] text-text-secondary">
                    <span className="text-text-muted">
                      [{TEN_BANG[d.nguon_bang] ?? d.nguon_bang}, dòng {d.dong_so}]
                    </span>{" "}
                    {d.ten}
                    {!d.ket_thuc && <span className="ml-1 text-yellow">· chưa có hạn</span>}
                    {d.cong_viec_id ? (
                      <>
                        {" → "}
                        <Link href={`/so-do?viec=${d.cong_viec_id}`} className="font-mono text-accent hover:underline">
                          {d.cong_viec_id}
                        </Link>{" "}
                        <span className="text-text-muted">({TEN_HANH_DONG[d.hanh_dong ?? ""] ?? d.hanh_dong})</span>
                      </>
                    ) : (
                      <div className={`ml-4 text-[11.5px] ${d.ly_do === "loi_ghi_so" ? "text-red" : "text-yellow"}`}>
                        {d.ly_do === "loi_ghi_so" ? "Lỗi ghi sổ" : d.ly_do === "khong_ro" ? "Chưa rõ" : "Quy tắc mới"}: {d.giai_thich}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
