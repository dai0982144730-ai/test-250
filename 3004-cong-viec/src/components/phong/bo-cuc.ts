// phong/bo-cuc.ts — xếp ô trên sân sơ đồ tổ chức. Tổng quát hoá đúng cách demo (thước) xếp:
//   tầng 1 Ban lãnh đạo giữa trên · tầng 2 các phòng một hàng · tầng 3:
//     – phòng có đơn vị có con (P.ĐT&PC → BQLDA → Ban điều hành): mọi đơn vị con đứng thành hàng, mỗi đơn vị một cột,
//       con tầng 4 xếp dọc bên dưới, trục nối bên trái; tầng 5 trở xuống chưa vẽ (hiện chưa có)
//     – phòng chỉ có đơn vị không con (P.KT&VH → các nhà máy): xếp dọc một cột dưới phòng, trục nối bên trái
//   Phòng có cột con đứng đúng cột đầu tiên của mình; phòng còn lại lấp cột trống từ trái sang.
//   Ô có DÒNG NHÓM bung/gập (Mr. Đại chốt 20/10/2026 — SCI PMC «Đang thiết kế», SCI E&C «Đang thi công», BQLDA, P.KT&VH «Các nhà máy»):
//     ô cao thêm CAO_NHOM, các hàng bên dưới dời xuống theo; ô đó vẫn GIỮ CỘT của mình khi đang gập (coi như có con) — bung ra
//     không xáo các cột khác.
// Hàm thuần — không đụng DOM.

export interface ONut {
  id: string;
  cha: string | null;
  thu_tu: number;
}

export interface ViTri {
  x: number; // tâm ô
  y: number; // mép trên
  w: number;
  h: number;
}

export interface BoCuc {
  W: number;
  H: number;
  VT: Record<string, ViTri>;
  /** ô cha có đường trục dọc (x) — con nối ngang vào trục */
  TRUC: Record<string, number>;
  /** cấp hiển thị (1–4) theo độ sâu trên sơ đồ */
  cap: Record<string, number>;
  con: Record<string, string[]>;
  goc: string | null;
  /** Chiều cao VÙNG CỐ ĐỊNH (cấp 1–3 kể cả dòng nhóm) — không đổi khi bung/gập nhóm; sân co giãn theo số này, không theo H (Mr. Đại chốt 25/10/2026) */
  Hcd: number;
}

/** Bước cột tối thiểu + lề trái/phải; bước cột có thể DÃN (tham số `cot`) cho vừa chiều ngang sân (25/10/2026) */
export const COT = 160;
export const X0 = 85;
/** Một dòng nhóm bung/gập (Cài đặt → Giao diện → "Sơ đồ tổ chức: nhóm bung/gập") */
export interface NhomGap {
  id: string;
  nhan: string;
  /** tên gọi ô con trong số đếm: "Đang thi công · 6 dự án" */
  ten_con: string;
}

/** Đọc các dòng "mã đơn vị | nhãn | tên gọi ô con"; dòng thiếu mã hoặc nhãn bỏ qua; mã trùng lấy dòng đầu */
export function docNhomGap(ds: readonly string[] | null | undefined): NhomGap[] {
  const r: NhomGap[] = [];
  for (const d of ds ?? []) {
    const [id, nhan, ten_con] = d.split("|").map((x) => x.trim());
    if (id && nhan && !r.some((x) => x.id === id)) r.push({ id, nhan, ten_con: ten_con || "đơn vị" });
  }
  return r;
}

/** Ô có dòng nhóm bung/gập cao thêm chừng này (chỗ cho dòng chữ bấm được bên dưới tên ô) */
export const KHE_CAP23 = 19;
export const CAO_NHOM = 38; // dòng nhóm hai dòng chữ 12px (kiểm độc lập lần 6, K3-2; trước 26 — một dòng 11px bị cắt)

/** `nhom`: ô có dòng nhóm bung/gập (20/10/2026) — cao thêm CAO_NHOM, giữ cột cả khi các ô con đang gập */
export function xepSoDo(ds: ONut[], nhom: ReadonlySet<string> = new Set(), cot: number = COT): BoCuc {
  const them = (id: string) => (nhom.has(id) ? CAO_NHOM : 0);
  const con: Record<string, string[]> = {};
  ds.forEach((n) => (con[n.id] = []));
  const theoTT = [...ds].sort((a, b) => a.thu_tu - b.thu_tu);
  theoTT.forEach((n) => {
    if (n.cha && con[n.cha]) con[n.cha].push(n.id);
  });
  const goc = theoTT.find((n) => !n.cha)?.id ?? null;
  const VT: Record<string, ViTri> = {};
  const TRUC: Record<string, number> = {};
  const cap: Record<string, number> = {};
  if (!goc) return { W: 400, H: 200, Hcd: 200, VT, TRUC, cap, con, goc };

  // Ô không nối được tới gốc (cha lạ) → treo dưới gốc cho khỏi mất
  const toi = new Set<string>();
  const di = (id: string) => {
    toi.add(id);
    con[id].forEach(di);
  };
  di(goc);
  theoTT.filter((n) => !toi.has(n.id)).forEach((n) => con[goc].push(n.id));

  const t2 = con[goc];
  // Khe cột tầng 3
  type Khe = { loai: "cot"; id: string; cha: string } | { loai: "chong"; ids: string[]; cha: string };
  const khe: Khe[] = [];
  for (const p of t2) {
    // Phòng có ít nhất một đơn vị có con (P.ĐT&PC: BQLDA có Ban điều hành) → mọi đơn vị con đứng thành hàng, mỗi đơn vị một cột;
    // phòng chỉ có đơn vị không con (P.KT&VH: các nhà máy) → xếp dọc một cột.
    if (con[p].some((c) => con[c].length > 0 || nhom.has(c))) con[p].forEach((c) => khe.push({ loai: "cot", id: c, cha: p }));
    else if (con[p].length || nhom.has(p)) khe.push({ loai: "chong", ids: con[p], cha: p });
  }
  const N = Math.max(khe.length, t2.length, 1);
  const colX = (i: number) => X0 + i * cot;
  const W = 2 * X0 + (N - 1) * cot;

  // Cột của phòng
  const cotPhong: Record<string, number> = {};
  const daDung = new Set<number>();
  t2.forEach((p) => {
    const i = khe.findIndex((k) => k.cha === p);
    if (i >= 0 && !daDung.has(i)) {
      cotPhong[p] = i;
      daDung.add(i);
    }
  });
  let tro = 0;
  t2.forEach((p) => {
    if (cotPhong[p] !== undefined) return;
    while (daDung.has(tro)) tro++;
    cotPhong[p] = tro;
    daDung.add(tro);
  });

  VT[goc] = { x: W / 2, y: 12, w: 220, h: 54 + them(goc) };
  cap[goc] = 1;
  const y2 = 94 + them(goc);
  t2.forEach((p) => {
    VT[p] = { x: colX(cotPhong[p]), y: y2, w: 150, h: 48 + them(p) };
    cap[p] = 2;
  });
  // Khe dọc cấp 2 → cấp 3: 19 (Mr. Đại chốt 25/10/2026: thu còn 1/2 so với 38 trước đó)
  const y3 = y2 + 48 + Math.max(0, ...t2.map(them)) + KHE_CAP23;
  let day = y2 + 48;
  khe.forEach((k, i) => {
    const x = colX(i);
    if (k.loai === "cot") {
      const h = 46 + them(k.id);
      VT[k.id] = { x, y: y3, w: 150, h };
      cap[k.id] = 3;
      TRUC[k.id] = x - 77;
      day = Math.max(day, y3 + h);
      con[k.id].forEach((c, j) => {
        const y = y3 + h + 26 + j * 46;
        VT[c] = { x, y, w: 140, h: 38 + them(c) };
        cap[c] = 4;
        day = Math.max(day, y + 38 + them(c));
      });
    } else {
      TRUC[k.cha] = x - 85;
      let y = y3;
      k.ids.forEach((c) => {
        const h = 46 + them(c);
        VT[c] = { x, y, w: 150, h };
        cap[c] = 3;
        day = Math.max(day, y + h);
        y += h + 10;
      });
    }
  });
  // Vùng cố định: tới đáy hàng cấp 3 (ô cột, kể cả dòng nhóm) — ô chồng dọc của nhà máy đã gập nên không tính
  const Hcd = y3 + Math.max(46, ...khe.flatMap((k) => (k.loai === "cot" ? [46 + them(k.id)] : []))) + 30;
  return { W, H: Math.max(day + 30, Hcd), Hcd, VT, TRUC, cap, con, goc };
}

/** Đường nối cha → con (vẽ từ cha xuống con; tín hiệu chạy ngược lên). */
export function duongNoi(bc: BoCuc, cha: string, con: string): string {
  const c = bc.VT[cha];
  const k = bc.VT[con];
  const y0 = c.y + c.h;
  const tx = bc.TRUC[cha];
  // trục chỉ dùng cho con xếp dọc ngay cạnh trục (con nằm bên phải trục, hoặc bên trái) — con đứng cột riêng thì nối kiểu thanh ngang
  if (tx != null && Math.abs(k.x - tx) >= 70 && Math.abs(k.x - tx) <= 95) {
    const yc = k.y + k.h / 2;
    const canh = k.x < tx ? k.x + k.w / 2 : k.x - k.w / 2;
    return `M${c.x} ${y0} V${Math.min(y0 + 10, k.y - 8)} H${tx} V${yc} H${canh}`;
  }
  return `M${c.x} ${y0} V${k.y - 14} H${k.x} V${k.y}`;
}
