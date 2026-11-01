"use client";
// HỘP XỬ LÝ TÀI LIỆU: Nhận · Chuyển tiếp · Chuyển tiếp + gửi kèm · Trả lại · Gửi tài liệu mới · Hoàn thành
// (và Gửi lại bản đã sửa khi tài liệu của mình bị trả lại). Chỉ hiện nút hợp lệ theo bước và quyền (server tính sẵn).
// Làm được nhiều thao tác trên cùng một bước sau khi nhận (vd A lên Ban TGĐ, B sang P.TCKT, D gửi Phó TGĐ).
import { useEffect, useRef, useState } from "react";
import { CheckCheck, CircleStop, CornerUpLeft, FilePlus2, Forward, Inbox, Loader2, Paperclip, Send, Upload, X } from "lucide-react";
import type { BuocCuaToi, ThaoTac, ThongTinTaiLieuGui } from "@/lib/gui/doc";
import type { DongCongViec, MauWord } from "@/lib/types";
import { KetQuaKiemTra, type KetQuaHienThi } from "@/components/kiem-tra/KetQuaKiemTra";
import { BangCongViecKiemTra, type DuDoanHienThi } from "@/components/kiem-tra/BangCongViecKiemTra";
import { ChonNoiNhan, napNoiNhan, tenNoiNhan, type DanhSachNoiNhan } from "./ChonNoiNhan";
import { NHAN_LOAI_BUOC, NHAN_TRANG_THAI, Nhan, NutChinh, NutPhu, ThongDiep, goiApi, goiForm, ngayGio } from "./chung";

const NUT: Record<ThaoTac, { nhan: string; icon: JSX.Element; kieu: "chinh" | "phu" | "nguy" }> = {
  nhan: { nhan: "Nhận", icon: <Inbox size={14} />, kieu: "phu" },
  chuyen_tiep: { nhan: "Chuyển tiếp", icon: <Forward size={14} />, kieu: "phu" },
  chuyen_tiep_kem: { nhan: "Chuyển tiếp + gửi kèm", icon: <Paperclip size={14} />, kieu: "phu" },
  tra_lai: { nhan: "Trả lại", icon: <CornerUpLeft size={14} />, kieu: "nguy" },
  gui_lai: { nhan: "Gửi lại bản đã sửa", icon: <Upload size={14} />, kieu: "chinh" },
  gui_moi: { nhan: "Gửi tài liệu mới", icon: <FilePlus2 size={14} />, kieu: "phu" },
  hoan_thanh: { nhan: "Hoàn thành", icon: <CircleStop size={14} />, kieu: "chinh" },
};

interface TepKem {
  tai_lieu_id: string | null;
  ten: string;
  ket_qua: KetQuaHienThi;
}

function laTheoMau(k: KetQuaHienThi) {
  return !!k.mau_ma;
}

/** Bảng việc của file mới / bản sửa: người gửi xác nhận hoặc bỏ qua gợi ý "có vẻ trùng" trước khi gửi. */
function ViecCuaTep({ k, xacNhan, onXacNhan }: { k: KetQuaHienThi; xacNhan: Record<number, string>; onXacNhan: (dong: number, v: string | null) => void }) {
  if (!k.cong_viec.length) return null;
  return (
    <BangCongViecKiemTra
      congViec={k.cong_viec as unknown as DongCongViec[]}
      duDoan={(k.du_doan ?? []) as unknown as DuDoanHienThi[]}
      loi={k.loi}
      mau={k.mau as MauWord | null | undefined}
      xacNhan={xacNhan}
      onXacNhan={onXacNhan}
    />
  );
}

function KhungThaoTac({
  b,
  thaoTac,
  tt,
  onXong,
  onHuy,
}: {
  b: BuocCuaToi;
  thaoTac: ThaoTac;
  tt: ThongTinTaiLieuGui;
  onXong: (thongDiep: string) => void;
  onHuy: () => void;
}) {
  const [den, setDen] = useState<string[]>([]);
  const [lyDo, setLyDo] = useState("");
  const [kem, setKem] = useState<TepKem[]>([]);
  const [moi, setMoi] = useState<TepKem | null>(null);
  const [banSua, setBanSua] = useState<{ tep: File; ket_qua: KetQuaHienThi } | null>(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xacNhanTrung, setXacNhanTrung] = useState<Record<number, string>>({});
  const [ds, setDs] = useState<DanhSachNoiNhan | null>(null);
  const oTep = useRef<HTMLInputElement>(null);
  useEffect(() => {
    napNoiNhan().then(setDs).catch(() => undefined);
  }, []);
  const tenNoi = (id: string) => tenNoiNhan(ds, id);
  const doiXacNhan = (dong: number, v: string | null) =>
    setXacNhanTrung((x) => {
      const m = { ...x };
      if (v) m[dong] = v;
      else delete m[dong];
      return m;
    });

  async function chay(fn: () => Promise<string>) {
    setDang(true);
    setLoi(null);
    try {
      onXong(await fn());
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  async function taiTep(files: FileList | null) {
    if (!files?.length) return;
    setDang(true);
    setLoi(null);
    try {
      for (const f of Array.from(files)) {
        if (thaoTac === "gui_lai") {
          const fd = new FormData();
          fd.set("tep", f);
          fd.set("tai_lieu_id", tt.tai_lieu.id);
          fd.set("luu", "0");
          const r = await goiForm<{ ket_qua: KetQuaHienThi }>("/api/kiem-tra", fd);
          setBanSua({ tep: f, ket_qua: r.ket_qua });
          setXacNhanTrung({});
          continue;
        }
        const fd = new FormData();
        fd.set("tep", f);
        const r = await goiForm<TepKem>("/api/tai-lieu-gui/tai-len", fd);
        if (thaoTac === "gui_moi") {
          setMoi(r);
          setXacNhanTrung({});
          setDen(r.ket_qua.gui_den ?? []);
        } else setKem((x) => [...x, r]);
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  const kemLoi = kem.some((k) => laTheoMau(k.ket_qua) && !k.ket_qua.dat);
  let noiDung: JSX.Element | null = null;
  let xacNhan: { nhan: string; bat: boolean; lam: () => Promise<string> } | null = null;

  if (thaoTac === "chuyen_tiep" || thaoTac === "chuyen_tiep_kem") {
    noiDung = (
      <div className="space-y-3">
        <ChonNoiNhan chon={den} onChon={setDen} nhan="Chuyển tiếp cho" />
        {thaoTac === "chuyen_tiep_kem" ? (
          <div>
            <NutPhu onClick={() => oTep.current?.click()} disabled={dang}>
              <Paperclip size={14} /> Chọn file gửi kèm
            </NutPhu>
            <ul className="mt-2 space-y-1">
              {kem.map((k, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <Paperclip size={12} className="text-text-muted" />
                  <span className="text-text">{k.ten}</span>
                  {laTheoMau(k.ket_qua) ? (
                    k.ket_qua.dat ? (
                      <Nhan mau="border-green text-green">theo mẫu · đạt kiểm tra · {k.ket_qua.cong_viec.length} việc vào sổ cái</Nhan>
                    ) : (
                      <Nhan mau="border-red text-red" title={k.ket_qua.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep).join("\n")}>
                        theo mẫu · chưa đạt kiểm tra
                      </Nhan>
                    )
                  ) : (
                    <Nhan>file thường, không phải kiểm tra</Nhan>
                  )}
                  <button type="button" onClick={() => setKem((x) => x.filter((_, j) => j !== i))} className="text-text-muted hover:text-red" aria-label="Bỏ file">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
            {kemLoi ? <p className="mt-1 text-xs text-red">File kèm theo mẫu phải đạt kiểm tra mới gửi được.</p> : null}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Gửi đúng tài liệu này, không thêm gì. Cùng hành trình; sổ cái không đổi.</p>
        )}
      </div>
    );
    xacNhan = {
      nhan: thaoTac === "chuyen_tiep" ? "Chuyển tiếp" : "Chuyển tiếp kèm file",
      bat: den.length > 0 && (thaoTac === "chuyen_tiep" || (kem.length > 0 && !kemLoi && kem.every((k) => k.tai_lieu_id))),
      lam: async () => {
        await goiApi("/api/gui/chuyen-tiep", { buoc_id: b.buoc_id, den, tep_kem: kem.map((k) => k.tai_lieu_id) });
        return thaoTac === "chuyen_tiep" ? "Đã chuyển tiếp nguyên văn." : `Đã chuyển tiếp kèm ${kem.map((k) => k.ten).join(", ")}.`;
      },
    };
  } else if (thaoTac === "tra_lai") {
    noiDung = (
      <label className="block text-sm">
        <span className="text-xs text-text-muted">Lý do trả lại (bắt buộc) — về Đến của {b.tu_ten}, gắn nhãn &quot;Bị trả lại&quot;</span>
        <textarea
          value={lyDo}
          onChange={(e) => setLyDo(e.target.value)}
          rows={2}
          placeholder="vd thiếu số liệu thu vốn NK1"
          className="mt-1 w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
      </label>
    );
    xacNhan = {
      nhan: "Trả lại",
      bat: lyDo.trim().length > 0,
      lam: async () => {
        await goiApi("/api/gui/tra-lai", { buoc_id: b.buoc_id, ly_do: lyDo });
        return `Đã trả lại ${b.tu_ten}: “${lyDo.trim()}”.`;
      },
    };
  } else if (thaoTac === "gui_moi") {
    noiDung = (
      <div className="space-y-3">
        <p className="text-xs text-text-muted">Tài liệu mới hoàn toàn (vd báo cáo phòng Form 1): hành trình mới, ghi &quot;liên quan đến&quot; tài liệu này.</p>
        <NutPhu onClick={() => oTep.current?.click()} disabled={dang}>
          <Upload size={14} /> {moi ? "Chọn file khác" : "Chọn file tài liệu mới"}
        </NutPhu>
        {moi ? (
          <>
            <div className="text-sm text-text">{moi.ten}</div>
            <KetQuaKiemTra kq={moi.ket_qua} tenNoiNhan={tenNoi} />
            <ViecCuaTep k={moi.ket_qua} xacNhan={xacNhanTrung} onXacNhan={doiXacNhan} />
            <ChonNoiNhan chon={den} onChon={setDen} macDinh={moi.ket_qua.gui_den} />
          </>
        ) : null}
      </div>
    );
    xacNhan = {
      nhan: "Gửi tài liệu mới",
      bat: !!moi?.tai_lieu_id && moi.ket_qua.dat && den.length > 0,
      lam: async () => {
        await goiApi("/api/gui/gui-moi", {
          tai_lieu_id: moi!.tai_lieu_id,
          den,
          lien_quan_den_tai_lieu: tt.tai_lieu.id,
          tu_buoc_id: b.buoc_id,
          xac_nhan_trung: xacNhanTrung,
        });
        return `Đã gửi tài liệu mới ${moi!.ten}.`;
      },
    };
  } else if (thaoTac === "gui_lai") {
    noiDung = (
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Lý do bị trả lại: <span className="text-red">“{b.ly_do}”</span>. Bản sửa thay bản cũ trong thư mục (bản cũ còn trong lịch sử), qua kiểm tra lại, cùng hành trình.
        </p>
        <NutPhu onClick={() => oTep.current?.click()} disabled={dang}>
          <Upload size={14} /> {banSua ? "Chọn file khác" : "Chọn bản đã sửa"}
        </NutPhu>
        {banSua ? (
          <>
            <KetQuaKiemTra kq={banSua.ket_qua} tenNoiNhan={tenNoi} />
            <ViecCuaTep k={banSua.ket_qua} xacNhan={xacNhanTrung} onXacNhan={doiXacNhan} />
          </>
        ) : null}
      </div>
    );
    xacNhan = {
      nhan: "Gửi lại",
      bat: !!banSua?.ket_qua.dat,
      lam: async () => {
        const fd = new FormData();
        fd.set("buoc_tra_lai_id", b.buoc_id);
        fd.set("tep", banSua!.tep);
        fd.set("xac_nhan_trung", JSON.stringify(xacNhanTrung));
        const r = await goiForm<{ phien_ban: number }>("/api/gui/gui-lai", fd);
        return `Đã gửi lại bản ${r.phien_ban}.`;
      },
    };
  } else if (thaoTac === "hoan_thanh") {
    noiDung = <p className="text-sm text-text-secondary">Nhận, lưu và dừng nhánh hành trình tại đây — không gửi đi đâu nữa.</p>;
    xacNhan = {
      nhan: "Hoàn thành",
      bat: true,
      lam: async () => {
        await goiApi("/api/gui/hoan-thanh", { buoc_id: b.buoc_id });
        return "Đã hoàn thành: nhánh hành trình dừng tại đây.";
      },
    };
  }

  return (
    <div className="mt-3 rounded-sm border border-border p-3">
      <input
        ref={oTep}
        type="file"
        multiple={thaoTac === "chuyen_tiep_kem"}
        className="hidden"
        onChange={(e) => {
          void taiTep(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mb-2 text-sm font-medium text-text">{NUT[thaoTac].nhan}</div>
      {noiDung}
      {loi ? (
        <div className="mt-2">
          <ThongDiep loai="loi">{loi}</ThongDiep>
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        {xacNhan ? (
          <NutChinh onClick={() => void chay(xacNhan!.lam)} disabled={!xacNhan.bat || dang}>
            {dang ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {xacNhan.nhan}
          </NutChinh>
        ) : null}
        <NutPhu onClick={onHuy} disabled={dang}>
          Thôi
        </NutPhu>
      </div>
    </div>
  );
}

export function HopXuLy({ tt, onDaLam }: { tt: ThongTinTaiLieuGui; onDaLam: () => void }) {
  const [mo, setMo] = useState<{ buoc: string; tt: ThaoTac } | null>(null);
  const [thong, setThong] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState<string | null>(null);
  const buoc = tt.buoc_cua_toi.filter((b) => b.thao_tac.length > 0);
  const daXong = tt.buoc_cua_toi.filter((b) => b.thao_tac.length === 0);
  const [toiId, setToiId] = useState<string | null>(null);
  useEffect(() => {
    napNoiNhan()
      .then((d) => setToiId(d.toi.id))
      .catch(() => undefined);
  }, []);
  const laNguoiGui = !!toiId && (tt.tai_lieu.nguoi_tao === toiId || tt.cay.some((n) => n.tu_nguoi === toiId));

  async function nhan(b: BuocCuaToi) {
    setDang(b.buoc_id);
    setLoi(null);
    try {
      await goiApi("/api/gui/nhan", { buoc_id: b.buoc_id });
      setThong(`Đã nhận. ${b.tu_ten} thấy "đã nhận lúc …".`);
      onDaLam();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(null);
    }
  }

  if (buoc.length === 0) {
    return (
      <div className="text-sm text-text-muted">
        {daXong.length
          ? "Bạn đã xử lý xong các bước của mình với tài liệu này."
          : laNguoiGui
            ? "Bạn là người gửi tài liệu này, không còn bước nào chờ bạn xử lý. Cây hành trình bên dưới cho thấy tài liệu đã đi đâu, dừng ở đâu, có bị trả lại không."
            : "Bạn không phải nơi nhận của tài liệu này. Cây hành trình bên dưới cho thấy tài liệu đã đi đâu."}
        {thong ? (
          <div className="mt-2">
            <ThongDiep loai="ok" onDong={() => setThong(null)}>
              {thong}
            </ThongDiep>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {thong ? (
        <ThongDiep loai="ok" onDong={() => setThong(null)}>
          {thong}
        </ThongDiep>
      ) : null}
      {loi ? (
        <ThongDiep loai="loi" onDong={() => setLoi(null)}>
          {loi}
        </ThongDiep>
      ) : null}
      {buoc.map((b) => {
        const t = NHAN_TRANG_THAI[b.trang_thai];
        return (
          <div key={b.buoc_id} className="rounded-sm border border-border-light p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-text">
                {b.loai === "tra_lai" ? "Bị trả lại bởi" : "Từ"} <b>{b.tu_ten}</b>
              </span>
              <Nhan>{b.loai === "gui_lai" ? `Gửi lại bản ${b.phien_ban}` : NHAN_LOAI_BUOC[b.loai]}</Nhan>
              <Nhan mau={t?.mau}>{t?.nhan}</Nhan>
              <span className="text-[11px] text-text-muted">{ngayGio(b.luc)} · đến {b.den_ten}</span>
            </div>
            {b.ly_do ? <div className="mt-1 text-xs text-red">Lý do: “{b.ly_do}”</div> : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {b.thao_tac.map((x) => {
                const n = NUT[x];
                const onClick = x === "nhan" ? () => void nhan(b) : () => setMo({ buoc: b.buoc_id, tt: x });
                const dangMo = mo?.buoc === b.buoc_id && mo.tt === x;
                return n.kieu === "chinh" ? (
                  <NutChinh key={x} onClick={onClick} disabled={dang === b.buoc_id}>
                    {n.icon} {n.nhan}
                  </NutChinh>
                ) : (
                  <NutPhu key={x} onClick={onClick} nguyHiem={n.kieu === "nguy"} disabled={dang === b.buoc_id} className={dangMo ? "border-accent" : ""}>
                    {x === "nhan" && dang === b.buoc_id ? <Loader2 size={14} className="animate-spin" /> : n.icon} {n.nhan}
                  </NutPhu>
                );
              })}
            </div>
            {mo?.buoc === b.buoc_id ? (
              <KhungThaoTac
                key={mo.tt}
                b={b}
                thaoTac={mo.tt}
                tt={tt}
                onHuy={() => setMo(null)}
                onXong={(m) => {
                  setMo(null);
                  setThong(m);
                  onDaLam();
                }}
              />
            ) : null}
          </div>
        );
      })}
      <p className="flex items-center gap-1 text-[11px] text-text-muted">
        <CheckCheck size={12} /> Sau khi nhận làm được nhiều thao tác cùng lúc trên cùng một bước. Không có thu hồi.
      </p>
    </div>
  );
}
