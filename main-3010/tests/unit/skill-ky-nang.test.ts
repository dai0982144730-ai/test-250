// SKILL AI CỦA TÔI — port từ bản chạy thật phaply (LOI-DUNG-CHUNG mục 5)
//
// Ba lưới chặn đáng kiểm nhất (giữ nguyên từ bản gốc đã chạy thật):
//   ① zip-slip: file .skill độc chứa "../" không được ghi ra ngoài kho
//   ② zip-bomb: quá 20 MB sau giải nén / quá 200 file → chặn
//   ③ slug: tên tiếng Việt có dấu → thư mục an toàn, không còn ký tự lạ

import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import os from "node:os";
import AdmZip from "adm-zip";
import {
  SKILL_CO_SCRIPT,
  SKILL_HE_THONG,
  capNhatSkillHeThong,
  docFrontmatterSkillMd,
  giaiNenSkillZip,
  khoChung,
  lamSachSlug,
  layDanhSach,
  luuTuNoiDung,
  xoaSkill,
} from "@/lib/skill/ky-nang";

// ============ SLUG ============

describe("Làm sạch slug", () => {
  it("bỏ dấu tiếng Việt, đ → d", () => {
    expect(lamSachSlug("Soát Tiến Độ Điện Gió")).toBe("soat-tien-do-dien-gio");
  });
  it("nuốt mọi ký tự lạ — không còn đường thoát path traversal", () => {
    expect(lamSachSlug("../../etc/passwd")).toBe("etc-passwd");
    expect(lamSachSlug("a\\..\\b")).toBe("a-b");
  });
  it("chuỗi toàn ký tự lạ → rỗng (bị từ chối ở tầng trên)", () => {
    expect(lamSachSlug("###")).toBe("");
  });
});

// ============ FRONTMATTER ============

describe("Đọc frontmatter SKILL.md", () => {
  it("đọc được dạng thường và dạng khối >- nhiều dòng", () => {
    const fm = docFrontmatterSkillMd(
      "---\nname: thu-skill\ndescription: >-\n  dòng một\n  dòng hai\n---\n\n# Nội dung"
    );
    expect(fm?.ten).toBe("thu-skill");
    expect(fm?.moTa).toBe("dòng một dòng hai");
  });
  it("thiếu name hoặc description → null, không đoán", () => {
    expect(docFrontmatterSkillMd("---\nname: x\n---\nnội dung")).toBeNull();
    expect(docFrontmatterSkillMd("không có frontmatter")).toBeNull();
  });
});

// ============ GIẢI NÉN — LƯỚI CHẶN ============

function zipTu(entries: Record<string, string>): Buffer {
  const z = new AdmZip();
  for (const [ten, noiDung] of Object.entries(entries)) {
    z.addFile(ten, Buffer.from(noiDung, "utf8"));
  }
  return z.toBuffer();
}

const SKILL_MD_HOP_LE =
  "---\nname: thu-nghiem\ndescription: skill thử nghiệm cho bài kiểm\n---\n\n# Thử";

describe("Giải nén .skill — các lưới chặn của bản phaply", () => {
  const kho = fs.mkdtempSync(path.join(os.tmpdir(), "kho-skill-"));
  afterAll(() => fs.rmSync(kho, { recursive: true, force: true }));

  it("gói hợp lệ → giải nén đúng chỗ, đọc đúng tên + mô tả", () => {
    const kq = giaiNenSkillZip(kho, zipTu({ "thu-nghiem/SKILL.md": SKILL_MD_HOP_LE }));
    expect(kq.slug).toBe("thu-nghiem");
    expect(fs.existsSync(path.join(kho, "thu-nghiem", "SKILL.md"))).toBe(true);
  });

  it("① zip-slip: entry chứa ../ bị TỪ CHỐI, KHÔNG ghi ra ngoài", () => {
    // adm-zip có thể tự chuẩn hoá "a/../../x" trước khi lưới của mình chạy —
    // điều PHẢI đúng là gói bị từ chối (câu nào cũng được) và không có file
    // nào lọt ra ngoài kho. Khẳng định bản chất, không khẳng định câu chữ.
    expect(() =>
      giaiNenSkillZip(kho, zipTu({ "a/SKILL.md": SKILL_MD_HOP_LE, "a/../../ngoai.txt": "x" }))
    ).toThrow();
    expect(fs.existsSync(path.join(kho, "..", "ngoai.txt"))).toBe(false);
    expect(fs.existsSync(path.join(kho, "ngoai.txt"))).toBe(false);
  });

  it("① đường dẫn tuyệt đối cũng bị chặn", () => {
    // adm-zip chuẩn hoá bớt, nên kiểm bằng entry kiểu Windows-drive
    const z = new AdmZip();
    z.addFile("c:/tmp/doc.txt", Buffer.from("x"));
    z.addFile("a/SKILL.md", Buffer.from(SKILL_MD_HOP_LE));
    expect(() => giaiNenSkillZip(kho, z.toBuffer())).toThrow(/tuyệt đối|MỘT thư mục gốc/);
  });

  it("② quá 200 file → chặn", () => {
    const entries: Record<string, string> = { "to/SKILL.md": SKILL_MD_HOP_LE };
    for (let i = 0; i < 205; i++) entries[`to/references/f${i}.md`] = "x";
    expect(() => giaiNenSkillZip(kho, zipTu(entries))).toThrow(/quá 200 mục/);
  });

  it("hai thư mục gốc → chặn (phải đúng MỘT)", () => {
    expect(() =>
      giaiNenSkillZip(kho, zipTu({ "a/SKILL.md": SKILL_MD_HOP_LE, "b/SKILL.md": SKILL_MD_HOP_LE }))
    ).toThrow(/MỘT thư mục gốc/);
  });

  it("thiếu SKILL.md → chặn", () => {
    expect(() => giaiNenSkillZip(kho, zipTu({ "a/doc.md": "x" }))).toThrow(/SKILL\.md/);
  });

  it("không phải ZIP → câu lỗi tiếng Việt", () => {
    expect(() => giaiNenSkillZip(kho, Buffer.from("đây không phải zip"))).toThrow(/ZIP hợp lệ/);
  });
});

// ============ SKILL HỆ THỐNG + KHO ============

describe("Skill hệ thống và kho", () => {
  const NGUOI = "bai-kiem-skill";
  afterAll(() => {
    // Dọn skill bài kiểm tạo ra — kho riêng của "người" này
    fs.rmSync(duongDanDuLieu("skills", "rieng", NGUOI), {
      recursive: true,
      force: true,
    });
  });

  it("5 skill hệ thống trong repo đều có SKILL.md frontmatter hợp lệ", () => {
    for (const slug of SKILL_HE_THONG) {
      const p = path.join(process.cwd(), "skills-he-thong", slug, "SKILL.md");
      expect(fs.existsSync(p), `thiếu ${slug}/SKILL.md`).toBe(true);
      const fm = docFrontmatterSkillMd(fs.readFileSync(p, "utf8"));
      expect(fm, `${slug} frontmatter hỏng`).not.toBeNull();
      expect(fm!.ten).toBe(slug); // name phải khớp tên thư mục
    }
  });

  it("3 skill xuất file đều có script Python kèm theo", () => {
    for (const slug of SKILL_CO_SCRIPT) {
      const dir = path.join(process.cwd(), "skills-he-thong", slug, "scripts");
      const co = fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith(".py"));
      expect(co, `${slug} thiếu scripts/*.py`).toBe(true);
    }
  });

  it("cập nhật skill hệ thống → kho chung có đủ, danh sách thấy đủ", () => {
    capNhatSkillHeThong();
    for (const slug of SKILL_HE_THONG) {
      expect(fs.existsSync(path.join(khoChung(), slug, "SKILL.md"))).toBe(true);
    }
    const ds = layDanhSach(NGUOI);
    for (const slug of SKILL_HE_THONG) {
      expect(ds.some((s) => s.slug === slug && s.phamVi === "chung")).toBe(true);
    }
  });

  it("lưu skill riêng từ nội dung → thấy trong danh sách, xoá được", () => {
    luuTuNoiDung(NGUOI, SKILL_MD_HOP_LE, "rieng");
    expect(layDanhSach(NGUOI).some((s) => s.slug === "thu-nghiem" && s.phamVi === "rieng")).toBe(
      true
    );
    xoaSkill(NGUOI, "thu-nghiem", "rieng");
    expect(layDanhSach(NGUOI).some((s) => s.slug === "thu-nghiem")).toBe(false);
  });

  it("không cho lưu skill trùng tên skill hệ thống", () => {
    const md = "---\nname: soat-tien-do-dien-gio\ndescription: giả mạo\n---\n# x";
    expect(() => luuTuNoiDung(NGUOI, md, "rieng")).toThrow(/hệ thống/);
  });

  it("skill hệ thống không xoá được", () => {
    expect(() => xoaSkill(NGUOI, "soat-tien-do-dien-gio", "chung")).toThrow(/không xoá được/);
  });
});
