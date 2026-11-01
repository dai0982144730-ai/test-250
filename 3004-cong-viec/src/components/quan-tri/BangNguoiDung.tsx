"use client";
// Thẻ Người dùng: lọc theo đơn vị / chưa gán / tìm, thêm, sửa (đơn vị, chức vụ, cấp, vai trò, kiêm nhiệm), khóa, đặt lại mật khẩu.
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Lock, Plus, Search, Trash2, Unlock, UserPlus } from "lucide-react";
import { HopLoi, HopThoai, LOP_O_NHAP, Nut, The, Truong, goiApi } from "@/components/layout/giao-dien";
import { chuCaiDau, useTai, xepTheoCay, type Bao, type DonViQT, type KetQuaDonVi, type KetQuaVaiTro, type NguoiDungQT } from "./du-lieu";
import type { ToiQuanTri } from "./TrangQuanTri";

export function BangNguoiDung({ toi, bao, donViBanDau }: { toi: ToiQuanTri; bao: Bao; donViBanDau: string }) {
  const [donVi, setDonVi] = useState(donViBanDau);
  const [tim, setTim] = useState("");
  const [timTre, setTimTre] = useState("");
  const [caKhoa, setCaKhoa] = useState(false);
  const [sua, setSua] = useState<NguoiDungQT | "moi" | null>(null);
  const [matKhauMoi, setMatKhauMoi] = useState<{ email: string; mat_khau: string } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setTimTre(tim), 250);
    return () => window.clearTimeout(t);
  }, [tim]);

  const url = `/api/quan-tri/nguoi-dung?don_vi=${encodeURIComponent(donVi)}&tim=${encodeURIComponent(timTre)}${caKhoa ? "&ca_bi_khoa=1" : ""}`;
  const nd = useTai<{ nguoi_dung: NguoiDungQT[] }>(url);
  const dv = useTai<KetQuaDonVi>("/api/quan-tri/don-vi");
  const vt = useTai<KetQuaVaiTro>("/api/quan-tri/vai-tro");

  const cay = useMemo(() => xepTheoCay(dv.duLieu?.don_vi ?? []), [dv.duLieu]);
  const tenDv = (id: string | null) => (id ? dv.duLieu?.don_vi.find((d) => d.id === id)?.ten_ngan ?? id : null);
  const tenVt = (id: string) => vt.duLieu?.vai_tro.find((v) => v.id === id)?.ten ?? id;
  // Trưởng chính (chốt 03/10/2026): người được chọn có đủ quyền trưởng của đơn vị dù cột vai trò trống (phien.ts tự cấp) —
  // hiện ra để Admin khỏi tưởng người đó không có quyền (kiểm độc lập lần 4 ⚪7)
  const truongChinhCua = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of dv.duLieu?.don_vi ?? []) if (d.uy_quyen_truong) m.set(d.uy_quyen_truong, [...(m.get(d.uy_quyen_truong) ?? []), d.ten_ngan ?? d.ten]);
    return m;
  }, [dv.duLieu]);

  const danhSach = nd.duLieu?.nguoi_dung ?? [];

  return (
    <The
      tieuDe={
        <span>
          Người dùng
          <span className="ml-2 text-[11px] font-normal text-text-muted">
            {danhSach.length} người{dv.duLieu && dv.duLieu.chua_gan > 0 ? ` · ${dv.duLieu.chua_gan} chưa gán đơn vị` : ""}
          </span>
        </span>
      }
      phai={
        <Nut nho kieu="chinh" onClick={() => setSua("moi")}>
          <UserPlus className="h-3.5 w-3.5" /> Thêm người dùng
        </Nut>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-text-muted" />
          <input className={`${LOP_O_NHAP} pl-7`} placeholder="Tìm tên, email, chức vụ…" value={tim} onChange={(e) => setTim(e.target.value)} />
        </div>
        <select className={`${LOP_O_NHAP} !w-auto`} value={donVi} onChange={(e) => setDonVi(e.target.value)}>
          <option value="">Mọi đơn vị</option>
          <option value="chua_gan">— Chưa gán đơn vị —</option>
          {cay.map((d) => (
            <option key={d.id} value={d.id}>
              {"  ".repeat(d.sau)}
              {d.ten}
              {d.active ? "" : " (ngừng)"}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
          <input type="checkbox" checked={caKhoa} onChange={(e) => setCaKhoa(e.target.checked)} className="accent-[var(--accent)]" /> Hiện cả tài khoản bị khóa
        </label>
      </div>
      <HopLoi loi={nd.loi ?? dv.loi ?? vt.loi} />
      <div className="scroll-thin overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Đơn vị</th>
              <th>Chức vụ</th>
              <th>Vai trò</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {danhSach.map((n) => (
              <tr key={n.id} className={n.active ? "" : "opacity-50"}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 min-w-7 items-center justify-center rounded-full border border-border text-[10px] font-bold text-text-secondary">
                      {chuCaiDau(n.ten)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-text">
                        {n.ten}
                        {n.la_quan_tri && <span className="ml-1.5 text-[10px] font-bold text-accent">QUẢN TRỊ</span>}
                        {!n.active && <span className="ml-1.5 text-[10px] font-bold text-red">ĐÃ KHÓA</span>}
                      </div>
                      <div className="text-[11px] text-text-muted">{n.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {n.don_vi_id ? tenDv(n.don_vi_id) : <span className="text-yellow">Chưa gán</span>}
                  {n.kiem_nhiem.length > 0 && (
                    <div className="text-[10.5px] text-text-muted">kiêm {n.kiem_nhiem.map((k) => tenDv(k.don_vi_id)).join(", ")}</div>
                  )}
                </td>
                <td>
                  {n.chuc_vu}
                  {n.cap_chuc_vu !== null && <div className="text-[10.5px] text-text-muted">cấp {n.cap_chuc_vu} theo chức vụ</div>}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {n.vai_tro.map((v) => (
                      <span key={v} className="rounded-sm border border-border px-1.5 py-0.5 text-[10.5px] text-text-secondary">
                        {tenVt(v)}
                      </span>
                    ))}
                  </div>
                  {truongChinhCua.has(n.id) && (
                    <div className="mt-0.5 text-[10.5px] text-text-muted">Trưởng chính {truongChinhCua.get(n.id)!.join(", ")} — đủ quyền trưởng</div>
                  )}
                </td>
                <td className="text-right">
                  {n.sua_duoc && (!n.la_quan_tri || toi.la_quan_tri) && (
                    <Nut nho kieu="nhat" onClick={() => setSua(n)}>
                      Sửa
                    </Nut>
                  )}
                </td>
              </tr>
            ))}
            {danhSach.length === 0 && nd.duLieu && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-text-muted">
                  Không có người dùng nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sua && dv.duLieu && vt.duLieu && (
        <SuaNguoiDung
          nguoi={sua === "moi" ? null : sua}
          toi={toi}
          donVi={cay}
          vaiTro={vt.duLieu}
          dong={() => setSua(null)}
          xong={async (chu, mk) => {
            bao(chu);
            setSua(null);
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

export function HienMatKhau({ email, mat_khau, dong }: { email: string; mat_khau: string; dong: () => void }) {
  return (
    <HopThoai tieuDe="Mật khẩu mới" dong={dong} rong="max-w-[380px]" chan={<Nut kieu="chinh" onClick={dong}>Đã ghi lại</Nut>}>
      <p className="text-[12px] text-text-secondary">
        Mật khẩu của <b className="text-text">{email}</b> — chỉ hiện <b>một lần</b>. Gửi cho người dùng và nhắc họ đổi sau khi đăng nhập.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded-sm border border-border bg-bg px-3 py-2 font-mono text-[14px] text-accent">{mat_khau}</code>
        <Nut nho onClick={() => void navigator.clipboard?.writeText(mat_khau)}>
          Chép
        </Nut>
      </div>
    </HopThoai>
  );
}

export function SuaNguoiDung({
  nguoi,
  toi,
  donVi,
  vaiTro,
  dong,
  xong,
  bao,
  donViMacDinh = "",
}: {
  donViMacDinh?: string;
  nguoi: NguoiDungQT | null;
  toi: ToiQuanTri;
  donVi: (DonViQT & { sau: number })[];
  vaiTro: KetQuaVaiTro;
  dong: () => void;
  xong: (chu: string, mk?: { email: string; mat_khau: string }) => void;
  bao: Bao;
}) {
  const [email, setEmail] = useState(nguoi?.email ?? "");
  const [ten, setTen] = useState(nguoi?.ten ?? "");
  const [donViId, setDonViId] = useState(nguoi?.don_vi_id ?? donViMacDinh);
  const [chucVu, setChucVu] = useState(nguoi?.chuc_vu ?? "");
  const [cap, setCap] = useState(nguoi?.cap_chuc_vu === null || nguoi?.cap_chuc_vu === undefined ? "" : String(nguoi.cap_chuc_vu));
  const [vt, setVt] = useState<string[]>(nguoi?.vai_tro ?? []);
  const [kn, setKn] = useState<{ don_vi_id: string; chuc_vu: string }[]>(
    (nguoi?.kiem_nhiem ?? []).map((k) => ({ don_vi_id: k.don_vi_id, chuc_vu: k.chuc_vu ?? "" })),
  );
  // "Làm trưởng ở" (db/86, Mr. Đại chốt 10/10/2026): vai Trưởng chỉ áp ở đơn vị được đánh dấu; không đánh dấu ô nào = mọi đơn vị
  const [tt, setTt] = useState<string[]>(nguoi?.truong_tai ?? []);
  const [laQT, setLaQT] = useState(nguoi?.la_quan_tri ?? false);
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  const dvHoatDong = donVi.filter((d) => d.active || d.id === nguoi?.don_vi_id);
  const dvCuaNguoi = Array.from(new Set([donViId, ...kn.map((k) => k.don_vi_id)].filter((d): d is string => !!d)));
  // Người thuộc đơn vị chức danh: chức vụ = chức danh, máy tự điền (khai một nơi — ở đơn vị)
  const dvChucDanh = donVi.find((d) => d.id === donViId && d.loai === "chuc_danh");

  async function luu() {
    setDang(true);
    setLoi(null);
    const du = {
      ten,
      don_vi_id: donViId || null,
      chuc_vu: chucVu || null,
      cap_chuc_vu: cap === "" ? null : Number(cap),
      vai_tro: vt,
      kiem_nhiem: kn.filter((k) => k.don_vi_id).map((k) => ({ don_vi_id: k.don_vi_id, chuc_vu: k.chuc_vu || null })),
      ...(toi.la_quan_tri ? { la_quan_tri: laQT } : {}),
    };
    try {
      if (nguoi) {
        await goiApi(`/api/quan-tri/nguoi-dung/${encodeURIComponent(nguoi.id)}`, { method: "PATCH", body: { ...du, email, truong_tai: tt } });
        xong(`Đã lưu ${ten}`);
      } else {
        const r = await goiApi<{ nguoi_dung: NguoiDungQT; mat_khau?: string }>("/api/quan-tri/nguoi-dung", {
          body: { ...du, email, mat_khau: matKhau || undefined },
        });
        xong(`Đã thêm ${r.nguoi_dung.ten}${r.nguoi_dung.don_vi_id ? "" : " (chưa gán đơn vị — quản trị viên được nhắc)"}`, r.mat_khau ? { email: r.nguoi_dung.email, mat_khau: r.mat_khau } : undefined);
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setDang(false);
    }
  }

  async function khoa(khoaLai: boolean) {
    if (!nguoi) return;
    if (khoaLai && !window.confirm(`Khóa tài khoản ${nguoi.ten}? Người này sẽ không đăng nhập được.`)) return;
    try {
      await goiApi(`/api/quan-tri/nguoi-dung/${encodeURIComponent(nguoi.id)}`, { method: "PATCH", body: { active: !khoaLai } });
      xong(khoaLai ? `Đã khóa ${nguoi.ten}` : `Đã mở khóa ${nguoi.ten}`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đổi được");
    }
  }

  async function datLai() {
    if (!nguoi || !window.confirm(`Đặt lại mật khẩu cho ${nguoi.ten}? Mật khẩu cũ hết dùng ngay.`)) return;
    try {
      const r = await goiApi<{ mat_khau: string }>(`/api/quan-tri/nguoi-dung/${encodeURIComponent(nguoi.id)}/dat-lai-mat-khau`, { body: {} });
      xong(`Đã đặt lại mật khẩu cho ${nguoi.ten}`, { email: nguoi.email, mat_khau: r.mat_khau });
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không đặt lại được", false);
    }
  }

  return (
    <HopThoai
      tieuDe={nguoi ? `Sửa người dùng: ${nguoi.ten}` : "Thêm người dùng"}
      dong={dong}
      rong="max-w-[620px]"
      chan={
        <>
          {nguoi && (
            <div className="mr-auto flex gap-2">
              <Nut nho onClick={() => void datLai()}>
                <KeyRound className="h-3.5 w-3.5" /> Đặt lại mật khẩu
              </Nut>
              {nguoi.active ? (
                nguoi.id !== toi.id && (
                  <Nut nho kieu="nguy" onClick={() => void khoa(true)}>
                    <Lock className="h-3.5 w-3.5" /> Khóa
                  </Nut>
                )
              ) : (
                <Nut nho onClick={() => void khoa(false)}>
                  <Unlock className="h-3.5 w-3.5" /> Mở khóa
                </Nut>
              )}
            </div>
          )}
          <Nut onClick={dong}>Hủy</Nut>
          <Nut kieu="chinh" disabled={dang || !ten.trim() || !email.trim()} onClick={() => void luu()}>
            {dang ? "Đang lưu…" : "Lưu"}
          </Nut>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Truong nhan="Email (tên đăng nhập)">
          {/* Sửa được email: mã tài khoản bên trong giữ nguyên, việc / lịch sử cũ vẫn của người này */}
          <input className={LOP_O_NHAP} value={email} autoFocus={!nguoi} onChange={(e) => setEmail(e.target.value)} placeholder="ten@scigroup.vn" />
        </Truong>
        <Truong nhan="Họ tên">
          <input className={LOP_O_NHAP} value={ten} onChange={(e) => setTen(e.target.value)} />
        </Truong>
        <Truong nhan="Đơn vị" goiY={!donViId ? "Chưa gán: đăng nhập được, quyền tối thiểu; quản trị viên được nhắc." : undefined}>
          <select className={LOP_O_NHAP} value={donViId} onChange={(e) => setDonViId(e.target.value)}>
            <option value="">— Chưa gán đơn vị —</option>
            {dvHoatDong.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.sua_duoc}>
                {"  ".repeat(d.sau)}
                {d.ten} (cấp {d.cap})
              </option>
            ))}
          </select>
        </Truong>
        <Truong nhan="Chức vụ">
          {dvChucDanh ? (
            <input className={LOP_O_NHAP} disabled value={dvChucDanh.chuc_danh ?? dvChucDanh.ten.split(" · ")[0]} title="Máy tự lấy theo chức danh của đơn vị — sửa ở đơn vị" />
          ) : (
            <input className={LOP_O_NHAP} value={chucVu} onChange={(e) => setChucVu(e.target.value)} placeholder="Nhân viên, Phó phòng, Trưởng phòng…" />
          )}
        </Truong>
        <Truong nhan="Cấp theo chức vụ" goiY="Để trống = lấy cấp của đơn vị. Vd Chủ tịch HĐQT cấp 0, cao hơn Ban TGĐ.">
          <input className={LOP_O_NHAP} type="number" min={0} max={99} value={cap} onChange={(e) => setCap(e.target.value)} />
        </Truong>
        {!nguoi && (
          <Truong nhan="Mật khẩu ban đầu" goiY="Để trống = mật khẩu lần đầu là chính email đăng nhập; người dùng tự đổi sau.">
            <input className={LOP_O_NHAP} type="text" value={matKhau} onChange={(e) => setMatKhau(e.target.value)} autoComplete="off" />
          </Truong>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-semibold text-text-secondary">Vai trò {!nguoi && vt.length === 0 && <span className="font-normal text-text-muted">(trống = vai trò mặc định trong Cài đặt)</span>}</div>
        <div className="grid gap-1 sm:grid-cols-2">
          {vaiTro.vai_tro.map((v) => (
            <label key={v.id} className="flex items-start gap-2 rounded-sm px-1 py-0.5 text-[12px] text-text-secondary hover:bg-white/5">
              <input
                type="checkbox"
                className="mt-0.5 accent-[var(--accent)]"
                checked={vt.includes(v.id)}
                onChange={(e) => setVt((c) => (e.target.checked ? [...c, v.id] : c.filter((x) => x !== v.id)))}
              />
              <span>
                <span className="text-text">{v.ten}</span>
                {v.mo_ta && <span className="block text-[10.5px] text-text-muted">{v.mo_ta}</span>}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-text-secondary">Kiêm nhiệm (thuộc thêm đơn vị khác)</span>
          <Nut nho kieu="nhat" onClick={() => setKn((c) => [...c, { don_vi_id: "", chuc_vu: "" }])}>
            <Plus className="h-3 w-3" /> Thêm
          </Nut>
        </div>
        {kn.length === 0 && <p className="text-[11px] text-text-muted">Không kiêm nhiệm.</p>}
        {kn.map((k, i) => (
          <div key={i} className="mb-1.5 flex gap-2">
            <select
              className={LOP_O_NHAP}
              value={k.don_vi_id}
              onChange={(e) => setKn((c) => c.map((x, j) => (j === i ? { ...x, don_vi_id: e.target.value } : x)))}
            >
              <option value="">— Chọn đơn vị —</option>
              {dvHoatDong
                .filter((d) => d.id !== donViId)
                .map((d) => (
                  <option key={d.id} value={d.id} disabled={!d.sua_duoc}>
                    {"  ".repeat(d.sau)}
                    {d.ten}
                  </option>
                ))}
            </select>
            <input
              className={`${LOP_O_NHAP} max-w-[180px]`}
              placeholder="Chức vụ kiêm nhiệm"
              value={k.chuc_vu}
              onChange={(e) => setKn((c) => c.map((x, j) => (j === i ? { ...x, chuc_vu: e.target.value } : x)))}
            />
            <button type="button" className="text-text-muted hover:text-red" title="Bỏ" onClick={() => setKn((c) => c.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Chỉ cần khi mang vai Trưởng mà thuộc từ 2 đơn vị (chính + kiêm nhiệm): chọn nơi thật sự làm trưởng */}
      {nguoi && vt.includes("truong-don-vi") && dvCuaNguoi.length > 1 && (
        <div className="mt-4">
          <div className="mb-1 text-[11px] font-semibold text-text-secondary">
            Làm trưởng ở{" "}
            <span className="font-normal text-text-muted">
              — vai Trưởng chỉ áp ở đơn vị được đánh dấu; không đánh dấu ô nào = trưởng ở mọi đơn vị của người này
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {dvCuaNguoi.map((d) => (
              <label key={d} className="flex items-center gap-2 px-1 py-0.5 text-[12px] text-text-secondary">
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={tt.includes(d)}
                  onChange={(e) => setTt((c) => (e.target.checked ? [...c, d] : c.filter((x) => x !== d)))}
                />
                {donVi.find((x) => x.id === d)?.ten ?? d}
              </label>
            ))}
          </div>
        </div>
      )}

      {toi.la_quan_tri && (
        <label className="mt-4 flex items-center gap-2 text-[12px] text-text-secondary">
          <input type="checkbox" className="accent-[var(--accent)]" checked={laQT} disabled={nguoi?.id === toi.id} onChange={(e) => setLaQT(e.target.checked)} />
          Quản trị viên (luôn có mọi quyền, không phụ thuộc vai trò)
        </label>
      )}
      <div className="mt-3">
        <HopLoi loi={loi} />
      </div>
    </HopThoai>
  );
}
