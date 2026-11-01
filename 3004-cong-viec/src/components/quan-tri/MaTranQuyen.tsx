"use client";
// Ma trận Vai trò × Quyền. Bấm từng ô để xoay vòng phạm vi:
// Không có → Của mình → Đơn vị mình → Mình + cấp dưới → Toàn bộ → Không có. "Lưu thay đổi" ghi vào nhật ký.
import { useMemo, useState } from "react";
import { Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { PHAM_VI_NHAN, phamViTiep, phamViKhongRongHon } from "@sci/identity";
import type { PhamVi, Quyen } from "@/lib/types";
import { HopLoi, HopThoai, LOP_O_NHAP, Nut, The, Truong, goiApi } from "@/components/layout/giao-dien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { useTai, type Bao, type KetQuaVaiTro, type VaiTroQT } from "./du-lieu";
import type { ToiQuanTri } from "./TrangQuanTri";

const NHOM_QUYEN: { ten: string; tien_to: string[] }[] = [
  { ten: "Thư mục và tài liệu", tien_to: ["tai_lieu.", "van_thu."] },
  { ten: "Công việc và sổ cái", tien_to: ["cong_viec.", "so_cai.", "lich_su."] },
  { ten: "Quản trị", tien_to: [] }, // mọi quyền còn lại (quyền mới thêm vào danh mục tự hiện ở đây)
];

const MAU_PHAM_VI: Record<PhamVi | "khong", string> = {
  khong: "text-text-muted border-border-light",
  cua_minh: "text-text-secondary border-border",
  don_vi: "text-blue border-blue/40",
  don_vi_va_cap_duoi: "text-yellow border-yellow/40",
  toan_bo: "text-green border-green/40",
};

type Doi = Record<string, Partial<Record<Quyen, PhamVi | null>>>; // vai trò → quyền → phạm vi mới

export function MaTranQuyen({ bao }: { toi: ToiQuanTri; bao: Bao }) {
  const { duLieu, loi, taiLai } = useTai<KetQuaVaiTro>("/api/quan-tri/vai-tro");
  const [doi, setDoi] = useState<Doi>({});
  const [dangLuu, setDangLuu] = useState(false);
  const [sua, setSua] = useState<VaiTroQT | "moi" | null>(null);

  const nhomQuyen = useMemo(() => {
    if (!duLieu) return [];
    const tatCa = Object.keys(duLieu.danh_muc_quyen) as Quyen[];
    const daXep = new Set<string>();
    return NHOM_QUYEN.map((n) => {
      const ds = tatCa.filter((q) => !daXep.has(q) && (n.tien_to.length === 0 || n.tien_to.some((t) => q.startsWith(t))));
      ds.forEach((q) => daXep.add(q));
      return { ten: n.ten, quyen: ds };
    }).filter((n) => n.quyen.length > 0);
  }, [duLieu]);

  if (loi) return <HopLoi loi={loi} />;
  if (!duLieu) return <div className="text-[12px] text-text-muted">Đang tải…</div>;

  const suaDuoc = duLieu.sua_duoc;
  const soDoi = Object.values(doi).reduce((s, m) => s + Object.keys(m).length, 0);

  const giaTri = (v: VaiTroQT, q: Quyen): PhamVi | null => (q in (doi[v.id] ?? {}) ? doi[v.id][q] ?? null : v.quyen[q] ?? null);

  /** Không nâng được phạm vi vượt quyền của chính mình (quản trị viên thì được). */
  const toiDa = (q: Quyen): PhamVi | null => (duLieu.quyen_cua_toi === null ? "toan_bo" : duLieu.quyen_cua_toi[q] ?? null);

  const bam = (v: VaiTroQT, q: Quyen) => {
    if (!suaDuoc) return;
    let moi = phamViTiep(giaTri(v, q));
    // bỏ qua các mức vượt quyền của mình
    while (moi && !phamViKhongRongHon(moi, toiDa(q))) moi = phamViTiep(moi);
    setDoi((c) => {
      const m = { ...(c[v.id] ?? {}) };
      if ((v.quyen[q] ?? null) === moi) delete m[q];
      else m[q] = moi;
      const kq = { ...c, [v.id]: m };
      if (Object.keys(m).length === 0) delete kq[v.id];
      return kq;
    });
  };

  async function luu() {
    setDangLuu(true);
    try {
      for (const [id, quyen] of Object.entries(doi)) await goiApi(`/api/quan-tri/vai-tro/${encodeURIComponent(id)}`, { method: "PATCH", body: { quyen } });
      bao(`Đã lưu ${soDoi} thay đổi quyền. Ghi vào nhật ký.`);
      setDoi({});
      await taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Lưu thất bại", false);
    } finally {
      setDangLuu(false);
    }
  }

  async function xoa(v: VaiTroQT) {
    if (!window.confirm(`Xóa vai trò "${v.ten}"?`)) return;
    try {
      await goiApi(`/api/quan-tri/vai-tro/${encodeURIComponent(v.id)}`, { method: "DELETE" });
      bao(`Đã xóa vai trò ${v.ten}`);
      await taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không xóa được", false);
    }
  }

  return (
    <The
      tieuDe={
        <span>
          Vai trò và quyền
          <span className="ml-2 text-[11px] font-normal text-text-muted">
            Bấm vào ô để đổi phạm vi: Không, Của mình, Đơn vị mình, Đơn vị mình và cấp dưới, Toàn bộ
          </span>
        </span>
      }
      phai={
        suaDuoc && (
          <>
            <Nut nho onClick={() => setSua("moi")}>
              <Plus className="h-3.5 w-3.5" /> Vai trò mới
            </Nut>
            {soDoi > 0 && (
              <Nut nho kieu="nhat" onClick={() => setDoi({})}>
                <RotateCcw className="h-3.5 w-3.5" /> Bỏ thay đổi
              </Nut>
            )}
            <Nut nho kieu="chinh" disabled={soDoi === 0 || dangLuu} onClick={() => void luu()}>
              <Save className="h-3.5 w-3.5" /> {dangLuu ? "Đang lưu…" : `Lưu thay đổi${soDoi ? ` (${soDoi})` : ""}`}
            </Nut>
          </>
        )
      }
    >
      {!suaDuoc && (
        <p className="mb-3 text-[11.5px] text-text-muted">Chỉ người quản lý toàn bộ người dùng mới sửa được ma trận này. Bạn đang xem.</p>
      )}
      <div className="scroll-thin overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="min-w-[240px]">Quyền</th>
              {duLieu.vai_tro.map((v) => (
                <th key={v.id} className="min-w-[118px] text-center" style={{ whiteSpace: "normal" }}>
                  <div className="flex items-start justify-center gap-1">
                    <span className="normal-case tracking-normal text-text-secondary" title={v.mo_ta ?? ""}>
                      {v.ten}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-center gap-1 normal-case tracking-normal">
                    <span className="text-[10px] text-text-muted">
                      {v.so_nguoi} người{v.he_thong ? " · hệ thống" : ""}
                    </span>
                    {suaDuoc && (
                      <button type="button" title="Đổi tên, mô tả" onClick={() => setSua(v)} className="text-text-muted hover:text-accent">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {suaDuoc && !v.he_thong && (
                      <button type="button" title="Xóa vai trò" onClick={() => void xoa(v)} className="text-text-muted hover:text-red">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nhomQuyen.map((n) => [
              <tr key={`nhom-${n.ten}`}>
                <td colSpan={duLieu.vai_tro.length + 1} className="!pt-3 text-[10.5px] font-bold uppercase tracking-wider !text-accent">
                  {n.ten}
                </td>
              </tr>,
              ...n.quyen.map((q) => (
                <tr key={q}>
                  <td>
                    <div className="text-text">{duLieu.danh_muc_quyen[q]}</div>
                    <div className="font-mono text-[10px] text-text-muted">{q}</div>
                  </td>
                  {duLieu.vai_tro.map((v) => {
                    const pv = giaTri(v, q);
                    const daDoi = q in (doi[v.id] ?? {});
                    return (
                      <td key={v.id} className="text-center">
                        <button
                          type="button"
                          disabled={!suaDuoc}
                          onClick={() => bam(v, q)}
                          title={suaDuoc ? "Bấm để đổi phạm vi" : undefined}
                          className={`w-full rounded-sm border px-1.5 py-1 text-[11px] font-semibold transition enabled:hover:border-accent ${MAU_PHAM_VI[pv ?? "khong"]} ${
                            daDoi ? "ring-1 ring-accent" : ""
                          }`}
                        >
                          {pv ? PHAM_VI_NHAN[pv] : "Không"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-text-muted">
        Người có nhiều vai trò lấy phạm vi rộng nhất. Quản trị viên (cờ trên tài khoản) luôn có mọi quyền. Vai trò hệ thống sửa được quyền nhưng không xóa được.
      </p>
      {sua && <KhaiHuongDan ma="cd-vai-tro-moi" uuTien={2} />}
      {sua && (
        <SuaVaiTro
          vaiTro={sua === "moi" ? null : sua}
          tatCa={duLieu.vai_tro}
          dong={() => setSua(null)}
          xong={async (chu) => {
            bao(chu);
            setSua(null);
            await taiLai();
          }}
        />
      )}
    </The>
  );
}

function SuaVaiTro({ vaiTro, tatCa, dong, xong }: { vaiTro: VaiTroQT | null; tatCa: VaiTroQT[]; dong: () => void; xong: (chu: string) => void }) {
  const [ten, setTen] = useState(vaiTro?.ten ?? "");
  const [moTa, setMoTa] = useState(vaiTro?.mo_ta ?? "");
  const [ma, setMa] = useState("");
  const [chepTu, setChepTu] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  async function luu() {
    setDang(true);
    setLoi(null);
    try {
      if (vaiTro) {
        await goiApi(`/api/quan-tri/vai-tro/${encodeURIComponent(vaiTro.id)}`, { method: "PATCH", body: { ten, mo_ta: moTa || null } });
        xong(`Đã sửa vai trò ${ten}`);
      } else {
        const quyen = chepTu ? tatCa.find((v) => v.id === chepTu)?.quyen ?? {} : {};
        await goiApi("/api/quan-tri/vai-tro", { body: { ten, mo_ta: moTa || null, id: ma || undefined, quyen } });
        xong(`Đã tạo vai trò ${ten}. Bấm các ô trong cột mới để bật quyền.`);
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setDang(false);
    }
  }

  return (
    <HopThoai
      tieuDe={vaiTro ? `Sửa vai trò: ${vaiTro.ten}` : "Vai trò mới"}
      dong={dong}
      chan={
        <>
          <Nut onClick={dong}>Hủy</Nut>
          <Nut kieu="chinh" disabled={dang || !ten.trim()} onClick={() => void luu()}>
            {dang ? "Đang lưu…" : "Lưu"}
          </Nut>
        </>
      }
    >
      <div className="space-y-3">
        <Truong nhan="Tên vai trò">
          <input className={LOP_O_NHAP} value={ten} autoFocus onChange={(e) => setTen(e.target.value)} placeholder="vd Nhân sự HCTH" />
        </Truong>
        <Truong nhan="Mô tả">
          <input className={LOP_O_NHAP} value={moTa} onChange={(e) => setMoTa(e.target.value)} placeholder="Vai trò này dùng cho ai, làm gì" />
        </Truong>
        {!vaiTro && (
          <>
            <Truong nhan="Mã (không bắt buộc)" goiY="Chữ thường không dấu, số, gạch ngang. Để trống thì tự tạo từ tên.">
              <input className={LOP_O_NHAP} value={ma} onChange={(e) => setMa(e.target.value)} placeholder="nhan-su-hcth" />
            </Truong>
            <Truong nhan="Chép quyền từ vai trò">
              <select className={LOP_O_NHAP} value={chepTu} onChange={(e) => setChepTu(e.target.value)}>
                <option value="">— Bắt đầu không có quyền nào —</option>
                {tatCa.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.ten}
                  </option>
                ))}
              </select>
            </Truong>
          </>
        )}
        <HopLoi loi={loi} />
      </div>
    </HopThoai>
  );
}
