"use client";

// ============================================================
// MÀN KỊCH BẢN TEST — khuôn lấy từ màn Test của agent pháp lý
// (phaply.scigroup.vn, đo tận nơi 06/09 theo lệnh Mr. Đại).
//
// Bê nguyên từ bản pháp lý:
//   · Hàng tab kèm số đếm "1/6" ngay trên tên tab
//   · Nhãn nhỏ chữ hoa → tiêu đề → câu dẫn → thanh tiến độ "1/6 đạt"
//   · Mỗi bài: chip mã · tiêu đề · hai nút Đạt / Không đạt ở góc phải
//   · Các bước đánh số, rồi ô "Mong đợi:" nền khác
//   · Bấm "Không đạt" → bung ô mô tả, viền đỏ
//
// THÊM so với bản pháp lý, đều theo lệnh Mr. Đại:
//   ① Ô lý do nhận ẢNH DÁN THẲNG bằng Ctrl+V (Snipping Tool), thêm ô viết
//      câu lệnh nhờ AI sửa.
//   ② Kết quả LƯU RA FILE trên máy (không phải localStorage) để bảo AI đọc.
//   ③ Tab "Vấn đề phát sinh" cho thứ không có trong kịch bản.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CAC_TAB, TONG_SO_BAI } from "@/lib/kiem-thu/kich-ban";
import { LY_DO_TAM_AN, TAB_TAM_AN } from "@/lib/kiem-thu/noi-dung-chung";
import {
  demTab,
  NHAN_GOC,
  type BaiTest,
  type SoKetQuaTest,
  type TrangThaiBai,
} from "@/lib/kiem-thu/kich-ban-chung";
import { ngayGioVN } from "@/lib/ngay-hien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const SO_RONG: SoKetQuaTest = { bai: {}, phatSinh: [], capNhatLuc: "" };

function urlAnh(ten: string): string {
  return `/api/kiem-thu/anh?ten=${encodeURIComponent(ten)}`;
}

/** Bóc ảnh ra khỏi sự kiện dán — clipboard có thể có nhiều mục, chỉ lấy ảnh */
function anhTuClipboard(dl: DataTransfer | null): File | null {
  if (!dl) return null;
  const it = Array.from(dl.items ?? []).find((x) => x.kind === "file" && x.type.startsWith("image/"));
  const f = it?.getAsFile() ?? null;
  if (f) return f;
  return Array.from(dl.files ?? []).find((x) => x.type.startsWith("image/")) ?? null;
}

/**
 * Ô dán ảnh.
 *
 * ⚠ SỬA 06/09 sau khi Mr. Đại báo "Ctrl+V không dán vào được": lượt đầu tôi
 * gắn onPaste lên đúng cái ô nét đứt, nên chỉ ăn khi con trỏ đang ở TRONG ô
 * đó. Người dùng gõ mô tả ở ô bên trên rồi Ctrl+V thì sự kiện rơi vào
 * textarea, không tới ô này.
 *
 * Nay bắt ở BA chỗ, chỗ nào cũng ăn:
 *   ① onPaste gắn ở khối BAO NGOÀI (sự kiện từ textarea nổi bọt lên)
 *   ② ô nét đứt vẫn bấm vào rồi dán được như cũ
 *   ③ nút "Chọn ảnh" mở hộp thoại — đường lui khi trình duyệt chặn dán
 */
function ODanAnh({
  anh,
  onThem,
  onBo,
  dangGui,
}: {
  anh: string[];
  onThem: (ten: string) => void;
  onBo: (ten: string) => void;
  dangGui: boolean;
}) {
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const guiAnh = useCallback(
    async (f: File) => {
      setDangTai(true);
      setLoi(null);
      try {
        const b64 = await new Promise<string>((ok, no) => {
          const r = new FileReader();
          r.onload = () => ok(String(r.result));
          r.onerror = () => no(new Error("Không đọc được ảnh."));
          r.readAsDataURL(f);
        });
        const duoi = (f.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
        const res = await fetch("/api/kiem-thu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "luu-anh", duoi, duLieu: b64 }),
        });
        const j = (await res.json()) as { ok: boolean; ten?: string; message?: string };
        if (j.ok && j.ten) onThem(j.ten);
        else setLoi(j.message ?? "Lưu ảnh thất bại.");
      } catch (e) {
        setLoi(e instanceof Error ? e.message : "Lưu ảnh thất bại.");
      } finally {
        setDangTai(false);
      }
    },
    [onThem]
  );

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const f = anhTuClipboard(e.dataTransfer);
          if (f) {
            e.preventDefault();
            void guiAnh(f);
          }
        }}
        role="presentation"
        className="cursor-pointer rounded-sm border border-dashed border-border px-2.5 py-2 text-[11.5px] text-text-muted transition hover:border-accent"
      >
        {dangTai ? (
          "Đang lưu ảnh…"
        ) : (
          <>
            📋 <b className="text-text">Ctrl+V</b> để dán ảnh (Snipping Tool) — dán ở bất kỳ đâu
            trong khung này đều được. Hoặc <b className="text-text">bấm vào đây</b> để chọn file,
            hoặc kéo thả ảnh vào.
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void guiAnh(f);
          e.target.value = "";
        }}
      />
      {loi && <div className="text-[11px] text-red">{loi}</div>}
      {anh.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {anh.map((a) => (
            <div key={a} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlAnh(a)}
                alt="ảnh chụp màn hình"
                className="h-16 rounded-sm border border-border-light object-cover"
              />
              <button
                type="button"
                disabled={dangGui}
                onClick={() => onBo(a)}
                title="Bỏ ảnh này"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] text-text-muted hover:border-red hover:text-red"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Hook dùng chung: bắt Ctrl+V ở cả một khối, không riêng một ô */
function useDanAnhTrongKhoi(onCoAnh: (f: File) => void) {
  return useCallback(
    (e: React.ClipboardEvent) => {
      const f = anhTuClipboard(e.clipboardData);
      if (f) {
        e.preventDefault();
        onCoAnh(f);
      }
    },
    [onCoAnh]
  );
}

function MotBai({
  bai,
  so,
  onLuu,
  dangGui,
}: {
  bai: BaiTest;
  so: SoKetQuaTest;
  onLuu: (p: Record<string, unknown>) => Promise<void>;
  dangGui: boolean;
}) {
  const kq = so.bai[bai.ma];
  const [ghiChu, setGhiChu] = useState(kq?.ghiChu ?? "");
  const [prompt, setPrompt] = useState(kq?.prompt ?? "");
  const [anh, setAnh] = useState<string[]>(kq?.anh ?? []);
  /**
   * Đang mở khối soạn hay không (Mr. Đại 06/09: "từng bài test thêm nút sửa
   * và nút lưu"). Trước đây lưu ngầm khi rời ô — người dùng không biết đã lưu
   * hay chưa. Nay: soạn xong bấm LƯU; lưu rồi thì thu lại, muốn đổi bấm SỬA.
   */
  const [dangSoan, setDangSoan] = useState(false);
  const [dangDan, setDangDan] = useState(false);

  // Sổ đổi từ máy chủ thì nạp lại ô soạn — trừ khi đang gõ dở, không cướp chữ
  useEffect(() => {
    if (dangSoan) return;
    setGhiChu(kq?.ghiChu ?? "");
    setPrompt(kq?.prompt ?? "");
    setAnh(kq?.anh ?? []);
  }, [kq?.ghiChu, kq?.prompt, kq?.anh, dangSoan]);

  const khongDat = kq?.trangThai === "khong-dat";
  const daCham = kq !== undefined;
  const coGhiChu = Boolean(kq?.ghiChu || kq?.prompt || (kq?.anh?.length ?? 0) > 0);

  const cham = (tt: TrangThaiBai): void => {
    // Bấm lại đúng nút đang chọn = bỏ chấm (bớt cú bấm, khỏi tìm nút xoá)
    if (kq?.trangThai === tt) {
      setDangSoan(false);
      void onLuu({ hanhDong: "bo-cham", ma: bai.ma });
      return;
    }
    void onLuu({ hanhDong: "cham", ma: bai.ma, trangThai: tt, ghiChu, prompt, anh });
    // Không đạt thì mở luôn khối soạn để ghi lý do
    setDangSoan(tt === "khong-dat");
  };

  const luu = async (): Promise<void> => {
    await onLuu({
      hanhDong: "cham",
      ma: bai.ma,
      trangThai: kq?.trangThai ?? "khong-dat",
      ghiChu,
      prompt,
      anh,
    });
    setDangSoan(false);
  };

  const boSua = (): void => {
    setGhiChu(kq?.ghiChu ?? "");
    setPrompt(kq?.prompt ?? "");
    setAnh(kq?.anh ?? []);
    setDangSoan(false);
  };

  /** Ảnh dán ở bất kỳ đâu trong khối soạn đều được nhận */
  const themAnhDan = useCallback((f: File) => {
    setDangDan(true);
    void (async () => {
      try {
        const b64 = await new Promise<string>((ok, no) => {
          const r = new FileReader();
          r.onload = () => ok(String(r.result));
          r.onerror = () => no(new Error("Không đọc được ảnh."));
          r.readAsDataURL(f);
        });
        const duoi = (f.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
        const res = await fetch("/api/kiem-thu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "luu-anh", duoi, duLieu: b64 }),
        });
        const j = (await res.json()) as { ok: boolean; ten?: string };
        if (j.ok && j.ten) setAnh((v) => [...v, j.ten as string]);
      } finally {
        setDangDan(false);
      }
    })();
  }, []);
  const batDan = useDanAnhTrongKhoi(themAnhDan);

  return (
    <div
      className={`rounded border bg-surface shadow-card ${
        khongDat ? "border-red/40" : kq?.trangThai === "dat" ? "border-green/40" : "border-border"
      }`}
    >
      {/* Hàng đầu: mã · tên · hai nút chấm */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-light px-3 py-2">
        <span className="rounded-sm bg-bg2 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          {bai.ma}
        </span>
        <b className="text-[12.5px] text-text">{bai.ten}</b>
        <span className="text-[9.5px] text-text-muted">
          {NHAN_GOC[bai.goc]}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            disabled={dangGui}
            onClick={() => cham("dat")}
            data-lenh="kiem-thu.cham"
            data-gia-tri={`${bai.ma} đạt`}
            className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
              kq?.trangThai === "dat"
                ? "border-green bg-green-soft text-green"
                : "border-border text-text-secondary hover:border-green hover:text-green"
            }`}
          >
            {kq?.trangThai === "dat" ? "◉" : "○"} Đạt
          </button>
          <button
            type="button"
            disabled={dangGui}
            onClick={() => cham("khong-dat")}
            data-lenh="kiem-thu.cham"
            data-gia-tri={`${bai.ma} không đạt`}
            className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
              khongDat
                ? "border-red bg-red-soft text-red"
                : "border-border text-text-secondary hover:border-red hover:text-red"
            }`}
          >
            {khongDat ? "◉" : "○"} Không đạt
          </button>

          {/* Sửa / Lưu đứng CẠNH hai nút chấm — Mr. Đại chốt 06/09.
              Đang soạn thì hiện Lưu + Bỏ sửa; đã lưu rồi thì hiện Sửa. */}
          {dangSoan ? (
            <>
              <button
                type="button"
                disabled={dangGui}
                onClick={() => void luu()}
                data-lenh="kiem-thu.luu-bai"
                data-gia-tri={bai.ma}
                className="rounded-sm border border-accent bg-accent-soft px-2.5 py-1 text-[11.5px] font-bold text-accent transition disabled:opacity-40"
              >
                {dangGui ? "Đang lưu…" : "💾 Lưu"}
              </button>
              <button
                type="button"
                onClick={boSua}
                className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
              >
                Bỏ sửa
              </button>
            </>
          ) : (
            daCham && (
              <button
                type="button"
                onClick={() => setDangSoan(true)}
                data-lenh="kiem-thu.sua-bai"
                data-gia-tri={bai.ma}
                className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
              >
                ✎ Sửa
              </button>
            )
          )}
        </div>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <ol className="space-y-1">
          {bai.buoc.map((b, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-text-secondary">
              <span className="shrink-0 text-text-muted">{i + 1}.</span>
              <span>{b}</span>
            </li>
          ))}
        </ol>

        {bai.fileMau && (
          <div className="text-[11.5px] text-text-secondary">
            📄 File mẫu: <span className="font-mono text-[11px] text-accent">{bai.fileMau}</span>{" "}
            <span className="text-text-muted">— trong thư mục data/mau-test/</span>
          </div>
        )}

        <div className="rounded-sm bg-bg2 px-2.5 py-1.5 text-[12px] text-text-secondary">
          <b className="text-text">Mong đợi:</b> {bai.mongDoi}
        </div>

        {/* ===== ĐÃ LƯU, THU LẠI — chỉ hiện tóm tắt kèm nút Sửa ===== */}
        {daCham && !dangSoan && (
          <div
            className={`rounded-sm border px-2.5 py-2 ${
              khongDat ? "border-red/40 bg-red-soft/30" : "border-border-light bg-bg2"
            }`}
          >
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                {coGhiChu ? (
                  <>
                    {kq?.ghiChu && (
                      <div className="whitespace-pre-wrap text-[12px] text-text-secondary">
                        {kq.ghiChu}
                      </div>
                    )}
                    {kq?.prompt && (
                      <div className="whitespace-pre-wrap border-l-2 border-accent pl-2 text-[12px] text-text">
                        🤖 {kq.prompt}
                      </div>
                    )}
                    {(kq?.anh?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {kq?.anh?.map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={a}
                            src={urlAnh(a)}
                            alt="ảnh chụp màn hình"
                            className="h-14 rounded-sm border border-border-light object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11.5px] text-text-muted">
                    {khongDat
                      ? "Chưa ghi lý do — bấm Sửa để mô tả và dán ảnh."
                      : "Đã chấm Đạt. Bấm Sửa nếu muốn ghi thêm."}
                  </div>
                )}
              </div>
            </div>
            {kq?.luc && (
              <div className="mt-1 text-[10px] text-text-muted">
                Đã lưu lúc {ngayGioVN(new Date(kq.luc))}
              </div>
            )}
          </div>
        )}

        {/* ===== ĐANG SOẠN — nút Lưu và Bỏ sửa =====
            onPaste đặt ở khối này chứ không ở riêng ô ảnh: gõ mô tả xong
            Ctrl+V luôn là ăn (Mr. Đại báo lỗi 06/09). */}
        {dangSoan && (
          <div
            onPaste={batDan}
            className="space-y-2 rounded-sm border border-red/40 bg-red-soft/30 p-2.5"
          >
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={3}
              placeholder="Mô tả cụ thể: bạn làm gì, phần mềm phản hồi gì, khác mong đợi ở đâu…"
              className="w-full resize-y rounded-sm border border-border bg-bg px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent"
            />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Câu lệnh nhờ AI sửa — viết luôn ở đây, sau chỉ việc bảo AI đọc file kết quả…"
              className="w-full resize-y rounded-sm border border-accent/40 bg-bg px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent"
            />
            {dangDan && <div className="text-[11px] text-accent">Đang lưu ảnh vừa dán…</div>}
            <ODanAnh
              anh={anh}
              dangGui={dangGui}
              onThem={(t) => setAnh((v) => [...v, t])}
              onBo={(t) => setAnh((v) => v.filter((x) => x !== t))}
            />
            <div className="text-[10.5px] text-text-muted">
              Ghi vào file trên máy — bấm <b className="text-text">💾 Lưu</b> ở hàng trên mới có
              hiệu lực.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tab riêng cho vấn đề KHÔNG có trong kịch bản */
function TabPhatSinh({
  so,
  onLuu,
  dangGui,
}: {
  so: SoKetQuaTest;
  onLuu: (p: Record<string, unknown>) => Promise<void>;
  dangGui: boolean;
}) {
  const [moForm, setMoForm] = useState(false);
  const [sua, setSua] = useState<string | null>(null);
  const [ten, setTen] = useState("");
  const [prompt, setPrompt] = useState("");
  const [anh, setAnh] = useState<string[]>([]);

  /** Dán ảnh ở bất kỳ đâu trong form phát sinh cũng được */
  const themAnhDan = useCallback((f: File) => {
    void (async () => {
      const b64 = await new Promise<string>((ok, no) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => no(new Error("Không đọc được ảnh."));
        r.readAsDataURL(f);
      });
      const duoi = (f.type.split("/")[1] ?? "png").replace("jpeg", "jpg");
      const res = await fetch("/api/kiem-thu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanhDong: "luu-anh", duoi, duLieu: b64 }),
      });
      const j = (await res.json()) as { ok: boolean; ten?: string };
      if (j.ok && j.ten) setAnh((v) => [...v, j.ten as string]);
    })();
  }, []);
  const batDan = useDanAnhTrongKhoi(themAnhDan);

  const dong = (): void => {
    setMoForm(false);
    setSua(null);
    setTen("");
    setPrompt("");
    setAnh([]);
  };

  const luu = async (): Promise<void> => {
    if (ten.trim() === "") return;
    await onLuu(
      sua
        ? { hanhDong: "sua-phat-sinh", id: sua, ten, prompt, anh }
        : { hanhDong: "them-phat-sinh", ten, prompt, anh }
    );
    dong();
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-accent">
          NGOÀI KỊCH BẢN
        </div>
        <h2 className="text-[17px] font-bold text-text">Vấn đề phát sinh</h2>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Thứ gặp phải mà kịch bản không có. Viết câu lệnh nhờ sửa và dán ảnh vào đây; xong nó thu
          lại còn một dòng tên.
        </p>
      </div>

      {!moForm && (
        <button
          type="button"
          onClick={() => setMoForm(true)}
          data-lenh="kiem-thu.them-phat-sinh"
          className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition hover:border-accent"
        >
          + Thêm vấn đề
        </button>
      )}

      {moForm && (
        <div
          onPaste={batDan}
          className="space-y-2 rounded border border-accent/40 bg-surface p-3 shadow-card"
        >
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            placeholder="Tên vấn đề — ngắn gọn, sau còn tìm lại"
            className="w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-[12.5px] text-text outline-none focus:border-accent"
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Mô tả vấn đề và viết luôn câu lệnh nhờ AI sửa…"
            className="w-full resize-y rounded-sm border border-border bg-bg px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent"
          />
          <ODanAnh
            anh={anh}
            dangGui={dangGui}
            onThem={(t) => setAnh((v) => [...v, t])}
            onBo={(t) => setAnh((v) => v.filter((x) => x !== t))}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={dangGui || ten.trim() === ""}
              onClick={() => void luu()}
              className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent disabled:opacity-40"
            >
              {dangGui ? "Đang lưu…" : sua ? "💾 Lưu sửa" : "💾 Lưu vấn đề"}
            </button>
            <button
              type="button"
              onClick={dong}
              className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
            >
              Bỏ
            </button>
          </div>
        </div>
      )}

      {so.phatSinh.length === 0 && !moForm && (
        <div className="text-[12.5px] text-text-muted">Chưa có vấn đề nào ngoài kịch bản.</div>
      )}

      {so.phatSinh.map((v) => (
        <div key={v.id} className="rounded border border-border bg-surface px-3 py-2 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-bg2 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
              {v.id}
            </span>
            <b className="text-[12.5px] text-text">{v.ten}</b>
            {v.anh.length > 0 && (
              <span className="text-[10.5px] text-text-muted">📎 {v.anh.length} ảnh</span>
            )}
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSua(v.id);
                  setTen(v.ten);
                  setPrompt(v.prompt);
                  setAnh(v.anh);
                  setMoForm(true);
                }}
                className="rounded-sm border border-border px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
              >
                Sửa
              </button>
              <button
                type="button"
                disabled={dangGui}
                onClick={() => void onLuu({ hanhDong: "xoa-phat-sinh", id: v.id })}
                className="rounded-sm border border-border px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:border-red hover:text-red"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function KichBanTest() {
  const [so, setSo] = useState<SoKetQuaTest>(SO_RONG);
  const [tabMa, setTabMa] = useState<string>(CAC_TAB[0]?.ma ?? "");
  const [dangGui, setDangGui] = useState(false);
  const [bao, setBao] = useState<string | null>(null);
  const lanDau = useRef(true);

  useEffect(() => {
    void fetch("/api/kiem-thu", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok: boolean; so?: SoKetQuaTest }) => {
        if (j.ok && j.so) setSo(j.so);
      })
      .catch(() => undefined)
      .finally(() => {
        lanDau.current = false;
      });
  }, []);

  const goi = useCallback(async (p: Record<string, unknown>): Promise<void> => {
    setDangGui(true);
    try {
      const r = await fetch("/api/kiem-thu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const j = (await r.json()) as { ok: boolean; so?: SoKetQuaTest; message?: string };
      if (j.so) setSo(j.so);
      setBao(j.ok ? (j.message ?? "Đã lưu.") : (j.message ?? "Lưu thất bại."));
      window.setTimeout(() => setBao(null), 2500);
    } catch {
      setBao("Không gọi được máy chủ — kết quả CHƯA được lưu.");
    } finally {
      setDangGui(false);
    }
  }, []);

  const tab = useMemo(() => CAC_TAB.find((t) => t.ma === tabMa) ?? null, [tabMa]);
  const dem = tab ? demTab(tab, so) : null;
  const tongDaCham = Object.keys(so.bai).length;
  const tongDat = Object.values(so.bai).filter((k) => k.trangThai === "dat").length;

  return (
    <div className="space-y-3">
      <KhaiHuongDan ma="kich-ban-test" />
      {/* ===== Hàng tab kèm số đếm — đúng khuôn màn test pháp lý ===== */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CAC_TAB.map((t) => {
          const d = demTab(t, so);
          return (
            <button
              key={t.ma}
              type="button"
              onClick={() => setTabMa(t.ma)}
              data-lenh="kiem-thu.tab"
              data-gia-tri={t.ten}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                tabMa === t.ma
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
              }`}
            >
              {t.ten}
              <span className="rounded-full bg-bg2 px-1.5 text-[9.5px] tabular-nums text-text-muted">
                {d.dat}/{d.tong}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setTabMa("phat-sinh")}
          data-lenh="kiem-thu.tab"
          data-gia-tri="Vấn đề phát sinh"
          className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
            tabMa === "phat-sinh"
              ? "border-accent/50 bg-accent-soft text-accent"
              : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
          }`}
        >
          🔧 Vấn đề phát sinh
          <span className="rounded-full bg-bg2 px-1.5 text-[9.5px] tabular-nums text-text-muted">
            {so.phatSinh.length}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
        <span>
          Đã chấm <b className="text-text">{tongDaCham}</b>/{TONG_SO_BAI} bài — đạt {tongDat}
        </span>
        {TAB_TAM_AN.map((t) => (
          <span key={t.ma}>
            · ⏸ Tạm ẩn {t.bai.length} bài «{t.ten}» ({t.bai.map((x) => x.ma).join(", ")}) — {LY_DO_TAM_AN}
          </span>
        ))}
        <span>·</span>
        <span>
          Kết quả lưu vào <span className="font-mono text-[10.5px]">data/kiem-thu/</span> trên máy,
          bảo AI đọc <span className="font-mono text-[10.5px]">BAO-CAO-TEST.md</span> là sửa được ngay
        </span>
        {bao && <span className="font-semibold text-accent">· {bao}</span>}
      </div>

      {tabMa === "phat-sinh" ? (
        <TabPhatSinh so={so} onLuu={goi} dangGui={dangGui} />
      ) : (
        tab && (
          <div className="space-y-3">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-accent">
                {tab.nhom}
              </div>
              <h2 className="text-[17px] font-bold text-text">Kịch bản — {tab.ten}</h2>
              <p className="mt-1 text-[12.5px] text-text-secondary">{tab.dan}</p>
            </div>

            {/* Thanh tiến độ */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${dem && dem.tong > 0 ? (dem.dat / dem.tong) * 100 : 0}%` }}
                />
              </div>
              <span className="shrink-0 text-[11.5px] font-semibold text-text-secondary">
                {dem?.dat}/{dem?.tong} đạt
              </span>
            </div>

            {tab.bai.map((b) => (
              <MotBai key={b.ma} bai={b} so={so} onLuu={goi} dangGui={dangGui} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
