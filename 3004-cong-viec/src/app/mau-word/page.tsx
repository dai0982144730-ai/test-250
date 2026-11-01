"use client";
// /mau-word — MẪU BÁO CÁO (đổi tên 22/10/2026 khi báo cáo chuyển sang nộp bằng Excel): mẫu Form 0–11. Người dùng tải tệp .xlsx
// ba tờ (Mẫu trắng · Hướng dẫn · Ví dụ đã điền) dựng từ file Word mẫu gốc + định nghĩa. Trước đây: 9 mẫu Form 0–8 có ô nhập gắn mã. Ai cũng xem và tải mẫu; quyền "mau.quan_ly" để tải lên phiên bản
// mẫu mới, sửa định nghĩa (ô bắt buộc, nơi nhận mặc định, bảng nào sinh việc), thêm mẫu mới (Form 9…) không sửa code.
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import type { DinhNghiaMau, MauWord } from "@/lib/types";
import { SuaMau } from "@/components/mau-word/SuaMau";
import { NutTaiMau } from "@/components/mau-word/NutTaiMau";
import { KhaiBaoMau, type CheDoKhaiBao } from "@/components/mau-word/KhaiBaoMau";
import { DongThoiGian } from "@/components/thu-muc/DongThoiGian";
import { Nhan, NutChinh, The, ThongDiep, goiApi, ngayGio } from "@/components/gui/chung";
import { KhungChia } from "@/components/layout/KhungChia";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface DuLieu {
  mau: (MauWord & { co_tep: boolean; co_vi_du?: boolean })[];
  don_vi: { id: string; ten: string; ten_ngan: string }[];
  duoc_sua: boolean;
  khung: DinhNghiaMau;
}

interface PhienBanTep {
  phien_ban: number;
  ten_tep: string;
  kich_thuoc: number;
  tai_len_boi: string;
  tai_len_luc: string;
}

const KY: Record<string, string> = { tuan: "Tuần", thang: "Tháng", quy: "Quý", tu_do: "Tự do" };

export default function TrangMauWord() {
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [pbTep, setPbTep] = useState<PhienBanTep[]>([]);
  const [soDaGui, setSoDaGui] = useState<number | null>(null);
  // Mẫu ngừng dùng gom vào một dòng co lại (Mr. Đại chốt 01/10)
  const [moNgung, setMoNgung] = useState(false);
  const [thong, setThong] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  // Khai báo mẫu không cần sửa code (Đợt D, 01/10/2026): đang cấu hình thì danh sách mẫu thu gọn (Mr. Đại 01/10)
  const [khaiBao, setKhaiBao] = useState<CheDoKhaiBao | null>(null);
  const [moDs, setMoDs] = useState(false);
  const [lan, setLan] = useState(0);

  const tai = useCallback(async () => {
    try {
      setDl(await goiApi<DuLieu>("/api/mau-word"));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);
  useEffect(() => {
    if (!chon) return;
    setSoDaGui(null);
    goiApi<{ phien_ban_tep: PhienBanTep[]; so_bao_cao_da_gui: number }>(`/api/mau-word/${encodeURIComponent(chon)}`)
      .then((r) => {
        setPbTep(r.phien_ban_tep);
        setSoDaGui(r.so_bao_cao_da_gui);
      })
      .catch(() => setPbTep([]));
  }, [chon, lan]);

  const tenDv = (id: string | null) => dl?.don_vi.find((d) => d.id === id)?.ten_ngan ?? (id ? id : "—");
  const mau = dl?.mau.find((m) => m.ma === chon) ?? null;

  const batKhaiBao = (c: CheDoKhaiBao) => {
    setKhaiBao(c);
    setChon(null);
    setMoDs(false);
    setThong(null);
  };

  const dongMau = (m: DuLieu["mau"][number]) => (
                  <tr key={m.ma} className={chon === m.ma ? "bg-bg" : ""}>
                    <td>
                      <div className="text-text">{m.ten}</div>
                      <div className="font-mono text-[11px] text-text-muted">{m.ma}</div>
                    </td>
                    <td>{tenDv(m.don_vi_lap)}</td>
                    <td>{tenDv(m.gui_den_mac_dinh)}</td>
                    <td>{KY[m.loai_ky] ?? m.loai_ky}</td>
                    <td className="num">
                      {m.dinh_nghia.o_nhap.length} <span className="text-text-muted">({m.dinh_nghia.o_nhap.filter((o) => o.bat_buoc).length} bắt buộc)</span>
                    </td>
                    {/* Tên chương thật của mẫu (có số) — máy nhận chương theo tên; bảng quyết định Form 0: TGĐ giao tay từng dòng */}
                    <td>
                      {m.dinh_nghia.bang_cong_viec.length
                        ? m.dinh_nghia.bang_cong_viec.map((b) => (
                            <div key={b.tag}>
                              {b.nhan}
                              {b.la_quyet_dinh ? <span className="text-text-muted"> · TGĐ giao tay</span> : null}
                            </div>
                          ))
                        : "—"}
                    </td>
                    <td className="num">
                      {m.phien_ban} {!m.active ? <Nhan mau="border-red text-red">ngừng dùng</Nhan> : null}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className="mr-2 inline-flex align-middle">
                        <NutTaiMau ma={m.ma} />
                      </span>
                      {dl?.duoc_sua ? (
                        <button type="button" onClick={() => batKhaiBao({ loai: "cap_nhat", ma: m.ma, ten: m.ten })} className="mr-2 inline-flex items-center gap-1 align-middle text-xs text-text-secondary hover:text-text" title="Tải file Word gốc mới (nguồn dựng tệp Excel) — 🤖 đọc, người duyệt, lưu bản mới">
                          <RefreshCw size={12} /> Cập nhật
                        </button>
                      ) : null}
                      <button type="button" onClick={() => { setChon(chon === m.ma ? null : m.ma); setKhaiBao(null); }} className="inline-flex items-center gap-1 align-middle text-xs text-text-secondary hover:text-text">
                        <Pencil size={12} /> {dl?.duoc_sua ? "Sửa" : "Xem"}
                      </button>
                    </td>
                  </tr>
                
  );

  return (
    <div className="mx-auto max-w-[1280px] p-6">
      <KhaiHuongDan ma="mau-word" uuTien={1} />
      {khaiBao && dl ? <KhaiHuongDan ma="mau-word-khai-bao" uuTien={2} /> : null}
      {mau && dl && !khaiBao ? <KhaiHuongDan ma="mau-word-sua" uuTien={2} /> : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Mẫu báo cáo</h1>
          <p className="text-sm text-text-secondary">
            Bấm «Tải mẫu» lấy tệp Excel của đơn vị: tờ «Mẫu trắng» để điền, tờ «Hướng dẫn», tờ «Ví dụ đã điền». Điền đúng tờ «Mẫu trắng» rồi nộp ở «Báo cáo».
          </p>
        </div>
        {dl?.duoc_sua ? (
          <NutChinh onClick={() => batKhaiBao({ loai: "moi" })} disabled={khaiBao?.loai === "moi"}>
            <Plus size={14} /> Thêm mẫu mới
          </NutChinh>
        ) : null}
      </div>
      {thong ? <div className="mb-3"><ThongDiep loai="ok" onDong={() => setThong(null)}>{thong}</ThongDiep></div> : null}
      {loi ? <div className="mb-3"><ThongDiep loai="loi" onDong={() => setLoi(null)}>{loi}</ThongDiep></div> : null}

      {khaiBao && dl ? (
        <div className="mb-4">
          <The tieuDe={khaiBao.loai === "moi" ? "Thêm mẫu mới" : `Cập nhật mẫu ${khaiBao.ten} · ${khaiBao.ma}`}>
            <KhaiBaoMau
              key={khaiBao.loai === "moi" ? "moi" : khaiBao.ma}
              cheDo={khaiBao}
              maGoiY={`form-${dl.mau.length}`}
              onThoi={() => setKhaiBao(null)}
              onXong={(tb) => {
                setKhaiBao(null);
                setThong(tb);
                setLan((x) => x + 1);
                void tai();
              }}
            />
          </The>
        </div>
      ) : null}

      {khaiBao && dl ? (
        <button type="button" onClick={() => setMoDs(!moDs)} className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text">
          {moDs ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Các mẫu hiện có ({dl.mau.length})
        </button>
      ) : null}
      {khaiBao && !moDs ? null : (
      <The>
        {!dl ? (
          <Loader2 className="animate-spin text-text-muted" size={16} />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="tbl" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Mẫu</th>
                  <th>Đơn vị lập</th>
                  <th>Gửi đến mặc định</th>
                  <th>Kỳ</th>
                  <th>Ô nhập</th>
                  <th>Bảng sinh việc</th>
                  <th>Phiên bản</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dl.mau.filter((m) => m.active).map(dongMau)}
                {dl.mau.some((m) => !m.active) ? (
                  <tr>
                    <td colSpan={8}>
                      <button type="button" onClick={() => setMoNgung(!moNgung)} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text">
                        {moNgung ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Mẫu ngừng dùng ({dl.mau.filter((m) => !m.active).length})
                      </button>
                    </td>
                  </tr>
                ) : null}
                {moNgung ? dl.mau.filter((m) => !m.active).map(dongMau) : null}
              </tbody>
            </table>
          </div>
        )}
      </The>
      )}

      {mau && dl && !khaiBao ? (
        <KhungChia khoa="mau-word" macDinh={66} tu={1024}
          trai={
<The tieuDe={`${mau.ten} · ${mau.ma}`}>
            <SuaMau
              key={`${mau.ma}-${mau.phien_ban}`}
              mau={mau}
              donVi={dl.don_vi}
              duocSua={dl.duoc_sua}
              soBaoCaoDaGui={soDaGui}
              onDaXoa={(tb) => {
                setChon(null);
                setThong(tb);
                void tai();
              }}
              onDaLuu={(_m, tb) => {
                setThong(tb);
                setLan((x) => x + 1);
                void tai();
              }}
            />
          </The>
          }
          phai={
<div className="space-y-4">
            <The tieuDe="Các phiên bản mẫu">
              {pbTep.length === 0 ? (
                <p className="text-sm text-text-muted">Mẫu này chưa có file Word gốc — tệp Excel dựng theo định nghĩa mẫu.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {pbTep.map((p) => (
                    <li key={p.phien_ban} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <a href={`/api/mau-word/${encodeURIComponent(mau.ma)}/tep?phien_ban=${p.phien_ban}`} className="truncate text-accent hover:underline" title="Tệp Excel dựng từ phiên bản này">
                          Bản {p.phien_ban} · tải Excel
                        </a>
                        {/* File Word gốc là nguồn dựng tệp Excel — chỉ người quản lý mẫu cần */}
                        {dl.duoc_sua ? (
                          <a href={`/api/mau-word/${encodeURIComponent(mau.ma)}/tep?phien_ban=${p.phien_ban}&word=1`} className="shrink-0 text-[11px] text-text-muted hover:text-text hover:underline">
                            Word gốc
                          </a>
                        ) : null}
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-text-muted">{ngayGio(p.tai_len_luc, true)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 border-t border-border pt-2 text-xs text-text-muted">Mỗi tệp tải về đã có sẵn tờ «Hướng dẫn» và tờ «Ví dụ đã điền».</p>
            </The>
            {/* Lịch sử mẫu chỉ người quản lý mẫu xem được (API trả 403 cho người khác) — không hiện lỗi đỏ cho người chỉ xem */}
            {dl.duoc_sua ? (
              <The tieuDe="Lịch sử mẫu">
                <DongThoiGian key={`${mau.ma}-${lan}`} doiTuongLoai="mau" doiTuongId={mau.ma} tieuDe={`Dòng thời gian của ${mau.ma}`} />
              </The>
            ) : null}
          </div>
          }
        />
      ) : null}
    </div>
  );
}
