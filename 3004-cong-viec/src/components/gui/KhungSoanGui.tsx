"use client";
// ============================================================
// KhungSoanGui — NẠP FILE & GỬI BÁO CÁO, 5 bước nối tiếp có thanh tiến trình:
//   1 Nộp báo cáo → 2 Sửa lỗi (🤖 đề xuất, Đồng ý từng dòng rồi ghi file MỘT lần) → 3 Soát nội dung (luật AI + góp ý 🤖 đề xuất,
//   duyệt hết rồi ghi file MỘT lần, AI không soát lại) → 4 Duyệt vào kế hoạch (MỘT bảng, cả việc AI tìm ngoài bảng)
//   → 5 Kết thúc & lưu (1 đơn vị + 1 người nhận, Gửi).
// Thiết kế lại 29/09/2026 (Mr. Đại): rộng tối đa 1040px; bộ màu / chữ của cột phải Sơ đồ tổ chức (phong.css "TRANG GỬI
// BÁO CÁO"); bước 2 và 3 cùng MỘT kiểu dòng Vấn đề · Đề xuất · Duyệt (nop/DongVanDe); bỏ ký hiệu trang trí, 🤖 chỉ ở chữ
// đề xuất do AI viết; "có vẻ trùng" chỉ quyết ở cột Vào sổ cái bước 4. Mỗi lúc chỉ một lượt AI của một phiên bản.
// ============================================================
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DongCongViec, DuDoanDong, MauWord } from "@/lib/types";
import type { SuaMotCho } from "@/lib/kiem-tra/sua-vao-file";
import { mucDat, viTri, type KetQuaHienThi } from "@/components/kiem-tra/KetQuaKiemTra";
import { canChonBld, dongCanDuyet, type DuDoanHienThi, type QuyetDuyet } from "@/components/kiem-tra/BangCongViecKiemTra";
import { ChonNoiNhanGon, napNoiNhan, tenNoiNhan, type DanhSachNoiNhan } from "@/components/gui/ChonNoiNhan";
import { KhoiBuoc, ThanhTienTrinhNop, type BuocNop } from "@/components/gui/ThanhTienTrinhNop";
import { goiApi, goiForm, ngayGio } from "@/components/gui/chung";
import { BuocSuaLoi } from "@/components/kiem-tra/BuocSuaLoi";
import { chonMacDinh, type ChonViecAi } from "@/components/kiem-tra/ViecAiNgoaiBang";
import { Buoc3SoatNoiDung, type Quyet3, type TrangThaiGuiAi } from "@/components/gui/nop/Buoc3SoatNoiDung";
import { cachChon } from "./nop/chon-vao-so";
import { BangDuyetViec } from "@/components/gui/nop/BangDuyetViec";
import { DauBangVanDe, DongVanDe } from "@/components/gui/nop/DongVanDe";
import type { KetQuaAiLuu } from "@/lib/so-cai/ai-doc-bao-cao";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface KetQuaApi {
  tai_lieu_id: string | null;
  phien_ban: number | null;
  ten_tep: string;
  ket_qua: KetQuaHienThi & { cong_viec: DongCongViec[]; du_doan: DuDoanHienThi[]; mau: MauWord | null; don_vi_lap?: string | null };
  chua_gan_don_vi: string | null;
}

interface KetQuaGui {
  tai_lieu_id?: string;
  hanh_trinh_id: string;
  buoc_ids: string[];
  so_cai: DuDoanDong[];
}

interface Nhap {
  id: string;
  ten: string;
  mau_ma: string | null;
  tao_luc: string;
  dat: boolean | null;
  so_loi: number;
  so_canh_bao: number;
}

/** Trạng thái một bản nháp (Mr. Đại 01/10: bản nào cũng ghi rõ — danh sách chỉ có bản CHƯA gửi) */
function trangThaiNhap(n: Nhap): { chu: string; mau: string } {
  if (n.dat === false) return { chu: `Còn ${n.so_loi || ""} lỗi chặn — chưa gửi được`.replace("  ", " "), mau: "text-red" };
  if (n.dat === true) return { chu: n.so_canh_bao ? `Đã hết lỗi, còn ${n.so_canh_bao} cảnh báo — chưa gửi` : "Đã hết lỗi — chưa gửi", mau: "text-text-muted" };
  return { chu: "Chưa kiểm tra — chưa gửi", mau: "text-text-muted" };
}
const NHAP_MOI_TRANG = 15;

const BO_O = /^(mau_ma|noi_dung_\d+)$/;

function tomTatSoCai(sc: DuDoanDong[]): string {
  if (!sc.length) return "không có việc vào sổ cái";
  const dem = (h: string) => sc.filter((x) => x.hanh_dong === h).length;
  return [
    dem("tao_moi") && `${dem("tao_moi")} việc mới`,
    dem("de") && `${dem("de")} việc được cập nhật (bản cũ vào lịch sử)`,
    dem("khong_dung") && `${dem("khong_dung")} bản không được dùng`,
    dem("dong_viec") && `${dem("dong_viec")} việc đóng`,
    dem("vao_so_xong") && `${dem("vao_so_xong")} việc đã xong ghi vào sổ (lần nạp đầu)`,
    dem("goi_y_trung") && `${dem("goi_y_trung")} việc có vẻ trùng`,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Sau khi gửi: cột "Vào sổ cái" hiện kết quả thật (tạo mới / đè CV-… / không dùng) thay cho dự đoán. */
function ketQuaSoCai(sc: DuDoanDong[], duDoan: DuDoanHienThi[]): DuDoanHienThi[] {
  return sc.map((d) => ({ ...d, chi_so: duDoan.find((x) => x.dong === d.dong)?.chi_so ?? d.dong }));
}

/**
 * moRong / onMoRong: chỉ màn Thư mục cổ dùng (khung kiểm tra chiếm cả chỗ danh sách thư mục khi mở một file).
 */
export function KhungSoanGui({ onMoRong }: { moRong?: boolean; onMoRong?: (b: boolean) => void } = {}) {
  const moRongRef = useRef(onMoRong);
  moRongRef.current = onMoRong;
  const [ds, setDs] = useState<DanhSachNoiNhan | null>(null);
  const [kq, setKq] = useState<KetQuaApi | null>(null);
  const [tep, setTep] = useState<File | null>(null);
  const [den, setDen] = useState<string[]>([]);
  const [xacNhan, setXacNhan] = useState<Record<number, string>>({});
  const [dang, setDang] = useState<"" | "tai" | "gui" | "ghi3">("");
  const [loi, setLoi] = useState<string | null>(null);
  const [daGui, setDaGui] = useState<KetQuaGui | null>(null);
  const [nhap, setNhap] = useState<Nhap[]>([]);
  // Danh sách nháp mặc định THU GỌN, bung ra thì 15 bản một trang (Mr. Đại 01/10)
  const [moNhap, setMoNhap] = useState(false);
  const [trangNhap, setTrangNhap] = useState(0);
  const [ai, setAi] = useState<TrangThaiGuiAi>({ dangChoChan: false, chanKhongDat: [] });
  const [loiGui, setLoiGui] = useState<string | null>(null);
  const [lamMoiAi, setLamMoiAi] = useState(0);
  // Bước 4: 🤖 đọc việc (việc ngoài bảng, tên gợi ý, trùng theo nghĩa) — chỉ gợi ý, người gửi quyết
  const [ketQuaAi, setKetQuaAi] = useState<KetQuaAiLuu | null>(null);
  const goiYAi = ketQuaAi?.ket_qua?.goi_y ?? null;
  const viecAi = ketQuaAi?.ket_qua?.viec_them ?? [];
  const [chonAi, setChonAi] = useState<Record<number, ChonViecAi>>({});
  const [quyetAi, setQuyetAi] = useState<Record<number, QuyetDuyet>>({});
  const [dangAi, setDangAi] = useState(false);
  const [loiAiViec, setLoiAiViec] = useState<string | null>(null);
  const [doiTen, setDoiTen] = useState<Record<number, string>>({});
  const [duyet, setDuyet] = useState<Record<number, QuyetDuyet>>({});
  const [chonBld, setChonBld] = useState<Record<number, string>>({});
  // Bước 2: cảnh báo đã "Bỏ qua" · Bước 3: quyết định từng dòng — giữ qua các bản sửa của cùng tài liệu
  const [boQua, setBoQua] = useState<Set<string>>(new Set());
  const [quyet3, setQuyet3] = useState<Quyet3>({});
  const [aiXong3, setAiXong3] = useState(false);
  const [buoc3Xong, setBuoc3Xong] = useState(false);
  // Bung / co khối từng bước bằng tay — khoá theo "bước:trạng thái" nên đổi trạng thái là về mặc định (đang làm mở, xong co)
  const [moTay, setMoTay] = useState<Record<string, boolean>>({});
  const idDangMo = kq?.tai_lieu_id ?? null;
  useEffect(() => {
    setBoQua(new Set());
    setQuyet3({});
  }, [idDangMo]);
  const oTep = useRef<HTMLInputElement>(null);
  const oTepSua = useRef<HTMLInputElement>(null);

  const taiNhap = useCallback(() => {
    goiApi<{ tai_lieu: Nhap[] }>("/api/tai-lieu-gui/nhap")
      .then((r) => setNhap(r.tai_lieu))
      .catch(() => undefined);
  }, []);

  const nhanKetQua = useCallback((r: KetQuaApi) => {
    setKq(r);
    moRongRef.current?.(true);
    // Tối đa 1 đơn vị + 1 người (chốt 28/09): dòng "Gửi:" ghi nhiều nơi thì lấy nơi đầu
    setDen((r.ket_qua.gui_den ?? []).slice(0, 1));
    setAiXong3(false);
    setBuoc3Xong(false);
    setMoTay({});
    setXacNhan({});
    setKetQuaAi(null);
    setChonAi({});
    setQuyetAi({});
    setLoiAiViec(null);
    setDoiTen({});
    setDuyet({});
    setChonBld({});
    setDaGui(null);
    setAi({ dangChoChan: false, chanKhongDat: [] });
    setLoiGui(null);
  }, []);

  const moTaiLieu = useCallback(
    async (id: string) => {
      setDang("tai");
      setLoi(null);
      try {
        nhanKetQua(await goiApi<KetQuaApi>(`/api/kiem-tra?tai_lieu_id=${encodeURIComponent(id)}`));
        setTep(null);
      } catch (e) {
        setLoi(e instanceof Error ? e.message : String(e));
      } finally {
        setDang("");
      }
    },
    [nhanKetQua],
  );

  useEffect(() => {
    napNoiNhan().then(setDs).catch(() => undefined);
    taiNhap();
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("tai_lieu_id");
    if (id) void moTaiLieu(id);
    // "📤 Nộp báo cáo này" từ skill /lam-bao-cao (Mr. Đại chốt 01/10): nạp sẵn file Trợ lý vừa làm — như người tự chọn file
    const ma = sp.get("tu-chat");
    if (ma && /^[a-z0-9]{6,20}$/.test(ma)) {
      void (async () => {
        const r = await fetch(`/api/tro-ly/xuat/tai?ma=${ma}`);
        // 404 = tệp đã tự xoá sau 7 ngày (tải về cũng hỏng theo) — kiểm độc lập lần 7, 17/10/2026
        if (r.status === 404) return setLoi('Tệp Trợ lý làm đã quá 7 ngày nên đã xoá — gõ "làm lại file" trong phiên chat.');
        if (!r.ok) return setLoi(`Không lấy được file Trợ lý vừa làm (máy chủ báo lỗi ${r.status}) — tải lại trang để thử lại.`);
        const ten = decodeURIComponent((r.headers.get("Content-Disposition") ?? "").split("''")[1] ?? "bao-cao.xlsx");
        await taiLen(new File([await r.blob()], ten, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), false);
        window.history.replaceState(null, "", window.location.pathname); // tải lại trang không nạp trùng lần nữa
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taiNhap, moTaiLieu]);

  async function taiLen(f: File, laBanSua: boolean) {
    setDang("tai");
    setLoi(null);
    try {
      const fd = new FormData();
      fd.set("tep", f);
      if (laBanSua && kq?.tai_lieu_id) fd.set("tai_lieu_id", kq.tai_lieu_id);
      nhanKetQua(await goiForm<KetQuaApi>("/api/kiem-tra", fd));
      setTep(f);
      taiNhap();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang("");
    }
  }

  /** Bước 3: ghi các đề xuất đã đồng ý vào file MỘT lần → bản mới (kết quả soát chép sang, AI không soát lại). */
  async function ghiBuoc3(sua: SuaMotCho[], buoc3: { gop_y: string[]; luat: string[] }) {
    if (!kq?.tai_lieu_id) return;
    setDang("ghi3");
    setLoi(null);
    try {
      nhanKetQua(await goiApi<KetQuaApi>("/api/kiem-tra/sua-loi", { tai_lieu_id: kq.tai_lieu_id, sua, buoc3 }));
      taiNhap();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang("");
    }
  }

  async function gui() {
    if (!kq) return;
    setDang("gui");
    setLoi(null);
    setLoiGui(null);
    try {
      let r: KetQuaGui;
      if (!kq.tai_lieu_id) {
        // Người chưa gán đơn vị (cấu hình cho gửi với cấp thấp nhất): gửi thẳng file
        if (!tep) throw new Error("Chọn lại file để gửi");
        const fd = new FormData();
        fd.set("tep", tep);
        fd.set("den", JSON.stringify(den));
        fd.set("xac_nhan_trung", JSON.stringify(xacNhan));
        r = await goiForm<KetQuaGui>("/api/gui/tep", fd);
      } else {
        const chon = (i: number) => chonAi[i] ?? chonMacDinh(viecAi[i]);
        r = await goiApi<KetQuaGui>("/api/gui", {
          tai_lieu_id: kq.tai_lieu_id,
          den,
          xac_nhan_trung: xacNhan,
          doi_ten: doiTen,
          // Việc AI tìm ngoài bảng: Duyệt → vào sổ cái; Bỏ → đã xem, không phải việc
          them_viec: viecAi
            .map((v, i) => ({ v, c: chon(i), q: quyetAi[i] }))
            .filter((x) => x.q === "duyet")
            .map(({ v, c }) => ({ ten: c.ten.trim(), nguoi_lam: c.nguoi_lam.trim() || null, han: c.han || null, trich: v.trich, gop: c.gop || null })),
          bo_qua_ai: viecAi.filter((_, i) => quyetAi[i] !== "duyet").map((v) => v.trich),
          bo_viec: Object.entries(duyet)
            .filter(([, v]) => v === "bo")
            .map(([d]) => Number(d)),
          thay_bld: chonBld,
        });
      }
      setDaGui({ ...r, tai_lieu_id: r.tai_lieu_id ?? kq.tai_lieu_id ?? undefined });
      taiNhap();
    } catch (e) {
      setLoiGui(e instanceof Error ? e.message : String(e));
      setLamMoiAi((n) => n + 1);
    } finally {
      setDang("");
    }
  }

  const k = kq?.ket_qua;
  const chanNguoiMoi = kq?.chua_gan_don_vi === "chan_gui";
  // "Có vẻ trùng" quyết ở bước 4 (cột Vào sổ cái), không phải bỏ qua ở bước 2
  const canhBaoCon = k ? k.loi.filter((l) => l.muc === "canh_bao" && l.luat !== "viec_trung" && !boQua.has(l.thong_diep)).length : 0;
  const soChanCon = k ? k.loi.filter((l) => l.muc === "chan").length : 0;
  const canDuyet = k && kq?.tai_lieu_id && !daGui ? dongCanDuyet(k.du_doan ?? [], k.cong_viec, k.mau) : [];
  const chuaDuyetBang = canDuyet.filter((d) => !duyet[d]).length;
  const chuaDuyetAi = daGui ? 0 : viecAi.filter((_, i) => !quyetAi[i]).length;
  const chuaDuyet = chuaDuyetBang + chuaDuyetAi;
  const tongDuyet = canDuyet.length + (daGui ? 0 : viecAi.length);
  // Phải chọn trùng: cùng một hàm với ô Vào sổ cái của BangDuyetViec (gui/nop/chon-vao-so.ts) — máy thấy giống, AI nhận ra cùng
  // việc, dòng đã xong có việc đang mở để đóng; ứng viên 🤖 AI cho là khác việc thì không bắt chọn
  const canChonTrung = new Set(
    ((k?.du_doan ?? []) as DuDoanHienThi[])
      .filter((d) => !xacNhan[d.dong] && cachChon(d, k?.cong_viec[d.chi_so ?? d.dong], (goiYAi ?? []).find((g) => g.chi_so === (d.chi_so ?? d.dong))).macDinh === "")
      .map((d) => d.dong),
  );
  const canBld = new Set(((k?.du_doan ?? []) as DuDoanHienThi[]).filter((d) => canChonBld(k?.cong_viec[d.chi_so ?? d.dong]) && !chonBld[d.dong]).map((d) => d.dong));
  const duyetDuocHet = canDuyet.filter((d) => !duyet[d] && !canChonTrung.has(d) && !canBld.has(d));
  const aiChuaQuyet = viecAi.map((_, i) => i).filter((i) => !quyetAi[i]);
  // "tuần 40 · P.CĐ" — dòng nguồn của việc ở bước 4 (giống ô việc cột phải Sơ đồ)
  const nhanNguon = [
    k?.ky_bao_cao?.so ? `${k.ky_bao_cao.loai === "thang" ? "tháng" : k.ky_bao_cao.loai === "quy" ? "quý" : "tuần"} ${k.ky_bao_cao.so}` : "",
    (ds?.don_vi ?? []).find((d) => d.id === k?.don_vi_lap)?.ten_ngan ?? "",
  ]
    .filter(Boolean)
    .join(" · ") || "này";
  const lanhDao = (ds?.don_vi ?? []).filter((d) => d.loai === "chuc_danh").map((d) => ({ id: d.id, ten: d.ten_ngan }));
  const tenDen = den.map((d) => tenNoiNhan(ds, d));
  const macDinh = k?.gui_den?.length ? k.gui_den : (ds?.theo_luong ?? []);

  const coLoi = !!k && k.loi.some((l) => l.muc === "chan" || (l.muc === "canh_bao" && l.luat !== "viec_trung"));
  const coKhungSua = !!k && coLoi && !daGui && !!kq?.tai_lieu_id && !!kq?.phien_ban && /\.(docx|xlsx)$/i.test(kq.ten_tep);

  // ---------- 5 bước nối tiếp ----------
  const soChan = k ? k.loi.filter((l) => l.muc === "chan").length : 0;
  const conLoi = !!k && (!k.dat || canhBaoCon > 0);
  const coLuatAi = !!(kq?.tai_lieu_id && kq.phien_ban && (k?.mau || k?.tu_do));
  const coGopY = !!(k?.mau && kq?.tai_lieu_id && kq.phien_ban);
  const coAiDoc = !!(k?.mau && kq?.tai_lieu_id && kq.phien_ban);
  const toiBuoc3 = !!k && (!conLoi || !!daGui);
  const soatXong = !!daGui || (toiBuoc3 && (!(coLuatAi || coGopY) || buoc3Xong) && ai.chanKhongDat.length === 0);
  const aiDocXong = !!daGui || !coAiDoc || (!dangAi && (!!ketQuaAi || !!loiAiViec));
  const duyetXong = !!daGui || (soatXong && aiDocXong && chuaDuyet === 0);
  const khoaDuyet = daGui
    ? null
    : !toiBuoc3
      ? "Duyệt ở bước 4 — sửa xong lỗi ở bước 2 trước"
      : !soatXong
        ? "Duyệt ở bước 4 — quyết xong bước 3 (soát nội dung) trước"
        : !aiDocXong
          ? "🤖 đang đọc việc trong báo cáo — chờ gợi ý rồi duyệt"
          : null;
  const buoc: BuocNop[] = [
    { ten: "Nộp báo cáo", toi: "buoc-1", trang_thai: kq ? "xong" : "dang", phu: kq ? (kq.phien_ban ? `bản ${kq.phien_ban}` : kq.ten_tep) : "thả tệp Excel vào đây" },
    {
      ten: "Sửa lỗi",
      toi: "buoc-2",
      trang_thai: !k ? "cho" : conLoi && !daGui ? "dang" : "xong",
      phu: !k ? "máy kiểm từng ô" : conLoi && !daGui ? [soChan && `${soChan} chặn gửi`, canhBaoCon && `${canhBaoCon} cảnh báo`].filter(Boolean).join(" · ") : coLoi ? "đã xử lý hết" : "không có lỗi",
      goiY: "Lỗi chặn gửi phải sửa; cảnh báo sửa hoặc bỏ qua",
    },
    {
      ten: "Soát nội dung",
      toi: "buoc-3",
      trang_thai: !toiBuoc3 ? "cho" : soatXong ? "xong" : "dang",
      phu: !toiBuoc3
        ? "chờ hết lỗi"
        : soatXong
          ? coLuatAi || coGopY
            ? "đã soát"
            : "không có luật AI"
          : !aiXong3
            ? "AI đang soát…"
            : ai.chanKhongDat.length
              ? "luật chặn gửi chưa đạt"
              : "chờ bạn duyệt",
      goiY: "Luật của đơn vị + góp ý nội dung, chạy trên bản đã hết lỗi",
    },
    {
      ten: "Duyệt vào kế hoạch",
      toi: "buoc-4",
      trang_thai: !soatXong ? "cho" : duyetXong ? "xong" : "dang",
      phu: !soatXong ? "chờ soát xong" : !aiDocXong ? "AI đang đọc việc…" : tongDuyet ? `đã quyết ${tongDuyet - chuaDuyet}/${tongDuyet}` : "không có việc cần duyệt",
      goiY: "Duyệt / Bỏ từng việc sắp vào sổ cái",
    },
    {
      ten: "Kết thúc & lưu",
      toi: "buoc-5",
      trang_thai: daGui ? "xong" : duyetXong ? "dang" : "cho",
      phu: daGui ? "đã gửi" : duyetXong ? "chọn nơi nhận rồi Gửi" : "chờ duyệt xong",
      goiY: "Chọn 1 đơn vị nhận và/hoặc 1 người, bấm Gửi",
    },
  ];
  const moBuoc = (i: number) => moTay[`${i}:${buoc[i].trang_thai}`] ?? (buoc[i].trang_thai === "dang" || (i === 4 && !!daGui));

  const coTheGui =
    !!k?.dat &&
    canhBaoCon === 0 &&
    chuaDuyet === 0 &&
    duyetXong &&
    den.length > 0 &&
    !chanNguoiMoi &&
    !daGui &&
    !ai.dangChoChan &&
    ai.chanKhongDat.length === 0 &&
    (!!kq?.tai_lieu_id || kq?.chua_gan_don_vi === "cho_gui_cap_thap_nhat");
  // Một câu lý do duy nhất cho nút Gửi đang khóa
  const lyDoKhoaGui = !k
    ? null
    : !k.dat
      ? "Còn lỗi chặn gửi — sửa ở bước 2."
      : canhBaoCon > 0
        ? `Còn ${canhBaoCon} cảnh báo chưa sửa / chưa bỏ qua ở bước 2.`
        : ai.chanKhongDat.length
          ? `Luật ${ai.chanKhongDat.map((t) => `“${t}”`).join(", ")} chưa đạt — sửa ở bước 3.`
          : !soatXong
            ? "Chờ bước 3 soát nội dung xong."
            : !aiDocXong
              ? "Chờ AI đọc việc ở bước 4."
              : chuaDuyet > 0
                ? `Còn ${chuaDuyet} việc chưa Duyệt / Bỏ ở bước 4.`
                : den.length === 0
                  ? "Chọn nơi nhận."
                  : null;

  // ---------- 🤖 đọc việc (bước 4): chỉ bắt đầu khi bước 3 xong trên chính phiên bản này ----------
  async function raSoatAi() {
    if (!kq?.tai_lieu_id) return;
    setDangAi(true);
    setLoiAiViec(null);
    try {
      const r = await goiApi<{ ket_qua_ai: KetQuaAiLuu }>("/api/kiem-tra/ai-viec", { tai_lieu_id: kq.tai_lieu_id, phien_ban: kq.phien_ban });
      setKetQuaAi(r.ket_qua_ai);
      setChonAi({});
      setQuyetAi({});
      if (r.ket_qua_ai.loi) setLoiAiViec(`AI chưa đọc được báo cáo: ${r.ket_qua_ai.loi} (không ảnh hưởng việc gửi)`);
    } catch (e) {
      setLoiAiViec(e instanceof Error ? e.message : String(e));
    } finally {
      setDangAi(false);
    }
  }
  const khoaAi = soatXong && kq?.tai_lieu_id && kq.phien_ban && kq.ket_qua.mau ? `${kq.tai_lieu_id}:${kq.phien_ban}` : "";
  useEffect(() => {
    if (!khoaAi || daGui) return;
    const [id, pb] = khoaAi.split(":");
    let huy = false;
    goiApi<{ ket_qua_ai: KetQuaAiLuu | null }>(`/api/kiem-tra/ai-viec?tai_lieu_id=${encodeURIComponent(id)}&phien_ban=${pb}`)
      .then((r) => {
        if (huy) return;
        if (r.ket_qua_ai) {
          setKetQuaAi(r.ket_qua_ai);
          if (r.ket_qua_ai.loi) setLoiAiViec(`AI chưa đọc được báo cáo: ${r.ket_qua_ai.loi} (không ảnh hưởng việc gửi)`);
        } else void raSoatAi();
      })
      .catch(() => undefined);
    return () => {
      huy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoaAi]);

  // ---------- Nội dung từng bước ----------
  const phaiBuoc1 = kq ? (
    <>
      <span className="max-w-[360px] truncate">{kq.ten_tep}</span>
      <button
        type="button"
        className="lk"
        onClick={() => {
          setKq(null);
          setTep(null);
          setDaGui(null);
          moRongRef.current?.(false);
        }}
      >
        Tài liệu khác
      </button>
    </>
  ) : null;

  const loiTheoTag = new Map<string, "chan" | "canh_bao">();
  for (const l of k?.loi ?? []) if (l.vi_tri?.tag && !l.vi_tri.bang && (l.muc === "chan" || l.muc === "canh_bao")) loiTheoTag.set(l.vi_tri.tag, loiTheoTag.get(l.vi_tri.tag) === "chan" ? "chan" : l.muc);
  const noiDungBuoc1 = k?.mau ? (
    <div className="o-nhap">
      {k.mau.dinh_nghia.o_nhap
        .filter((o) => !BO_O.test(o.tag))
        .map((o) => {
          const v = k.o_nhap[o.tag];
          const mat = !(o.tag in k.o_nhap);
          const l = loiTheoTag.get(o.tag);
          return (
            <div key={o.tag} className="min-w-0">
              <div className="nhan">
                {o.nhan}
                {o.bat_buoc ? <span className="text-red"> *</span> : null}
              </div>
              <div className={`gt${l === "chan" ? " loi" : mat || !v?.trim() ? " trong" : ""}`} title={v}>
                {mat ? "mất ô nhập" : v?.trim() ? v : "trống"}
              </div>
            </div>
          );
        })}
    </div>
  ) : (
    <div className="ghi">Chưa nhận ra mẫu nên chưa đọc được ô nhập.</div>
  );

  // Bước 2: một dòng xám tóm tắt + gợi ý của máy (không cần duyệt) + danh sách lỗi (BuocSuaLoi)
  const goiYMay = (k?.loi ?? []).filter((l) => l.muc === "goi_y" && l.luat !== "noi_dung_ai");
  const noiDungBuoc2 = k ? (
    <>
      <div className="ghi flex flex-wrap items-center justify-between gap-2">
        {/* Dòng tổng hợp: còn vấn đề thì CẢ dòng đỏ đậm, sạch thì xanh (Mr. Đại chốt 29/09) */}
        <span className={!k.dat || canhBaoCon > 0 ? "tong-loi" : "ok"}>
          {k.dat ? "Đủ điều kiện bắt buộc" : `Chưa gửi được · ${soChanCon} lỗi chặn`}
          {canhBaoCon > 0 ? ` · ${canhBaoCon} cảnh báo chưa xử lý` : ""}
          {mucDat(k).length ? ` · Đạt ${mucDat(k).length} mục: ${mucDat(k).join(" · ")}` : ""}
          {!k.mau && !k.tu_do ? " · Chưa nhận ra mẫu — các mục khác chưa kiểm" : ""}
        </span>
        {coLoi && !daGui && kq?.tai_lieu_id && kq.phien_ban ? (
          <span className="flex flex-wrap gap-3">
            {/\.(docx|xlsx)$/i.test(kq.ten_tep) ? (
              <a
                className="lk"
                href={`/api/kiem-tra/danh-dau?tai_lieu_id=${encodeURIComponent(kq.tai_lieu_id)}&phien_ban=${kq.phien_ban}`}
                title={/\.xlsx$/i.test(kq.ten_tep) ? "Ô sai tô đỏ / vàng, rê chuột xem ghi chú; tờ «Lỗi cần sửa» liệt kê đủ — sửa ngay trên tệp rồi tải lên lại" : "Ô sai tô đỏ / vàng, có ghi chú — để sửa bằng Word"}
              >
                {/\.xlsx$/i.test(kq.ten_tep) ? "Tải bản đánh dấu lỗi" : "Tải bản Word đánh dấu lỗi"}
              </a>
            ) : null}
            <button type="button" className="lk" onClick={() => oTepSua.current?.click()} disabled={dang !== ""}>
              Tải lên bản đã sửa
            </button>
          </span>
        ) : null}
      </div>
      {coKhungSua && kq?.tai_lieu_id && kq.phien_ban ? (
        <BuocSuaLoi<KetQuaApi>
          taiLieuId={kq.tai_lieu_id}
          phienBan={kq.phien_ban}
          nhanNguon={nhanNguon}
          boQua={boQua}
          onBoQua={(x) => setBoQua((c) => new Set([...c, ...x]))}
          onDaSua={(r) => {
            nhanKetQua(r);
            taiNhap();
          }}
        />
      ) : null}
      {goiYMay.length ? (
        <>
          {!coKhungSua ? <DauBangVanDe /> : null}
          {goiYMay.map((l, i) => (
            <DongVanDe key={i} noiDung={l.thong_diep} muc="goi_y" phu={viTri(l, k.mau) || undefined} />
          ))}
        </>
      ) : null}
    </>
  ) : null;

  const noiDungBuoc3 = !toiBuoc3 ? (
    <div className="ghi">Chờ bước 2 hết lỗi: AI chỉ soát trên bản đã sạch lỗi.</div>
  ) : !(coLuatAi || coGopY) || !kq?.tai_lieu_id || !kq.phien_ban ? (
    <div className="ghi">Mẫu này không có luật AI / góp ý — bước này tự qua.</div>
  ) : (
    <Buoc3SoatNoiDung
      taiLieuId={kq.tai_lieu_id}
      phienBan={kq.phien_ban}
      mau={k?.mau}
      oNhap={k?.o_nhap ?? {}}
      coLuat={coLuatAi}
      coGopY={coGopY}
      luatDaDung={k?.luat_da_dung}
      lamMoi={lamMoiAi}
      quyet={quyet3}
      onQuyet={(khoa, q) =>
        setQuyet3((c) => {
          const m = { ...c };
          if (q) m[khoa] = q;
          else delete m[khoa];
          return m;
        })
      }
      onTrangThai={setAi}
      onAiXong={setAiXong3}
      onBuocXong={setBuoc3Xong}
      onGhi={ghiBuoc3}
      dangGhi={dang === "ghi3"}
    />
  );

  const phaiBuoc4 =
    moBuoc(3) && k && kq?.tai_lieu_id && !daGui ? (
      <>
        {chuaDuyetBang > 0 ? (
          <button
            type="button"
            className="lk"
            disabled={!duyetDuocHet.length || !!khoaDuyet}
            onClick={() => setDuyet((x) => ({ ...Object.fromEntries(duyetDuocHet.map((d) => [d, "duyet" as QuyetDuyet])), ...x }))}
            title={khoaDuyet ?? (duyetDuocHet.length < chuaDuyetBang ? "Việc có vẻ trùng / ghi Ban lãnh đạo chung chung phải chọn trước" : "Duyệt mọi việc trong bảng chưa quyết")}
          >
            Duyệt tất cả việc trong bảng ({duyetDuocHet.length})
          </button>
        ) : null}
        {aiChuaQuyet.length > 0 ? (
          <button type="button" className="lk" disabled={!!khoaDuyet} onClick={() => setQuyetAi((x) => ({ ...Object.fromEntries(aiChuaQuyet.map((i) => [i, "bo" as QuyetDuyet])), ...x }))}>
            Bỏ tất cả việc AI tìm ({aiChuaQuyet.length})
          </button>
        ) : null}
        <button type="button" className="lk" onClick={() => void raSoatAi()} disabled={dangAi || !soatXong} title="AI đọc lại cả báo cáo: việc viết ngoài bảng, tên việc, việc trùng theo nghĩa">
          {dangAi ? "AI đang đọc…" : "AI đọc lại"}
        </button>
      </>
    ) : null;

  const noiDungBuoc4 = k ? (
    <>
      {dangAi ? <div className="ghi">AI đang đọc cả báo cáo (việc ngoài bảng, tên việc, việc trùng)…</div> : null}
      {loiAiViec ? <div className="ghi text-red">{loiAiViec}</div> : null}
      {!k.mau && !k.tu_do ? (
        <div className="ghi">Chưa đọc được bảng việc: hệ thống chưa nhận ra file theo mẫu nào.</div>
      ) : (
        <BangDuyetViec
          congViec={k.cong_viec}
          duDoan={daGui ? ketQuaSoCai(daGui.so_cai, k.du_doan ?? []) : (k.du_doan ?? [])}
          loi={k.loi}
          mau={k.mau}
          xacNhan={xacNhan}
          onXacNhan={(dong, v) =>
            setXacNhan((x) => {
              const m = { ...x };
              if (v) m[dong] = v;
              else delete m[dong];
              return m;
            })
          }
          goiYAi={goiYAi}
          doiTen={doiTen}
          onDoiTen={(dong, ten) =>
            setDoiTen((x) => {
              const m = { ...x };
              if (ten) m[dong] = ten;
              else delete m[dong];
              return m;
            })
          }
          duyet={duyet}
          onDuyet={(dong, v) =>
            setDuyet((x) => {
              const m = { ...x };
              if (v) m[dong] = v;
              else delete m[dong];
              return m;
            })
          }
          khoaDuyet={khoaDuyet}
          lanhDao={lanhDao}
          chonBld={chonBld}
          onChonBld={(dong, id) =>
            setChonBld((x) => {
              const m = { ...x };
              if (id) m[dong] = id;
              else delete m[dong];
              return m;
            })
          }
          nguonBc={kq?.tai_lieu_id ? { taiLieuId: kq.tai_lieu_id, nhan: nhanNguon } : null}
          viecAi={daGui ? [] : viecAi}
          chonAi={chonAi}
          onChonAi={(i, c) => setChonAi((x) => ({ ...x, [i]: c }))}
          quyetAi={quyetAi}
          onQuyetAi={(i, v) =>
            setQuyetAi((x) => {
              const m = { ...x };
              if (v) m[i] = v;
              else delete m[i];
              return m;
            })
          }
          daGui={!!daGui}
        />
      )}
    </>
  ) : null;

  const noiDungBuoc5 = kq ? (
    daGui ? (
      <div className="dem ok">
        Đã gửi {tenDen.join(", ")} ({daGui.buoc_ids.length} nơi nhận). Sổ cái: {tomTatSoCai(daGui.so_cai)}
        {Object.values(duyet).filter((v) => v === "bo").length ? `; ${Object.values(duyet).filter((v) => v === "bo").length} việc bạn bỏ không vào sổ cái` : ""}.{" "}
        {daGui.tai_lieu_id ? (
          <a href={`/api/tai-lieu/${daGui.tai_lieu_id}/tep`} className="lk">
            Tải bản đã gửi
          </a>
        ) : null}
      </div>
    ) : (
      <div className="dem space-y-2">
        <ChonNoiNhanGon chon={den} onChon={setDen} macDinh={macDinh} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="nn chinh" style={{ padding: "5px 16px", fontSize: 13.5 }} onClick={() => void gui()} disabled={!coTheGui || dang !== ""}>
            {dang === "gui" ? "Đang gửi…" : k?.dat && ai.dangChoChan ? "Đang chờ AI kiểm luật…" : den.length ? `Gửi ${tenDen.join(", ")}` : "Gửi"}
          </button>
          {!coLoi ? (
            <button type="button" className="lk" onClick={() => oTepSua.current?.click()} disabled={dang !== ""}>
              Tải lại bản đã sửa
            </button>
          ) : null}
          {lyDoKhoaGui && !coTheGui ? <span className="text-[12.5px] text-text-muted">{lyDoKhoaGui}</span> : null}
        </div>
        {loiGui ? (
          <div className="text-[12.5px] text-red" role="alert">
            Chưa gửi được: {loiGui}{" "}
            <button type="button" className="lk" onClick={() => void gui()} disabled={dang !== ""}>
              Thử gửi lại
            </button>
          </div>
        ) : null}
      </div>
    )
  ) : null;

  const noiDung = [noiDungBuoc1, noiDungBuoc2, noiDungBuoc3, noiDungBuoc4, noiDungBuoc5];

  return (
    <div className="trang-gui">
      <div className="tg-dau">
        <div>
          <b>Nạp file &amp; gửi báo cáo</b>
          <div className="phu">Thả tệp Excel (.xlsx) làm trên mẫu báo cáo: máy kiểm từng ô, 🤖 AI soát nội dung, bạn duyệt rồi Gửi. Việc trong báo cáo tự vào sổ cái.</div>
        </div>
        <Link href="/mau-word" className="lk shrink-0">
          Tải mẫu báo cáo
        </Link>
      </div>

      {ds?.toi.chua_gan_don_vi === "chan_gui" ? <div className="mb-2 text-[13px] text-red">Bạn chưa được gán đơn vị nên chưa gửi được tài liệu. Quản trị viên đã được báo; bạn vẫn kiểm tra thử file được.</div> : null}
      {loi ? (
        <div className="mb-2 flex items-start justify-between gap-3 text-[13px] text-red" role="alert">
          <span>{loi}</span>
          <button type="button" className="lk" onClick={() => setLoi(null)}>
            đóng
          </button>
        </div>
      ) : null}

      <ThanhTienTrinhNop buoc={buoc} onChon={(i) => setMoTay((x) => ({ ...x, [`${i}:${buoc[i].trang_thai}`]: true }))} />

      <input
        ref={oTep}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void taiLen(f, false);
        }}
      />
      <input
        ref={oTepSua}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void taiLen(f, true);
        }}
      />

      {!kq ? (
        <div className="bang-nop">
          <KhaiHuongDan ma="gb-buoc-1" />
          <button
            type="button"
            onClick={() => oTep.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void taiLen(f, false);
            }}
            className="flex min-h-[130px] w-full flex-col items-center justify-center gap-1 px-4 text-center hover:bg-[var(--nen-dau)]"
          >
            <span className="text-[14px] text-text">{dang === "tai" ? "Đang đọc và kiểm tra…" : "Bấm hoặc kéo thả tệp Excel (.xlsx) vào đây"}</span>
            <span className="text-[12.5px] text-text-muted">Từ 22/10/2026 báo cáo nộp bằng Excel — tải mẫu ở «Tải mẫu báo cáo», điền tờ «Mẫu trắng». Sửa xong tải lại thành bản 2, lịch sử vẫn giữ bản 1.</span>
          </button>
          <button
            type="button"
            className="buoc-dau w-full text-left"
            style={{ borderTop: "1px solid var(--p-line)" }}
            onClick={() => setMoNhap((m) => !m)}
            aria-expanded={moNhap}
          >
            <span className="ten">
              {moNhap ? "▾" : "▸"} Bản nháp chưa gửi của tôi · {nhap.length}
            </span>
            <span className="text-[12.5px] text-text-muted">Bản đã gửi không nằm ở đây</span>
          </button>
          {!moNhap ? null : nhap.length === 0 ? (
            <div className="ghi">Không có bản nháp nào chưa gửi.</div>
          ) : (
            nhap.slice(trangNhap * NHAP_MOI_TRANG, (trangNhap + 1) * NHAP_MOI_TRANG).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void moTaiLieu(n.id)}
                className="flex w-full items-center gap-3 px-[14px] py-2 text-left text-[13.5px] hover:bg-[var(--nen-dau)]"
                style={{ borderTop: "1px solid var(--ke)" }}
              >
                <span className="min-w-0 flex-1 truncate text-text">{n.ten}</span>
                <span className={`shrink-0 text-[12.5px] ${trangThaiNhap(n).mau}`}>{trangThaiNhap(n).chu}</span>
                <span className="shrink-0 text-[12.5px] text-text-muted">{ngayGio(n.tao_luc)}</span>
              </button>
            ))
          )}
          {moNhap && nhap.length > NHAP_MOI_TRANG && (
            <div className="flex items-center justify-end gap-2 px-[14px] py-2 text-[12.5px] text-text-muted" style={{ borderTop: "1px solid var(--ke)" }}>
              <button type="button" className="lk disabled:opacity-40" disabled={trangNhap === 0} onClick={() => setTrangNhap((t) => t - 1)}>‹ Trước</button>
              <span>
                Trang {trangNhap + 1}/{Math.ceil(nhap.length / NHAP_MOI_TRANG)}
              </span>
              <button type="button" className="lk disabled:opacity-40" disabled={(trangNhap + 1) * NHAP_MOI_TRANG >= nhap.length} onClick={() => setTrangNhap((t) => t + 1)}>Sau ›</button>
            </div>
          )}
        </div>
      ) : (
        // Năm bước xếp dọc 1→5 trong MỘT khung, đúng thứ tự thanh tiến trình (không chia cột)
        <div className="bang-nop">
          {buoc.map((b, i) => (
            <KhoiBuoc
              key={b.ten}
              so={i + 1}
              b={b}
              mo={moBuoc(i)}
              onBat={() => setMoTay((x) => ({ ...x, [`${i}:${b.trang_thai}`]: !moBuoc(i) }))}
              phai={i === 0 ? phaiBuoc1 : i === 3 ? phaiBuoc4 : undefined}
            >
              {moBuoc(i) && <KhaiHuongDan ma={`gb-buoc-${i + 1}`} uuTien={b.trang_thai === "dang" ? 1 : 0} />}
              {noiDung[i]}
            </KhoiBuoc>
          ))}
        </div>
      )}
    </div>
  );
}
