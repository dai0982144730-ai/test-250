"use client";
// Trang Cài đặt: mỗi nhóm trong NHOM_CAU_HINH một mục. Sửa → Lưu (kiểm tra trước khi lưu, tăng phiên bản, hiệu lực ngay).
// Mỗi nhóm có nhật ký phiên bản + nút quay lại; JSON nâng cao; Xuất / Nhập toàn bộ cấu hình.
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Braces, Download, History, Lock, RotateCcw, Save, Upload, Undo2 } from "lucide-react";
import type { KhoaCauHinh } from "@/lib/cau-hinh/mac-dinh";
import { nhanLoiCauHinh, nhanTruong } from "@/lib/cau-hinh/bieu-mau";
import { fmtSo } from "@/lib/format";
import { TieuDeTrang } from "@/components/layout/TieuDeTrang";
import { HopLoi, HopThoai, LoiApi, Nut, goiApi, ngayGio, useThongBaoNhanh } from "@/components/layout/giao-dien";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { TrinhSuaNhom } from "./nhom";
import type { DanhMucCaiDat } from "./o-nhap";
import { KhungEmail } from "./email";
import { KhungKeoMain } from "./keo-main";
import { KetNoiAI } from "@/components/ai/KetNoiAI";
import { ThongKeAI } from "@/components/ai/ThongKeAI";
import { KhungXemTruoc, NutApDungLaiNgay, doiThuTu, useXemTruocApDungLai } from "./ap-dung-lai";
import { RaSoatSoCai } from "./ra-soat";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { useToi } from "@/components/layout/dung-toi";
import type { ToiQuanTri } from "@/components/quan-tri/TrangQuanTri";
import { ToChucNguoiDung } from "@/components/quan-tri/ToChucNguoiDung";
import { MaTranQuyen } from "@/components/quan-tri/MaTranQuyen";
import { NhapExcel } from "@/components/quan-tri/NhapExcel";
import { TrangLuatKiemTra } from "@/components/luat/TrangLuatKiemTra";
import { TraCuuLichSu } from "@/components/lich-su/TraCuuLichSu";
import { KhungChia } from "@/components/layout/KhungChia";
import { DungLuongDinhKem } from "@/components/dinh-kem/DinhKem";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface NhomCaiDat {
  khoa: KhoaCauHinh;
  ten: string;
  mo_ta: string;
  gia_tri: unknown;
  mac_dinh: unknown;
  phien_ban: number;
  sua_boi: string | null;
  sua_luc: string | null;
  sua_duoc: boolean;
}

interface DongNhatKy {
  id: number;
  phien_ban: number;
  boi: string | null;
  boi_ten: string | null;
  luc: string;
  thay_doi: { truong: string; tu: unknown; sang: unknown }[];
}

const giong = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Câu báo thêm khi lưu làm hệ thống áp dụng lại quy tắc đè cho việc đang mở. */
const cauApDungLai = (n?: number) => (n ? ` Đã áp dụng lại cho ${n} việc đang mở.` : "");

function ngan(v: unknown): string {
  if (v === null || v === undefined) return "(trống)";
  if (typeof v === "boolean") return v ? "bật" : "tắt";
  if (typeof v === "number") return fmtSo(v, 6); // nhật ký đổi cài đặt: 0.7 → «0,7» (chuẩn số Việt Nam, chốt 130)
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

function NhatKy({ nhom, bao, sauKhiQuayLai }: { nhom: NhomCaiDat; bao: (c: string, t?: boolean) => void; sauKhiQuayLai: () => Promise<void> }) {
  const [ds, setDs] = useState<DongNhatKy[] | null>(null);
  const [dang, setDang] = useState<number | null>(null);
  const tai = useCallback(async () => {
    try {
      setDs((await goiApi<{ nhat_ky: DongNhatKy[] }>(`/api/cai-dat/${nhom.khoa}/nhat-ky`)).nhat_ky);
    } catch {
      setDs([]);
    }
  }, [nhom.khoa]);
  useEffect(() => {
    void tai();
  }, [tai, nhom.phien_ban]);

  async function quayLai(pb: number) {
    if (!window.confirm(pb === 0 ? "Quay về giá trị mặc định ban đầu?" : `Quay lại phiên bản ${pb}? Hệ thống tạo phiên bản mới mang giá trị cũ.`)) return;
    setDang(pb);
    try {
      const r = await goiApi<{ phien_ban: number; so_viec_ap_dung_lai?: number }>(`/api/cai-dat/${nhom.khoa}/quay-lai`, { body: { phien_ban: pb } });
      bao(`Đã quay lại ${pb === 0 ? "mặc định" : `phiên bản ${pb}`} → phiên bản ${r.phien_ban}. Có hiệu lực ngay.${cauApDungLai(r.so_viec_ap_dung_lai)}`);
      await sauKhiQuayLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không quay lại được", false);
    } finally {
      setDang(null);
    }
  }

  return (
    <div className="rounded border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-[13px] font-bold text-text">
        <History className="h-4 w-4 text-accent" /> Nhật ký phiên bản
      </div>
      <div className="scroll-thin max-h-[520px] overflow-y-auto">
        {ds === null && <p className="px-4 py-3 text-[12px] text-text-muted">Đang tải…</p>}
        {ds?.length === 0 && <p className="px-4 py-3 text-[12px] text-text-muted">Chưa ai sửa nhóm này — đang dùng giá trị mặc định (phiên bản 0).</p>}
        <ul className="divide-y divide-border-light">
          {ds?.map((d) => (
            <li key={d.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-text">
                  Phiên bản {d.phien_ban}
                  {d.phien_ban === nhom.phien_ban && <span className="ml-1.5 text-[10px] font-bold text-green">ĐANG DÙNG</span>}
                </span>
                {nhom.sua_duoc && d.phien_ban !== nhom.phien_ban && (
                  <Nut nho kieu="nhat" disabled={dang !== null} onClick={() => void quayLai(d.phien_ban)}>
                    <Undo2 className="h-3 w-3" /> {dang === d.phien_ban ? "Đang…" : "Quay lại bản này"}
                  </Nut>
                )}
              </div>
              <div className="text-[10.5px] text-text-muted">
                {d.boi_ten ?? d.boi ?? "?"} · {ngayGio(d.luc)}
              </div>
              <ul className="mt-1 space-y-0.5">
                {d.thay_doi.slice(0, 8).map((t, i) => (
                  <li key={i} className="text-[11px] text-text-secondary">
                    <span className="text-text">{nhanTruong(nhom.khoa, t.truong)}</span>: <span className="text-text-muted line-through">{ngan(t.tu)}</span> →{" "}
                    <span className="text-accent">{ngan(t.sang)}</span>
                  </li>
                ))}
                {d.thay_doi.length > 8 && <li className="text-[10.5px] text-text-muted">… và {d.thay_doi.length - 8} thay đổi khác</li>}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      {nhom.sua_duoc && nhom.phien_ban > 0 && (
        <div className="border-t border-border px-4 py-2">
          <Nut nho kieu="nhat" disabled={dang !== null} onClick={() => void quayLai(0)}>
            <RotateCcw className="h-3 w-3" /> Quay về mặc định
          </Nut>
        </div>
      )}
    </div>
  );
}

function KhungNhom({
  nhom,
  danhMuc,
  bao,
  taiLai,
  suaMoiNhom,
}: {
  nhom: NhomCaiDat;
  danhMuc: DanhMucCaiDat;
  bao: (c: string, t?: boolean) => void;
  taiLai: () => Promise<void>;
  suaMoiNhom: boolean;
}) {
  const [nhap, setNhap] = useState<unknown>(structuredClone(nhom.gia_tri));
  const [json, setJson] = useState<string | null>(null);
  const [loiJson, setLoiJson] = useState<string | null>(null);
  const [loi, setLoi] = useState<{ loi: string; ds: string[] } | null>(null);
  const [dang, setDang] = useState(false);

  useEffect(() => {
    setNhap(structuredClone(nhom.gia_tri));
    setJson(null);
    setLoi(null);
  }, [nhom.khoa, nhom.phien_ban, nhom.gia_tri]);

  const daDoi = !giong(nhap, nhom.gia_tri);
  const tat = !nhom.sua_duoc;

  // Quy tắc đè: bật "áp dụng lại khi đổi" và đổi trường ảnh hưởng thứ tự → xem trước việc sẽ đổi rồi mới cho lưu
  const laQuyTacDe = nhom.khoa === "quy_tac_de";
  const qtdMoi = laQuyTacDe ? (nhap as CauHinh["quy_tac_de"]) : null;
  const canXemTruoc = laQuyTacDe && !tat && json === null && !!qtdMoi?.ap_dung_lai_khi_doi && doiThuTu(nhom.gia_tri as CauHinh["quy_tac_de"], qtdMoi);
  const xt = useXemTruocApDungLai(canXemTruoc, qtdMoi);

  async function luu() {
    let giaTri = nhap;
    if (json !== null) {
      try {
        giaTri = JSON.parse(json);
      } catch (e) {
        setLoiJson(`JSON sai cú pháp: ${e instanceof Error ? e.message : ""}`);
        return;
      }
    }
    setDang(true);
    setLoi(null);
    try {
      const r = await goiApi<{ phien_ban: number; so_viec_ap_dung_lai?: number }>(`/api/cai-dat/${nhom.khoa}`, { method: "PUT", body: { gia_tri: giaTri } });
      bao(
        r.phien_ban === nhom.phien_ban
          ? "Không có gì thay đổi"
          : `Đã lưu "${nhom.ten}" → phiên bản ${r.phien_ban}. Có hiệu lực ngay.${cauApDungLai(r.so_viec_ap_dung_lai)}`,
      );
      setJson(null);
      await taiLai();
    } catch (e) {
      setLoi({ loi: e instanceof Error ? e.message : "Không lưu được", ds: e instanceof LoiApi ? e.danhSach.map((l) => nhanLoiCauHinh(nhom.khoa, l)) : [] });
    } finally {
      setDang(false);
    }
  }

  return (
    <KhungChia khoa="cai-dat:nhom" macDinh={70} tu={1024}
      trai={
<div className="min-w-0 rounded border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-bold text-text">
              {nhom.ten}
              {tat && (
                <span className="flex items-center gap-1 text-[10.5px] font-normal text-text-muted">
                  <Lock className="h-3 w-3" /> chỉ xem
                </span>
              )}
            </div>
            <div className="text-[11px] text-text-muted">
              {nhom.mo_ta} · phiên bản {nhom.phien_ban}
              {nhom.sua_boi && ` · ${nhom.sua_boi} sửa ${ngayGio(nhom.sua_luc)}`}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Nut
              nho
              kieu="nhat"
              onClick={() => {
                setLoiJson(null);
                setJson(json === null ? JSON.stringify(nhap, null, 2) : null);
              }}
            >
              <Braces className="h-3.5 w-3.5" /> {json === null ? "JSON nâng cao" : "Về biểu mẫu"}
            </Nut>
            {!tat && (
              <>
                {!giong(nhap, nhom.mac_dinh) && json === null && (
                  <Nut nho kieu="nhat" title="Điền lại giá trị mặc định (chưa lưu)" onClick={() => setNhap(structuredClone(nhom.mac_dinh))}>
                    Điền mặc định
                  </Nut>
                )}
                {(daDoi || json !== null) && (
                  <Nut
                    nho
                    onClick={() => {
                      setNhap(structuredClone(nhom.gia_tri));
                      setJson(null);
                      setLoi(null);
                    }}
                  >
                    Bỏ thay đổi
                  </Nut>
                )}
                {laQuyTacDe && suaMoiNhom && !daDoi && json === null && <NutApDungLaiNgay bao={bao} />}
                <Nut
                  nho
                  kieu="chinh"
                  disabled={dang || (!daDoi && json === null) || (canXemTruoc && xt.dangXem)}
                  title={canXemTruoc && xt.dangXem ? "Đang tính các việc sẽ đổi — chờ xem trước rồi lưu" : undefined}
                  onClick={() => void luu()}
                >
                  <Save className="h-3.5 w-3.5" /> {dang ? "Đang lưu…" : canXemTruoc && xt.ket_qua ? `Lưu và áp dụng lại (${xt.ket_qua.so_viec} việc)` : "Lưu"}
                </Nut>
              </>
            )}
          </div>
        </div>
        <div className="p-4">
          {nhom.khoa === "thong_bao" && suaMoiNhom && <KhungEmail bao={bao} daDoi={daDoi} phienBan={nhom.phien_ban} />}
          {nhom.khoa === "du_an" && <KhungKeoMain ds={nhom.gia_tri as CauHinh["du_an"]} tat={tat} daDoi={daDoi || json !== null} bao={bao} taiLai={taiLai} />}
          {canXemTruoc && <KhungXemTruoc xt={xt} />}
          {loi && (
            <div className="mb-3">
              <HopLoi loi={loi.ds.length ? "Chưa lưu được — cấu hình chưa hợp lệ:" : loi.loi} danhSach={loi.ds} />
            </div>
          )}
          {json !== null ? (
            <div>
              <textarea
                className="scroll-thin h-[480px] w-full rounded-sm border border-border bg-bg p-3 font-mono text-[12px] text-text outline-none focus:border-accent"
                spellCheck={false}
                disabled={tat}
                value={json}
                onChange={(e) => {
                  setJson(e.target.value);
                  setLoiJson(null);
                }}
              />
              {loiJson && <div className="mt-1 text-[11.5px] text-red">{loiJson}</div>}
              <p className="mt-1 text-[11px] text-text-muted">Sửa trực tiếp giá trị JSON. Khi lưu, hệ thống vẫn kiểm tra kiểu và luật như biểu mẫu.</p>
            </div>
          ) : (
            <TrinhSuaNhom khoa={nhom.khoa} giaTri={nhap} doi={setNhap} tat={tat} danhMuc={danhMuc} />
          )}
        </div>
      </div>
      }
      phai={
<NhatKy nhom={nhom} bao={bao} sauKhiQuayLai={taiLai} />
      }
    />
  );
}

// ⭐ Bốn tab chuẩn dùng chung các agent (theo khuôn Cài đặt của agent tiến độ, Mr. Đại chốt 11/09):
//   🔔 Cảnh báo & ngưỡng · 🔌 Kết nối · 👥 Người dùng & phân quyền · 🧩 Riêng của agent.
// Mọi cài đặt, quản trị (người dùng, đơn vị, vai trò), Luật kiểm tra và Lịch sử đều nằm ở đây — một menu Cài đặt duy nhất.
type MucCaiDat = { khoa: string; ten: string; mo_ta: string } & ({ loai: "nhom"; nhom: KhoaCauHinh } | { loai: "trang" });
const TAB_CAI_DAT: { khoa: string; nhan: string; mo_ta: string; muc: MucCaiDat[] }[] = [
  {
    khoa: "canh-bao",
    nhan: "🔔 Cảnh báo & ngưỡng",
    mo_ta: "Ngưỡng hạn, quá hạn, nhắc việc; hạn nộp báo cáo; quy tắc khi việc trùng hoặc thiếu hạn",
    muc: [
      { khoa: "so_cai", ten: "Hạn việc, quá hạn, nhắc việc", mo_ta: "Sắp đến hạn · Quá hạn 1–3 ngày tô vàng, hơn thì đỏ · mã việc · kênh nhắc", loai: "nhom", nhom: "so_cai" },
      { khoa: "ky_bao_cao", ten: "Kỳ báo cáo, hạn nộp", mo_ta: "Tuần, tháng; hạn nộp; ngày nghỉ", loai: "nhom", nhom: "ky_bao_cao" },
      { khoa: "quy_tac_de", ten: "Quy tắc đè, việc thiếu hạn", mo_ta: "Việc trùng thì bản nào thắng; thiếu ngày kết thúc thì chặn", loai: "nhom", nhom: "quy_tac_de" },
    ],
  },
  {
    khoa: "ket-noi",
    nhan: "🔌 Kết nối",
    mo_ta: "AI, thống kê dùng AI, email, khóa cho agent khác đọc sổ cái, sao lưu",
    muc: [
      { khoa: "ai", ten: "AI", mo_ta: "Kết nối AI, model mặc định, góp ý", loai: "nhom", nhom: "ai" },
      // Mr. Đại chốt 04/10: thống kê tách khỏi mục AI thành mục riêng
      { khoa: "thong-ke-ai", ten: "Thống kê dùng AI", mo_ta: "Token, thời gian chạy, ai dùng nhiều, tính năng tốn token", loai: "trang" },
      { khoa: "thong_bao", ten: "Email, thông báo", mo_ta: "Hộp thư gửi, nội dung mẫu", loai: "nhom", nhom: "thong_bao" },
      { khoa: "khoa-agent", ten: "Khóa cho agent", mo_ta: "Agent khác đọc sổ cái qua MCP", loai: "trang" },
      { khoa: "giao_dien", ten: "Giao diện, sao lưu", mo_ta: "Tên, màu, giờ sao lưu; sơ đồ tổ chức ẩn/hiện đơn vị không có việc", loai: "nhom", nhom: "giao_dien" },
    ],
  },
  {
    khoa: "nguoi-dung",
    nhan: "👥 Người dùng & phân quyền",
    mo_ta: "Người dùng, đơn vị, chức danh lãnh đạo, vai trò và quyền",
    muc: [
      // Mr. Đại chốt 28/09: gộp "Người dùng" + "Đơn vị, chức danh" — mỗi thông tin khai một nơi (link cũ tự chuyển về đây)
      { khoa: "to-chuc", ten: "Tổ chức & người dùng", mo_ta: "Cây đơn vị, chức danh; mở một đơn vị thấy người của nó, trưởng, kiêm nhiệm", loai: "trang" },
      { khoa: "vai-tro", ten: "Vai trò và quyền", mo_ta: "Ai được làm gì, ở phạm vi nào", loai: "trang" },
      { khoa: "nhap-excel", ten: "Nhập từ Excel", mo_ta: "Nhập nhiều người dùng một lần", loai: "trang" },
      { khoa: "tai_khoan", ten: "Tài khoản người dùng", mo_ta: "Vai trò mặc định, mật khẩu", loai: "nhom", nhom: "tai_khoan" },
      { khoa: "nguoi_ngoai", ten: "Người ngoài, chưa gán đơn vị", mo_ta: "Cá nhân, bên ngoài", loai: "nhom", nhom: "nguoi_ngoai" },
      { khoa: "giao_viec", ten: "Giao chuyển tiếp — hỗ trợ Ban lãnh đạo", mo_ta: "Chọn người hiện thành nhóm «Hỗ trợ Ban lãnh đạo» khi lãnh đạo giao chuyển tiếp", loai: "nhom", nhom: "giao_viec" },
      { khoa: "phan_quyen_cau_hinh", ten: "Phân quyền cài đặt", mo_ta: "Ai được sửa nhóm cài đặt nào", loai: "nhom", nhom: "phan_quyen_cau_hinh" },
    ],
  },
  {
    khoa: "rieng",
    nhan: "🧩 Riêng của agent",
    mo_ta: "Cài đặt chỉ agent SCI công việc có: luật kiểm tra báo cáo, luồng gửi, thư mục, lịch sử",
    muc: [
      { khoa: "luat", ten: "Luật kiểm tra", mo_ta: "Kiểm báo cáo trước khi gửi: luật code và luật AI", loai: "trang" },
      { khoa: "luat_kiem_tra", ten: "Luật hệ thống", mo_ta: "Bật tắt luật gốc, mức chặn", loai: "nhom", nhom: "luat_kiem_tra" },
      { khoa: "luong_bao_cao", ten: "Luồng báo cáo", mo_ta: "Đơn vị nào gửi cho ai, ai tổng hợp", loai: "nhom", nhom: "luong_bao_cao" },
      { khoa: "ten_goi_khac_don_vi", ten: "Tên gọi khác của đơn vị", mo_ta: "Tên viết tắt ghi trên báo cáo (HL7, NMĐG HL8…) để máy nhận ra báo cáo của đơn vị nào", loai: "nhom", nhom: "ten_goi_khac_don_vi" },
      { khoa: "cong_ty_don_vi", ten: "Công ty của nhà máy / Ban điều hành", mo_ta: "Công ty vận hành nhà máy, công ty tổng thầu của Ban điều hành — máy điền dòng CÔNG TY …… khi làm báo cáo Form 8 / Form 10", loai: "nhom", nhom: "cong_ty_don_vi" },
      { khoa: "du_an", ten: "Sơ đồ tổ chức dự án", mo_ta: "Cây dự án cho menu Dự án: việc chỉ thuộc dự án có trong cây (máy tra tên, không đoán)", loai: "nhom", nhom: "du_an" },
      { khoa: "gan_wbs", ten: "Gắn việc vào WBS", mo_ta: "🤖 AI đề xuất mã WBS cho việc của dự án có cây tiến độ; người duyệt hay AI tự duyệt", loai: "nhom", nhom: "gan_wbs" },
      { khoa: "thu_muc", ten: "Thư mục", mo_ta: "Thư mục con mặc định, thùng rác", loai: "nhom", nhom: "thu_muc" },
      { khoa: "dinh_kem", ten: "Tệp đính kèm việc", mo_ta: "Kẹp file khi giao việc, báo xong, bình luận; 50 MB; lưu 6 tháng", loai: "nhom", nhom: "dinh_kem" },
      { khoa: "bao_cao_tuan", ten: "Báo cáo tuần (AI)", mo_ta: "Model viết, đơn vị được đánh giá, ngưỡng quá tải, hệ số trễ, giờ viết muộn nhất", loai: "nhom", nhom: "bao_cao_tuan" },
      { khoa: "lich-su", ten: "Lịch sử", mo_ta: "Mọi thao tác, chỉ ghi thêm, kiểm tra toàn vẹn", loai: "trang" },
      { khoa: "ra-soat", ten: "Rà soát sổ cái", mo_ta: "Mọi báo cáo đã gửi đã vào sổ cái đủ việc chưa; bổ sung việc thiếu", loai: "trang" },
    ],
  },
];

/** Tab + mục theo URL (?tab=&muc=); link cũ ?nhom=<khóa cấu hình> vẫn mở đúng chỗ. */
function viTriTuUrl(sp: URLSearchParams): { tab: string; muc: string } {
  const nhomCu = sp.get("nhom");
  if (nhomCu) {
    const t = TAB_CAI_DAT.find((x) => x.muc.some((m) => m.khoa === nhomCu));
    if (t) return { tab: t.khoa, muc: nhomCu };
  }
  const t = TAB_CAI_DAT.find((x) => x.khoa === sp.get("tab")) ?? TAB_CAI_DAT[0];
  const mucUrl = sp.get("muc") === "nguoi-dung" || sp.get("muc") === "don-vi" ? "to-chuc" : sp.get("muc"); // hai menu cũ đã gộp
  const m = t.muc.find((x) => x.khoa === mucUrl) ?? t.muc[0];
  return { tab: t.khoa, muc: m.khoa };
}

function NoiDung() {
  const sp = useSearchParams();
  const router = useRouter();
  const [nhom, setNhom] = useState<NhomCaiDat[] | null>(null);
  const [suaMoiNhom, setSuaMoiNhom] = useState(false);
  const [danhMuc, setDanhMuc] = useState<DanhMucCaiDat | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [viTri, setViTri] = useState(() => viTriTuUrl(new URLSearchParams(sp.toString())));
  const toiNd = useToi();
  const [loiNhap, setLoiNhap] = useState<string[] | null>(null);
  const oTep = useRef<HTMLInputElement>(null);
  const { bao, khung } = useThongBaoNhanh();

  const taiLai = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([goiApi<{ nhom: NhomCaiDat[]; sua_moi_nhom: boolean }>("/api/cai-dat"), goiApi<DanhMucCaiDat>("/api/cai-dat/danh-muc")]);
      setNhom(a.nhom);
      setSuaMoiNhom(a.sua_moi_nhom);
      setDanhMuc(b);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tải được cài đặt");
    }
  }, []);
  useEffect(() => {
    void taiLai();
  }, [taiLai]);

  const chonMuc = (tab: string, muc?: string) => {
    const t = TAB_CAI_DAT.find((x) => x.khoa === tab) ?? TAB_CAI_DAT[0];
    const m = muc ?? t.muc[0].khoa;
    setViTri({ tab: t.khoa, muc: m });
    router.replace(`/cai-dat?tab=${t.khoa}&muc=${m}`, { scroll: false });
  };

  async function nhapFile(f: File | null) {
    if (!f) return;
    let duLieu: unknown;
    try {
      duLieu = JSON.parse(await f.text());
    } catch {
      bao("File không phải JSON hợp lệ", false);
      return;
    }
    if (!window.confirm(`Nhập cấu hình từ "${f.name}"? Các nhóm có trong file sẽ được ghi đè (mỗi nhóm tăng một phiên bản, quay lại được).`)) return;
    try {
      const r = await goiApi<{ so_viec_ap_dung_lai?: number }>("/api/cai-dat/nhap", { body: duLieu });
      setLoiNhap(null);
      bao(`Đã nhập cấu hình. Có hiệu lực ngay.${cauApDungLai(r.so_viec_ap_dung_lai)}`);
      await taiLai();
    } catch (e) {
      if (e instanceof LoiApi && e.danhSach.length) setLoiNhap(e.danhSach);
      else bao(e instanceof Error ? e.message : "Nhập thất bại", false);
    } finally {
      if (oTep.current) oTep.current.value = "";
    }
  }

  const tab = TAB_CAI_DAT.find((t) => t.khoa === viTri.tab) ?? TAB_CAI_DAT[0];
  const muc = tab.muc.find((m) => m.khoa === viTri.muc) ?? tab.muc[0];
  const hienTai = muc.loai === "nhom" ? nhom?.find((n) => n.khoa === muc.nhom) : undefined;
  const suaDuocNhomNao = nhom?.some((n) => n.sua_duoc) ?? false;
  const toiQt: ToiQuanTri | null = toiNd
    ? {
        id: toiNd.id,
        la_quan_tri: toiNd.la_quan_tri,
        toan_bo: !!toiNd.co_the.quan_tri_toan_bo,
        cap_khoa: !!toiNd.co_the.cap_khoa,
        quan_ly_mau: !!toiNd.co_the.quan_ly_mau,
      }
    : null;
  const coQt = !!toiNd?.co_the.quan_tri;
  const mucCan = (m: MucCaiDat) =>
    ["to-chuc", "vai-tro"].includes(m.khoa)
      ? coQt
      : m.khoa === "nhap-excel"
        ? coQt && !!toiQt?.toan_bo
        : m.khoa === "khoa-agent"
          ? !!(toiQt?.cap_khoa || toiQt?.la_quan_tri)
          : m.khoa === "ra-soat"
            ? suaMoiNhom
            : m.khoa === "thong-ke-ai"
              ? !!toiNd?.co_the.thong_ke_ai
              : true;

  return (
    <>
      {/* Hướng dẫn: tổng Cài đặt (khối phụ) + hướng dẫn của MỤC đang mở, mã cd-<khoa mục> (chỉ khi người này được xem mục) */}
      <KhaiHuongDan ma="cai-dat" uuTien={0} />
      {mucCan(muc) && <KhaiHuongDan ma={"cd-" + muc.khoa} />}
      <TieuDeTrang
        tieuDe="Cài đặt"
        moTa="Cái gì có thể đổi thì nằm ở đây, không viết cứng trong code — đổi xong có hiệu lực ngay"
        phai={
          suaDuocNhomNao && (
            <>
              <a
                href="/api/cai-dat/xuat"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
              >
                <Download className="h-3.5 w-3.5" /> Xuất cấu hình
              </a>
              <Nut nho onClick={() => oTep.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Nhập cấu hình
              </Nut>
              <input ref={oTep} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void nhapFile(e.target.files?.[0] ?? null)} />
            </>
          )
        }
      />
      <div className="space-y-4 p-5 text-text">
        {/* ===== Bốn tab ngang: bấm là sang tab ===== */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
          {TAB_CAI_DAT.map((t) => (
            <button
              key={t.khoa}
              type="button"
              onClick={() => chonMuc(t.khoa)}
              title={t.mo_ta}
              className={`rounded-sm border px-3 py-1.5 text-[12px] font-semibold transition ${
                tab.khoa === t.khoa ? "border-accent/50 bg-accent/10 text-accent" : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
              }`}
            >
              {t.nhan}
            </button>
          ))}
          <span className="ml-2 text-[11.5px] text-text-muted">{tab.mo_ta}</span>
        </div>
        <HopLoi loi={loi} />
        <KhungChia
          khoa="cai-dat"
          laPx
          macDinh={250}
          toiThieu={200}
          tu={1024}
          trai={
          <aside>
            <div className="rounded border border-border bg-surface p-2">
              {tab.muc.filter(mucCan).map((m) => {
                const n = m.loai === "nhom" ? nhom?.find((x) => x.khoa === m.nhom) : undefined;
                const dangChon = muc.khoa === m.khoa;
                return (
                  <button
                    key={m.khoa}
                    type="button"
                    onClick={() => chonMuc(tab.khoa, m.khoa)}
                    className={`flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition ${dangChon ? "bg-white/5" : "hover:bg-white/5"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[12.5px] ${dangChon ? "font-bold text-text" : "text-text-secondary"}`}>{m.ten}</span>
                      <span className="block truncate text-[10.5px] text-text-muted" title={m.mo_ta}>
                        {m.mo_ta}
                      </span>
                    </span>
                    {n && (
                      <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[10px] text-text-muted">
                        {!n.sua_duoc && <Lock className="h-3 w-3" />}
                        {n.phien_ban > 0 && <span className="rounded-sm border border-border px-1">v{n.phien_ban}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
          }
          phai={
          <div className="min-w-0 flex-1">
            {muc.loai === "nhom" && (
              <>
                {muc.nhom === "ai" && <KetNoiAI className="mb-4" />}
                {muc.nhom === "dinh_kem" && <DungLuongDinhKem />}
                {hienTai && danhMuc ? (
                  <KhungNhom key={hienTai.khoa} nhom={hienTai} danhMuc={danhMuc} bao={bao} taiLai={taiLai} suaMoiNhom={suaMoiNhom} />
                ) : (
                  !loi && <p className="text-[12px] text-text-muted">Đang tải…</p>
                )}
              </>
            )}
            {muc.loai === "trang" && !mucCan(muc) && (
              <div className="rounded border border-border bg-surface px-4 py-8 text-center text-[12.5px] text-text-muted">Bạn không có quyền mở mục này. Liên hệ quản trị viên nếu cần.</div>
            )}
            {muc.loai === "trang" && mucCan(muc) && (
              <>
                {muc.khoa === "to-chuc" && toiQt && <ToChucNguoiDung toi={toiQt} bao={bao} donViBanDau={sp.get("don_vi") ?? ""} />}
                {muc.khoa === "vai-tro" && toiQt && <MaTranQuyen toi={toiQt} bao={bao} />}
                {muc.khoa === "nhap-excel" && <NhapExcel bao={bao} />}
                {muc.khoa === "khoa-agent" && (
                  <div className="rounded border border-border bg-surface p-4 text-[12.5px] text-text-secondary">
                    Cấp và thu hồi khóa để agent khác (vd agent tiến độ) đọc sổ cái qua cổng MCP <code className="font-mono">/api/mcp/socai</code>.
                    <div className="mt-3">
                      <Link href="/quan-tri/khoa-agent" className="inline-flex items-center gap-1.5 rounded-sm border border-accent px-3 py-1.5 font-semibold text-accent hover:bg-accent hover:text-white">
                        <KeyRound className="h-4 w-4" /> Mở trang Khóa cho agent
                      </Link>
                    </div>
                  </div>
                )}
                {muc.khoa === "luat" && (
                  <div className="-mt-4 min-w-0 overflow-hidden">
                    <TrangLuatKiemTra nhung />
                  </div>
                )}
                {muc.khoa === "ra-soat" && <RaSoatSoCai bao={bao} />}
                {muc.khoa === "thong-ke-ai" && <ThongKeAI />}
                {muc.khoa === "lich-su" && (
                  <div className="-mt-6 min-w-0 overflow-hidden">
                    <TraCuuLichSu />
                  </div>
                )}
              </>
            )}
          </div>
          }
        />
      </div>
      {loiNhap && (
        <HopThoai tieuDe="Không nhập được cấu hình" dong={() => setLoiNhap(null)} rong="max-w-[640px]" chan={<Nut onClick={() => setLoiNhap(null)}>Đóng</Nut>}>
          <p className="mb-2 text-[12px] text-text-secondary">File có lỗi nên không nhóm nào bị ghi. Sửa file rồi nhập lại:</p>
          <HopLoi danhSach={loiNhap} />
        </HopThoai>
      )}
      {khung}
    </>
  );
}

export function TrangCaiDat() {
  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-text-muted">Đang mở Cài đặt…</div>}>
      <NoiDung />
    </Suspense>
  );
}
