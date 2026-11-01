// ============================================================
// GOOGLE DRIVE API (REST thuần, không thêm thư viện) + CÂY SCI-AI-AGENT.
// Cây thư mục theo ĐÚNG bản chốt CAU-TRUC-KHO-DU-LIEU-v1.0 mục 2:
//   SCI-AI-AGENT/ (MỘT tài khoản duy nhất)
//   ├─ 00-HE-THONG/{bieu-mau, quy-tac-mau, huong-dan}
//   │   └─ 07-NGHIEM-THU/{01-form, 02-luat} — một bản dùng chung agent Nghiệm thu (18/10/2026, PLAN Nghiệm thu §8.1)
//   └─ <mỗi dự án>/ 00-HO-SO-CHUNG … 09-CHUA-PHAN-LOAI (05–06 trống là CỐ Ý; 07-NGHIEM-THU thêm 18/10/2026)
// Cây dự án tạo LƯỜI: lần đầu mở khu Drive của dự án nào thì dựng nhánh đó,
// id cache vào drive.enc để khỏi dò lại.
// ============================================================

import { layAccessToken } from "./oauth";
import { capNhatDrive, docDrive } from "./store";
import { fmtNum } from "@/lib/format";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const MIME_FOLDER = "application/vnd.google-apps.folder";

export interface DriveNode {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  laThuMuc: boolean;
}

async function goi(duongDan: string, init?: RequestInit): Promise<Response> {
  const t = await layAccessToken();
  if (!t.ok) throw new Error(t.loi);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${t.token}`);
  return fetch(duongDan, { ...init, headers });
}

/** Email + dung lượng tài khoản đã kết nối */
export async function thongTinTaiKhoan(): Promise<{ email: string; dungLuong: string }> {
  const res = await goi(`${API}/about?fields=user(emailAddress),storageQuota(usage,limit)`);
  if (!res.ok) throw new Error(`about.get lỗi HTTP ${res.status}`);
  const j = (await res.json()) as {
    user?: { emailAddress?: string };
    storageQuota?: { usage?: string; limit?: string };
  };
  const gb = (x?: string): string =>
    x ? `${fmtNum(Number(x) / 1024 ** 3, 1)} GB` : "?";
  return {
    email: j.user?.emailAddress ?? "?",
    dungLuong: `${gb(j.storageQuota?.usage)} / ${gb(j.storageQuota?.limit)}`,
  };
}

// Chống TẠO TRÙNG khi 2 yêu cầu chạy song song (đã xảy ra thật 01/09: dev
// gọi API 2 lần cùng lúc → 2 thư mục cùng tên): cùng khóa "parent/tên" thì
// dùng chung MỘT promise; tìm thấy nhiều bản trùng thì luôn chọn bản CŨ NHẤT
// để mọi nơi hội tụ về một thư mục.
const dangTimTao = new Map<string, Promise<string>>();

/** Tìm thư mục con theo tên trong parent — chưa có thì tạo (idempotent) */
async function timHoacTaoThuMuc(ten: string, parentId: string): Promise<string> {
  const khoa = `${parentId}/${ten}`;
  const dang = dangTimTao.get(khoa);
  if (dang) return dang;
  const p = (async (): Promise<string> => {
    const q = encodeURIComponent(
      `name = '${ten.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = '${MIME_FOLDER}' and trashed = false`
    );
    const tim = await goi(`${API}/files?q=${q}&fields=files(id,createdTime)&orderBy=createdTime&pageSize=10`);
    if (tim.ok) {
      const j = (await tim.json()) as { files?: { id: string }[] };
      if (j.files && j.files.length > 0) return j.files[0].id;
    }
    const tao = await goi(`${API}/files?fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ten, mimeType: MIME_FOLDER, parents: [parentId] }),
    });
    if (!tao.ok) throw new Error(`Tạo thư mục "${ten}" lỗi HTTP ${tao.status}`);
    return ((await tao.json()) as { id: string }).id;
  })();
  dangTimTao.set(khoa, p);
  try {
    return await p;
  } finally {
    dangTimTao.delete(khoa);
  }
}

/** Dựng gốc SCI-AI-AGENT + 00-HE-THONG (gọi ngay sau khi kết nối) */
export async function taoGocKho(): Promise<string> {
  const s = docDrive();
  if (s.cay?.rootId) return s.cay.rootId;
  const rootId = await timHoacTaoThuMuc("SCI-AI-AGENT", "root");
  const heThongId = await timHoacTaoThuMuc("00-HE-THONG", rootId);
  for (const t of ["bieu-mau", "quy-tac-mau", "huong-dan"]) {
    await timHoacTaoThuMuc(t, heThongId);
  }
  // 18/10/2026 (PLAN-AGENT-NGHIEM-THU v2.0 §8.1, P11): mẫu biểu + văn bản luật của agent Nghiệm thu — MỘT bản chung mọi dự án
  const ntId = await timHoacTaoThuMuc("07-NGHIEM-THU", heThongId);
  for (const t of ["01-form", "02-luat"]) await timHoacTaoThuMuc(t, ntId);
  capNhatDrive({ cay: { rootId, heThongId, duAn: s.cay?.duAn ?? {} } });
  return rootId;
}

/** Nhánh chuẩn của MỘT dự án — đúng mục 2 (05–06 trống là cố ý, không tạo; 07-NGHIEM-THU thêm 18/10/2026 — PLAN Nghiệm thu §8.1) */
const NHANH_DU_AN: [string, string[]][] = [
  ["00-HO-SO-CHUNG", ["quyet-dinh-mo-du-an", "so-do-to-chuc"]],
  [
    "01-TIEN-DO",
    [
      "01-tien-do-muc-tieu",
      "02-baseline",
      "03-bao-cao-ngay-thau-phu",
      "04-bao-cao-tuan-tong-thau",
      "05-bao-cao-BQLDA",
      "06-anh-hien-truong",
      "07-hop-dong-thau-phu",
    ],
  ],
  ["02-PHAP-LY", []],
  ["03-THIET-KE", []],
  // Đổi tên từ 04-HOP-DONG (Mr. Đại chốt 01/09): kho này CHỈ chứa HĐ có BQL ký
  ["04-HOP-DONG-BQL-KY", []],
  // 18/10/2026: agent Nghiệm thu — 01-form, 02-luat chỉ chứa phần RIÊNG dự án (bản chung ở 00-HE-THONG/07-NGHIEM-THU), 03-bien-ban
  ["07-NGHIEM-THU", ["01-form", "02-luat", "03-bien-ban"]],
  ["08-BAN-LANH-DAO", ["bao-cao-thang", "bao-cao-phan-tich"]],
  ["09-CHUA-PHAN-LOAI", []],
];

/** Dựng (lười) nhánh dự án trên Drive → trả folderId gốc nhánh */
export async function taoNhanhDuAn(projectId: string, tenDuAn: string): Promise<string> {
  const s = docDrive();
  const daCo = s.cay?.duAn[projectId];
  if (daCo) return daCo;
  const rootId = await taoGocKho();
  const duAnId = await timHoacTaoThuMuc(tenDuAn, rootId);
  for (const [ten, con] of NHANH_DU_AN) {
    const chaId = await timHoacTaoThuMuc(ten, duAnId);
    for (const c of con) await timHoacTaoThuMuc(c, chaId);
    if (ten === "01-TIEN-DO") {
      // 05-bao-cao-BQLDA có 2 con đặc thù (nhap ⛔ / da-ky ✅ — mục 2)
      const bc = await timHoacTaoThuMuc("05-bao-cao-BQLDA", chaId);
      await timHoacTaoThuMuc("nhap", bc);
      await timHoacTaoThuMuc("da-ky", bc);
      const anh = await timHoacTaoThuMuc("06-anh-hien-truong", chaId);
      await timHoacTaoThuMuc("9-chua-gan-dau-viec", anh);
    }
  }
  const st = docDrive();
  capNhatDrive({
    cay: {
      rootId,
      heThongId: st.cay?.heThongId,
      duAn: { ...(st.cay?.duAn ?? {}), [projectId]: duAnId },
    },
  });
  return duAnId;
}

/** Dựng chuỗi thư mục theo đường dẫn TƯƠNG ĐỐI trong nhánh dự án → folderId cuối */
export async function taoDuongDanDuAn(
  projectId: string,
  tenDuAn: string,
  viTri: string[]
): Promise<string> {
  let chaId = await taoNhanhDuAn(projectId, tenDuAn);
  for (const ten of viTri) {
    if (ten.trim() === "") continue;
    chaId = await timHoacTaoThuMuc(ten.trim(), chaId);
  }
  return chaId;
}

/** Trần số mục một thư mục — quá trần thì BÁO LỖI, không cắt lặng lẽ (E40 — 04/10/2026) */
const TRAN_MUC_THU_MUC = 5000;

/** Liệt kê con của một thư mục (thư mục trước, rồi file, theo tên).
 *  Drive trả từng đợt 200 mục — đọc hết các đợt theo nextPageToken. Trước 04/10 chỉ đọc đợt
 *  đầu nên thư mục quá 200 mục bị mất phần sau mà không ai biết. */
export async function lietKe(folderId: string): Promise<DriveNode[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const ds: Omit<DriveNode, "laThuMuc">[] = [];
  let token = "";
  do {
    const res = await goi(
      `${API}/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime)&orderBy=folder,name&pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`
    );
    if (!res.ok) throw new Error(`Liệt kê thư mục lỗi HTTP ${res.status}`);
    const j = (await res.json()) as { files?: Omit<DriveNode, "laThuMuc">[]; nextPageToken?: string };
    ds.push(...(j.files ?? []));
    token = j.nextPageToken ?? "";
    if (token && ds.length >= TRAN_MUC_THU_MUC)
      throw new Error(`Thư mục có hơn ${TRAN_MUC_THU_MUC} mục — chia nhỏ thư mục trên Drive rồi mở lại`);
  } while (token);
  return ds.map((f) => ({ ...f, laThuMuc: f.mimeType === MIME_FOLDER }));
}

/** Tải nội dung một file về (Buffer) */
export async function taiFile(fileId: string): Promise<{ ten: string; du_lieu: Buffer }> {
  const meta = await goi(`${API}/files/${fileId}?fields=name`);
  if (!meta.ok) throw new Error(`Đọc tên file lỗi HTTP ${meta.status}`);
  const ten = ((await meta.json()) as { name: string }).name;
  const res = await goi(`${API}/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`Tải file lỗi HTTP ${res.status}`);
  return { ten, du_lieu: Buffer.from(await res.arrayBuffer()) };
}

/**
 * ẢNH THU NHỎ do Drive dựng sẵn — dùng cho lưới thư viện ảnh.
 * Ảnh công trường ~740 KB/tấm; lưới 20 tấm là ~15 MB nếu tải ảnh gốc, còn bản
 * thu nhỏ chỉ vài chục KB. Drive chưa dựng kịp (ảnh mới đẩy lên) thì trả null
 * để nơi gọi rơi về ảnh gốc, KHÔNG để lưới trống.
 */
export async function taiAnhNho(
  fileId: string,
  rong = 400,
): Promise<{ ten: string; du_lieu: Buffer; kieu: string } | null> {
  const meta = await goi(`${API}/files/${fileId}?fields=name,thumbnailLink`);
  if (!meta.ok) throw new Error(`Đọc thông tin ảnh lỗi HTTP ${meta.status}`);
  const j = (await meta.json()) as { name: string; thumbnailLink?: string };
  if (!j.thumbnailLink) return null;
  // thumbnailLink kết thúc bằng =s220; đổi cỡ theo ý mình
  const url = j.thumbnailLink.replace(/=s\d+(-c)?$/, `=s${rong}`);
  const res = await goi(url);
  if (!res.ok) return null;
  return {
    ten: j.name,
    du_lieu: Buffer.from(await res.arrayBuffer()),
    kieu: res.headers.get("content-type") ?? "image/jpeg",
  };
}

/** Chuyển một mục sang thư mục cha khác (dùng khi gộp thư mục trùng) */
async function chuyenCha(id: string, tuCha: string, denCha: string): Promise<void> {
  const res = await goi(
    `${API}/files/${id}?addParents=${encodeURIComponent(denCha)}&removeParents=${encodeURIComponent(tuCha)}&fields=id`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  if (!res.ok) throw new Error(`Chuyển mục lỗi HTTP ${res.status}`);
}

export interface BaoCaoDonTrung {
  thuMucGop: number;
  mucChuyen: number;
  chiTiet: string[];
}

/** Gộp các thư mục TRÙNG TÊN cùng cấp: giữ bản CŨ NHẤT, dồn ruột các bản sau vào rồi bỏ vỏ vào Thùng rác */
async function donTrungThuMuc(folderId: string, duongDan: string, bc: BaoCaoDonTrung): Promise<void> {
  const items = await lietKe(folderId);
  const nhom = new Map<string, DriveNode[]>();
  for (const x of items.filter((i) => i.laThuMuc)) {
    nhom.set(x.name, [...(nhom.get(x.name) ?? []), x]);
  }
  for (const [ten, ds] of Array.from(nhom.entries())) {
    if (ds.length < 2) continue;
    ds.sort((a, b) => (a.createdTime ?? "").localeCompare(b.createdTime ?? ""));
    const giu = ds[0];
    for (const trung of ds.slice(1)) {
      const ruot = await lietKe(trung.id);
      for (const c of ruot) {
        await chuyenCha(c.id, trung.id, giu.id);
        bc.mucChuyen++;
      }
      await xoaFile(trung.id); // vỏ rỗng → Thùng rác
      bc.thuMucGop++;
    }
    bc.chiTiet.push(`${duongDan}/${ten}: ${ds.length} bản trùng → 1`);
  }
  // đệ quy bằng danh sách MỚI (sau gộp) — trùng phát sinh ở cấp con sẽ được gộp tiếp
  const sauGop = await lietKe(folderId);
  for (const f of sauGop.filter((i) => i.laThuMuc)) {
    await donTrungThuMuc(f.id, `${duongDan}/${f.name}`, bc);
  }
}

/** Dọn trùng CẢ KHO từ gốc SCI-AI-AGENT (kể cả trường hợp chính gốc bị nhân đôi) */
export async function donTrungCay(): Promise<BaoCaoDonTrung> {
  const bc: BaoCaoDonTrung = { thuMucGop: 0, mucChuyen: 0, chiTiet: [] };
  const q = encodeURIComponent(
    `name = 'SCI-AI-AGENT' and 'root' in parents and mimeType = '${MIME_FOLDER}' and trashed = false`
  );
  const res = await goi(`${API}/files?q=${q}&fields=files(id,createdTime)&orderBy=createdTime&pageSize=10`);
  if (!res.ok) throw new Error(`Tìm gốc kho lỗi HTTP ${res.status}`);
  const goc = ((await res.json()) as { files?: { id: string }[] }).files ?? [];
  if (goc.length === 0) throw new Error("Chưa có thư mục SCI-AI-AGENT trên Drive.");
  const rootId = goc[0].id;
  for (const trung of goc.slice(1)) {
    const ruot = await lietKe(trung.id);
    for (const c of ruot) {
      await chuyenCha(c.id, trung.id, rootId);
      bc.mucChuyen++;
    }
    await xoaFile(trung.id);
    bc.thuMucGop++;
    bc.chiTiet.push(`SCI-AI-AGENT: ${goc.length} bản trùng → 1`);
  }
  await donTrungThuMuc(rootId, "SCI-AI-AGENT", bc);
  // id cache có thể trỏ vào vỏ đã bỏ → giữ root đúng, xóa map nhánh để lần sau tự dò lại (giờ là duy nhất)
  capNhatDrive({ cay: { rootId, heThongId: undefined, duAn: {} } });
  return bc;
}

/** Xóa file = chuyển vào Thùng rác Drive (khôi phục được 30 ngày) — KHÔNG xóa vĩnh viễn */
export async function xoaFile(fileId: string): Promise<void> {
  const res = await goi(`${API}/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!res.ok) throw new Error(`Xóa file lỗi HTTP ${res.status}`);
}

/** Đẩy một file lên thư mục chỉ định (multipart) */
export async function dayFile(
  folderId: string,
  ten: string,
  noiDung: Buffer,
  mime: string
): Promise<string> {
  const ranhGioi = "sci-drive-" + Date.now();
  const meta = JSON.stringify({ name: ten, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${ranhGioi}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${ranhGioi}\r\nContent-Type: ${mime}\r\n\r\n`
    ),
    noiDung,
    Buffer.from(`\r\n--${ranhGioi}--`),
  ]);
  const res = await goi(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${ranhGioi}` },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`Đẩy file lên Drive lỗi HTTP ${res.status}`);
  return ((await res.json()) as { id: string }).id;
}
