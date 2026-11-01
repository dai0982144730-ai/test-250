// ============================================================
// db.ts — CHỈ CHẠY PHÍA SERVER. Một cổng vào CSDL cho mọi module.
//
// - Có DATABASE_URL  → PostgreSQL thật (máy chủ Vietnix: PostgreSQL 17, CSDL riêng "scidocflow").
// - Không có          → PGlite (Postgres nhúng) lưu tại data/pgdata — chạy thử trên máy không cần cài gì.
// - DOCFLOW_DB=memory → PGlite trong RAM (dùng cho test).
// Cùng một SQL cho cả ba. Lúc mở lần đầu tự chạy mọi file db/*.sql (idempotent) rồi gieo dữ liệu mặc định.
// ============================================================

import fs from "node:fs";
import path from "node:path";

export interface KetQua<T> {
  rows: T[];
}

/** Đối tượng truy vấn — dùng chung cho cả kết nối thường lẫn trong giao dịch. */
export interface Q {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<KetQua<T>>;
}

interface CoSo extends Q {
  exec(sql: string): Promise<void>;
  tx<T>(fn: (q: Q) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

async function moPglite(dataDir?: string): Promise<CoSo> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const q: Q = {
    query: async <T,>(sql: string, params?: unknown[]) => {
      const r = await pg.query<T>(sql, params as unknown[] | undefined);
      return { rows: r.rows };
    },
  };
  return {
    ...q,
    exec: async (sql) => {
      await pg.exec(sql);
    },
    tx: (fn) =>
      pg.transaction(async (t) =>
        fn({
          query: async <T,>(sql: string, params?: unknown[]) => {
            const r = await t.query<T>(sql, params as unknown[] | undefined);
            return { rows: r.rows };
          },
        }),
      ),
    close: () => pg.close(),
  };
}

async function moPg(url: string): Promise<CoSo> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 8 });
  pool.on("error", () => undefined);
  return {
    query: async <T,>(sql: string, params?: unknown[]) => {
      const r = await pool.query(sql, params as unknown[] | undefined);
      return { rows: r.rows as T[] };
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    tx: async (fn) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const kq = await fn({
          query: async <T,>(sql: string, params?: unknown[]) => {
            const r = await c.query(sql, params as unknown[] | undefined);
            return { rows: r.rows as T[] };
          },
        });
        await c.query("COMMIT");
        return kq;
      } catch (e) {
        await c.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end(),
  };
}

/** Chạy mọi file db/*.sql theo thứ tự tên. */
export async function chayLuocDo(cs: { exec(sql: string): Promise<void> }): Promise<void> {
  const thuMuc = path.join(process.cwd(), "db");
  const tep = fs
    .readdirSync(thuMuc)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of tep) {
    await cs.exec(fs.readFileSync(path.join(thuMuc, f), "utf8"));
  }
}

type G = typeof globalThis & { __docflowDb?: Promise<CoSo> };
const g = globalThis as G;

async function mo(): Promise<CoSo> {
  const url = process.env.DATABASE_URL?.trim();
  // Bộ test KHÔNG BAO GIỜ được mở data/pgdata thật (02/10/2026: một bài test mở database thật lúc app đang chạy → hai tiến trình
  // cùng ghi → hỏng WAL, phải khôi phục bản sao lưu). vitest.config.ts đặt DOCFLOW_DB=memory; đây là chốt chặn thứ hai.
  if (process.env.VITEST && !url && process.env.DOCFLOW_DB !== "memory")
    throw new Error("Đang chạy test mà định mở database thật data/pgdata — đặt DOCFLOW_DB=memory");
  const cs = url
    ? await moPg(url)
    : process.env.DOCFLOW_DB === "memory"
      ? await moPglite()
      : await moPglite(path.join(process.cwd(), "data", "pgdata"));
  await chayLuocDo(cs);
  // Gieo dữ liệu mặc định (9 đơn vị, vai trò, 9 mẫu, cấu hình...) — idempotent
  const { gieoDuLieu } = await import("@/lib/khoi-tao");
  await gieoDuLieu(cs);
  // Tên đơn vị chức danh = "<chức danh> · <người giữ>" máy tự ghép (db/69, lib/to-chuc.ts) — idempotent
  const { dongBoChucDanh } = await import("@/lib/to-chuc");
  await dongBoChucDanh(cs);
  return cs;
}

function coSo(): Promise<CoSo> {
  if (!g.__docflowDb) {
    g.__docflowDb = mo().catch((e) => {
      g.__docflowDb = undefined;
      throw e;
    });
  }
  return g.__docflowDb;
}

/** Truy vấn đơn lẻ. */
export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<KetQua<T>> {
  return (await coSo()).query<T>(sql, params);
}

/** Chạy trong MỘT giao dịch: lỗi ở đâu thì hoàn lại toàn bộ. */
export async function tx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  return (await coSo()).tx(fn);
}

/** Lấy đối tượng truy vấn (khi hàm dịch vụ cần tham số q). */
export async function layQ(): Promise<Q> {
  return coSo();
}

/** CHỈ DÙNG TRONG TEST: đóng CSDL hiện tại và mở CSDL RAM mới tinh (đã có lược đồ + dữ liệu gieo). */
export async function __moCsdlTestMoi(): Promise<void> {
  process.env.DOCFLOW_DB = "memory";
  delete process.env.DATABASE_URL;
  if (g.__docflowDb) {
    const cu = await g.__docflowDb.catch(() => null);
    await cu?.close().catch(() => undefined);
  }
  g.__docflowDb = undefined;
  await coSo();
}
