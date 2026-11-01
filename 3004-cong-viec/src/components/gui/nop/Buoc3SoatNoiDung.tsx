"use client";
// ============================================================
// BƯỚC 3 · SOÁT NỘI DUNG (Mr. Đại chốt 29/09/2026) — gộp "Luật AI" + "AI góp ý" thành MỘT danh sách cùng kiểu dòng với
// bước 2: Vấn đề · Đề xuất ("🤖 nên sửa thành", sửa được) · Duyệt (Đồng ý / Bỏ qua).
// - Luật AI không đạt + góp ý AI đều phải quyết; luật mức Chặn gửi không bỏ qua được (phải sửa).
// - Đồng ý chỉ được khi vấn đề chỉ vào MỘT ô (máy ghi vào đúng ô đó). Góp ý chung chung chỉ Bỏ qua (sửa bằng Word nếu cần).
// - Gom: duyệt hết rồi bấm "Ghi … vào file" MỘT lần → bản mới; kết quả soát chép sang bản mới, AI không soát lại
//   (lib/kiem-tra/ket-thua-soat.ts). Luật "không kết luận được" gom một dòng xám, không bắt duyệt.
// Phần hỏi máy chủ lấy nguyên từ LuatAi.tsx / GopYAi.tsx cũ (hỏi lại theo nhịp tới khi AI xong).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KetQuaLuatAi, LuatKiemTra, MucLuat, TrangThaiLuatAi } from "@/lib/luat/types";
import type { LoiKiemTra, MauWord } from "@/lib/types";
import type { SuaMotCho } from "@/lib/kiem-tra/sua-vao-file";
import { laMotO } from "@/lib/kiem-tra/vi-tri-o";
import { goiApi } from "@/components/gui/chung";
import { luatCuaMau } from "@/components/luat/api";
import { viTri } from "@/components/kiem-tra/KetQuaKiemTra";
import { DauBangVanDe, DongVanDe, NutDuyet, ODeXuat, type MucVanDe } from "./DongVanDe";

// ---------------- Kiểu dữ liệu ----------------

type KetQuaAi = KetQuaLuatAi & { ten: string; muc: MucLuat; khi_ai_loi: LuatKiemTra["khi_ai_loi"] };
interface TraLoiLuat {
  trang_thai: TrangThaiLuatAi;
  ket_qua: KetQuaAi[];
  loi?: string | null;
}
interface GopYHienThi {
  loai: "muc_trong" | "mau_thuan" | "chinh_ta_ten" | "khac";
  thong_diep: string;
  vi_tri?: LoiKiemTra["vi_tri"];
  cho?: string;
  de_xuat?: string;
  da_sua?: boolean;
}
interface TraLoiGopY {
  trang_thai: "dang_gop_y" | "xong" | "loi" | "tat";
  gop_y: GopYHienThi[];
  loi?: string | null;
  ly_do?: string;
}

export interface TrangThaiGuiAi {
  /** Còn luật AI mức Chặn gửi chưa có kết luận → chưa cho gửi */
  dangChoChan: boolean;
  /** Luật AI mức Chặn gửi không đạt (hoặc AI lỗi mà luật để "chặn") */
  chanKhongDat: string[];
}

/** Quyết định từng dòng bước 3, khoá "g:<thông điệp>" (góp ý) / "l:<mã luật>" (luật) — giữ qua các bản của cùng tài liệu. */
export type Quyet3 = Record<string, { v: "dong_y" | "bo_qua"; moi?: string }>;

const NHAN_LOAI: Record<GopYHienThi["loai"], string> = {
  muc_trong: "Góp ý: mục trống",
  mau_thuan: "Góp ý: số liệu mâu thuẫn",
  chinh_ta_ten: "Góp ý: tên người / đơn vị",
  khac: "Góp ý",
};
const NHIP_MS = 2500;
const HOI_TOI_DA = 60; // ~2,5 phút

// ---------------- Hỏi máy chủ tới khi AI xong ----------------

function useHoiDenKhiXong<T>(url: string | null, dangCho: (t: T | null) => boolean) {
  const [kq, setKq] = useState<T | null>(null);
  const [loiMang, setLoiMang] = useState<string | null>(null);
  const [lanHoi, setLanHoi] = useState(0);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoi = useCallback(
    async (thuLai = false) => {
      if (!url) return;
      try {
        setKq(await goiApi<T>(`${url}${thuLai ? "&thu_lai=1" : ""}`));
        setLoiMang(null);
      } catch (e) {
        setLoiMang(e instanceof Error ? e.message : String(e));
      } finally {
        setLanHoi((n) => n + 1);
      }
    },
    [url],
  );
  useEffect(() => {
    setKq(null);
    setLanHoi(0);
    setLoiMang(null);
    void hoi();
    return () => {
      if (hen.current) clearTimeout(hen.current);
    };
  }, [hoi]);
  const cho = dangCho(kq);
  useEffect(() => {
    if (hen.current) clearTimeout(hen.current);
    if (((cho && !!kq) || (!kq && !!loiMang && lanHoi < 3)) && lanHoi > 0 && lanHoi < HOI_TOI_DA) hen.current = setTimeout(() => void hoi(), NHIP_MS);
  }, [kq, cho, loiMang, lanHoi, hoi]);
  const hetKienNhan = !!url && cho && (lanHoi >= HOI_TOI_DA || (!kq && !!loiMang && lanHoi >= 3));
  const hoiLai = (thuLai = false) => {
    setLanHoi(0);
    void hoi(thuLai);
  };
  return { kq, loiMang, hetKienNhan, hoiLai, xong: !url || !cho || hetKienNhan };
}

// ---------------- Thành phần ----------------

export function Buoc3SoatNoiDung({
  taiLieuId,
  phienBan,
  mau,
  oNhap,
  coLuat,
  coGopY,
  luatDaDung,
  lamMoi = 0,
  quyet,
  onQuyet,
  onTrangThai,
  onAiXong,
  onBuocXong,
  onGhi,
  dangGhi,
}: {
  taiLieuId: string;
  phienBan: number;
  mau?: MauWord | null;
  oNhap: Record<string, string>;
  coLuat: boolean;
  coGopY: boolean;
  luatDaDung?: { id: string; cach_kiem: string; muc: MucLuat }[];
  /** Tăng để hỏi lại luật AI ngay (vd sau khi gửi bị 409 vì AI đang kiểm) */
  lamMoi?: number;
  quyet: Quyet3;
  onQuyet: (khoa: string, q: Quyet3[string] | null) => void;
  onTrangThai?: (t: TrangThaiGuiAi) => void;
  /** Cả hai lượt AI đã có kết luận (xong / lỗi / hết kiên nhẫn) */
  onAiXong?: (xong: boolean) => void;
  /** Bước 3 xong: AI xong + mọi dòng đã quyết + không còn chỗ Đồng ý chờ ghi file */
  onBuocXong?: (xong: boolean) => void;
  onGhi: (sua: SuaMotCho[], buoc3: { gop_y: string[]; luat: string[] }) => Promise<void>;
  dangGhi: boolean;
}) {
  // Luật AI áp dụng cho mẫu (tên + mức khi chưa có kết quả)
  const [luat, setLuat] = useState<LuatKiemTra[] | null>(null);
  useEffect(() => {
    let huy = false;
    void luatCuaMau(mau?.ma ?? null).then((ds) => !huy && setLuat(ds ?? []));
    return () => {
      huy = true;
    };
  }, [mau?.ma]);

  const qs = `tai_lieu_id=${encodeURIComponent(taiLieuId)}&phien_ban=${phienBan}`;
  const L = useHoiDenKhiXong<TraLoiLuat>(coLuat ? `/api/luat/ai?${qs}` : null, (t) => !t || t.trang_thai === "dang_kiem");
  const G = useHoiDenKhiXong<TraLoiGopY>(coGopY ? `/api/kiem-tra/gop-y?${qs}` : null, (t) => !t || t.trang_thai === "dang_gop_y");
  const lamMoiRef = useRef(lamMoi);
  useEffect(() => {
    if (lamMoi !== lamMoiRef.current) {
      lamMoiRef.current = lamMoi;
      L.hoiLai();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lamMoi]);

  // Luật: đã dùng khi kiểm (hoặc đang bật cho mẫu) ∪ kết quả trả về
  const dongLuat = useMemo(() => {
    const idDung = luatDaDung ? new Set(luatDaDung.filter((l) => l.cach_kiem !== "code").map((l) => l.id)) : null;
    const coAi = (luat ?? []).filter((l) => l.cach_kiem !== "code" && !l.he_thong && (idDung ? idDung.has(l.id) : l.bat));
    const theoId = new Map((L.kq?.ket_qua ?? []).map((k) => [k.luat_id, k]));
    const ds: { id: string; ten: string; muc: MucLuat; khi_ai_loi: LuatKiemTra["khi_ai_loi"]; kq?: KetQuaAi }[] = coAi.map((l) => ({
      id: l.id,
      ten: l.ten,
      muc: l.muc,
      khi_ai_loi: l.khi_ai_loi,
      kq: theoId.get(l.id),
    }));
    for (const k of L.kq?.ket_qua ?? []) if (!ds.some((d) => d.id === k.luat_id)) ds.push({ id: k.luat_id, ten: k.ten, muc: k.muc, khi_ai_loi: k.khi_ai_loi, kq: k });
    return ds;
  }, [luat, L.kq, luatDaDung]);

  const loiLuat = L.kq?.trang_thai === "loi";
  const dangKiemLuat = coLuat && (!L.kq || L.kq.trang_thai === "dang_kiem");
  const tt: TrangThaiGuiAi = useMemo(() => {
    const chan = dongLuat.filter((d) => d.muc === "chan");
    return {
      dangChoChan: dangKiemLuat && !L.hetKienNhan && chan.some((d) => !d.kq || d.kq.dat === null),
      chanKhongDat: chan
        .filter((d) => d.kq?.dat === false || (d.khi_ai_loi === "chan" && (loiLuat || L.hetKienNhan || (d.kq && d.kq.dat === null && !dangKiemLuat))))
        .map((d) => d.ten),
    };
  }, [dongLuat, dangKiemLuat, L.hetKienNhan, loiLuat]);
  const khoaTt = JSON.stringify(tt);
  const baoRef = useRef(onTrangThai);
  baoRef.current = onTrangThai;
  useEffect(() => {
    baoRef.current?.(JSON.parse(khoaTt) as TrangThaiGuiAi);
  }, [khoaTt]);

  const aiXong = L.xong && G.xong;
  const aiXongRef = useRef(onAiXong);
  aiXongRef.current = onAiXong;
  useEffect(() => {
    aiXongRef.current?.(aiXong);
  }, [aiXong]);

  // ---------- Các dòng phải quyết ----------
  const gopY = G.kq?.trang_thai === "xong" ? G.kq.gop_y : [];
  const dong = [
    ...dongLuat
      .filter((d) => d.kq?.dat === false && !d.kq.da_sua)
      .map((d) => ({
        khoa: `l:${d.id}`,
        noiDung: d.kq!.thong_diep,
        muc: d.muc as MucVanDe,
        nguon: `Luật: ${d.ten}`,
        vi_tri: d.kq!.vi_tri,
        cho: undefined as string | undefined,
        de_xuat: d.kq!.de_xuat,
        boQuaDuoc: d.muc !== "chan",
      })),
    ...gopY
      .filter((g) => !g.da_sua)
      .map((g) => ({
        khoa: `g:${g.thong_diep}`,
        noiDung: g.thong_diep,
        muc: "goi_y" as MucVanDe,
        nguon: NHAN_LOAI[g.loai] ?? "Góp ý",
        vi_tri: g.vi_tri,
        cho: g.cho,
        de_xuat: g.de_xuat,
        boQuaDuoc: true,
      })),
  ];
  const [nhap, setNhap] = useState<Record<string, string>>({});
  const daSua = dongLuat.filter((d) => d.kq?.da_sua).length + gopY.filter((g) => g.da_sua).length;
  const chuaKetLuan = dongLuat.filter((d) => d.kq && d.kq.dat === null);
  const dat = dongLuat.filter((d) => d.kq?.dat === true && !d.kq.da_sua);
  const chuaQuyet = dong.filter((d) => !quyet[d.khoa]);
  const choGhi = dong.filter((d) => quyet[d.khoa]?.v === "dong_y");
  const buocXong = aiXong && chuaQuyet.length === 0 && choGhi.length === 0 && tt.chanKhongDat.length === 0;
  const buocRef = useRef(onBuocXong);
  buocRef.current = onBuocXong;
  useEffect(() => {
    buocRef.current?.(buocXong);
  }, [buocXong]);

  async function ghi() {
    await onGhi(
      choGhi.filter((d) => d.vi_tri).map((d) => ({ vi_tri: d.vi_tri!, moi: quyet[d.khoa].moi ?? "" })),
      { gop_y: choGhi.filter((d) => d.khoa.startsWith("g:")).map((d) => d.khoa.slice(2)), luat: choGhi.filter((d) => d.khoa.startsWith("l:")).map((d) => d.khoa.slice(2)) },
    );
  }

  // ---------- Dòng tình trạng ----------
  const dangCho = !aiXong;
  const tinhTrang: React.ReactNode[] = [];
  if (dangCho) tinhTrang.push("AI đang soát nội dung (luật của đơn vị + góp ý)… thường 15–30 giây");
  if (loiLuat)
    tinhTrang.push(
      <span key="ll" className="text-red">
        Luật AI chưa kiểm được ({L.kq?.loi ?? "lỗi không rõ"}).{" "}
        <button type="button" className="lk" onClick={() => L.hoiLai(true)}>
          Soát lại
        </button>
      </span>,
    );
  if (G.kq?.trang_thai === "loi")
    tinhTrang.push(
      <span key="gl" className="text-red">
        Góp ý AI chưa chạy được ({G.kq.loi ?? "lỗi không rõ"}).{" "}
        <button type="button" className="lk" onClick={() => G.hoiLai(true)}>
          Soát lại
        </button>
      </span>,
    );
  if (L.hetKienNhan || G.hetKienNhan)
    tinhTrang.push(
      <span key="hk">
        AI chưa trả lời sau một lúc lâu.{" "}
        <button
          type="button"
          className="lk"
          onClick={() => {
            if (L.hetKienNhan) L.hoiLai();
            if (G.hetKienNhan) G.hoiLai();
          }}
        >
          Hỏi lại
        </button>
      </span>,
    );
  if (!dangCho && coLuat && dongLuat.length)
    tinhTrang.push(
      `Luật của đơn vị: ${dongLuat.length} luật — ${dat.length} đạt${dongLuat.filter((d) => d.kq?.dat === false && !d.kq.da_sua).length ? ` · ${dongLuat.filter((d) => d.kq?.dat === false && !d.kq.da_sua).length} không đạt` : ""}${chuaKetLuan.length ? ` · ${chuaKetLuan.length} chưa kết luận` : ""}`,
    );
  if (!dangCho && G.kq?.trang_thai === "xong") tinhTrang.push(`Góp ý: ${gopY.filter((g) => !g.da_sua).length}`);
  if (G.kq?.trang_thai === "tat") tinhTrang.push(`Không có góp ý AI: ${G.kq.ly_do ?? "đang tắt"}`);
  if (daSua) tinhTrang.push(<span key="ds" className="ok">Đã ghi {daSua} đề xuất vào file ở bản trước</span>);

  const boQuaDuoc = chuaQuyet.filter((d) => d.boQuaDuoc);
  const giaTriCua = (d: (typeof dong)[number]) => nhap[d.khoa] ?? quyet[d.khoa]?.moi ?? d.de_xuat ?? "";
  const dongYDuoc = chuaQuyet.filter((d) => laMotO(d.vi_tri) && !!giaTriCua(d).trim());

  return (
    <>
      <div className="ghi flex flex-wrap items-center justify-between gap-2">
        {/* Dòng tổng hợp: còn luật không đạt / chưa kết luận / góp ý chưa xử lý thì CẢ dòng đỏ đậm (Mr. Đại chốt 29/09) */}
        <span className={!dangCho && (dongLuat.some((d) => d.kq?.dat === false && !d.kq.da_sua) || chuaKetLuan.length > 0 || gopY.some((g) => !g.da_sua)) ? "tong-loi" : undefined}>
          {tinhTrang.map((t, i) => (
            <span key={i}>
              {i ? " · " : ""}
              {t}
            </span>
          ))}
        </span>
      </div>
      {chuaKetLuan.length ? (
        <div className="ghi">
          Chưa kết luận (không bắt duyệt): {chuaKetLuan.map((d) => `${d.ten} — ${d.kq?.thong_diep}`).join("; ")}
        </div>
      ) : null}
      {dong.length ? <DauBangVanDe /> : null}
      {dong.map((d) => {
        const q = quyet[d.khoa];
        const motO = laMotO(d.vi_tri);
        const giaTri = nhap[d.khoa] ?? q?.moi ?? d.de_xuat ?? "";
        const cu = d.vi_tri?.tag && !d.vi_tri.bang ? (oNhap[d.vi_tri.tag] ?? "") : undefined;
        return (
          <DongVanDe
            key={d.khoa}
            noiDung={d.noiDung}
            muc={d.muc}
            phu={[d.nguon, viTri({ vi_tri: d.vi_tri }, mau) || (d.cho ? `Chỗ: ${d.cho}` : "")].filter(Boolean).join(" · ")}
            daQuyet={!!q}
            deXuat={
              motO ? (
                <ODeXuat
                  cu={cu}
                  giaTri={giaTri}
                  laAi={!!d.de_xuat && giaTri === d.de_xuat}
                  khoa={!!q || dangGhi}
                  onDoi={(v) => setNhap((c) => ({ ...c, [d.khoa]: v }))}
                />
              ) : (
                <span className="text-text-muted">Không chỉ vào một ô cụ thể — cần thì sửa trong tệp rồi tải lên bản đã sửa.</span>
              )
            }
            duyet={
              <NutDuyet
                quyet={q?.v}
                onDongY={() => onQuyet(d.khoa, { v: "dong_y", moi: giaTri })}
                onBoQua={() => onQuyet(d.khoa, { v: "bo_qua" })}
                onDoi={dangGhi ? undefined : () => onQuyet(d.khoa, null)}
                choDongY={motO && !!giaTri.trim()}
                choBoQua={d.boQuaDuoc}
                lyDoKhoa={motO ? "Gõ chữ mới trước" : "Không chỉ vào một ô — máy không ghi được"}
              />
            }
          />
        );
      })}
      {!dangCho && !dong.length && !loiLuat && G.kq?.trang_thai !== "loi" ? <div className="ghi ok">Không có gì cần sửa.</div> : null}
      {dong.length ? (
        <div className="chan-nut">
          {dongYDuoc.length > 1 ? (
            <button type="button" className="nn to" disabled={dangGhi} onClick={() => dongYDuoc.forEach((d) => onQuyet(d.khoa, { v: "dong_y", moi: giaTriCua(d) }))} title="Đánh dấu đồng ý mọi đề xuất chưa quyết — chưa ghi file">
              Đồng ý cả {dongYDuoc.length} đề xuất
            </button>
          ) : null}
          {boQuaDuoc.length > 1 ? (
            <button type="button" className="nn to" disabled={dangGhi} onClick={() => boQuaDuoc.forEach((d) => onQuyet(d.khoa, { v: "bo_qua" }))}>
              Bỏ qua tất cả góp ý ({boQuaDuoc.length})
            </button>
          ) : null}
          {choGhi.length ? (
            <button
              type="button"
              className="nn chinh to"
              disabled={dangGhi || chuaQuyet.length > 0}
              onClick={() => void ghi()}
              title={chuaQuyet.length ? `Còn ${chuaQuyet.length} dòng chưa quyết — quyết hết trước` : "Ghi một lần thành bản mới (AI không soát lại bản đó)"}
            >
              {dangGhi ? "Đang ghi…" : `Sửa ${choGhi.length} mục đã đồng ý vào file`}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
