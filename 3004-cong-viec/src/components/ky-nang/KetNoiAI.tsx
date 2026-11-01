"use client";

// ============================================================
// KẾT NỐI AI + VĂN PHONG trên trang Kỹ năng AI (trang chỉ hiện cho người có quyền cau_hinh.sua).
// Thẻ Kết nối AI là component DÙNG CHUNG với Cài đặt → AI (src/components/ai/KetNoiAI.tsx) —
// không nhân đôi code. Văn phong trả lời vẫn ở đây như bản gốc (thẻ "Phong cách trả lời").
// ============================================================

import { useState } from "react";
import { KetNoiAI as TheKetNoiAI } from "@/components/ai/KetNoiAI";
import { Nut, goiApi } from "@/components/layout/giao-dien";
import { SectionCard } from "./khung";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const O = "w-full rounded-sm border border-border bg-bg2 px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent";

function VanPhongTraLoi() {
  const [mo, setMo] = useState(false);
  const [noiDung, setNoiDung] = useState("");
  const [dang, setDang] = useState(false);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);

  async function chay(fn: () => Promise<string>) {
    setDang(true);
    setBao(null);
    try {
      setBao({ ok: true, chu: await fn() });
    } catch (e) {
      setBao({ ok: false, chu: e instanceof Error ? e.message : "Lỗi không rõ." });
    } finally {
      setDang(false);
    }
  }

  return (
    <SectionCard
      title="Văn phong trả lời"
      subtitle="Hướng dẫn cách Trợ lý SCI công việc viết câu trả lời (xưng hô, độ dài, định dạng)."
      actions={
        <Nut
          nho
          disabled={dang}
          onClick={() =>
            void (async () => {
              if (!mo) {
                const j = await goiApi<{ noiDung?: string }>("/api/tro-ly/van-phong").catch(() => ({ noiDung: "" }));
                setNoiDung(String(j.noiDung ?? ""));
              }
              setMo((v) => !v);
            })()
          }
        >
          {mo ? "Đóng văn phong" : "Văn phong trả lời…"}
        </Nut>
      }
    >
      {mo ? (
        <div className="space-y-2">
          <textarea className={`${O} h-48 resize-y font-mono text-[11px]`} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} />
          <div className="flex gap-2">
            <Nut nho disabled={dang} onClick={() => void chay(async () => String((await goiApi<{ message?: string }>("/api/tro-ly/van-phong", { body: { noiDung } })).message ?? ""))}>
              Lưu văn phong
            </Nut>
            <Nut
              nho
              kieu="nhat"
              disabled={dang}
              onClick={() =>
                void chay(async () => {
                  const j = await goiApi<{ noiDung?: string; message?: string }>("/api/tro-ly/van-phong", { body: { veMacDinh: true } });
                  setNoiDung(String(j.noiDung ?? ""));
                  return String(j.message ?? "");
                })
              }
            >
              Về mặc định
            </Nut>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-text-muted">Bấm “Văn phong trả lời…” để xem và sửa.</p>
      )}
      {bao && <div className={`mt-2 text-[11.5px] ${bao.ok ? "text-green" : "text-red"}`}>{bao.chu}</div>}
    </SectionCard>
  );
}

export function KetNoiAI() {
  return (
    <div className="space-y-4">
      <KhaiHuongDan ma="ky-nang-ket-noi-ai" uuTien={0} />
      <TheKetNoiAI />
      <VanPhongTraLoi />
    </div>
  );
}
