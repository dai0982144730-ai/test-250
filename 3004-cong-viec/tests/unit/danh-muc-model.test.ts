// Bản cố định model Claude: tên tự đặt cho mã mới, gộp model tự học + danh mục + model bổ sung.
import { describe, expect, it } from "vitest";
import { MODEL_CLAUDE, danhSachModelClaude, tenModel, tenTuMa } from "@/lib/ai/danh-muc-model";

describe("danh mục model", () => {
  it("đặt tên đẹp từ mã model", () => {
    expect(tenTuMa("claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(tenTuMa("claude-haiku-4-5-20251001")).toBe("Claude Haiku 4.5");
    expect(tenTuMa("claude-sonnet-6")).toBe("Claude Sonnet 6");
    expect(tenTuMa("gpt-5")).toBe("gpt-5");
    expect(tenModel("claude-opus-5-5")).toBe(MODEL_CLAUDE.find((m) => m.id === "claude-opus-5-5")!.ten);
  });

  it("gộp model tự học (trước) + danh mục + model bổ sung, bỏ trùng", () => {
    const ds = danhSachModelClaude(["claude-sonnet-5", "claude-moi-9"], [{ id: "claude-opus-6", ten: "Claude Opus 6" }, { id: "claude-sonnet-5", ten: "trùng" }]);
    expect(ds[0]!.id).toBe("claude-opus-6");
    expect(ds.filter((m) => m.id === "claude-sonnet-5")).toHaveLength(1);
    expect(ds.at(-1)).toEqual({ id: "claude-moi-9", ten: "Claude Moi 9 (bổ sung)" });
    expect(ds).toHaveLength(MODEL_CLAUDE.length + 2);
  });
});
