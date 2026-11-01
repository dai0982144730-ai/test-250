"use client";

// ============================================================
// DANH BẠ AGENT — người điều khiển tự khai nối mấy con, con nào
//
// ⛔ Màn này tồn tại để KHÔNG BAO GIỜ phải gắn cứng "4 agent" hay "5 agent"
//    vào code. Hôm nay 5 con, mai thêm con quan sát thành 6, mốt bớt còn 2 —
//    người dùng sửa ở đây, code không đổi dòng nào.
//
// Khuôn theo `core.nang_luc_agent` (PLAN-TONG-THE 6.5) và luật
// "agent nào dang_bat = false thì BỎ QUA và NÓI RÕ" (HOP-DONG-KET-NOI 8.1).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Plus, Power, Save, Trash2, Wifi, WifiOff } from "lucide-react";
import type { KhaiAgent } from "@/lib/danh-ba-agent";

interface TinhTrang {
  ma: string;
  song: boolean;
  chiTiet: string;
}

/** Trạng thái tiến trình — khớp `TrangThaiAgent` bên `lib/dieu-khien-agent`. */
interface TrangThaiChay {
  ma: string;
  ten: string;
  dangChay: boolean;
  pidMainBat: number | null;
  cong: number | null;
  khongBatDuoc: string | null;
}

export function DanhBaAgent({
  danhBa,
  luu,
  dangLuu,
}: {
  danhBa: KhaiAgent[];
  luu: (p: { danhBaAgent: KhaiAgent[] }) => Promise<void>;
  dangLuu: boolean;
}) {
  const [ds, setDs] = useState<KhaiAgent[]>(danhBa);
  const [dangDo, setDangDo] = useState(false);
  const [tinhTrang, setTinhTrang] = useState<TinhTrang[]>([]);

  const doi = (i: number, k: keyof KhaiAgent, v: string | boolean) =>
    setDs((cu) => cu.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  const them = () =>
    setDs((cu) => [
      ...cu,
      { ma: "", ten: "", diaChi: "http://localhost:", duongDanMcp: "", dangBat: false },
    ]);

  const bo = (i: number) => setDs((cu) => cu.filter((_, j) => j !== i));

  /** Gọi thử suc_khoe từng agent ĐANG BẬT — đo thật, không đoán */
  const doThu = async () => {
    setDangDo(true);
    setTinhTrang([]);
    const ra: TinhTrang[] = [];
    for (const a of ds.filter((x) => x.dangBat && x.diaChi.trim() !== "")) {
      try {
        const r = await fetch("/api/do-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diaChi: a.diaChi, duongDanMcp: a.duongDanMcp, ma: a.ma }),
        });
        const j = (await r.json()) as { song: boolean; chiTiet: string };
        ra.push({ ma: a.ma, song: j.song, chiTiet: j.chiTiet });
      } catch {
        ra.push({ ma: a.ma, song: false, chiTiet: "Không gọi được máy chủ của agent này" });
      }
    }
    setTinhTrang(ra);
    setDangDo(false);
  };

  const soBat = ds.filter((d) => d.dangBat).length;

  // ── Bật/tắt tiến trình ────────────────────────────────────
  const [chay, setChay] = useState<TrangThaiChay[]>([]);
  const [dangBam, setDangBam] = useState<string | null>(null);
  const [noiGanNhat, setNoiGanNhat] = useState<string | null>(null);

  const hoiTrangThai = useCallback(async () => {
    try {
      const r = await fetch("/api/dieu-khien-agent", { cache: "no-store" });
      const j = (await r.json()) as { ok: boolean; trangThai?: TrangThaiChay[] };
      setChay(Array.isArray(j.trangThai) ? j.trangThai : []);
    } catch {
      setChay([]); // hỏi không được thì thôi — cột đó hiện "—", không hiện 0
    }
  }, []);

  useEffect(() => {
    void hoiTrangThai();
    // Hỏi lại mỗi 10s: `next dev` lần đầu biên dịch 30–60s mới thưa, người
    // dùng cần thấy nó chuyển từ "đang bật" sang "đang chạy" mà không phải F5.
    const h = setInterval(() => void hoiTrangThai(), 10_000);
    return () => clearInterval(h);
  }, [hoiTrangThai]);

  const dieuKhien = async (ma: string, viec: "bat" | "tat") => {
    setDangBam(ma);
    setNoiGanNhat(null);
    try {
      const r = await fetch("/api/dieu-khien-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ma, viec }),
      });
      const j = (await r.json()) as { ok: boolean; noi?: string };
      setNoiGanNhat(j.noi ?? (j.ok ? "Xong." : "Không rõ kết quả."));
    } catch {
      setNoiGanNhat("Không gọi được máy chủ Main.");
    } finally {
      setDangBam(null);
      void hoiTrangThai();
    }
  };

  const soDangChay = chay.filter((c) => c.dangChay).length;

  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="text-[13px] font-bold text-text">
        Danh bạ agent — khai muốn nối mấy con, con nào
      </div>

      <div className="mb-3 mt-2 rounded-sm border border-accent/40 bg-accent-soft px-3 py-2 text-[11.5px] leading-relaxed text-text-secondary">
        <strong className="text-accent">Đây là BẢN CHÍNH của cả hệ.</strong> Bốn agent kia
        không giữ danh bạ riêng nữa — chúng{" "}
        <strong className="text-text">kéo bản này về</strong> qua công cụ{" "}
        <code>main.danh_ba</code>. Sửa ở đây là cả hệ đổi theo.
        <br />
        Trước ngày 06/09 mỗi app giữ một bản riêng: tắt một con ở một agent mà quên tắt ở Main thì
        con quan sát thôi soi nó nhưng Main vẫn hỏi nó —{" "}
        <strong className="text-text">hai bản lệch nhau mà không ai báo</strong>.
      </div>

      <p className="mb-3 mt-1 text-[11.5px] leading-relaxed text-text-secondary">
        Số agent <strong className="text-text">không gắn cứng trong code</strong>. Thêm dòng
        là nối thêm một con, tắt là bỏ qua con đó. Agent bị <strong className="text-text">tắt
        thì hệ nói rõ lý do</strong> chứ không gọi rồi ngồi chờ hết hạn.
        Lên máy chủ thì chỉ sửa cột <em>Địa chỉ</em> từ <code>localhost</code> sang tên miền —
        không phải sửa code.
      </p>

      <div className="mb-3 rounded-sm border border-border bg-bg2 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
        <strong className="text-text-secondary">Hai chữ “bật” khác nhau, đừng lẫn:</strong>{" "}
        ô tick <em>Bật</em> ở cột đầu nghĩa là{" "}
        <strong className="text-text-secondary">“kể từ giờ hỏi con này”</strong> — luôn dùng
        được, kể cả khi con đó nằm trên tên miền. Còn nút{" "}
        <strong className="text-text-secondary">Chạy / Dừng</strong> ở cột cuối là{" "}
        <strong className="text-text-secondary">chạy app lên</strong> — chỉ làm được với con
        nằm cùng máy với Main. Lên tên miền thì con đó phải tự chạy trên máy chủ của nó.
      </div>

      <div className="mb-2 flex items-center gap-2 text-[11.5px]">
        <span className="font-semibold text-text-secondary">
          {ds.length} agent khai · <strong className="text-text">{soBat} đang bật</strong> ·{" "}
          {chay.length === 0 ? (
            <span title="Chưa hỏi được trạng thái tiến trình">— đang chạy</span>
          ) : (
            <strong className="text-green">{soDangChay} đang chạy</strong>
          )}
        </span>
        <button
          type="button"
          onClick={() => void doThu()}
          disabled={dangDo || soBat === 0}
          className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 font-semibold text-text-secondary transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {dangDo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
          Gọi thử các con đang bật
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th className="py-1.5 pr-2 w-[70px]">Bật</th>
              <th className="py-1.5 pr-2 w-[100px]">Mã</th>
              <th className="py-1.5 pr-2">Tên hiện ra</th>
              <th className="py-1.5 pr-2">Địa chỉ</th>
              <th className="py-1.5 pr-2">Đường dẫn MCP</th>
              <th className="py-1.5 pr-2">Thư mục code</th>
              <th className="py-1.5 pr-2">Ghi chú</th>
              <th className="py-1.5 pr-2 w-[110px]">Chạy app</th>
              <th className="py-1.5 w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {ds.map((a, i) => {
              const tt = tinhTrang.find((t) => t.ma === a.ma);
              return (
                <tr key={`${a.ma}-${i}`} className="border-b border-border-light align-top">
                  <td className="py-1.5 pr-2">
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={a.dangBat}
                        onChange={(e) => doi(i, "dangBat", e.target.checked)}
                      />
                      <span className="text-[10.5px] font-semibold text-text-muted">
                        {a.dangBat ? "bật" : "tắt"}
                      </span>
                    </label>
                    {tt && (
                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${
                          tt.song ? "text-green" : "text-text-muted"
                        }`}
                        title={tt.chiTiet}
                      >
                        {tt.song ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {tt.song ? "trả lời" : "im"}
                      </div>
                    )}
                  </td>
                  {(["ma", "ten", "diaChi", "duongDanMcp", "thuMucCode", "ghiChu"] as const).map((k) => (
                    <td key={k} className="py-1.5 pr-2">
                      <input
                        value={(a[k] as string) ?? ""}
                        onChange={(e) => doi(i, k, e.target.value)}
                        placeholder={
                          k === "ma"
                            ? "vd: quansat"
                            : k === "duongDanMcp"
                              ? "/api/mcp/…"
                              : k === "thuMucCode"
                                ? "để trống = không chạy test"
                                : ""
                        }
                        className="w-full rounded-sm border border-border bg-bg2 px-2 py-1 text-[11.5px] text-text outline-none focus:border-accent"
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pr-2">
                    {(() => {
                      const c = chay.find((x) => x.ma === a.ma);
                      // Chưa hỏi được trạng thái → "—", KHÔNG đoán là tắt.
                      if (!c) return <span className="text-[10.5px] text-text-muted">—</span>;
                      if (c.khongBatDuoc !== null) {
                        return (
                          <div
                            className="text-[10.5px] leading-tight text-text-muted"
                            title={c.khongBatDuoc}
                          >
                            {c.dangChay ? (
                              <span className="font-semibold text-green">đang chạy</span>
                            ) : (
                              "—"
                            )}
                            <div className="mt-0.5">không bật hộ được</div>
                          </div>
                        );
                      }
                      const dangCho = dangBam === a.ma;
                      return (
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-[10.5px] font-semibold ${
                              c.dangChay ? "text-green" : "text-text-muted"
                            }`}
                          >
                            {c.dangChay ? `đang chạy · ${c.cong ?? "—"}` : "chưa chạy"}
                          </span>
                          <button
                            type="button"
                            disabled={dangCho}
                            onClick={() => void dieuKhien(a.ma, c.dangChay ? "tat" : "bat")}
                            className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10.5px] font-semibold transition disabled:opacity-50 ${
                              c.dangChay
                                ? "border-border text-text-secondary hover:border-red hover:text-red"
                                : "border-accent/50 bg-accent-soft text-accent hover:border-accent"
                            }`}
                          >
                            {dangCho ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : c.dangChay ? (
                              <Power className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            {c.dangChay ? "Dừng" : "Chạy"}
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => bo(i)}
                      title="Bỏ dòng này khỏi danh bạ"
                      className="text-text-muted transition hover:text-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {noiGanNhat !== null && (
        <div className="mt-2 rounded-sm border border-border bg-bg2 px-3 py-2 text-[11px] text-text-secondary">
          {noiGanNhat}
        </div>
      )}

      {chay.some((c) => c.khongBatDuoc !== null) && (
        <div className="mt-2 rounded-sm border border-border bg-bg2 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
          <strong className="text-text-secondary">Con không bật hộ được từ đây:</strong>
          {chay
            .filter((c) => c.khongBatDuoc !== null)
            .map((c) => (
              <div key={c.ma} className="mt-1">
                <strong className="text-text-secondary">{c.ten || c.ma}</strong>: {c.khongBatDuoc}
              </div>
            ))}
        </div>
      )}

      {tinhTrang.some((t) => !t.song) && (
        <div className="mt-2 rounded-sm border border-border bg-bg2 px-3 py-2 text-[11px] text-text-secondary">
          {tinhTrang
            .filter((t) => !t.song)
            .map((t) => (
              <div key={t.ma}>
                <strong className="text-text">{t.ma}</strong>: {t.chiTiet}
              </div>
            ))}
        </div>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={them}
          className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm agent
        </button>
        <button
          type="button"
          disabled={dangLuu}
          onClick={() => void luu({ danhBaAgent: ds.filter((d) => d.ma.trim() !== "") })}
          className="flex items-center gap-1.5 rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition hover:border-accent disabled:opacity-60"
        >
          {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lưu danh bạ
        </button>
      </div>

      <p className="mt-2 text-[10.5px] leading-relaxed text-text-muted">
        Cột <strong className="text-text-secondary">Thư mục code</strong> là đường dẫn{" "}
        <em>trên máy đang chạy app này</em> — để nút{" "}
        <strong className="text-text-secondary">Chạy / Dừng</strong> ở bảng trên bật được app
        của con đó. Để trống thì vẫn theo dõi được qua mạng (tab Sức khoẻ của Nhật ký &amp; sức
        khoẻ agent), chỉ là không bật hộ được.
      </p>

      <p className="mt-2.5 text-[10.5px] leading-relaxed text-text-muted">
        Ví dụ dùng ô <em>Thêm agent</em>: muốn nối thêm <strong>con quan sát</strong> thì khai
        mã <code>quansat</code>, địa chỉ của nó, rồi bật lên. Không cần sửa code, không cần
        đóng gói lại.
      </p>
    </div>
  );
}
