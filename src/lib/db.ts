import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import postgres from "postgres";

export interface StatementWrapper {
  all(params?: any): Promise<any[]>;
  all(...params: any[]): Promise<any[]>;
  get(params?: any): Promise<any | undefined>;
  get(...params: any[]): Promise<any | undefined>;
  run(params?: any): Promise<{ lastInsertRowid: number; changes: number }>;
  run(...params: any[]): Promise<{ lastInsertRowid: number; changes: number }>;
}

export interface DbWrapper {
  prepare(sql: string): StatementWrapper;
  exec(sql: string): Promise<void>;
  isPostgres: boolean;
}

let _db: DbWrapper | null = null;
let _pgSql: any = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar_hue INTEGER NOT NULL DEFAULT 260,
  bio TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  goal_category TEXT DEFAULT 'Custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Custom',
  banner_hue INTEGER NOT NULL DEFAULT 260,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
  image_url TEXT DEFAULT '',
  caption TEXT NOT NULL,
  progress_note TEXT DEFAULT '',
  post_date TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  flag_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_date)
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  flag_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  week_start TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, week_start)
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

function translateSql(sql: string): string {
  let res = sql;

  // 1. Convert INSERT OR IGNORE INTO ... to INSERT INTO ... ON CONFLICT DO NOTHING
  if (res.toUpperCase().includes("INSERT OR IGNORE INTO")) {
    res = res.replace(/INSERT OR IGNORE INTO/gi, "INSERT INTO");
    if (!res.toUpperCase().includes("ON CONFLICT")) {
      res = res + " ON CONFLICT DO NOTHING";
    }
  }

  // 2. Convert SQLite date/time functions
  res = res.replace(/datetime\s*\(\s*['"]now['"]\s*,\s*['"]-30 days['"]\s*\)/gi, "now() - interval '30 days'");
  res = res.replace(/date\s*\(\s*['"]now['"]\s*,\s*['"]-6 days['"]\s*\)/gi, "current_date - interval '6 days'");
  res = res.replace(/date\s*\(\s*['"]now['"]\s*,\s*['"]localtime['"]\s*\)/gi, "current_date");
  res = res.replace(/datetime\s*\(\s*['"]now['"]\s*\)/gi, "now()");
  res = res.replace(/\(datetime\s*\(\s*['"]now['"]\s*\)\)/gi, "now()");

  // 3. Convert strftime('%w', post_date) to EXTRACT(dow FROM post_date::date)
  res = res.replace(/CAST\s*\(\s*strftime\s*\(\s*['"]%w['"]\s*,\s*(\w+)\s*\)\s*AS\s*INTEGER\s*\)/gi, "EXTRACT(dow FROM CAST($1 AS date))::integer");
  
  // 4. Convert CAST(substr(created_at, 12, 2) AS INTEGER) to EXTRACT(hour FROM created_at)
  res = res.replace(/CAST\s*\(\s*substr\s*\(\s*created_at\s*,\s*12\s*,\s*2\s*\)\s*AS\s*INTEGER\s*\)/gi, "EXTRACT(hour FROM created_at)::integer");

  // 5. Convert dynamic SQLite datetime intervals for Postgres
  res = res.replace(/datetime\s*\(\s*['"]now['"]\s*,\s*['"]-['"]\s*\|\|\s*([\s\S]+?)\s*\|\|\s*['"]\s*(days|minutes)['"]\s*\)/gi, "now() - ($1 || ' $2')::interval");

  // 6. Replace boolean = integer comparisons/updates with boolean types for Postgres
  res = res.replace(/\bcm\.flagged\s*=\s*0\b/gi, "cm.flagged = false");
  res = res.replace(/\bp\.flagged\s*=\s*0\b/gi, "p.flagged = false");
  res = res.replace(/\bread\s*=\s*0\b/gi, "read = false");
  res = res.replace(/\bread\s*=\s*1\b/gi, "read = true");
  res = res.replace(/\bis_private\s*=\s*0\b/gi, "is_private = false");
  res = res.replace(/\bis_private\s*=\s*1\b/gi, "is_private = true");

  // 7. Inject explicit cast for boolean columns inserted/updated as integer values
  res = res.replace(
    "INSERT INTO posts (user_id, community_id, image_url, caption, progress_note, post_date, flagged, flag_reason) VALUES (?,?,?,?,?,?,?,?)",
    "INSERT INTO posts (user_id, community_id, image_url, caption, progress_note, post_date, flagged, flag_reason) VALUES (?,?,?,?,?,?,?::integer::boolean,?)"
  );
  res = res.replace(
    "INSERT INTO comments (post_id, user_id, body, flagged, flag_reason) VALUES (?,?,?,?,?)",
    "INSERT INTO comments (post_id, user_id, body, flagged, flag_reason) VALUES (?,?,?,?::integer::boolean,?)"
  );
  res = res.replace(
    "INSERT INTO communities (name, slug, description, category, banner_hue, is_private, created_by) VALUES (?,?,?,?,?,?,?)",
    "INSERT INTO communities (name, slug, description, category, banner_hue, is_private, created_by) VALUES (?,?,?,?,?,?::integer::boolean,?)"
  );
  res = res.replace(
    "INSERT INTO notifications (user_id, actor_id, type, post_id, body, read, created_at) VALUES (?,?,?,?,?,?,datetime('now','-' || ? || ' minutes'))",
    "INSERT INTO notifications (user_id, actor_id, type, post_id, body, read, created_at) VALUES (?,?,?,?,?,?::integer::boolean,now() - (? || ' minutes')::interval)"
  );

  return res;
}

function extractNamedParams(sql: string, paramsObj: any): { sql: string; values: any[] } {
  const matches = sql.match(/@\w+/g);
  if (!matches) return { sql, values: [] };

  let converted = sql;
  const values: any[] = [];
  const uniqueParams = Array.from(new Set(matches));

  uniqueParams.forEach((param, idx) => {
    const key = param.slice(1);
    const val = paramsObj[key];
    values.push(val === undefined ? null : val);
    converted = converted.replace(new RegExp(param + "\\b", "g"), `$${idx + 1}`);
  });

  return { sql: converted, values };
}

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return (
    msg.includes("connect_timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("connection timeout") ||
    msg.includes("timeout") ||
    msg.includes("connect") ||
    msg.includes("epipe") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("dns") ||
    code.includes("timeout") ||
    code.includes("connect") ||
    code.includes("enotfound")
  );
}

function getSqliteDbWrapper(): DbWrapper {
  let dbPath: string;
  if (process.env.VERCEL) {
    dbPath = "/tmp/goalreal.db";
  } else {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    dbPath = path.join(dataDir, "goalreal.db");
  }

  // Clean SQLite tables creation SQLite-style Schema
  const SQLITE_SCHEMA = SCHEMA
    .replace(/SERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
    .replace(/TIMESTAMPTZ/gi, "TEXT")
    .replace(/DEFAULT\s+now\s*\(\s*\)/gi, "DEFAULT CURRENT_TIMESTAMP");

  const sqliteDb = new Database(dbPath);
  sqliteDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    ${SQLITE_SCHEMA}
    CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id, post_date);
    CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id, post_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_memberships_community ON memberships(community_id, status);
  `);

  const sqliteDbWrapper: DbWrapper = {
    isPostgres: false,
    prepare(sqlString: string) {
      const stmt = sqliteDb.prepare(sqlString);
      return {
        async all(...args: any[]) {
          if (
            args.length === 1 &&
            typeof args[0] === "object" &&
            args[0] !== null &&
            !Array.isArray(args[0]) &&
            sqlString.includes("@")
          ) {
            return stmt.all(args[0]);
          }
          const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          return stmt.all(...flatArgs);
        },
        async get(...args: any[]) {
          if (
            args.length === 1 &&
            typeof args[0] === "object" &&
            args[0] !== null &&
            !Array.isArray(args[0]) &&
            sqlString.includes("@")
          ) {
            return stmt.get(args[0]);
          }
          const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          return stmt.get(...flatArgs);
        },
        async run(...args: any[]) {
          let res;
          if (
            args.length === 1 &&
            typeof args[0] === "object" &&
            args[0] !== null &&
            !Array.isArray(args[0]) &&
            sqlString.includes("@")
          ) {
            res = stmt.run(args[0]);
          } else {
            const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
            res = stmt.run(...flatArgs);
          }
          return {
            lastInsertRowid: Number(res.lastInsertRowid),
            changes: res.changes,
          };
        },
      };
    },
    async exec(sqlString: string) {
      sqliteDb.exec(sqlString);
    },
  };

  const row = sqliteDb.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (row.c === 0) {
    const { seed } = require("./seed") as typeof import("./seed");
    seed(sqliteDb);
  }

  return sqliteDbWrapper;
}

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return (
    code === "42p01" ||
    msg.includes("does not exist") ||
    msg.includes("relation")
  );
}

function cleanPgRow(row: any): any {
  if (!row) return row;
  const newRow = { ...row };
  for (const key of Object.keys(newRow)) {
    const val = newRow[key];
    if (val instanceof Date) {
      if (key.includes("date") || key === "week_start") {
        newRow[key] = dateStr(val);
      } else {
        newRow[key] = val.toISOString();
      }
    } else if (typeof val === "string") {
      const lowerKey = key.toLowerCase();
      if (
        key === "id" ||
        key === "c" ||
        key === "count" ||
        lowerKey.endsWith("_id") ||
        lowerKey.endsWith("_count") ||
        lowerKey.endsWith("_hue") ||
        lowerKey === "is_member" ||
        lowerKey === "is_pending" ||
        lowerKey === "liked_by_me" ||
        lowerKey === "read" ||
        lowerKey === "flagged" ||
        lowerKey === "is_private" ||
        lowerKey === "streak" ||
        lowerKey === "current_streak" ||
        lowerKey === "longest_streak" ||
        lowerKey === "consistency" ||
        lowerKey === "posts7" ||
        lowerKey === "activetoday" ||
        lowerKey === "totalposts"
      ) {
        const num = Number(val);
        if (!isNaN(num)) {
          newRow[key] = num;
        }
      }
    }
  }
  return newRow;
}

async function executePgUnsafe(sqlString: string, args: any[], appendReturning: boolean = false): Promise<any[]> {
  let translated = translateSql(sqlString);
  if (appendReturning) {
    const upper = translated.toUpperCase().trim();
    if (upper.startsWith("INSERT INTO") && !upper.includes("RETURNING")) {
      if (upper.includes("INTO FOLLOWS")) {
        translated = translated + " RETURNING follower_id AS id";
      } else {
        translated = translated + " RETURNING id";
      }
    }
  }

  let values: any[] = [];
  if (
    args.length === 1 &&
    typeof args[0] === "object" &&
    args[0] !== null &&
    !Array.isArray(args[0]) &&
    sqlString.includes("@")
  ) {
    const extracted = extractNamedParams(translated, args[0]);
    translated = extracted.sql;
    values = extracted.values;
  } else {
    const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    values = flatArgs;
    let paramCount = 1;
    while (translated.includes("?")) {
      translated = translated.replace("?", `$${paramCount++}`);
    }
  }

  return await _pgSql.unsafe(translated, values);
}

let _postgresSeededCheck = false;

async function checkAndSeedPostgres(pgDb: DbWrapper) {
  if (_postgresSeededCheck) return;
  _postgresSeededCheck = true;
  try {
    const row = await pgDb.prepare("SELECT COUNT(*) AS c FROM users").get();
    if (!row || Number(row.c) === 0) {
      console.log("Postgres database is empty, seeding initial data...");
      const { seed } = require("./seed") as typeof import("./seed");
      await seed(pgDb);
      console.log("Postgres database seeded successfully.");
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      console.log("Postgres relation missing during startup check, executing SCHEMA...");
      try {
        await pgDb.exec(SCHEMA);
        const { seed } = require("./seed") as typeof import("./seed");
        await seed(pgDb);
        console.log("Postgres schema created and database seeded.");
      } catch (schemaErr) {
        console.error("Failed to seed Postgres after schema creation:", schemaErr);
      }
    } else {
      console.error("Error during Postgres seed check:", err);
    }
  }
}

export function getDb(): DbWrapper {
  if (_db) return _db;

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const isCorrectPgUrl = dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"));

  if (dbUrl && !isCorrectPgUrl) {
    console.warn(
      `DATABASE_URL is defined but is not a valid PostgreSQL connection string (must start with postgres:// or postgresql://). Received: "${dbUrl}". Falling back to SQLite.`
    );
  }

  if (isCorrectPgUrl) {
    // ------------------ POSTGRESQL / SUPABASE ------------------
    _pgSql = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    const pgDb: DbWrapper = {
      isPostgres: true,
      prepare(sqlString: string) {
        return {
          async all(...args: any[]) {
            try {
              const rows = await executePgUnsafe(sqlString, args);
              return Array.from(rows).map(cleanPgRow);
            } catch (err: any) {
              if (isTableMissingError(err)) {
                console.log("Postgres relation missing, executing SCHEMA...");
                try {
                  await pgDb.exec(SCHEMA);
                  const { seed } = require("./seed") as typeof import("./seed");
                  await seed(pgDb);
                  const rows = await executePgUnsafe(sqlString, args);
                  return Array.from(rows).map(cleanPgRow);
                } catch (schemaErr) {
                  console.error("Failed to recreate schema on Postgres:", schemaErr);
                }
              }
              if (isConnectionError(err)) {
                console.warn("Postgres connection failed, falling back to SQLite:", err);
                const localDb = getSqliteDbWrapper();
                _db = localDb;
                return localDb.prepare(sqlString).all(...args);
              }
              throw err;
            }
          },
          async get(...args: any[]) {
            try {
              const rows = await this.all(...args);
              return rows[0];
            } catch (err: any) {
              if (isConnectionError(err)) {
                console.warn("Postgres connection failed, falling back to SQLite:", err);
                const localDb = getSqliteDbWrapper();
                _db = localDb;
                return localDb.prepare(sqlString).get(...args);
              }
              throw err;
            }
          },
          async run(...args: any[]) {
            try {
              const rows = await executePgUnsafe(sqlString, args, true);
              const lastInsertRowid = rows[0]?.id || rows[0]?.lastInsertRowid || 0;
              return { lastInsertRowid: Number(lastInsertRowid), changes: rows.length };
            } catch (err: any) {
              if (isTableMissingError(err)) {
                console.log("Postgres relation missing, executing SCHEMA...");
                try {
                  await pgDb.exec(SCHEMA);
                  const { seed } = require("./seed") as typeof import("./seed");
                  await seed(pgDb);
                  const rows = await executePgUnsafe(sqlString, args, true);
                  const lastInsertRowid = rows[0]?.id || rows[0]?.lastInsertRowid || 0;
                  return { lastInsertRowid: Number(lastInsertRowid), changes: rows.length };
                } catch (schemaErr) {
                  console.error("Failed to recreate schema on Postgres:", schemaErr);
                }
              }
              if (isConnectionError(err)) {
                console.warn("Postgres connection failed, falling back to SQLite:", err);
                const localDb = getSqliteDbWrapper();
                _db = localDb;
                return localDb.prepare(sqlString).run(...args);
              }
              throw err;
            }
          },
        };
      },
      async exec(sqlString: string) {
        try {
          const translated = translateSql(sqlString);
          await _pgSql.unsafe(translated);
        } catch (err: any) {
          if (isConnectionError(err)) {
            console.warn("Postgres connection failed, falling back to SQLite:", err);
            const localDb = getSqliteDbWrapper();
            _db = localDb;
            await localDb.exec(sqlString);
            return;
          }
          throw err;
        }
      },
    };

    _db = pgDb;
    // Trigger background seed check
    checkAndSeedPostgres(pgDb).catch((e) => console.error("Background seed check failed:", e));
  } else {
    _db = getSqliteDbWrapper();
  }

  return _db;
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}

export function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  return dateStr(x);
}
