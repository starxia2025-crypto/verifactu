import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { existsSync } from "fs";
import { Router, type IRouter } from "express";
import {
  and,
  db,
  eq,
  integrationSourcesTable,
  membershipsTable,
  taxpayerProfilesTable,
} from "@workspace/db";
import { getUserId, requireAuth } from "../lib/auth";

type SourceType = "excel" | "csv" | "postgres" | "mysql" | "sqlserver" | "dbf";
type SourceConfig = Record<string, any>;

const router: IRouter = Router();
const SOURCE_TYPES = new Set<SourceType>(["excel", "csv", "postgres", "mysql", "sqlserver", "dbf"]);
const SECRET = process.env.SESSION_SECRET ?? "fallback-secret-change-me";
const KEY = createHash("sha256").update(SECRET).digest();

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(value: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(":");
  if (!ivRaw || !tagRaw || !encryptedRaw) return "";
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function normalizeConfig(input: SourceConfig = {}, existing?: SourceConfig): SourceConfig {
  const next = { ...input };
  if (typeof next.password === "string" && next.password.length > 0) {
    next.passwordEncrypted = encryptSecret(next.password);
  } else if (existing?.passwordEncrypted && next.password === undefined) {
    next.passwordEncrypted = existing.passwordEncrypted;
  }
  delete next.password;
  return next;
}

function withDecryptedPassword(config: SourceConfig): SourceConfig {
  if (!config?.passwordEncrypted) return config;
  return { ...config, password: decryptSecret(String(config.passwordEncrypted)) };
}

function redactSource<T extends { config: unknown }>(source: T): T {
  const { password, passwordEncrypted, ...safeConfig } = (source.config ?? {}) as SourceConfig;
  return { ...source, config: safeConfig };
}

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function assertTaxpayerAccess(userId: number, taxpayerId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: taxpayerProfilesTable.id })
    .from(taxpayerProfilesTable)
    .innerJoin(membershipsTable, eq(membershipsTable.organizationId, taxpayerProfilesTable.organizationId))
    .where(
      and(
        eq(taxpayerProfilesTable.id, taxpayerId),
        eq(taxpayerProfilesTable.isActive, true),
        eq(membershipsTable.userId, userId),
        eq(membershipsTable.isActive, true),
      ),
    )
    .limit(1);

  return !!row;
}

async function getSourceForUser(userId: number, sourceId: number) {
  const [source] = await db
    .select()
    .from(integrationSourcesTable)
    .where(and(eq(integrationSourcesTable.id, sourceId), eq(integrationSourcesTable.isActive, true)))
    .limit(1);

  if (!source) return null;
  const allowed = await assertTaxpayerAccess(userId, source.taxpayerId);
  return allowed ? source : null;
}

function ensureSourceType(value: unknown): SourceType | null {
  return typeof value === "string" && SOURCE_TYPES.has(value as SourceType) ? (value as SourceType) : null;
}

function assertReadOnlyQuery(query: unknown): string {
  const value = String(query || "").trim();
  if (!value) throw new Error("Debes indicar una consulta SELECT o una tabla.");
  if (!/^select\s/i.test(value)) throw new Error("Solo se permiten consultas SELECT para proteger el ERP origen.");
  if (/;\s*\S/.test(value)) throw new Error("No se permiten varias sentencias SQL.");
  return value;
}

function quoteIdentifier(identifier: string, dialect: "postgres" | "mysql" | "sqlserver"): string {
  if (!/^[A-Za-z0-9_.$\[\]]+$/.test(identifier)) throw new Error("Nombre de tabla no permitido.");
  if (dialect === "mysql") return identifier.split(".").map((part) => `\`${part}\``).join(".");
  if (dialect === "sqlserver") return identifier.split(".").map((part) => `[${part.replace(/^\[|\]$/g, "")}]`).join(".");
  return identifier.split(".").map((part) => `"${part}"`).join(".");
}

function buildPreviewQuery(config: SourceConfig, dialect: "postgres" | "mysql" | "sqlserver"): string {
  if (config.query) {
    const query = assertReadOnlyQuery(config.query);
    return dialect === "sqlserver" ? `SELECT TOP 25 * FROM (${query}) AS verifactu_preview` : `SELECT * FROM (${query}) AS verifactu_preview LIMIT 25`;
  }

  const tableName = String(config.tableName || "").trim();
  if (!tableName) throw new Error("Debes indicar tabla o consulta SELECT.");
  const quoted = quoteIdentifier(tableName, dialect);
  return dialect === "sqlserver" ? `SELECT TOP 25 * FROM ${quoted}` : `SELECT * FROM ${quoted} LIMIT 25`;
}

async function testSource(type: SourceType, rawConfig: SourceConfig) {
  const config = withDecryptedPassword(rawConfig);

  if (type === "postgres") {
    const pg = await import("pg");
    const client = new pg.Client({
      host: config.host,
      port: Number(config.port || 5432),
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    await client.query("select 1");
    await client.end();
    return { ok: true, message: "Conexión PostgreSQL correcta" };
  }

  if (type === "mysql") {
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection({
      host: config.host,
      port: Number(config.port || 3306),
      database: config.database,
      user: config.username,
      password: config.password,
    });
    await connection.query("select 1");
    await connection.end();
    return { ok: true, message: "Conexión MySQL/MariaDB correcta" };
  }

  if (type === "sqlserver") {
    const mssql = await import("mssql");
    const pool = await mssql.connect({
      server: config.host,
      port: Number(config.port || 1433),
      database: config.database,
      user: config.username,
      password: config.password,
      options: {
        encrypt: !!config.encrypt,
        trustServerCertificate: config.trustServerCertificate !== false,
      },
    });
    await pool.request().query("select 1 as ok");
    await pool.close();
    return { ok: true, message: "Conexión SQL Server correcta" };
  }

  const filePath = String(config.filePath || "").trim();
  if (!filePath) throw new Error("Debes indicar la ruta del archivo en el servidor.");
  if (!existsSync(filePath)) throw new Error("No se encontró el archivo indicado en el servidor.");
  return { ok: true, message: "Archivo encontrado correctamente" };
}

async function previewSource(type: SourceType, rawConfig: SourceConfig) {
  const config = withDecryptedPassword(rawConfig);

  if (type === "postgres") {
    const pg = await import("pg");
    const client = new pg.Client({
      host: config.host,
      port: Number(config.port || 5432),
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    const result = await client.query(buildPreviewQuery(config, "postgres"));
    await client.end();
    return { columns: result.fields.map((field) => field.name), rows: result.rows };
  }

  if (type === "mysql") {
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection({
      host: config.host,
      port: Number(config.port || 3306),
      database: config.database,
      user: config.username,
      password: config.password,
    });
    const [rows] = await connection.query(buildPreviewQuery(config, "mysql"));
    await connection.end();
    const items = Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
    return { columns: Object.keys(items[0] || {}), rows: items };
  }

  if (type === "sqlserver") {
    const mssql = await import("mssql");
    const pool = await mssql.connect({
      server: config.host,
      port: Number(config.port || 1433),
      database: config.database,
      user: config.username,
      password: config.password,
      options: {
        encrypt: !!config.encrypt,
        trustServerCertificate: config.trustServerCertificate !== false,
      },
    });
    const result = await pool.request().query(buildPreviewQuery(config, "sqlserver"));
    await pool.close();
    const rows = result.recordset ?? [];
    return { columns: Object.keys(rows[0] || {}), rows };
  }

  if (type === "dbf") {
    const { DBFFile } = await import("dbffile");
    const dbf = await DBFFile.open(String(config.filePath));
    const rows = await dbf.readRecords(25);
    return { columns: dbf.fields.map((field: any) => field.name), rows };
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.readFile(String(config.filePath), { raw: false });
  const sheetName = config.sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No se encontró la hoja indicada.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }).slice(0, 25);
  return { columns: Object.keys(rows[0] || {}), rows };
}

router.get("/taxpayers/:taxpayerId/integration-sources", requireAuth, async (req, res): Promise<void> => {
  const taxpayerId = parseId(req.params.taxpayerId);
  if (!taxpayerId) {
    res.status(400).json({ error: "Invalid taxpayerId" });
    return;
  }

  const userId = getUserId(req);
  if (!(await assertTaxpayerAccess(userId, taxpayerId))) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }

  const sources = await db
    .select()
    .from(integrationSourcesTable)
    .where(and(eq(integrationSourcesTable.taxpayerId, taxpayerId), eq(integrationSourcesTable.isActive, true)));

  res.json(sources.map(redactSource));
});

router.post("/taxpayers/:taxpayerId/integration-sources", requireAuth, async (req, res): Promise<void> => {
  const taxpayerId = parseId(req.params.taxpayerId);
  const type = ensureSourceType(req.body?.type);
  const name = String(req.body?.name || "").trim();

  if (!taxpayerId || !type || name.length < 2) {
    res.status(400).json({ error: "Nombre, contribuyente y tipo son obligatorios." });
    return;
  }

  const userId = getUserId(req);
  if (!(await assertTaxpayerAccess(userId, taxpayerId))) {
    res.status(404).json({ error: "Taxpayer not found" });
    return;
  }

  const [source] = await db
    .insert(integrationSourcesTable)
    .values({
      taxpayerId,
      name,
      type,
      config: normalizeConfig(req.body?.config),
    })
    .returning();

  res.status(201).json(redactSource(source));
});

router.patch("/integration-sources/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const userId = getUserId(req);
  const existing = await getSourceForUser(userId, id);
  if (!existing) {
    res.status(404).json({ error: "Fuente no encontrada" });
    return;
  }

  const type = req.body?.type === undefined ? existing.type : ensureSourceType(req.body.type);
  const name = req.body?.name === undefined ? existing.name : String(req.body.name || "").trim();
  if (!type || name.length < 2) {
    res.status(400).json({ error: "Nombre y tipo no válidos." });
    return;
  }

  const [source] = await db
    .update(integrationSourcesTable)
    .set({
      name,
      type,
      config: normalizeConfig(req.body?.config ?? existing.config, existing.config as SourceConfig),
    })
    .where(eq(integrationSourcesTable.id, id))
    .returning();

  res.json(redactSource(source));
});

router.delete("/integration-sources/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const source = await getSourceForUser(getUserId(req), id);
  if (!source) {
    res.status(404).json({ error: "Fuente no encontrada" });
    return;
  }

  await db.update(integrationSourcesTable).set({ isActive: false }).where(eq(integrationSourcesTable.id, id));
  res.sendStatus(204);
});

router.post("/integration-sources/:id/test", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const source = await getSourceForUser(getUserId(req), id);
  if (!source) {
    res.status(404).json({ error: "Fuente no encontrada" });
    return;
  }

  try {
    const result = await testSource(source.type as SourceType, source.config as SourceConfig);
    await db
      .update(integrationSourcesTable)
      .set({ status: "ready", lastTestStatus: "ok", lastTestMessage: result.message, lastTestedAt: new Date() })
      .where(eq(integrationSourcesTable.id, id));
    res.json(result);
  } catch (error: any) {
    const message = error?.message || "No se pudo probar la fuente";
    await db
      .update(integrationSourcesTable)
      .set({ status: "error", lastTestStatus: "error", lastTestMessage: message, lastTestedAt: new Date() })
      .where(eq(integrationSourcesTable.id, id));
    res.status(400).json({ ok: false, message });
  }
});

router.post("/integration-sources/:id/preview", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const source = await getSourceForUser(getUserId(req), id);
  if (!source) {
    res.status(404).json({ error: "Fuente no encontrada" });
    return;
  }

  try {
    res.json(await previewSource(source.type as SourceType, source.config as SourceConfig));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "No se pudo previsualizar la fuente" });
  }
});

export default router;
