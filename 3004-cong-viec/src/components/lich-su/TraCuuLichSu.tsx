"use client";
// ============================================================
// Trang Lịch sử (kế hoạch v2, mục "Lịch sử"): tìm theo thời gian, người, đơn vị, loại đối tượng, hành động,
// từ khóa — lọc theo quyền lich_su.xem. Bấm một đối tượng → dòng thời gian đầy đủ; tài liệu thì mở được
// mọi phiên bản, kể cả bản đã bị xóa khỏi thư mục. Mỗi dòng có mã băm; nút "Kiểm tra toàn vẹn".
// ============================================================
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { HANH_DONG_LICH_SU, type DongLichSu, type LoaiDoiTuong } from "@/lib/types";
import { goiApi, ngayGio, nhanHanhDong, NHAN_LOAI_DOI_TUONG, tomTatChiTiet } from "@/components/thu-muc/tien-ich";
import { HopThoai } from "@/components/thu-muc/HopThoai";
import { DongThoiGian } from "@/components/thu-muc/DongThoiGian";
import { XemTruocTaiLieu } from "@/components/thu-muc/XemTruocTaiLieu";
import { KiemTraToanVen } from "./KiemTraToanVen";
import { KhungChia } from "@/components/layout/KhungChia";
import { DONG_MOT_TRANG, PhanTrang } from "@/components/layout/PhanTrang";
import ONhapNgay from "@/components/common/ONhapNgay";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface TenLichSu {
  nguoi: Record<string, string>;
  don_vi: Record<string, string>;
  doi_tuong: Record<string, string>;
}
interface DanhMuc {
  don_vi: { id: string; ten: string; ten_ngan: string }[];
  nguoi: { id: string; ten: string; don_vi_id: string | null }[];
  pham_vi: string | null;
  toi: { id: string; ten: string };
}

const KHOA_LOC = ["tu", "den", "nguoi", "don_vi_id", "doi_tuong_loai", "hanh_dong", "tu_khoa"] as const;
type Loc = Record<(typeof KHOA_LOC)[number], string>;
const LOC_TRONG: Loc = { tu: "", den: "", nguoi: "", don_vi_id: "", doi_tuong_loai: "", hanh_dong: "", tu_khoa: "" };

const NHAN_PHAM_VI: Record<string, string> = {
  cua_minh: "việc của mình và tài liệu, công việc của mình",
  don_vi: "đơn vị mình",
  don_vi_va_cap_duoi: "đơn vị mình và cấp dưới",
  toan_bo: "toàn bộ",
};

const NHOM_HANH_DONG: { ten: string; ma: string[] }[] = [
  { ten: "Tài liệu", ma: ["tai_len", "kiem_tra", "gui", "nhan", "mo_xem", "tai_ve", "xoa", "khoi_phuc", "chuyen_tiep", "chuyen_tiep_kem", "tra_lai", "gui_lai", "gui_moi", "hoan_thanh", "vao_so_van_ban_den"] },
  { ten: "Công việc", ma: ["vao_so_cai", "bi_de", "khong_dung", "giao_viec", "gia_han", "doi_nguoi", "phan_cong", "nhac_tu_bao_cao_tuan", "giao_tu_bao_cao_tuan", "them_phan_viec", "bot_phan_viec", "ket_thuc_phan_viec", "cong_viec_hoan_thanh", "dong_viec", "cho_sua", "qua_han", "tu_tinh_ngay"] },
];

const O = "rounded-sm border border-border bg-surface px-2 py-1 text-[12px] text-text outline-none focus:border-accent";

export function TraCuuLichSu() {
  const router = useRouter();
  const pathname = usePathname();
  const tham = useSearchParams();

  const docLocUrl = useCallback((): Loc => {
    const l = { ...LOC_TRONG };
    for (const k of KHOA_LOC) l[k] = tham.get(k) ?? "";
    return l;
  }, [tham]);

  const [loc, setLoc] = useState<Loc>(docLocUrl);
  const [dong, setDong] = useState<DongLichSu[] | null>(null);
  const [ten, setTen] = useState<TenLichSu>({ nguoi: {}, don_vi: {}, doi_tuong: {} });
  const [phamVi, setPhamVi] = useState<string | null>(null);
  const [danhMuc, setDanhMuc] = useState<DanhMuc | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTim, setDangTim] = useState(false);
  // Chia trang 30 dòng ở máy chủ (E40 — Mr. Đại 04/10). Trước 04/10 chỉ lấy 300 dòng mới nhất.
  const [trang, setTrang] = useState(1);
  const [tong, setTong] = useState(0);
  const [mo, setMo] = useState<{ loai: LoaiDoiTuong; id: string } | null>(
    tham.get("loai") && tham.get("id") ? { loai: tham.get("loai") as LoaiDoiTuong, id: tham.get("id") as string } : null,
  );

  useEffect(() => {
    goiApi<DanhMuc>("/api/lich-su/danh-muc")
      .then(setDanhMuc)
      .catch(() => undefined);
  }, []);

  const tim = useCallback(async (l: Loc, t = 1) => {
    setDangTim(true);
    setLoi(null);
    try {
      const qs = new URLSearchParams();
      for (const k of KHOA_LOC) if (l[k].trim()) qs.set(k, l[k].trim());
      if (t > 1) qs.set("trang", String(t));
      const j = await goiApi<{ dong: DongLichSu[]; tong: number; trang: number; ten: TenLichSu; pham_vi: string }>(`/api/lich-su?${qs.toString()}`);
      setDong(j.dong);
      setTong(j.tong);
      setTrang(j.trang);
      setTen(j.ten);
      setPhamVi(j.pham_vi);
    } catch (e) {
      setLoi((e as Error).message);
      setDong([]);
    } finally {
      setDangTim(false);
    }
  }, []);

  useEffect(() => {
    void tim(docLocUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ghiUrl = (l: Loc, m: { loai: string; id: string } | null) => {
    const qs = new URLSearchParams();
    // Lịch sử nằm trong Cài đặt (/cai-dat?tab=rieng&muc=lich-su): giữ tab/mục khi ghi bộ lọc lên URL
    for (const k of ["tab", "muc"]) if (tham.get(k)) qs.set(k, tham.get(k) as string);
    for (const k of KHOA_LOC) if (l[k].trim()) qs.set(k, l[k].trim());
    if (m) {
      qs.set("loai", m.loai);
      qs.set("id", m.id);
    }
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const bamTim = (l = loc) => {
    ghiUrl(l, mo);
    void tim(l);
  };

  const moDoiTuong = (m: { loai: LoaiDoiTuong; id: string } | null) => {
    setMo(m);
    ghiUrl(loc, m);
  };

  const coLoc = KHOA_LOC.some((k) => loc[k].trim());
  const tenMo = mo ? ten.doi_tuong[`${mo.loai}:${mo.id}`] ?? mo.id : "";

  const tenNguoiDs = useMemo(() => danhMuc?.nguoi ?? [], [danhMuc]);

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold text-text">Lịch sử</h1>
          <p className="mt-0.5 text-[12px] text-text-muted">
            Lưu tất cả: nội dung, quá trình xử lý tài liệu, quá trình công việc và các bản bị đè. Chỉ được ghi thêm, không ai sửa hay xóa được, kể cả
            quản trị viên.
            {phamVi && <span className="text-text-secondary"> Bạn đang xem: {NHAN_PHAM_VI[phamVi] ?? phamVi}.</span>}
          </p>
        </div>
        <KiemTraToanVen />
      </div>

      <form
        className="mb-3 flex flex-wrap items-end gap-2 rounded border border-border bg-surface p-3"
        onSubmit={(e) => {
          e.preventDefault();
          bamTim();
        }}
      >
        <label className="flex flex-col gap-1 text-[11px] text-text-muted">
          Từ ngày
          <ONhapNgay className={O} value={loc.tu} onChange={(x) => setLoc({ ...loc, tu: x })} aria-label="Từ ngày" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-muted">
          Đến ngày
          <ONhapNgay className={O} value={loc.den} onChange={(x) => setLoc({ ...loc, den: x })} aria-label="Đến ngày" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-muted">
          Người
          <input
            list="ds-nguoi-lich-su"
            className={`${O} w-44`}
            value={loc.nguoi}
            placeholder="Tên hoặc email"
            onChange={(e) => setLoc({ ...loc, nguoi: e.target.value })}
          />
          <datalist id="ds-nguoi-lich-su">
            {tenNguoiDs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.ten}
              </option>
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-muted">
          Đơn vị
          <select className={O} value={loc.don_vi_id} onChange={(e) => setLoc({ ...loc, don_vi_id: e.target.value })}>
            <option value="">Tất cả</option>
            {danhMuc?.don_vi.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten_ngan}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-muted">
          Loại
          <select className={O} value={loc.doi_tuong_loai} onChange={(e) => setLoc({ ...loc, doi_tuong_loai: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(NHAN_LOAI_DOI_TUONG).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-muted">
          Hành động
          <select className={`${O} max-w-[220px]`} value={loc.hanh_dong} onChange={(e) => setLoc({ ...loc, hanh_dong: e.target.value })}>
            <option value="">Tất cả</option>
            {NHOM_HANH_DONG.map((n) => (
              <optgroup key={n.ten} label={n.ten}>
                {n.ma.map((m) => (
                  <option key={m} value={m}>
                    {nhanHanhDong(m)}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Khác">
              {Array.from(new Set([...Object.keys(HANH_DONG_LICH_SU), "tao_thu_muc"]))
                .filter((m) => !NHOM_HANH_DONG.some((n) => n.ma.includes(m)))
                .map((m) => (
                  <option key={m} value={m}>
                    {nhanHanhDong(m)}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[11px] text-text-muted">
          Từ khóa
          <input
            className={O}
            value={loc.tu_khoa}
            placeholder="Tên tài liệu, mã việc, tên file, lý do…"
            onChange={(e) => setLoc({ ...loc, tu_khoa: e.target.value })}
          />
        </label>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-sm border border-accent px-3 py-1 text-[12.5px] text-accent hover:bg-bg">
          {dangTim ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Tìm
        </button>
        {coLoc && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-[12px] text-text-secondary hover:text-text"
            onClick={() => {
              setLoc(LOC_TRONG);
              bamTim(LOC_TRONG);
            }}
          >
            <X size={12} /> Bỏ lọc
          </button>
        )}
      </form>

      {loi && <p className="mb-2 text-[12.5px] text-red">{loi}</p>}
      {dong && (
        <div className="mb-1 text-[11.5px] text-text-muted">
          {tong.toLocaleString("vi-VN")} dòng, mới nhất trước
        </div>
      )}
      <div className="scroll-thin overflow-x-auto rounded border border-border bg-surface">
        <table className="tbl" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Lúc</th>
              <th>Người</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Chi tiết</th>
              <th>Mã băm</th>
            </tr>
          </thead>
          <tbody>
            {dong?.map((d) => {
              const tenDt = ten.doi_tuong[`${d.doi_tuong_loai}:${d.doi_tuong_id}`];
              return (
                <tr key={d.id}>
                  <td className="whitespace-nowrap font-mono text-[11.5px]">{ngayGio(d.luc)}</td>
                  <td>
                    <div className="text-text">{ten.nguoi[d.nguoi] ?? d.nguoi}</div>
                    <div className="text-[11px] text-text-muted">
                      {d.don_vi_id ? ten.don_vi[d.don_vi_id] ?? d.don_vi_id : ""}
                      {d.thay_cho ? ` · thay cho ${ten.nguoi[d.thay_cho] ?? d.thay_cho}` : ""}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{nhanHanhDong(d.hanh_dong)}</td>
                  <td>
                    <button
                      type="button"
                      className="max-w-[260px] truncate text-left text-text hover:text-accent"
                      title="Xem dòng thời gian đầy đủ"
                      onClick={() => moDoiTuong({ loai: d.doi_tuong_loai, id: d.doi_tuong_id })}
                    >
                      {tenDt ?? d.doi_tuong_id}
                    </button>
                    <div className="text-[10.5px] text-text-muted">{NHAN_LOAI_DOI_TUONG[d.doi_tuong_loai] ?? d.doi_tuong_loai}</div>
                  </td>
                  <td className="max-w-[320px] text-[11.5px]">{tomTatChiTiet(d.chi_tiet ?? {}, ten)}</td>
                  <td className="font-mono text-[10.5px] text-text-muted" title={`${d.hash}\ntrước: ${d.hash_truoc ?? "(đầu chuỗi)"}`}>
                    #{d.id} {d.hash.slice(0, 10)}…
                  </td>
                </tr>
              );
            })}
            {dong?.length === 0 && !loi && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-muted">
                  Không có dòng lịch sử nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Sang trang = hỏi máy chủ trang đó với đúng bộ lọc đang áp (bộ lọc đã gõ mà chưa bấm Tìm thì chưa tính) */}
      <PhanTrang trang={trang - 1} soTrang={Math.max(1, Math.ceil(tong / DONG_MOT_TRANG))} tong={tong} onDoi={(t) => void tim(docLocUrl(), t + 1)} />

      {mo && <KhaiHuongDan ma="ls-dong-thoi-gian" uuTien={2} />}
      {mo && (
        <HopThoai
          rong={mo.loai === "tai_lieu" ? "max-w-7xl" : "max-w-3xl"}
          tieuDe={`${NHAN_LOAI_DOI_TUONG[mo.loai] ?? mo.loai}: ${tenMo}`}
          onDong={() => moDoiTuong(null)}
          phai={
            mo.loai === "tai_lieu" || mo.loai === "cong_viec" ? (
              <a
                href={mo.loai === "tai_lieu" ? `/api/tai-lieu/${encodeURIComponent(mo.id)}/tep` : `/so-do?viec=${encodeURIComponent(mo.id)}`}
                className="inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-[12px] text-text-secondary hover:text-text"
              >
                <ExternalLink size={12} /> {mo.loai === "tai_lieu" ? "Tải tệp" : "Mở việc trên Sơ đồ"}
              </a>
            ) : null
          }
        >
          {mo.loai === "tai_lieu" ? (
            <KhungChia khoa="lich-su" macDinh={45} tu={1024}
              trai={
<DongThoiGian doiTuongLoai="tai_lieu" doiTuongId={mo.id} tieuDe={`Dòng thời gian của ${tenMo}`} />
              }
              phai={
<XemTruocTaiLieu taiLieuId={mo.id} choChonPhienBan />
              }
            />
          ) : (
            <DongThoiGian doiTuongLoai={mo.loai} doiTuongId={mo.id} tieuDe={`Dòng thời gian của ${tenMo}`} />
          )}
        </HopThoai>
      )}
    </div>
  );
}
