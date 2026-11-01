"use client";
// ============================================================
// Cài đặt → 👥 → "Tổ chức & người dùng" (Mr. Đại chốt 28/09/2026 — gộp hai menu "Người dùng" + "Đơn vị, chức danh"
// để mỗi thông tin chỉ khai MỘT nơi):
//   · trái: cây đơn vị + ô tìm người · phải: đơn vị đang chọn (thông tin, trưởng, danh sách người kể cả kiêm nhiệm)
//   · bấm một người = sửa tại chỗ (hộp sửa dùng chung với bản cũ) · "+ Thêm người" gán sẵn đơn vị đang chọn
//   · trưởng đơn vị máy tự tính từ vai trò "Trưởng phòng / GĐ đơn vị"; 2 trưởng hoặc chưa có trưởng thì báo ngay
//   · đơn vị chức danh: chỉ khai chức danh, tên người giữ máy tự ghép (lib/to-chuc.ts); kiêm nhiệm tự hiện "kiêm …"
//   · TRƯỞNG CHÍNH (chốt 03/10/2026, cột uy_quyen_truong): đơn vị có từ 2 trưởng → chọn một người máy dùng giao việc; chọn là lưu ngay
//   · CHỨC NĂNG NHIỆM VỤ (db/81, chốt 03/10): ô chữ mỗi đơn vị — 🤖 AI soạn giao việc ở Cây việc đọc ô này
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Pencil, Plus, RotateCcw, Search, UserPlus } from "lucide-react";
import { HopLoi, LOP_O_NHAP, Nut, The, goiApi } from "@/components/layout/giao-dien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { chuCaiDau, useTai, xepTheoCay, type Bao, type DonViQT, type KetQuaDonVi, type KetQuaVaiTro, type NguoiDungQT } from "./du-lieu";
import { HienMatKhau, SuaNguoiDung } from "./BangNguoiDung";
import { SuaDonVi, type Sua } from "./CayDonVi";
import type { ToiQuanTri } from "./TrangQuanTri";

const CHUA_GAN = "chua_gan";
const VAI_TRUONG = "truong-don-vi";
/** Loại đơn vị cần đúng một trưởng (chức danh, Ban TGĐ, cá nhân, bên ngoài thì không xét). */
const CAN_TRUONG = new Set(["phong", "don_vi"]);

type Thanh = { nguoi: NguoiDungQT; kiem: string | null | undefined };

export function ToChucNguoiDung({ toi, bao, donViBanDau }: { toi: ToiQuanTri; bao: Bao; donViBanDau: string }) {
  const dv = useTai<KetQuaDonVi>("/api/quan-tri/don-vi");
  const nd = useTai<{ nguoi_dung: NguoiDungQT[] }>("/api/quan-tri/nguoi-dung?ca_bi_khoa=1");
  const vt = useTai<KetQuaVaiTro>("/api/quan-tri/vai-tro");
  const [chon, setChon] = useState(donViBanDau);
  const [sang, setSang] = useState<string | null>(null); // người vừa bấm từ ô tìm
  const [tim, setTim] = useState("");
  const [caNgung, setCaNgung] = useState(false);
  const [caKhoa, setCaKhoa] = useState(false);
  const [suaDv, setSuaDv] = useState<Sua | null>(null);
  const [suaNd, setSuaNd] = useState<NguoiDungQT | "moi" | null>(null);
  const [matKhauMoi, setMatKhauMoi] = useState<{ email: string; mat_khau: string } | null>(null);
  const khungPhai = useRef<HTMLDivElement>(null);
  const [suaCn, setSuaCn] = useState<string | null>(null); // nháp ô chức năng nhiệm vụ; null = đang xem

  const tatCaDv = dv.duLieu?.don_vi ?? [];
  const cayDu = useMemo(() => xepTheoCay(tatCaDv), [tatCaDv]);
  const cay = useMemo(() => cayDu.filter((d) => caNgung || d.active), [cayDu, caNgung]);
  const nguoi = useMemo(() => (nd.duLieu?.nguoi_dung ?? []).filter((n) => caKhoa || n.active), [nd.duLieu, caKhoa]);
  const tenDv = (id: string | null) => (id ? tatCaDv.find((d) => d.id === id)?.ten_ngan ?? id : "");
  const tenVt = (id: string) => vt.duLieu?.vai_tro.find((v) => v.id === id)?.ten ?? id;

  // Người của từng đơn vị: biên chế trước, kiêm nhiệm sau
  const thanhVien = useMemo(() => {
    const m = new Map<string, Thanh[]>();
    const them = (id: string, t: Thanh) => m.set(id, [...(m.get(id) ?? []), t]);
    for (const n of nguoi) {
      them(n.don_vi_id ?? CHUA_GAN, { nguoi: n, kiem: undefined });
      for (const k of n.kiem_nhiem) them(k.don_vi_id, { nguoi: n, kiem: k.chuc_vu });
    }
    for (const ds of m.values()) ds.sort((a, b) => Number(a.kiem !== undefined) - Number(b.kiem !== undefined) || a.nguoi.ten.localeCompare(b.nguoi.ten, "vi"));
    return m;
  }, [nguoi]);
  const truongCua = (id: string) => (thanhVien.get(id) ?? []).filter((t) => t.nguoi.active && t.nguoi.vai_tro.includes(VAI_TRUONG));

  // Mặc định mở đơn vị đầu cây
  useEffect(() => {
    if (!chon && cay.length) setChon(cay[0].id);
  }, [chon, cay]);

  const timThay = useMemo(() => {
    const t = tim.trim().toLowerCase();
    if (!t) return [];
    return nguoi.filter((n) => [n.ten, n.email, n.chuc_vu ?? ""].some((x) => x.toLowerCase().includes(t))).slice(0, 30);
  }, [tim, nguoi]);

  const moDonVi = (id: string, ai: string | null = null) => {
    setChon(id);
    setSuaCn(null);
    setSang(ai);
    if (window.innerWidth < 1024) window.setTimeout(() => khungPhai.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  async function doiHoatDong(d: DonViQT, bat: boolean) {
    if (!bat && !window.confirm(`Ngừng hoạt động "${d.ten}"? Đơn vị không bị xóa: lịch sử và thư mục cũ vẫn giữ nguyên.`)) return;
    try {
      await goiApi(`/api/quan-tri/don-vi/${encodeURIComponent(d.id)}`, { method: "PATCH", body: { active: bat } });
      bao(bat ? `Đã mở lại ${d.ten}` : `Đã ngừng ${d.ten}`);
      await dv.taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không đổi được", false);
    }
  }

  async function uyQuyen(d: DonViQT, nguoiId: string) {
    try {
      await goiApi(`/api/quan-tri/don-vi/${encodeURIComponent(d.id)}`, { method: "PATCH", body: { uy_quyen_truong: nguoiId || null } });
      const ten = nguoi.find((n) => n.id === nguoiId)?.ten;
      bao(ten ? `Đã chọn ${ten} làm trưởng chính ${d.ten_ngan}` : `Đã bỏ chọn trưởng chính ${d.ten_ngan}`);
      await dv.taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không lưu được", false);
    }
  }

  async function doiNgoaiSci(d: DonViQT, gt: boolean) {
    try {
      await goiApi(`/api/quan-tri/don-vi/${encodeURIComponent(d.id)}`, { method: "PATCH", body: { ngoai_sci: gt } });
      bao(gt ? `${d.ten_ngan}: ngoài SCI — chỉ giao cho cả đơn vị, không giao đích danh cá nhân` : `${d.ten_ngan}: đơn vị trực thuộc SCI`);
      await dv.taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không lưu được", false);
    }
  }

  async function luuChucNang(d: DonViQT, chu: string) {
    try {
      await goiApi(`/api/quan-tri/don-vi/${encodeURIComponent(d.id)}`, { method: "PATCH", body: { chuc_nang: chu } });
      bao(`Đã lưu chức năng nhiệm vụ ${d.ten_ngan}`);
      setSuaCn(null);
      await dv.taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không lưu được", false);
    }
  }

  const loi = dv.loi ?? nd.loi ?? vt.loi;
  if (loi) return <HopLoi loi={loi} />;
  if (!dv.duLieu || !nd.duLieu || !vt.duLieu) return <div className="text-[12px] text-text-muted">Đang tải…</div>;

  const dang = tatCaDv.find((d) => d.id === chon) ?? null;
  const dsDang = thanhVien.get(chon) ?? [];
  const truongDang = dang ? truongCua(dang.id) : [];
  const laCd = dang?.loai === "chuc_danh";
  // TRƯỞNG CHÍNH (Mr. Đại chốt 03/10/2026 — cột uy_quyen_truong): đơn vị có từ 2 người làm trưởng thì chọn MỘT người để máy biết ai
  // là người giao việc khi máy tự giao. Trưởng còn lại = TRƯỞNG PHỤ (chốt lại 08/10): đủ quyền trưởng, chỉ không đứng tên khi máy tự
  // giao · không là người mặc định nhận việc của phòng · không hiện tên ở Thư mục. Ứng viên = các trưởng
  // (biên chế + kiêm nhiệm) cộng người đang được chọn sẵn (dữ liệu cũ thời "ủy quyền").
  const nguoiUyQuyen = dang?.uy_quyen_truong ? nguoi.find((n) => n.id === dang.uy_quyen_truong) ?? null : null;
  const ungVien = [
    ...truongDang.map((t) => t.nguoi),
    ...(nguoiUyQuyen && !truongDang.some((t) => t.nguoi.id === nguoiUyQuyen.id) ? [nguoiUyQuyen] : []),
  ];
  const truongKhac = nguoiUyQuyen ? truongDang.filter((t) => t.nguoi.id !== nguoiUyQuyen.id) : [];
  const chuaGan = (thanhVien.get(CHUA_GAN) ?? []).length;

  return (
    <The
      tieuDe={
        <span>
          Tổ chức & người dùng
          <span className="ml-2 text-[11px] font-normal text-text-muted">
            {cay.length} đơn vị · {nguoi.length} người{chuaGan ? ` · ${chuaGan} chưa gán đơn vị` : ""}
          </span>
        </span>
      }
      phai={
        <>
          <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            <input type="checkbox" checked={caNgung} onChange={(e) => setCaNgung(e.target.checked)} className="accent-[var(--accent)]" /> Đơn vị đã ngừng
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            <input type="checkbox" checked={caKhoa} onChange={(e) => setCaKhoa(e.target.checked)} className="accent-[var(--accent)]" /> Tài khoản bị khóa
          </label>
          {dv.duLieu.them_goc_duoc && (
            <Nut nho onClick={() => setSuaDv({ che_do: "them", cha: null })}>
              <Plus className="h-3.5 w-3.5" /> Đơn vị gốc
            </Nut>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ---------- Trái: tìm người + cây đơn vị ---------- */}
        <div className="lg:w-[330px] lg:min-w-[330px]">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-text-muted" />
            <input className={`${LOP_O_NHAP} pl-7`} placeholder="Tìm người: tên, email, chức vụ…" value={tim} onChange={(e) => setTim(e.target.value)} />
          </div>
          {tim.trim() ? (
            <div className="space-y-0.5">
              {timThay.length === 0 && <p className="px-1 py-2 text-[12px] text-text-muted">Không ai khớp.</p>}
              {timThay.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-white/5"
                  onClick={() => {
                    moDonVi(n.don_vi_id ?? CHUA_GAN, n.id);
                    setTim("");
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-text">{n.ten}</span>
                    <span className="block truncate text-[11px] text-text-muted">
                      {n.don_vi_id ? tenDv(n.don_vi_id) : "Chưa gán đơn vị"}
                      {n.chuc_vu ? ` · ${n.chuc_vu}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="scroll-thin max-h-[70vh] space-y-px overflow-y-auto pr-1">
              {cay.map((d) => {
                const tr = truongCua(d.id);
                const soNguoi = (thanhVien.get(d.id) ?? []).length;
                // Có từ 2 trưởng mà ĐÃ chọn trưởng chính → máy đã biết ai giao việc, không báo nữa
                const coTruongChinh = !!d.uy_quyen_truong && nguoi.some((n) => n.id === d.uy_quyen_truong && n.active);
                const canhBao = CAN_TRUONG.has(d.loai) && d.active ? (tr.length > 1 && !coTruongChinh ? `${tr.length} trưởng` : tr.length === 0 && soNguoi ? "chưa có trưởng" : "") : "";
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => moDonVi(d.id)}
                    className={`flex w-full items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-[12.5px] ${d.id === chon ? "bg-accent/15 text-text" : "text-text-secondary hover:bg-white/5"} ${d.active ? "" : "opacity-50"}`}
                    style={{ paddingLeft: 6 + d.sau * 16 }}
                  >
                    <span className="min-w-0 flex-1 truncate">{d.ten}</span>
                    {canhBao && <span className="whitespace-nowrap text-[10.5px] text-yellow">⚠ {canhBao}</span>}
                    <span className="text-[11px] text-text-muted">{soNguoi || ""}</span>
                  </button>
                );
              })}
              {chuaGan > 0 && (
                <button
                  type="button"
                  onClick={() => moDonVi(CHUA_GAN)}
                  className={`mt-2 flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-[12.5px] ${chon === CHUA_GAN ? "bg-accent/15 text-text" : "text-yellow hover:bg-white/5"}`}
                >
                  <span className="flex-1">Chưa gán đơn vị</span>
                  <span className="text-[11px]">{chuaGan}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---------- Phải: đơn vị đang chọn ---------- */}
        <div ref={khungPhai} className="min-w-0 flex-1 rounded-sm border border-border p-3">
          {chon === CHUA_GAN ? (
            <div className="mb-3">
              <div className="text-[14px] font-bold text-text">Chưa gán đơn vị</div>
              <div className="text-[11.5px] text-text-muted">Đăng nhập được, quyền tối thiểu. Bấm Sửa để gán đơn vị.</div>
            </div>
          ) : dang ? (
            <div className="mb-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-text">
                    {dang.ten}
                    {!dang.active && <span className="ml-1.5 text-[10px] font-bold text-red">NGỪNG</span>}
                  </div>
                  <div className="text-[11.5px] text-text-muted">
                    {dang.ten_ngan} · <span className="font-mono">{dang.id}</span> · cấp {dang.cap} · {dv.duLieu.loai[dang.loai] ?? dang.loai}
                    {dang.mau_ma ? ` · mẫu ${dang.mau_ma.replace("form-", "Form ")}` : ""}
                  </div>
                </div>
                {dang.sua_duoc && (
                  <div className="flex flex-wrap gap-1">
                    <Nut nho onClick={() => setSuaDv({ che_do: "sua", dv: dang })}>
                      <Pencil className="h-3 w-3" /> Sửa đơn vị
                    </Nut>
                    {dang.active && (
                      <Nut nho onClick={() => setSuaDv({ che_do: "them", cha: dang })}>
                        <Plus className="h-3 w-3" /> Đơn vị con
                      </Nut>
                    )}
                    {dang.active ? (
                      <Nut nho kieu="nhat" title="Ngừng hoạt động" onClick={() => void doiHoatDong(dang, false)}>
                        <Ban className="h-3 w-3" />
                      </Nut>
                    ) : (
                      <Nut nho kieu="nhat" title="Mở lại" onClick={() => void doiHoatDong(dang, true)}>
                        <RotateCcw className="h-3 w-3" />
                      </Nut>
                    )}
                  </div>
                )}
              </div>
              {/* Trưởng: máy tự tính từ vai trò — chữ trần (luật 28) */}
              <div className="mt-2 text-[12px] text-text-secondary">
                {laCd ? (
                  <>
                    Người giữ chức danh: <b className="text-text">{dsDang[0]?.nguoi.ten ?? "chưa có"}</b>
                    <span className="text-text-muted"> · tên đơn vị máy tự ghép, sửa chức danh ở «Sửa đơn vị»</span>
                  </>
                ) : CAN_TRUONG.has(dang.loai) ? (
                  nguoiUyQuyen ? (
                    <>
                      ★ Trưởng chính: <b className="text-text">{nguoiUyQuyen.ten}</b>
                      <span className="text-text-muted"> — đứng tên người giao khi máy tự giao, người mặc định nhận việc giao cho cả phòng, tên trưởng ở Thư mục</span>
                      {truongKhac.length > 0 && (
                        <>
                          <span> · trưởng phụ: </span>
                          <b className="text-text">{truongKhac.map((t) => t.nguoi.ten).join(", ")}</b>
                          <span className="text-text-muted"> — đủ quyền trưởng (giao việc cho nhân viên, chuyển tiếp việc của phòng, Xong việc · Gia hạn · Phối hợp), nhận chuông như trưởng</span>
                        </>
                      )}
                    </>
                  ) : truongDang.length === 1 ? (
                    <>
                      ★ Trưởng: <b className="text-text">{truongDang[0].nguoi.ten}</b>
                      {truongDang[0].kiem !== undefined && <span className="text-text-muted"> (kiêm nhiệm)</span>}
                    </>
                  ) : truongDang.length > 1 ? (
                    <span className="text-yellow">
                      ⚠ {truongDang.length} người cùng vai trò trưởng: {truongDang.map((t) => t.nguoi.ten).join(", ")} — chọn Trưởng chính ở ô dưới để máy biết ai là người giao việc
                    </span>
                  ) : (
                    <span className="text-yellow">⚠ Chưa có trưởng (chưa ai có vai trò «{tenVt(VAI_TRUONG)}»)</span>
                  )
                ) : null}
              </div>
              {/* Chỉ hiện khi có từ 2 người làm trưởng (Mr. Đại chốt 03/10); không có quyền sửa đơn vị thì ẨN (luật 3004) */}
              {CAN_TRUONG.has(dang.loai) && dang.sua_duoc && ungVien.length > 1 && (
                <label className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-text-secondary">
                  Trưởng chính:
                  <select
                    className={`${LOP_O_NHAP} !w-auto`}
                    value={dang.uy_quyen_truong ?? ""}
                    title="Trưởng chính: đứng tên khi máy tự giao, nhận mặc định việc giao cho cả phòng, tên ở Thư mục. Trưởng phụ vẫn đủ quyền trưởng. Chọn là lưu ngay"
                    onChange={(e) => void uyQuyen(dang, e.target.value)}
                  >
                    <option value="">— Chưa chọn —</option>
                    {ungVien.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.ten}
                        {n.chuc_vu ? ` · ${n.chuc_vu}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {/* Ngoài SCI (db/85 — Mr. Đại chốt 09–10/10): bấm là lưu; không sửa được đơn vị thì ẨN (luật 3004) */}
              {dang.sua_duoc && dang.loai === "don_vi" && (
                <label
                  className="mt-2 flex items-center gap-2 text-[12px] text-text-secondary"
                  title="SCI PMC, SCI E&C là công ty SCI có cổ phần, không phải đơn vị trực thuộc. Đơn vị trực thuộc chỉ có các BQL và các nhà máy. Đánh dấu thì người ngoài đơn vị này chỉ giao việc cho CẢ đơn vị, không giao đích danh một cá nhân của đơn vị (giao mới, giao chuyển tiếp) — người đứng đầu đơn vị tự giao tiếp cho nhân viên của mình"
                >
                  <input type="checkbox" className="accent-[var(--accent)]" checked={!!dang.ngoai_sci} onChange={(e) => void doiNgoaiSci(dang, e.target.checked)} />
                  Ngoài SCI (công ty SCI có cổ phần, không trực thuộc)
                </label>
              )}
              {/* Chức năng nhiệm vụ (db/81): chữ trần khi xem (luật 28); bút sửa chỉ hiện với người sửa được đơn vị */}
              <div className="mt-3 border-t border-border pt-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
                  Chức năng nhiệm vụ
                  <span className="text-[11px] font-normal text-text-muted">· 🤖 AI đọc khi soạn giao việc ở Cây việc</span>
                  {dang.sua_duoc && suaCn === null && (
                    <Nut nho kieu="nhat" title="Sửa chức năng nhiệm vụ" onClick={() => setSuaCn(dang.chuc_nang ?? "")}>
                      <Pencil className="h-3 w-3" /> Sửa
                    </Nut>
                  )}
                </div>
                {suaCn !== null ? (
                  <div className="mt-1.5">
                    <textarea
                      className={`${LOP_O_NHAP} min-h-[180px] font-normal leading-relaxed`}
                      value={suaCn}
                      onChange={(e) => setSuaCn(e.target.value)}
                      placeholder="Mỗi nhóm nhiệm vụ một dòng. Ghi cả nguồn (số nghị quyết, ngày)."
                    />
                    <div className="mt-1.5 flex gap-1.5">
                      <Nut nho onClick={() => void luuChucNang(dang, suaCn)}>Lưu</Nut>
                      <Nut nho kieu="nhat" onClick={() => setSuaCn(null)}>Thôi</Nut>
                    </div>
                  </div>
                ) : dang.chuc_nang ? (
                  <div className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-text-secondary">{dang.chuc_nang}</div>
                ) : (
                  <div className="mt-1 text-[12px] text-text-muted">Chưa ghi — 🤖 AI không biết đơn vị này làm việc gì.</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-text-muted">Chọn một đơn vị bên trái.</p>
          )}

          {(dang || chon === CHUA_GAN) && (
            <>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-text-secondary">{dsDang.length} người</span>
                {((chon === CHUA_GAN && (toi.la_quan_tri || dv.duLieu.them_goc_duoc)) || dang?.sua_duoc) && (
                  <Nut nho kieu="chinh" onClick={() => setSuaNd("moi")}>
                    <UserPlus className="h-3.5 w-3.5" /> Thêm người{dang ? " vào đây" : ""}
                  </Nut>
                )}
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Người</th>
                      <th>Chức vụ</th>
                      <th>Vai trò</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {dsDang.map(({ nguoi: n, kiem }) => (
                      <tr key={n.id + (kiem !== undefined ? "-kiem" : "")} className={`${n.active ? "" : "opacity-50"} ${sang === n.id ? "bg-accent/10" : ""}`}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 min-w-7 items-center justify-center rounded-full border border-border text-[10px] font-bold text-text-secondary">
                              {chuCaiDau(n.ten)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-text">
                                {n.ten}
                                {!laCd && n.vai_tro.includes(VAI_TRUONG) && <span className="ml-1.5 text-[10.5px] font-bold text-accent">★ TRƯỞNG</span>}
                                {dang?.uy_quyen_truong === n.id && <span className="ml-1.5 text-[10.5px] font-bold text-accent">TRƯỞNG CHÍNH</span>}
                                {n.la_quan_tri && <span className="ml-1.5 text-[10px] font-bold text-accent">QUẢN TRỊ</span>}
                                {!n.active && <span className="ml-1.5 text-[10px] font-bold text-red">ĐÃ KHÓA</span>}
                              </div>
                              <div className="text-[11px] text-text-muted">{n.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {kiem !== undefined ? (
                            <>
                              kiêm {kiem || "nhiệm"}
                              <div className="text-[10.5px] text-text-muted">
                                biên chế ở {tenDv(n.don_vi_id)}
                                {n.chuc_vu ? ` · ${n.chuc_vu}` : ""}
                              </div>
                            </>
                          ) : (
                            <>
                              {n.chuc_vu}
                              {n.kiem_nhiem.length > 0 && (
                                <div className="text-[10.5px] text-text-muted">
                                  kiêm {n.kiem_nhiem.map((k) => `${k.chuc_vu ? `${k.chuc_vu} ` : ""}${tenDv(k.don_vi_id)}`).join(", ")}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="text-[11.5px] text-text-secondary">{n.vai_tro.map(tenVt).join(" · ")}</td>
                        <td className="text-right">
                          {n.sua_duoc && (!n.la_quan_tri || toi.la_quan_tri) && (
                            <Nut nho kieu="nhat" onClick={() => setSuaNd(n)}>
                              Sửa
                            </Nut>
                          )}
                        </td>
                      </tr>
                    ))}
                    {dsDang.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-text-muted">
                          Đơn vị chưa có ai.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {suaDv && <KhaiHuongDan ma="cd-to-chuc-don-vi" uuTien={2} />}
      {suaNd && <KhaiHuongDan ma="cd-to-chuc-nguoi" uuTien={2} />}
      {suaDv && (
        <SuaDonVi
          sua={suaDv}
          tatCa={tatCaDv}
          loai={dv.duLieu.loai}
          mau={dv.duLieu.mau}
          dong={() => setSuaDv(null)}
          xong={async (chu) => {
            bao(chu);
            setSuaDv(null);
            await Promise.all([dv.taiLai(), nd.taiLai()]);
          }}
        />
      )}
      {suaNd && (
        <SuaNguoiDung
          nguoi={suaNd === "moi" ? null : suaNd}
          donViMacDinh={suaNd === "moi" && chon !== CHUA_GAN ? chon : ""}
          toi={toi}
          donVi={cayDu}
          vaiTro={vt.duLieu}
          dong={() => setSuaNd(null)}
          xong={async (chu, mk) => {
            bao(chu);
            setSuaNd(null);
            if (mk) setMatKhauMoi(mk);
            await Promise.all([nd.taiLai(), dv.taiLai()]);
          }}
          bao={bao}
        />
      )}
      {matKhauMoi && <HienMatKhau {...matKhauMoi} dong={() => setMatKhauMoi(null)} />}
    </The>
  );
}
