"use client";
// Xem trước tài liệu (Word → HTML) + chọn phiên bản. Chủ: module thu-muc. Props là hợp đồng.
// Tự gọi /api/tai-lieu/[id] (danh sách phiên bản) và /api/tai-lieu/[id]/xem-truoc (nội dung, ghi lịch sử 'mo_xem').
// Mở được cả bản cũ lẫn tài liệu đã bị xóa khỏi thư mục (lịch sử giữ mãi).
import { useEffect, useState } from "react";
import { Download, FileWarning, Loader2, ShieldCheck } from "lucide-react";
import { goiApi, kichThuoc, ngayGio } from "./tien-ich";

export interface XemTruocTaiLieuProps {
  taiLieuId: string;
  phienBan?: number; // mặc định bản hiện tại
  choChonPhienBan?: boolean;
}

interface PhienBanTomTat {
  phien_ban: number;
  ten_tep: string;
  mime: string;
  kich_thuoc: number;
  sha256: string;
  tai_len_boi: string;
  tai_len_boi_ten: string;
  tai_len_luc: string;
}

interface ThongTin {
  tai_lieu: { id: string; ten: string; phien_ban_hien_tai: number };
  phien_ban: PhienBanTomTat[];
  vi_tri: { da_xoa: boolean }[];
}

interface BanXem {
  thong_tin: PhienBanTomTat;
  loai: "html" | "pdf" | "anh" | "chu" | "khong_ho_tro";
  html?: string;
  chu?: string;
  ghi_chu?: string;
  ban_pdf?: boolean;
}

const LOP_HTML =
  "max-w-none text-[13px] leading-relaxed text-text-secondary [&_h1]:mb-2 [&_h1]:text-[17px] [&_h1]:font-bold [&_h1]:text-text [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-text [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:text-text [&_p]:mb-2 [&_strong]:text-text [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_img]:max-w-full [&_a]:text-accent [&_a]:underline";

export function XemTruocTaiLieu({ taiLieuId, phienBan, choChonPhienBan }: XemTruocTaiLieuProps) {
  const [thongTin, setThongTin] = useState<ThongTin | null>(null);
  const [chon, setChon] = useState<number | undefined>(phienBan);
  const [ban, setBan] = useState<BanXem | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);

  useEffect(() => setChon(phienBan), [phienBan, taiLieuId]);

  useEffect(() => {
    if (!choChonPhienBan) return;
    let huy = false;
    goiApi<ThongTin>(`/api/tai-lieu/${encodeURIComponent(taiLieuId)}`)
      .then((j) => !huy && setThongTin(j))
      .catch(() => undefined);
    return () => {
      huy = true;
    };
  }, [taiLieuId, choChonPhienBan]);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi(null);
    const qs = chon ? `?phien_ban=${chon}` : "";
    goiApi<BanXem>(`/api/tai-lieu/${encodeURIComponent(taiLieuId)}/xem-truoc${qs}`)
      .then((j) => {
        if (!huy) setBan(j);
      })
      .catch((e: Error) => {
        if (!huy) {
          setBan(null);
          setLoi(e.message);
        }
      })
      .finally(() => !huy && setDangTai(false));
    return () => {
      huy = true;
    };
  }, [taiLieuId, chon]);

  const tt = ban?.thong_tin;
  const goc = `/api/tai-lieu/${encodeURIComponent(taiLieuId)}/tep?phien_ban=${tt?.phien_ban ?? ""}`;
  const hienTai = thongTin?.tai_lieu.phien_ban_hien_tai;
  const daXoaHet = thongTin ? thongTin.vi_tri.length > 0 && thongTin.vi_tri.every((v) => v.da_xoa) : false;

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-text">{tt?.ten_tep ?? thongTin?.tai_lieu.ten ?? "Đang mở…"}</div>
          {tt && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
              <span>
                Bản {tt.phien_ban}
                {hienTai && tt.phien_ban !== hienTai ? " (bản cũ)" : ""}
              </span>
              <span>{kichThuoc(tt.kich_thuoc)}</span>
              <span>
                {tt.tai_len_boi_ten || tt.tai_len_boi} · {ngayGio(tt.tai_len_luc)}
              </span>
              <span className="inline-flex items-center gap-1 font-mono" title={`SHA-256: ${tt.sha256}`}>
                <ShieldCheck size={12} className="text-green" />
                {tt.sha256.slice(0, 16)}…
              </span>
              {daXoaHet && <span className="text-yellow">Đã xóa khỏi thư mục · vẫn giữ trong lịch sử</span>}
            </div>
          )}
        </div>
        {tt && (
          <a href={goc} className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-[12px] text-text-secondary hover:text-text">
            <Download size={13} /> Tải về
          </a>
        )}
      </div>

      {choChonPhienBan && thongTin && thongTin.phien_ban.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
          {thongTin.phien_ban
            .slice()
            .reverse()
            .map((p) => {
              const dang = (tt?.phien_ban ?? hienTai) === p.phien_ban;
              return (
                <button
                  key={p.phien_ban}
                  type="button"
                  onClick={() => setChon(p.phien_ban)}
                  title={`${p.ten_tep} · ${p.tai_len_boi_ten} · ${ngayGio(p.tai_len_luc)}`}
                  className={`rounded-sm border px-2 py-0.5 text-[11.5px] ${
                    dang ? "border-accent text-accent" : "border-border text-text-secondary hover:text-text"
                  }`}
                >
                  Bản {p.phien_ban}
                  {p.phien_ban === hienTai ? " · hiện tại" : ""}
                  <span className="ml-1 text-text-muted">{ngayGio(p.tai_len_luc).slice(0, 5)}</span>
                </button>
              );
            })}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        {dangTai && (
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <Loader2 size={14} className="animate-spin" /> Đang dựng bản xem trước…
          </div>
        )}
        {!dangTai && loi && <p className="text-[12.5px] text-red">{loi}</p>}
        {!dangTai && ban?.loai === "html" && <div className={LOP_HTML} dangerouslySetInnerHTML={{ __html: ban.html ?? "" }} />}
        {!dangTai && ban?.loai === "pdf" && (
          <iframe
            src={ban.ban_pdf ? `${goc}&ban=pdf` : `${goc}&inline=1`}
            title={tt?.ten_tep}
            className="h-[70vh] w-full rounded-sm border border-border bg-white"
          />
        )}
        {!dangTai && ban?.loai === "anh" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${goc}&inline=1`} alt={tt?.ten_tep ?? ""} className="mx-auto max-h-[70vh] max-w-full object-contain" />
        )}
        {!dangTai && ban?.loai === "chu" && (
          <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-text-secondary">{ban.chu}</pre>
        )}
        {!dangTai && ban?.loai === "khong_ho_tro" && (
          <div className="flex items-start gap-2 text-[12.5px] text-yellow">
            <FileWarning size={16} className="mt-0.5 shrink-0" />
            <span>{ban.ghi_chu}</span>
          </div>
        )}
      </div>
      {!dangTai && ban?.ghi_chu && ban.loai !== "khong_ho_tro" && (
        <p className="border-t border-border px-3 py-1.5 text-[10.5px] text-text-muted">{ban.ghi_chu}</p>
      )}
    </div>
  );
}
