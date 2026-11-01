"use client";
// Dòng thời gian lịch sử của một đối tượng. Chủ: module thu-muc. Props là hợp đồng.
// Tự gọi /api/lich-su/doi-tuong. Dòng tải lên có nút mở đúng bản đó (kể cả bản cũ, tài liệu đã xóa khỏi thư mục).
import { useCallback, useEffect, useState } from "react";
import { Download, Eye, Loader2, RefreshCw } from "lucide-react";
import type { DongLichSu, LoaiDoiTuong } from "@/lib/types";
import { goiApi, ngayGio, nhanHanhDong, tomTatChiTiet } from "./tien-ich";
import { HopThoai } from "./HopThoai";
import { XemTruocTaiLieu } from "./XemTruocTaiLieu";
import { KiemTraToanVen } from "@/components/lich-su/KiemTraToanVen";

export interface DongThoiGianProps {
  doiTuongLoai: LoaiDoiTuong;
  doiTuongId: string;
  tieuDe?: string;
}

interface TenLichSu {
  nguoi: Record<string, string>;
  don_vi: Record<string, string>;
  doi_tuong: Record<string, string>;
}

const MAU_HANH_DONG: Record<string, string> = {
  xoa: "bg-red",
  tra_lai: "bg-yellow",
  cho_sua: "bg-yellow",
  qua_han: "bg-red",
  bi_de: "bg-yellow",
  khong_dung: "bg-yellow",
  khoi_phuc: "bg-green",
  hoan_thanh: "bg-green",
  cong_viec_hoan_thanh: "bg-green",
  ket_thuc_phan_viec: "bg-green",
  tai_len: "bg-blue",
  gui: "bg-accent",
  gui_lai: "bg-accent",
  gui_moi: "bg-accent",
  vao_so_cai: "bg-accent",
};

export function DongThoiGian({ doiTuongLoai, doiTuongId, tieuDe }: DongThoiGianProps) {
  const [dong, setDong] = useState<DongLichSu[] | null>(null);
  const [ten, setTen] = useState<TenLichSu>({ nguoi: {}, don_vi: {}, doi_tuong: {} });
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [moBan, setMoBan] = useState<{ tai_lieu_id: string; phien_ban?: number } | null>(null);
  const [moRong, setMoRong] = useState<number | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const j = await goiApi<{ dong: DongLichSu[]; ten: TenLichSu }>(
        `/api/lich-su/doi-tuong?loai=${encodeURIComponent(doiTuongLoai)}&id=${encodeURIComponent(doiTuongId)}`,
      );
      setDong(j.dong);
      setTen(j.ten);
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, [doiTuongLoai, doiTuongId]);

  useEffect(() => {
    void tai();
  }, [tai]);

  const tenDoiTuong = ten.doi_tuong[`${doiTuongLoai}:${doiTuongId}`];

  return (
    <div className="rounded border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-text">
          {tieuDe ?? `Dòng thời gian của ${tenDoiTuong ?? doiTuongId}`}
        </h3>
        <KiemTraToanVen nho />
        <button type="button" onClick={() => void tai()} className="rounded-sm p-1 text-text-muted hover:text-text" aria-label="Tải lại">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="px-4 py-3">
        {dangTai && !dong && (
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <Loader2 size={14} className="animate-spin" /> Đang đọc lịch sử…
          </div>
        )}
        {loi && <p className="text-[12.5px] text-red">{loi}</p>}
        {dong && dong.length === 0 && <p className="text-[12.5px] text-text-muted">Chưa có dòng lịch sử nào.</p>}
        {dong && dong.length > 0 && (
          <ol className="relative">
            {dong.map((d, i) => {
              const ct = d.chi_tiet ?? {};
              const nguoi = ten.nguoi[d.nguoi] ?? d.nguoi;
              const dv = d.don_vi_id ? ten.don_vi[d.don_vi_id] ?? d.don_vi_id : null;
              const taiLieuCuaDong =
                d.doi_tuong_loai === "tai_lieu" ? d.doi_tuong_id : typeof ct.tai_lieu_id === "string" ? ct.tai_lieu_id : null;
              const coBan = taiLieuCuaDong && d.hanh_dong !== "mo_xem" && d.hanh_dong !== "tai_ve" && (d.hanh_dong === "tai_len" || typeof ct.phien_ban === "number");
              const phienBan = typeof ct.phien_ban === "number" ? ct.phien_ban : undefined;
              const khac = d.doi_tuong_loai !== doiTuongLoai || d.doi_tuong_id !== doiTuongId;
              const tomTat = tomTatChiTiet(ct, ten);
              return (
                <li key={d.id} className="relative flex gap-3 pb-4 last:pb-0">
                  <div className="w-[92px] shrink-0 pt-0.5 text-right font-mono text-[11px] leading-tight text-text-muted">
                    <div className="text-text-secondary">{ngayGio(d.luc).slice(0, 10)}</div>
                    <div>{ngayGio(d.luc).slice(11)}</div>
                  </div>
                  <div className="relative flex w-3 shrink-0 justify-center">
                    <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${MAU_HANH_DONG[d.hanh_dong] ?? "bg-text-muted"}`} />
                    {i < dong.length - 1 && <span className="absolute bottom-[-6px] top-5 w-px bg-border" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-text">
                      <b className="font-semibold">{nguoi}</b>
                      {dv && <span className="text-text-muted"> · {dv}</span>}
                      <span className="text-text-secondary"> — {nhanHanhDong(d.hanh_dong)}</span>
                      {d.thay_cho && <span className="text-text-muted"> (nhập thay cho {ten.nguoi[d.thay_cho] ?? d.thay_cho})</span>}
                      {khac && (
                        <span className="ml-1 rounded-sm border border-border px-1 text-[10.5px] text-text-muted">
                          {ten.doi_tuong[`${d.doi_tuong_loai}:${d.doi_tuong_id}`] ?? d.doi_tuong_id}
                        </span>
                      )}
                    </div>
                    {tomTat && <div className="mt-0.5 text-[11.5px] text-text-secondary">{tomTat}</div>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-text-muted">
                      <button
                        type="button"
                        className="font-mono hover:text-text"
                        title={`Mã băm dòng: ${d.hash}\nDòng trước: ${d.hash_truoc ?? "(đầu chuỗi)"}`}
                        onClick={() => setMoRong(moRong === d.id ? null : d.id)}
                      >
                        #{d.id} · {d.hash.slice(0, 12)}…
                      </button>
                      {typeof ct.sha256 === "string" && (
                        <span className="font-mono" title={`SHA-256 của file: ${ct.sha256}`}>
                          file {ct.sha256.slice(0, 12)}…
                        </span>
                      )}
                      {coBan && (
                        <>
                          <button
                            type="button"
                            onClick={() => setMoBan({ tai_lieu_id: taiLieuCuaDong as string, phien_ban: phienBan })}
                            className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-text-secondary hover:text-text"
                          >
                            <Eye size={11} /> Mở {phienBan ? `bản ${phienBan}` : "tài liệu"}
                          </button>
                          <a
                            href={`/api/tai-lieu/${encodeURIComponent(taiLieuCuaDong as string)}/tep${phienBan ? `?phien_ban=${phienBan}` : ""}`}
                            className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-text-secondary hover:text-text"
                          >
                            <Download size={11} /> Tải về
                          </a>
                        </>
                      )}
                      {d.thiet_bi && <span className="truncate" title={d.thiet_bi}>{d.thiet_bi.split(" ")[0]}</span>}
                    </div>
                    {moRong === d.id && (
                      <pre className="mt-1 overflow-auto rounded-sm border border-border bg-bg p-2 font-mono text-[10.5px] text-text-secondary">
                        {JSON.stringify({ chi_tiet: ct, hash: d.hash, hash_truoc: d.hash_truoc, thiet_bi: d.thiet_bi }, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {moBan && (
        <HopThoai tieuDe={ten.doi_tuong[`tai_lieu:${moBan.tai_lieu_id}`] ?? "Xem tài liệu"} onDong={() => setMoBan(null)}>
          <XemTruocTaiLieu taiLieuId={moBan.tai_lieu_id} phienBan={moBan.phien_ban} choChonPhienBan />
        </HopThoai>
      )}
    </div>
  );
}
