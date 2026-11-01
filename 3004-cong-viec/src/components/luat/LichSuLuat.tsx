"use client";
// Lịch sử phiên bản của MỘT luật: ai sửa, lúc nào, đổi gì so với bản trước; quay lại bản cũ (tạo phiên bản mới mang giá trị cũ).
import { useEffect, useState } from "react";
import { History, Loader2, Undo2 } from "lucide-react";
import type { LuatKiemTra } from "@/lib/luat/types";
import { HopThoai, Nut, ngayGio } from "@/components/layout/giao-dien";
import { quayLaiPhienBan, taiPhienBan, type PhienBanLuat } from "./api";
import { GhiChu, HuyHieuCach, HuyHieuMuc, NHAN_CACH, NHAN_MUC, tenApDung } from "./chung";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const giong = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function thayDoi(moi: LuatKiemTra, cu: LuatKiemTra | undefined): { nhan: string; tu?: string; sang?: string }[] {
  if (!cu) return [{ nhan: "Tạo luật" }];
  const ds: { nhan: string; tu?: string; sang?: string }[] = [];
  if (moi.bat !== cu.bat)
    ds.push({
      nhan: "Trạng thái",
      tu: cu.bat ? "Bật" : "Tắt",
      sang: moi.bat ? "Bật" : "Tắt",
    });
  if (moi.muc !== cu.muc)
    ds.push({
      nhan: "Mức",
      tu: NHAN_MUC[cu.muc].nhan,
      sang: NHAN_MUC[moi.muc].nhan,
    });
  if (moi.cach_kiem !== cu.cach_kiem)
    ds.push({
      nhan: "Cách kiểm",
      tu: NHAN_CACH[cu.cach_kiem].nhan,
      sang: NHAN_CACH[moi.cach_kiem].nhan,
    });
  if (moi.ten !== cu.ten) ds.push({ nhan: "Tên", tu: cu.ten, sang: moi.ten });
  if (moi.cau_luat !== cu.cau_luat) ds.push({ nhan: "Câu luật", tu: cu.cau_luat, sang: moi.cau_luat });
  if (!giong(moi.ap_dung, cu.ap_dung))
    ds.push({
      nhan: "Áp dụng",
      tu: tenApDung(cu.ap_dung),
      sang: tenApDung(moi.ap_dung),
    });
  if (moi.loai !== cu.loai || !giong(moi.tham_so, cu.tham_so)) ds.push({ nhan: "Dạng luật / tham số đã đổi" });
  if (moi.huong_dan_ai !== cu.huong_dan_ai) ds.push({ nhan: "Hướng dẫn cho AI đã đổi" });
  if (moi.khi_ai_loi !== cu.khi_ai_loi)
    ds.push({
      nhan: "Khi AI lỗi",
      tu: cu.khi_ai_loi === "chan" ? "Chặn" : "Cho gửi",
      sang: moi.khi_ai_loi === "chan" ? "Chặn" : "Cho gửi",
    });
  if ((moi.nhom ?? "") !== (cu.nhom ?? "")) ds.push({ nhan: "Nhóm", tu: cu.nhom ?? "—", sang: moi.nhom ?? "—" });
  return ds.length ? ds : [{ nhan: "Lưu lại, không đổi nội dung" }];
}

export function LichSuLuat({
  luat,
  suaDuoc,
  dong,
  sauKhiQuayLai,
}: {
  luat: LuatKiemTra;
  suaDuoc: boolean;
  dong: () => void;
  sauKhiQuayLai: (pb: number) => void;
}) {
  const [ds, setDs] = useState<PhienBanLuat[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState<number | null>(null);
  const [hoi, setHoi] = useState<number | null>(null);

  useEffect(() => {
    taiPhienBan(luat.id)
      .then(setDs)
      .catch((e) => setLoi(e instanceof Error ? e.message : "Không tải được lịch sử"));
  }, [luat.id, luat.phien_ban]);

  async function quayLai(pb: number) {
    setDang(pb);
    setLoi(null);
    try {
      await quayLaiPhienBan(luat.id, pb);
      sauKhiQuayLai(pb);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không quay lại được");
    } finally {
      setDang(null);
      setHoi(null);
    }
  }

  return (
    <HopThoai
      rong="max-w-[640px]"
      dong={dong}
      tieuDe={
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-accent" /> Lịch sử phiên bản · <span className="font-normal text-text-secondary">{luat.ten}</span>
        </span>
      }
      chan={<Nut onClick={dong}>Đóng</Nut>}
    >
      <KhaiHuongDan ma="luat-lich-su" uuTien={2} />
      {loi && (
        <GhiChu loai="loi" className="mb-3">
          {loi}
        </GhiChu>
      )}
      {!ds && !loi && (
        <p className="flex items-center gap-2 text-[12px] text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải lịch sử…
        </p>
      )}
      {ds?.length === 0 && <p className="text-[12px] text-text-muted">Luật chưa có phiên bản nào được ghi.</p>}
      {ds && ds.length > 0 && (
        <ol className="relative ml-2 border-l border-border pl-5">
          {ds.map((d, i) => {
            const dangDung = d.phien_ban === luat.phien_ban;
            const cu = ds[i + 1]?.gia_tri;
            return (
              <li key={d.phien_ban} className="relative pb-4 last:pb-0">
                <span
                  className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 ${dangDung ? "border-accent bg-accent" : "border-border bg-bg"}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-bold text-text">Phiên bản {d.phien_ban}</span>
                    {dangDung && <span className="text-[10px] font-bold uppercase tracking-wide text-green">Đang dùng</span>}
                    <HuyHieuCach cach={d.gia_tri.cach_kiem} nho />
                    <HuyHieuMuc muc={d.gia_tri.muc} nho />
                    {!d.gia_tri.bat && <span className="text-[10px] font-semibold uppercase text-text-muted">đã tắt</span>}
                  </div>
                  {suaDuoc &&
                    !dangDung &&
                    (hoi === d.phien_ban ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-[11px] text-text-secondary">Quay lại bản này?</span>
                        <Nut nho kieu="chinh" disabled={dang !== null} onClick={() => void quayLai(d.phien_ban)} autoFocus>
                          {dang === d.phien_ban ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Đồng ý
                        </Nut>
                        <Nut nho kieu="nhat" onClick={() => setHoi(null)}>
                          Thôi
                        </Nut>
                      </span>
                    ) : (
                      <Nut nho kieu="nhat" onClick={() => setHoi(d.phien_ban)}>
                        <Undo2 className="h-3 w-3" /> Quay lại bản này
                      </Nut>
                    ))}
                </div>
                <div className="text-[10.5px] text-text-muted">
                  {d.boi_ten ?? d.boi ?? "Hệ thống"} · {ngayGio(d.luc)}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {thayDoi(d.gia_tri, cu).map((t, j) => (
                    <li key={j} className="text-[11.5px] text-text-secondary">
                      <span className="text-text">{t.nhan}</span>
                      {t.tu !== undefined && (
                        <>
                          : <span className="text-text-muted line-through">{t.tu}</span> → <span className="text-accent">{t.sang}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-4 text-[10.5px] text-text-muted">
        Quay lại không xóa bản nào: hệ thống tạo phiên bản mới mang giá trị của bản cũ, mọi thay đổi đều vào lịch sử.
      </p>
    </HopThoai>
  );
}
