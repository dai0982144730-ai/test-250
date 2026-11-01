// Bộ gửi thư: chế độ thử ghi .eml đúng tiếng Việt (UTF-8, tiêu đề mã hóa MIME), gửi SMTP thật tới máy chủ giả,
// thử lại có giới hạn khi lỗi, thư thử của quản trị.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query } from "@/lib/db";
import { xepThu, thuLaiThu, danhSachHangDoi } from "@/lib/email/hang-doi";
import { guiHangDoi, taoEml } from "@/lib/email/bo-gui";
import { guiThuThu } from "@/lib/email/thu";
import { soanThu } from "@/lib/email/soan-thu";

const BIEN = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_SECURE", "DOCFLOW_EMAIL_THU", "DOCFLOW_EMAIL_SO_LAN_THU"];
const thuMucThu = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-eml-"));

// ---------- Giải mã MIME tối giản cho test ----------
function tachDau(eml: string): { dau: Map<string, string>; than: string } {
  const i = eml.indexOf("\r\n\r\n");
  const dauTho = eml.slice(0, i).replace(/\r\n[ \t]+/g, " ");
  const dau = new Map<string, string>();
  for (const dong of dauTho.split("\r\n")) {
    const k = dong.indexOf(":");
    if (k > 0 && !dau.has(dong.slice(0, k).toLowerCase())) dau.set(dong.slice(0, k).toLowerCase(), dong.slice(k + 1).trim());
  }
  return { dau, than: eml.slice(i + 4) };
}

function giaiQP(s: string): Buffer {
  const bo = s.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < bo.length; i++) {
    if (bo[i] === "=" && /^[0-9A-F]{2}$/i.test(bo.slice(i + 1, i + 3))) {
      bytes.push(parseInt(bo.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(...Buffer.from(bo[i], "latin1"));
  }
  return Buffer.from(bytes);
}

/** Giải mã tiêu đề dạng =?UTF-8?Q|B?...?= (nối các từ mã hóa liền nhau theo byte). */
function giaiTieuDe(v: string): string {
  const phan: Buffer[] = [];
  let conLai = v;
  const re = /^\s*=\?UTF-8\?([QB])\?([^?]*)\?=/i;
  let m: RegExpMatchArray | null;
  while ((m = conLai.match(re))) {
    phan.push(m[1].toUpperCase() === "B" ? Buffer.from(m[2], "base64") : giaiQP(m[2].replace(/_/g, " ")));
    conLai = conLai.slice(m[0].length);
  }
  return Buffer.concat([...phan, Buffer.from(conLai.trim(), "utf8")]).toString("utf8");
}

function phanChu(eml: string, kieu: string): { dau: Map<string, string>; noi_dung: string } {
  const goc = tachDau(eml);
  const ct = goc.dau.get("content-type") ?? "";
  const bien = ct.match(/boundary="?([^";]+)"?/i)?.[1];
  const cacPhan = bien ? goc.than.split("--" + bien).slice(1, -1).map((p) => p.replace(/^\r\n/, "")) : [eml.slice(eml.indexOf("\r\n\r\n") + 4)];
  for (const p of cacPhan) {
    const ph = bien ? tachDau(p) : goc;
    if (!(ph.dau.get("content-type") ?? "").toLowerCase().startsWith(kieu)) continue;
    const cte = (ph.dau.get("content-transfer-encoding") ?? "7bit").toLowerCase();
    const buf = cte === "base64" ? Buffer.from(ph.than.replace(/\s+/g, ""), "base64") : cte === "quoted-printable" ? giaiQP(ph.than) : Buffer.from(ph.than, "utf8");
    return { dau: ph.dau, noi_dung: buf.toString("utf8") };
  }
  throw new Error("Không thấy phần " + kieu);
}

// ---------- Máy chủ SMTP giả (không TLS) ----------
interface MayChuGia {
  cong: number;
  thu: string[];
  tuChoi: boolean;
  dong(): Promise<void>;
}
async function moSmtpGia(): Promise<MayChuGia> {
  const st: MayChuGia = { cong: 0, thu: [], tuChoi: false, dong: async () => undefined };
  const sv = net.createServer((s) => {
    let bo = "";
    let dangData = false;
    s.write("220 gia ESMTP\r\n");
    s.on("data", (d) => {
      bo += d.toString("latin1");
      for (;;) {
        if (dangData) {
          const k = bo.indexOf("\r\n.\r\n");
          if (k < 0) return;
          st.thu.push(Buffer.from(bo.slice(0, k + 2), "latin1").toString("utf8"));
          bo = bo.slice(k + 5);
          dangData = false;
          s.write("250 2.0.0 Da nhan\r\n");
          continue;
        }
        const k = bo.indexOf("\r\n");
        if (k < 0) return;
        const lenh = bo.slice(0, k).toUpperCase();
        bo = bo.slice(k + 2);
        if (lenh.startsWith("EHLO") || lenh.startsWith("HELO")) s.write("250-gia\r\n250-8BITMIME\r\n250 SMTPUTF8\r\n");
        else if (lenh.startsWith("MAIL FROM")) s.write("250 OK\r\n");
        else if (lenh.startsWith("RCPT TO")) s.write(st.tuChoi ? "451 4.3.0 Tam thoi khong nhan\r\n" : "250 OK\r\n");
        else if (lenh === "DATA") {
          dangData = true;
          s.write("354 Tiep\r\n");
        } else if (lenh === "QUIT") {
          s.write("221 Bye\r\n");
          s.end();
        } else if (lenh === "RSET" || lenh === "NOOP") s.write("250 OK\r\n");
        else s.write("502 Khong ho tro\r\n");
      }
    });
    s.on("error", () => undefined);
  });
  await new Promise<void>((r) => sv.listen(0, "127.0.0.1", () => r()));
  st.cong = (sv.address() as net.AddressInfo).port;
  st.dong = () => new Promise<void>((r) => sv.close(() => r()));
  return st;
}

let smtp: MayChuGia;

beforeAll(async () => {
  await csdlMoi();
  process.env.DOCFLOW_EMAIL_THU_THU_MUC = thuMucThu;
  smtp = await moSmtpGia();
});
afterAll(async () => {
  await smtp.dong();
});
beforeEach(async () => {
  for (const b of BIEN) delete process.env[b];
  await query("DELETE FROM docflow.hang_doi_email");
  smtp.tuChoi = false;
});

const NOI_DUNG = "Phòng Kỹ thuật và Vận hành gửi “Báo cáo tuần 29 — Nhà máy Nậm Xe” đến Ban Tổng giám đốc. Hạn xử lý: 25/09/2026.";

async function xepMau(den = "hung.tv@scigroup.vn") {
  const t = soanThu({ ten_ung_dung: "SCI công việc", ten_nguoi_nhan: "Trần Văn Hùng", tieu_de_mau: "Tài liệu mới đến: {noi_dung}", noi_dung: NOI_DUNG, lien_ket: "/tai-lieu/tl-29" });
  return { id: await xepThu(await layQ(), { den, nguoi_nhan: "hung.tv@scigroup.vn", loai: "nhan_tai_lieu", ...t }), ...t };
}

describe("chế độ thử: ghi .eml", () => {
  it("thư .eml đúng UTF-8, tiêu đề mã hóa MIME giải ra đúng tiếng Việt", async () => {
    process.env.DOCFLOW_EMAIL_THU = "1";
    const t = await xepMau();
    const truoc = new Set(fs.readdirSync(thuMucThu));
    const kq = await guiHangDoi(await layQ());
    expect(kq).toMatchObject({ che_do: "thu", da_gui: 1, loi: 0 });
    const moi = fs.readdirSync(thuMucThu).filter((f) => !truoc.has(f));
    expect(moi).toHaveLength(1);
    expect(moi[0]).toMatch(/\.eml$/);
    const eml = fs.readFileSync(path.join(thuMucThu, moi[0]), "latin1");
    // Tiêu đề là ASCII thuần (đã mã hóa), không lọt byte UTF-8 thô
    const { dau } = tachDau(eml);
    const tieuDeTho = dau.get("subject")!;
    expect(/^[\x20-\x7e]+$/.test(tieuDeTho)).toBe(true);
    expect(tieuDeTho).toMatch(/=\?UTF-8\?[QB]\?/i);
    expect(giaiTieuDe(tieuDeTho)).toBe(t.tieu_de);
    expect(t.tieu_de.startsWith("[SCI công việc] Tài liệu mới đến: Phòng Kỹ thuật và Vận hành")).toBe(true);
    expect(dau.get("x-docflow-loai")).toBe("nhan_tai_lieu");
    expect(dau.get("to")).toContain("hung.tv@scigroup.vn");
    const chu = phanChu(eml, "text/plain");
    expect(chu.dau.get("content-type")!.toLowerCase()).toContain("charset=utf-8");
    expect(chu.noi_dung).toContain("Chào Trần Văn Hùng,");
    expect(chu.noi_dung).toContain(NOI_DUNG);
    expect(chu.noi_dung).toContain("https://docflow.scigroup.vn/api/tai-lieu/tl-29/tep"); // link mới (test đêm 01/10)
    const html = phanChu(eml, "text/html");
    expect(html.noi_dung).toContain("Báo cáo tuần 29");
    expect(html.noi_dung).toContain('href="https://docflow.scigroup.vn/api/tai-lieu/tl-29/tep"');
    const r = await query<{ trang_thai: string; so_lan_thu: number; da_gui_luc: string | null }>("SELECT trang_thai, so_lan_thu, da_gui_luc FROM docflow.hang_doi_email WHERE id = $1", [t.id]);
    expect(r.rows[0]).toMatchObject({ trang_thai: "da_gui", so_lan_thu: 1 });
    expect(r.rows[0].da_gui_luc).not.toBeNull();
  });

  it("taoEml: người gửi có tên tiếng Việt cũng mã hóa đúng", async () => {
    const eml = (await taoEml({ from: '"Văn thư SCI" <docflow@scigroup.vn>', to: "a@scigroup.vn", subject: "Nhắc việc: quá hạn", text: "Nội dung" })).toString("latin1");
    const { dau } = tachDau(eml);
    expect(/^[\x20-\x7e]+$/.test(dau.get("from")!)).toBe(true);
    expect(giaiTieuDe(dau.get("from")!.split("<")[0].trim())).toBe("Văn thư SCI");
    expect(giaiTieuDe(dau.get("subject")!)).toBe("Nhắc việc: quá hạn");
  });
});

describe("gửi SMTP + thử lại", () => {
  function khaiSmtp() {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(smtp.cong);
    process.env.SMTP_SECURE = "khong";
    process.env.SMTP_FROM = "docflow@scigroup.vn";
  }

  it("gửi thật qua SMTP (máy chủ giả): thư đến nơi, nội dung tiếng Việt nguyên vẹn", async () => {
    khaiSmtp();
    const t = await xepMau();
    const kq = await guiHangDoi(await layQ());
    expect(kq).toMatchObject({ che_do: "smtp", da_gui: 1, loi: 0 });
    expect(smtp.thu).toHaveLength(1);
    const eml = Buffer.from(smtp.thu[0], "utf8").toString("latin1");
    expect(giaiTieuDe(tachDau(eml).dau.get("subject")!)).toBe(t.tieu_de);
    expect(phanChu(eml, "text/plain").noi_dung).toContain(NOI_DUNG);
    expect(tachDau(eml).dau.get("from")).toContain("docflow@scigroup.vn");
  });

  it("máy chủ từ chối tạm thời: thử lại theo lịch, hết lượt thì 'loi'; quản trị đưa về hàng chờ thì gửi lại được", async () => {
    khaiSmtp();
    process.env.DOCFLOW_EMAIL_SO_LAN_THU = "3";
    smtp.tuChoi = true;
    const { id } = await xepMau();
    const q = await layQ();
    const t0 = new Date("2026-09-25T01:00:00Z");
    // thư mới xếp có thu_lai_luc = now(); đặt về trước t0 để lịch thử xác định
    await query("UPDATE docflow.hang_doi_email SET thu_lai_luc = $1::timestamptz WHERE id = $2", [t0.toISOString(), id]);

    const k1 = await guiHangDoi(q, { bay_gio: t0 });
    expect(k1).toMatchObject({ da_gui: 0, loi: 1, het_luot: 0 });
    let r = (await query<{ trang_thai: string; so_lan_thu: number; loi_cuoi: string; thu_lai_luc: Date }>("SELECT * FROM docflow.hang_doi_email WHERE id = $1", [id])).rows[0];
    expect(r).toMatchObject({ trang_thai: "cho", so_lan_thu: 1 });
    expect(r.loi_cuoi).toMatch(/451/);
    expect(new Date(r.thu_lai_luc).getTime()).toBe(t0.getTime() + 60_000);

    // chưa đến giờ hẹn → không thử
    expect(await guiHangDoi(q, { bay_gio: new Date(t0.getTime() + 30_000) })).toMatchObject({ da_gui: 0, loi: 0 });
    // lần 2 (sau 1 phút), lần 3 (sau thêm 5 phút) → hết lượt
    expect(await guiHangDoi(q, { bay_gio: new Date(t0.getTime() + 61_000) })).toMatchObject({ loi: 1, het_luot: 0 });
    r = (await query<{ trang_thai: string; so_lan_thu: number; loi_cuoi: string; thu_lai_luc: Date }>("SELECT * FROM docflow.hang_doi_email WHERE id = $1", [id])).rows[0];
    expect(new Date(r.thu_lai_luc).getTime()).toBe(t0.getTime() + 61_000 + 5 * 60_000);
    expect(await guiHangDoi(q, { bay_gio: new Date(t0.getTime() + 61_000 + 5 * 60_000) })).toMatchObject({ loi: 1, het_luot: 1 });
    r = (await query<{ trang_thai: string; so_lan_thu: number; loi_cuoi: string; thu_lai_luc: Date }>("SELECT * FROM docflow.hang_doi_email WHERE id = $1", [id])).rows[0];
    expect(r).toMatchObject({ trang_thai: "loi", so_lan_thu: 3 });
    // đã 'loi' thì bộ gửi không lấy nữa
    expect(await guiHangDoi(q, { bay_gio: new Date("2027-01-01T00:00:00Z") })).toMatchObject({ da_gui: 0, loi: 0 });
    const ds = await danhSachHangDoi(q, { trang_thai: "loi" });
    expect(ds.dem.loi).toBe(1);
    expect(ds.thu[0]).toMatchObject({ id, trang_thai: "loi", so_lan_thu: 3 });

    // máy chủ nhận lại, quản trị bấm "thử lại"
    smtp.tuChoi = false;
    expect(await thuLaiThu(q, "tat_ca_loi")).toBe(1);
    const k = await guiHangDoi(q);
    expect(k).toMatchObject({ da_gui: 1, loi: 0 });
    expect(smtp.thu.length).toBeGreaterThanOrEqual(1);
  });

  it("bộ chuyển lỗi (ném) được ghi lỗi cuối, không làm hỏng các thư khác trong lô", async () => {
    process.env.DOCFLOW_EMAIL_THU = "1";
    const a = await xepMau("a@scigroup.vn");
    const b = await xepMau("b@scigroup.vn");
    const kq = await guiHangDoi(await layQ(), {
      chuyen: async (t) => {
        if (t.to === "a@scigroup.vn") throw new Error("Hộp thư đầy");
      },
    });
    expect(kq).toMatchObject({ da_gui: 1, loi: 1 });
    const rows = (await query<{ id: string; trang_thai: string; loi_cuoi: string | null }>("SELECT id, trang_thai, loi_cuoi FROM docflow.hang_doi_email ORDER BY id")).rows;
    expect(rows.find((r) => Number(r.id) === a.id)).toMatchObject({ trang_thai: "cho", loi_cuoi: "Hộp thư đầy" });
    expect(rows.find((r) => Number(r.id) === b.id)).toMatchObject({ trang_thai: "da_gui", loi_cuoi: null });
  });
});

describe("thư thử của quản trị", () => {
  it("chưa cấu hình: trả lỗi 'chưa cấu hình email', không xếp thư", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const kq = await guiThuThu(await layQ(), qt);
    expect(kq.ok).toBe(false);
    expect(kq.trang_thai.da_cau_hinh).toBe(false);
    expect(kq.loi).toMatch(/Chưa cấu hình email/);
    expect((await query("SELECT 1 FROM docflow.hang_doi_email")).rows).toHaveLength(0);
  });

  it("có SMTP: gửi ngay tới chính mình, không lộ mật khẩu", async () => {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(smtp.cong);
    process.env.SMTP_SECURE = "khong";
    process.env.SMTP_FROM = "docflow@scigroup.vn";
    process.env.SMTP_PASS = "bi-mat-123";
    const qt = await nguoi("quantri@scigroup.vn");
    const truoc = smtp.thu.length;
    const kq = await guiThuThu(await layQ(), qt);
    expect(kq).toMatchObject({ ok: true, den: "quantri@scigroup.vn", loi: null });
    expect(kq.trang_thai).toMatchObject({ che_do: "smtp", da_cau_hinh: true, may_chu: "127.0.0.1" });
    expect(JSON.stringify(kq)).not.toContain("bi-mat-123");
    expect(kq.trang_thai.co_mat_khau).toBe(true);
    expect(smtp.thu.length).toBe(truoc + 1);
  });
});
