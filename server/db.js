import "dotenv/config";
import { Pool, types } from "pg";

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(21, (value) => Number(value));
types.setTypeParser(23, (value) => Number(value));
types.setTypeParser(700, (value) => Number(value));
types.setTypeParser(701, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "";

if (!connectionString) {
  throw new Error("DATABASE_URL ou SUPABASE_DB_URL est requis pour demarrer l'API avec PostgreSQL.");
}

const useSsl = !/localhost|127\.0\.0\.1/i.test(connectionString) && process.env.PGSSLMODE !== "disable";

export const db = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

function convertQuestionMarks(sql) {
  let index = 0;
  let output = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === "'" && !inDouble) {
      output += char;
      if (inSingle && next === "'") {
        output += next;
        i += 1;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (char === "\"" && !inSingle) {
      inDouble = !inDouble;
      output += char;
      continue;
    }

    if (char === "?" && !inSingle && !inDouble) {
      index += 1;
      output += `$${index}`;
      continue;
    }

    output += char;
  }

  return output;
}

function normalizeSql(sql) {
  return sql
    .replace(/\r\n/g, "\n")
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, "BIGSERIAL PRIMARY KEY")
    .replace(/\b(created_at|updated_at|reviewed_at|delivered_at)\b\s+TEXT\b/gi, "$1 TIMESTAMPTZ")
    .replace(/BEGIN TRANSACTION/gi, "BEGIN");
}

async function emulatePragmaTableInfo(tableName) {
  const result = await db.query(
    `SELECT
       ordinal_position - 1 AS cid,
       column_name AS name,
       data_type AS type,
       CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull,
       column_default AS dflt_value,
       CASE WHEN column_name = 'id' THEN 1 ELSE 0 END AS pk
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows;
}

async function query(sql, params = []) {
  const trimmed = sql.trim();
  const pragmaMatch = trimmed.match(/^PRAGMA\s+table_info\(([^)]+)\)$/i);
  if (pragmaMatch) {
    const tableName = pragmaMatch[1].replace(/['"`]/g, "").trim();
    return { rows: await emulatePragmaTableInfo(tableName), rowCount: 0 };
  }

  let text = convertQuestionMarks(normalizeSql(sql));
  const isInsert = /^INSERT\s+INTO/i.test(trimmed);
  if (isInsert && !/\bRETURNING\b/i.test(text)) {
    text = `${text} RETURNING id`;
  }

  return db.query(text, params);
}

export async function run(sql, params = []) {
  const result = await query(sql, params);
  return {
    rows: result.rows ?? [],
    rowCount: result.rowCount ?? 0,
    changes: result.rowCount ?? 0,
    lastID: result.rows?.[0]?.id ?? null
  };
}

export async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows?.[0] ?? null;
}

export async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows ?? [];
}
