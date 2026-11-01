// ============================================================
// so-do-keo.ts — BỘ KÉO SƠ ĐỒ TỔ CHỨC từ agent Công việc về Main. CHỈ SERVER (node:fs · mạng).
// (Mr. Đại chốt 12/10/2026 — câu 9: "Làm: 30 phút + nút kéo" · "Báo + một nút tạo" · "Main tự khoá")
//
//   · Mỗi 30 phút (và khi bấm «Kéo sơ đồ ngay» ở Cài đặt › Người dùng) hỏi agent Công việc `base.so_do_to_chuc`
//     — đi qua `hoiAgent` nên CÓ VẾT trong sổ nhật ký (luật 29), kèm khoá nội bộ (cửa đó chỉ Main gọi được).
//   · So với bản Main đang giữ → có đổi thì: sao lưu bản trước → ghi người → ghi to-chuc.json → ghi một dòng "đổi gì"
//     → đẩy sang các agent con như mọi lần Main sửa người dùng.
//   · CHỐT AN TOÀN: sơ đồ rỗng / sai khuôn / làm mất quá nhiều đơn vị / khoá quá nhiều người → KHÔNG ghi đè, báo đỏ.
//   · Người mới bên agent Công việc: chỉ ghi vào danh sách "chưa có tài khoản"; tạo khi quản trị bấm một nút.
// Phần so sánh + chốt an toàn ở so-do-keo-thuan.ts (thuần). Dữ liệu của bộ kéo nằm ở data/so-do-keo/ (git bỏ qua).
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { docToChuc, ghiToChuc } from "@/lib/to-chuc";
import { apDungSoDoVaoNguoi, danhSachNguoiDungDayDu, taoNguoiTheoSoDo } from "@/lib/users";
import { dayChoCacAgent, type KetQuaDay } from "@/lib/day-sang-agent";
import {
  CONG_CU_SO_DO,
  NHIP_KEO_PHUT,
  denGioKeo,
  docSoDoKeoVe,
  lapKeHoach,
  xetAnToan,
  type KeHoachSoDo,
  type NguoiChuaCoTaiKhoan,
  type NguoiMainGon,
} from "@/lib/so-do-keo-thuan";

export type KetQuaKeo = "da-ghi" | "khong-doi" | "bi-chan" | "loi";

export interface TrangThaiKeo {
  /** Lần THỬ gần nhất (kể cả lần hỏng) — mốc tính nhịp 30 phút */
  lanThuCuoi: string | null;
  /** "tu-dong" hoặc email người bấm */
  boi: string | null;
  ketQua: KetQuaKeo | null;
  thongDiep: string;
  soDo: { donVi: number; kiemNhiem: number; nguoi: number } | null;
  /** Chốt an toàn chặn: lý do + các dòng SẼ đổi — quản trị bấm «Vẫn ghi theo sơ đồ mới» thì ghi */
  biChan: { lyDo: string; dong: string[] } | null;
  lanGhiCuoi: string | null;
  doiGiLanGhiCuoi: string[];
  nguoiChuaCoTaiKhoan: NguoiChuaCoTaiKhoan[];
  khongKhoa: KeHoachSoDo["khongKhoa"];
  emailLech: KeHoachSoDo["emailLech"];
  /** Email các tài khoản CHÍNH bộ kéo đã khoá — chỉ những tài khoản này mới được tự mở lại */
  tuKhoa: string[];
}

const TRANG_THAI_RONG: TrangThaiKeo = {
  lanThuCuoi: null,
  boi: null,
  ketQua: null,
  thongDiep: "",
  soDo: null,
  biChan: null,
  lanGhiCuoi: null,
  doiGiLanGhiCuoi: [],
  nguoiChuaCoTaiKhoan: [],
  khongKhoa: [],
  emailLech: [],
  tuKhoa: [],
};

/** Số bản sao lưu "bản trước" giữ lại · số dòng nhật ký giữ lại — đủ soi lại, không để phình */
const GIU_SAO_LUU = 20;
const GIU_NHAT_KY = 300;

const thuMuc = () => path.join(gocDuLieu(), "so-do-keo");
const tepTrangThai = () => path.join(thuMuc(), "trang-thai.json");
const tepNhatKy = () => path.join(thuMuc(), "nhat-ky.jsonl");

export function docTrangThaiKeo(): TrangThaiKeo {
  try {
    const j = JSON.parse(fs.readFileSync(tepTrangThai(), "utf8")) as Partial<TrangThaiKeo>;
    return { ...TRANG_THAI_RONG, ...j, tuKhoa: Array.isArray(j.tuKhoa) ? j.tuKhoa : [] };
  } catch {
    return { ...TRANG_THAI_RONG };
  }
}

function ghiTrangThai(t: TrangThaiKeo): void {
  fs.mkdirSync(thuMuc(), { recursive: true });
  fs.writeFileSync(tepTrangThai(), JSON.stringify(t, null, 2) + "\n", "utf8");
}

export interface DongNhatKyKeo {
  luc: string;
  boi: string;
  /** true = ghi dù chốt an toàn chặn (quản trị bấm «Vẫn ghi theo sơ đồ mới») */
  vanGhi: boolean;
  dong: string[];
}

export function docNhatKyKeo(gioiHan = 10): DongNhatKyKeo[] {
  try {
    const dong = fs.readFileSync(tepNhatKy(), "utf8").split("\n").filter((x) => x.trim() !== "");
    return dong
      .slice(-gioiHan)
      .reverse()
      .flatMap((x) => {
        try {
          return [JSON.parse(x) as DongNhatKyKeo];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function ghiNhatKy(d: DongNhatKyKeo): void {
  fs.mkdirSync(thuMuc(), { recursive: true });
  fs.appendFileSync(tepNhatKy(), JSON.stringify(d) + "\n", "utf8");
  // Tự gọn: quá ngưỡng thì chỉ giữ GIU_NHAT_KY dòng mới nhất
  const dong = fs.readFileSync(tepNhatKy(), "utf8").split("\n").filter((x) => x.trim() !== "");
  if (dong.length > GIU_NHAT_KY + 50) fs.writeFileSync(tepNhatKy(), dong.slice(-GIU_NHAT_KY).join("\n") + "\n", "utf8");
}

/** Sao lưu bản TRƯỚC khi ghi đè: to-chuc.json nguyên văn + phần tổ chức của từng người (không có mật khẩu) */
function saoLuuBanTruoc(luc: string, nguoi: NguoiMainGon[]): string {
  fs.mkdirSync(thuMuc(), { recursive: true });
  let toChucTho: string | null = null;
  try {
    toChucTho = fs.readFileSync(path.join(gocDuLieu(), "to-chuc.json"), "utf8");
  } catch {
    toChucTho = null;
  }
  const ten = `truoc-${luc.replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(path.join(thuMuc(), ten), JSON.stringify({ luc, toChucTho, nguoi }, null, 2) + "\n", "utf8");
  const cu = fs
    .readdirSync(thuMuc())
    .filter((f) => f.startsWith("truoc-") && f.endsWith(".json"))
    .sort();
  for (const f of cu.slice(0, Math.max(0, cu.length - GIU_SAO_LUU))) fs.rmSync(path.join(thuMuc(), f), { force: true });
  return ten;
}

function nguoiGon(): NguoiMainGon[] {
  return danhSachNguoiDungDayDu().map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    donViId: u.donViId,
    chucVu: u.chucVu,
    capChucVu: u.capChucVu,
    vaiCongViec: u.vaiCongViec,
  }));
}

function cauLoiHoi(maLoi: string | undefined, thongDiep: string | undefined): string {
  if (maLoi === "KHONG_HIEU_YEU_CAU" && (thongDiep ?? "").includes("không có công cụ")) {
    return "Agent Công việc đang chạy bản chưa có cửa sơ đồ tổ chức — cần dựng lại bản chạy ở cổng 3004 rồi mới kéo được. Sơ đồ ở Main giữ nguyên.";
  }
  return `Chưa kéo được sơ đồ từ agent Công việc: ${thongDiep ?? "không rõ lý do"} Sơ đồ ở Main giữ nguyên.`;
}

export interface KetQuaLuotKeo {
  trangThai: TrangThaiKeo;
  dayChoAgent: KetQuaDay[];
}

declare global {
  // eslint-disable-next-line no-var
  var __dangKeoSoDo: Promise<KetQuaLuotKeo> | null | undefined;
  // eslint-disable-next-line no-var
  var __nhipKeoSoDoDaBat: boolean | undefined;
  /** Vòng kiểm của BẢN MÃ MỚI NHẤT — thân mô-đun gán lại mỗi lần dev biên dịch lại (G4, 18/10/2026) */
  // eslint-disable-next-line no-var
  var __nhipKeoSoDoKiem: (() => void) | undefined;
}

/** Kéo một lượt. Hai lượt không chạy chồng: lượt sau chờ lượt trước xong rồi mới chạy. Không ném ngoại lệ. */
export async function keoSoDo(o: { boi: string; vanGhi?: boolean }): Promise<KetQuaLuotKeo> {
  if (globalThis.__dangKeoSoDo) await globalThis.__dangKeoSoDo.catch(() => undefined);
  const luot = keoThat(o).finally(() => {
    if (globalThis.__dangKeoSoDo === luot) globalThis.__dangKeoSoDo = null;
  });
  globalThis.__dangKeoSoDo = luot;
  return luot;
}

async function keoThat(o: { boi: string; vanGhi?: boolean }): Promise<KetQuaLuotKeo> {
  const luc = new Date().toISOString();
  const tuDong = o.boi === "tu-dong";
  const lyDo = tuDong
    ? `Main tự kéo sơ đồ tổ chức mỗi ${NHIP_KEO_PHUT} phút — để quyền theo dự án ở các agent đi theo đơn vị, kiêm nhiệm vừa sửa bên agent Công việc`
    : `${o.boi} bấm «Kéo sơ đồ ngay» ở Cài đặt › Người dùng của Main — cập nhật sơ đồ tổ chức vừa sửa bên agent Công việc`;
  const nen: TrangThaiKeo = { ...docTrangThaiKeo(), lanThuCuoi: luc, boi: o.boi };
  const xong = (t: TrangThaiKeo, dayChoAgent: KetQuaDay[] = []): KetQuaLuotKeo => {
    try {
      ghiTrangThai(t);
    } catch (e) {
      console.error(`[so-do-keo] không ghi được trạng thái: ${e instanceof Error ? e.message : e}`);
    }
    return { trangThai: t, dayChoAgent };
  };

  try {
    const ket = await hoiAgent("base", CONG_CU_SO_DO, lyDo, { kemKhoaNoiBo: true, khongThuLai: tuDong });
    if (!ket.ok) return xong({ ...nen, ketQua: "loi", thongDiep: cauLoiHoi(ket.ma_loi, ket.thong_diep) });

    const { soDo, loi } = docSoDoKeoVe(ket.du_lieu);
    if (!soDo) {
      return xong({
        ...nen,
        ketQua: "bi-chan",
        biChan: null,
        thongDiep: `Sơ đồ agent Công việc gửi về sai khuôn ở ${loi.length} chỗ — KHÔNG ghi đè: ${loi.slice(0, 4).join(" · ")}${loi.length > 4 ? " …" : ""}`,
      });
    }

    const tc = docToChuc();
    const nguoi = nguoiGon();
    const banCu = { toChuc: tc.toChuc, nguoi };
    const keHoach = lapKeHoach(banCu, soDo, nen.tuKhoa);
    const chung: TrangThaiKeo = {
      ...nen,
      soDo: { donVi: soDo.don_vi.length, kiemNhiem: soDo.kiem_nhiem.length, nguoi: soDo.nguoi.length },
      nguoiChuaCoTaiKhoan: keHoach.nguoiChuaCoTaiKhoan,
      khongKhoa: keHoach.khongKhoa,
      emailLech: keHoach.emailLech,
    };

    // Tệp sơ đồ của Main chưa có / đang hỏng thì lượt kéo này chính là lượt dựng lại — vẫn phải ghi dù không có dòng "đổi"
    const canDungLai = tc.tinhTrang !== "ok";
    if (!keHoach.coDoi && !canDungLai) {
      return xong({ ...chung, ketQua: "khong-doi", biChan: null, thongDiep: "Sơ đồ ở Main đang khớp agent Công việc — không có gì đổi." });
    }

    const xet = xetAnToan(banCu, keHoach);
    if (!xet.duoc && o.vanGhi !== true) {
      return xong({ ...chung, ketQua: "bi-chan", thongDiep: xet.lyDo, biChan: { lyDo: xet.lyDo, dong: keHoach.dong.slice(0, 200) } });
    }

    const tepSaoLuu = saoLuuBanTruoc(luc, nguoi);
    const dong = [
      ...(canDungLai ? [`Tệp sơ đồ của Main ${tc.tinhTrang === "hong" ? "không đọc được" : "chưa có"} — dựng lại từ sơ đồ vừa kéo`] : []),
      ...keHoach.dong,
    ];
    // Người trước, sơ đồ sau: ghi người mà vướng luật "còn ít nhất một PM / Quản trị" thì dừng, chưa đụng tới sơ đồ
    const ghiNguoi = apDungSoDoVaoNguoi(keHoach.vaNguoi);
    ghiToChuc(keHoach.toChucMoi);
    const tuKhoa = new Set(nen.tuKhoa);
    for (const k of keHoach.khoa) if (!ghiNguoi.khongKhoa.includes(k.email)) tuKhoa.add(k.email);
    for (const m of keHoach.moLai) tuKhoa.delete(m.email);
    ghiNhatKy({ luc, boi: o.boi, vanGhi: !xet.duoc, dong });
    const dayChoAgent = await dayChoCacAgent(`Sơ đồ tổ chức đổi ${dong.length} chỗ (kéo từ agent Công việc)`).catch(() => [] as KetQuaDay[]);
    return xong(
      {
        ...chung,
        ketQua: "da-ghi",
        biChan: null,
        thongDiep: `Đã ghi ${dong.length} thay đổi (bản trước lưu ở ${tepSaoLuu}).`,
        lanGhiCuoi: luc,
        doiGiLanGhiCuoi: dong,
        tuKhoa: Array.from(tuKhoa).sort(),
      },
      dayChoAgent,
    );
  } catch (e) {
    return xong({ ...nen, ketQua: "loi", thongDiep: `Lỗi khi kéo sơ đồ: ${e instanceof Error ? e.message : String(e)} Sơ đồ ở Main có thể chưa ghi xong — bấm «Kéo sơ đồ ngay» để thử lại.` });
  }
}

/** Tạo tài khoản cho những người lượt kéo gần nhất báo "chưa có tài khoản" — MỘT lần bấm cho cả danh sách */
export async function taoTaiKhoanChuaCo(boi: string): Promise<{ tao: string[]; boQua: { email: string; lyDo: string }[]; trangThai: TrangThaiKeo; dayChoAgent: KetQuaDay[] }> {
  const tt = docTrangThaiKeo();
  const ds = tt.nguoiChuaCoTaiKhoan;
  if (ds.length === 0) return { tao: [], boQua: [], trangThai: tt, dayChoAgent: [] };
  const { tao, boQua } = taoNguoiTheoSoDo(ds);
  const conLai = ds.filter((p) => !tao.includes(p.email));
  ghiTrangThai({ ...tt, nguoiChuaCoTaiKhoan: conLai });
  let dayChoAgent: KetQuaDay[] = [];
  if (tao.length) {
    const tenTheoEmail = new Map(ds.map((p) => [p.email, p.ten]));
    ghiNhatKy({ luc: new Date().toISOString(), boi, vanGhi: false, dong: tao.map((e) => `Tạo tài khoản ${tenTheoEmail.get(e) ?? e} (${e}) — mật khẩu lần đầu = email`) });
    dayChoAgent = await dayChoCacAgent(`Tạo ${tao.length} tài khoản cho người mới có ở agent Công việc`).catch(() => [] as KetQuaDay[]);
  }
  return { tao, boQua, trangThai: docTrangThaiKeo(), dayChoAgent };
}

/** Một nhịp kiểm: tới lượt 30 phút thì kéo (không chạy chồng — `__dangKeoSoDo` dùng chung mọi bản mô-đun) */
function kiemNhipKeoSoDo(): void {
  try {
    if (denGioKeo(docTrangThaiKeo().lanThuCuoi, Date.now())) void keoSoDo({ boi: "tu-dong" }).catch(() => undefined);
  } catch {
    // vòng kiểm không được phép làm sập máy chủ
  }
}
// Con trỏ toàn cục (G4 — Mr. Đại gật 18/10/2026, cách agent Tiến độ 17a9ac3): `setInterval` giữ hàm của LẦN NẠP ĐẦU; mỗi lần mô-đun
// nạp lại (có lượt mở trang sau khi sửa mã) con trỏ trỏ sang mã mới, `setInterval` chỉ gọi qua con trỏ.
globalThis.__nhipKeoSoDoKiem = kiemNhipKeoSoDo;

/**
 * Nhịp 30 phút — bật MỘT lần cho cả tiến trình (gọi ở layout: gác ngoài ping "/" mỗi phút nên máy chủ lên là nạp).
 * Vòng kiểm mỗi phút đọc mốc `lanThuCuoi` trong tệp, nên khởi động lại máy chủ không làm kéo dồn.
 * Sửa mã bộ kéo: vòng nền sang mã mới từ lượt mở trang đầu tiên sau khi dev biên dịch lại (con trỏ ở trên); sửa xong mà không ai
 * mở trang nào thì vẫn chạy mã cũ — khởi động lại cổng 3010 vẫn là cách chắc.
 */
export function khoiDongNhipKeoSoDo(): void {
  if (globalThis.__nhipKeoSoDoDaBat) return;
  globalThis.__nhipKeoSoDoDaBat = true;
  setInterval(() => {
    (globalThis.__nhipKeoSoDoKiem ?? kiemNhipKeoSoDo)();
  }, 60_000);
}
