import type { Severity } from "@/lib/types";

const TONE_CLASS: Record<string, string> = {
  green: "text-green",
  red: "text-red",
  yellow: "text-yellow",
  blue: "text-blue",
  muted: "text-text-muted",
  accent: "text-accent",
};

export type Tone = keyof typeof TONE_CLASS;

/**
 * Pill trạng thái dùng chung — màu theo ngữ nghĩa.
 * ⭐ Luật 28 (Mr. Đại chốt 10/09): nhãn trạng thái là CHỮ THUẦN — không viền, không nền,
 * không bo tròn (viền là dấu hiệu của nút). Phân biệt bằng màu chữ + đậm nhạt + icon.
 */
export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold ${TONE_CLASS[tone] ?? TONE_CLASS.muted}`}
    >
      {children}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const color =
    severity === "red" ? "bg-red" : severity === "yellow" ? "bg-yellow" : "bg-green";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function severityLabel(s: Severity): string {
  return s === "red" ? "Nghiêm trọng" : s === "yellow" ? "Cảnh báo" : "Bình thường";
}

/** Badge đánh dấu trường do AI sinh — PM cần review */
export function AITag() {
  return (
    <span className="ml-1 inline-flex items-center text-[9px] font-bold uppercase tracking-wide text-accent">
      AI
    </span>
  );
}
