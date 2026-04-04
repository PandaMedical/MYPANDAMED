import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { all, get, run } from "./db.js";
import { seedData } from "./seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const clientDist = path.join(projectRoot, "client", "dist");
const app = express();
const port = Number(process.env.PORT || 4000);
const sessionSecret = process.env.SESSION_SECRET || "pandamed-dev-secret";
const sessionCookieName = "pandamed_session";
const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;
const shouldSeedDemoData =
  process.env.ENABLE_DEMO_SEED === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_SEED !== "false");

app.use(cors());
app.use(express.json());

const backupTables = [
  "users",
  "sponsors",
  "patients",
  "patient_registrations",
  "pharmacies",
  "pharmacy_applications",
  "drivers",
  "driver_applications",
  "catalog_items",
  "orders",
  "whatsapp_settings",
  "whatsapp_message_logs"
];

const restoreDeleteOrder = [
  "whatsapp_message_logs",
  "orders",
  "driver_applications",
  "drivers",
  "pharmacy_applications",
  "pharmacies",
  "patient_registrations",
  "patients",
  "catalog_items",
  "sponsors",
  "users",
  "whatsapp_settings"
];

const requiredTableColumns = {
  patients: {
    first_name: "TEXT",
    last_name: "TEXT",
    phone: "TEXT",
    email: "TEXT",
    password: "TEXT",
    date_of_birth: "TEXT",
    sex: "TEXT",
    address: "TEXT",
    postal_code: "TEXT",
    wilaya: "TEXT",
    area: "TEXT",
    conditions: "TEXT",
    allergies: "TEXT",
    notes: "TEXT",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  pharmacies: {
    name: "TEXT",
    manager_name: "TEXT",
    phone: "TEXT",
    whatsapp: "TEXT",
    email: "TEXT",
    password: "TEXT",
    address: "TEXT",
    postal_code: "TEXT",
    wilaya: "TEXT",
    area: "TEXT",
    zone_name: "TEXT",
    opening_hours: "TEXT",
    status: "TEXT DEFAULT 'online'",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  drivers: {
    first_name: "TEXT",
    last_name: "TEXT",
    phone: "TEXT",
    email: "TEXT",
    password: "TEXT",
    zone_name: "TEXT",
    vehicle: "TEXT",
    status: "TEXT DEFAULT 'actif'",
    rating: "DOUBLE PRECISION DEFAULT 0",
    packages_count: "INTEGER DEFAULT 0",
    revenue: "DOUBLE PRECISION DEFAULT 0",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  catalog_items: {
    name: "TEXT",
    category: "TEXT",
    form: "TEXT",
    unit: "TEXT",
    price: "DOUBLE PRECISION DEFAULT 0",
    reference: "TEXT",
    image: "TEXT",
    contraindications: "TEXT",
    is_active: "INTEGER DEFAULT 1",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  users: {
    first_name: "TEXT",
    last_name: "TEXT",
    phone: "TEXT",
    email: "TEXT",
    role: "TEXT",
    status: "TEXT DEFAULT 'actif'",
    password: "TEXT",
    password_hint: "TEXT",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  sponsors: {
    name: "TEXT",
    slogan: "TEXT",
    logo: "TEXT",
    type: "TEXT",
    website: "TEXT",
    is_active: "INTEGER DEFAULT 1",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  orders: {
    patient_id: "INTEGER",
    pharmacy_id: "INTEGER",
    driver_id: "INTEGER",
    products: "TEXT",
    amount: "DOUBLE PRECISION DEFAULT 0",
    status: "TEXT DEFAULT 'pending'",
    channel: "TEXT",
    source: "TEXT",
    notes: "TEXT",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    delivered_at: "TIMESTAMPTZ"
  },
  driver_applications: {
    first_name: "TEXT",
    last_name: "TEXT",
    phone: "TEXT",
    whatsapp: "TEXT",
    email: "TEXT",
    wilaya: "TEXT",
    delivery_zone: "TEXT",
    vehicle: "TEXT",
    availability: "TEXT",
    motivation: "TEXT",
    status: "TEXT DEFAULT 'pending'",
    reviewed_at: "TIMESTAMPTZ",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  pharmacy_applications: {
    pharmacy_name: "TEXT",
    manager_name: "TEXT",
    phone: "TEXT",
    whatsapp: "TEXT",
    email: "TEXT",
    address: "TEXT",
    wilaya: "TEXT",
    service_area: "TEXT",
    status: "TEXT DEFAULT 'pending'",
    reviewed_at: "TIMESTAMPTZ",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  patient_registrations: {
    first_name: "TEXT",
    last_name: "TEXT",
    phone: "TEXT",
    email: "TEXT",
    wilaya: "TEXT",
    area: "TEXT",
    address: "TEXT",
    conditions: "TEXT",
    allergies: "TEXT",
    notes: "TEXT",
    password: "TEXT",
    status: "TEXT DEFAULT 'pending'",
    reviewed_at: "TIMESTAMPTZ",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  whatsapp_settings: {
    sender_phone: "TEXT",
    api_token: "TEXT",
    phone_number_id: "TEXT",
    api_version: "TEXT",
    confirmation_template: "TEXT",
    en_route_template: "TEXT",
    livree_template: "TEXT",
    pharmacie_template: "TEXT",
    mission_livreur_template: "TEXT",
    updated_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  },
  whatsapp_message_logs: {
    order_id: "INTEGER",
    recipient_phone: "TEXT",
    action_key: "TEXT",
    message_body: "TEXT",
    delivery_status: "TEXT",
    provider_message_id: "TEXT",
    response_body: "TEXT",
    created_at: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP"
  }
};

const legacyColumnAliases = {
  sponsors: {
    nom: "name",
    slogan: "slogan",
    logo: "logo",
    type: "type",
    site_web: "website",
    actif: "is_active"
  },
  patients: {
    prenom: "first_name",
    nom: "last_name",
    telephone: "phone",
    date_naissance: "date_of_birth",
    sexe: "sex",
    code_postal: "postal_code",
    localisation: "area",
    antecedents: "conditions",
    allergies: "allergies",
    notes: "notes"
  },
  pharmacies: {
    nom: "name",
    responsable: "manager_name",
    telephone: "phone",
    code_postal: "postal_code",
    localisation: "area",
    zone: "zone_name",
    horaires: "opening_hours"
  },
  drivers: {
    prenom: "first_name",
    nom: "last_name",
    telephone: "phone",
    zone: "zone_name",
    vehicule: "vehicle",
    revenus: "revenue"
  },
  users: {
    prenom: "first_name",
    nom: "last_name",
    telephone: "phone",
    mot_de_passe: "password",
    indice_mot_de_passe: "password_hint"
  },
  catalog_items: {
    produit: "name",
    categorie: "category",
    forme: "form",
    unite: "unit",
    prix: "price",
    reference: "reference",
    image_url: "image",
    contre_indications: "contraindications",
    actif: "is_active"
  }
};

const defaultWhatsappTemplates = {
  confirmation: "Bonjour, votre commande PandaMed est confirmee.",
  en_route: "Bonjour, votre commande est en route.",
  livree: "Bonjour, votre commande a ete livree avec succes.",
  pharmacie: "Bonjour, merci de preparer cette commande PandaMed.",
  mission_livreur: "Bonjour, une nouvelle mission de livraison vous a ete affectee."
};

const entityConfig = {
  patients: {
    table: "patients",
    orderBy: "created_at DESC",
    columns: ["first_name", "last_name", "phone", "email", "password", "date_of_birth", "sex", "address", "postal_code", "wilaya", "area", "conditions", "allergies", "notes"]
  },
  pharmacies: {
    table: "pharmacies",
    orderBy: "created_at DESC",
    columns: ["name", "manager_name", "phone", "whatsapp", "email", "password", "address", "postal_code", "wilaya", "area", "zone_name", "opening_hours", "status"]
  },
  drivers: {
    table: "drivers",
    orderBy: "created_at DESC",
    columns: ["first_name", "last_name", "phone", "email", "password", "zone_name", "vehicle", "status", "rating", "packages_count", "revenue"]
  },
  catalog: {
    table: "catalog_items",
    orderBy: "created_at DESC",
    columns: ["name", "category", "form", "unit", "price", "reference", "image", "contraindications", "is_active"]
  },
  users: {
    table: "users",
    orderBy: "created_at DESC",
    columns: ["first_name", "last_name", "phone", "email", "role", "status", "password", "password_hint"]
  },
  sponsors: {
    table: "sponsors",
    orderBy: "created_at DESC",
    columns: ["name", "slogan", "logo", "type", "website", "is_active"]
  }
};

function sanitizePayload(columns, payload) {
  return Object.fromEntries(columns.map((column) => [column, payload[column] ?? null]));
}

function signSessionPayload(payload) {
  return crypto.createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function readSessionToken(req) {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );

  const token = cookies[sessionCookieName];
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || signSessionPayload(payload) !== signature) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function setSessionCookie(res, user) {
  const token = createSessionToken(user);
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secureFlag}`
  );
}

function clearSessionCookie(res) {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`);
}

async function createTables() {
  await run(`CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    password TEXT,
    date_of_birth TEXT,
    sex TEXT,
    address TEXT,
    postal_code TEXT,
    wilaya TEXT,
    area TEXT,
    conditions TEXT,
    allergies TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS pharmacies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manager_name TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    password TEXT,
    address TEXT,
    postal_code TEXT,
    wilaya TEXT,
    area TEXT,
    zone_name TEXT,
    opening_hours TEXT,
    status TEXT DEFAULT 'online',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    password TEXT,
    zone_name TEXT,
    vehicle TEXT,
    status TEXT DEFAULT 'actif',
    rating REAL DEFAULT 0,
    packages_count INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    form TEXT,
    unit TEXT,
    price REAL NOT NULL DEFAULT 0,
    reference TEXT,
    image TEXT,
    contraindications TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'actif',
    password TEXT,
    password_hint TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slogan TEXT,
    logo TEXT,
    type TEXT,
    website TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    pharmacy_id INTEGER,
    driver_id INTEGER,
    products TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    channel TEXT,
    source TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    delivered_at TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS driver_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    wilaya TEXT,
    delivery_zone TEXT,
    vehicle TEXT NOT NULL,
    availability TEXT,
    motivation TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS pharmacy_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pharmacy_name TEXT NOT NULL,
    manager_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    address TEXT NOT NULL,
    wilaya TEXT,
    service_area TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS patient_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    wilaya TEXT,
    area TEXT,
    address TEXT,
    conditions TEXT,
    allergies TEXT,
    notes TEXT,
    password TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    sender_phone TEXT,
    api_token TEXT,
    phone_number_id TEXT,
    api_version TEXT,
    confirmation_template TEXT,
    en_route_template TEXT,
    livree_template TEXT,
    pharmacie_template TEXT,
    mission_livreur_template TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    recipient_phone TEXT,
    action_key TEXT,
    message_body TEXT,
    delivery_status TEXT,
    provider_message_id TEXT,
    response_body TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureRequiredSchema();
  await seedWhatsappSettings();
}

async function ensureColumn(tableName, columnName, columnSql) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
}

async function ensureRequiredSchema() {
  for (const [tableName, columnMap] of Object.entries(requiredTableColumns)) {
    for (const [columnName, columnSql] of Object.entries(columnMap)) {
      await ensureColumn(tableName, columnName, columnSql);
    }
  }

  await ensureLegacyColumnCompatibility();
}

async function ensureLegacyColumnCompatibility() {
  for (const [tableName, aliasMap] of Object.entries(legacyColumnAliases)) {
    const columns = await all(`PRAGMA table_info(${tableName})`);
    const columnNames = new Set(columns.map((column) => column.name));

    for (const [legacyColumn, canonicalColumn] of Object.entries(aliasMap)) {
      if (!columnNames.has(legacyColumn) || !columnNames.has(canonicalColumn)) continue;

      if (canonicalColumn === "is_active") {
        await run(
          `UPDATE ${tableName}
           SET ${canonicalColumn} = CASE
             WHEN ${canonicalColumn} IS NULL AND ${legacyColumn} IS NOT NULL AND ${legacyColumn} = TRUE THEN 1
             WHEN ${canonicalColumn} IS NULL AND ${legacyColumn} IS NOT NULL AND ${legacyColumn} = FALSE THEN 0
             ELSE ${canonicalColumn}
           END
           WHERE ${canonicalColumn} IS NULL AND ${legacyColumn} IS NOT NULL`
        );
        await run(
          `UPDATE ${tableName}
           SET ${legacyColumn} = CASE
             WHEN ${legacyColumn} IS NULL AND ${canonicalColumn} IS NOT NULL AND ${canonicalColumn} <> 0 THEN TRUE
             WHEN ${legacyColumn} IS NULL AND ${canonicalColumn} IS NOT NULL AND ${canonicalColumn} = 0 THEN FALSE
             ELSE ${legacyColumn}
           END
           WHERE ${legacyColumn} IS NULL AND ${canonicalColumn} IS NOT NULL`
        );
      } else {
        await run(
          `UPDATE ${tableName}
           SET ${canonicalColumn} = ${legacyColumn}
           WHERE ${canonicalColumn} IS NULL AND ${legacyColumn} IS NOT NULL`
        );
        await run(
          `UPDATE ${tableName}
           SET ${legacyColumn} = ${canonicalColumn}
           WHERE ${legacyColumn} IS NULL AND ${canonicalColumn} IS NOT NULL`
        );
      }

      try {
        await run(`ALTER TABLE ${tableName} ALTER COLUMN ${legacyColumn} DROP NOT NULL`);
      } catch {
        // Ignore si la contrainte n'existe pas ou si la colonne accepte deja NULL.
      }
    }
  }
}

async function resetTableSequence(tableName) {
  await run(
    `SELECT setval(
      pg_get_serial_sequence('${tableName}', 'id'),
      COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
      COALESCE((SELECT MAX(id) FROM ${tableName}), 0) > 0
    )`
  );
}

async function seedTable(tableName, rows) {
  const count = await get(`SELECT COUNT(*) AS count FROM ${tableName}`);
  if (count?.count) return;

  if (tableName === "orders") {
    for (const row of rows) {
      const patient = row.patient_phone ? await get("SELECT id FROM patients WHERE phone = ?", [row.patient_phone]) : null;
      const pharmacy = row.pharmacy_name ? await get("SELECT id FROM pharmacies WHERE name = ?", [row.pharmacy_name]) : null;
      const driver = row.driver_phone ? await get("SELECT id FROM drivers WHERE phone = ?", [row.driver_phone]) : null;
      await run(
        `INSERT INTO orders (patient_id, pharmacy_id, driver_id, products, amount, status, channel, source, notes, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient?.id ?? null,
          pharmacy?.id ?? null,
          driver?.id ?? null,
          row.products,
          row.amount,
          row.status,
          row.channel,
          row.source,
          row.notes,
          row.status === "delivered" ? new Date().toISOString() : null
        ]
      );
    }
    return;
  }

  const configEntry = Object.values(entityConfig).find((entry) => entry.table === tableName);
  for (const row of rows) {
    const columns = configEntry.columns;
    const placeholders = columns.map(() => "?").join(", ");
    await run(`INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`, columns.map((column) => row[column] ?? null));
  }
}

async function seedDatabase() {
  await seedTable("users", seedData.users);
  await seedTable("sponsors", seedData.sponsors);
  await seedTable("patients", seedData.patients);
  await seedTable("pharmacies", seedData.pharmacies);
  await seedTable("drivers", seedData.drivers);
  await seedTable("catalog_items", seedData.catalog_items);
  await seedTable("orders", seedData.orders);
  await seedPatientRegistrations();
}

async function seedPatientRegistrations() {
  const count = await get("SELECT COUNT(*) AS count FROM patient_registrations");
  if (count?.count) return;

  for (const row of seedData.patient_registrations ?? []) {
    await run(
      `INSERT INTO patient_registrations (first_name, last_name, phone, email, wilaya, area, address, conditions, allergies, notes, password, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.first_name,
        row.last_name,
        row.phone,
        row.email ?? null,
        row.wilaya ?? null,
        row.area ?? null,
        row.address ?? null,
        row.conditions ?? null,
        row.allergies ?? null,
        row.notes ?? null,
        row.password ?? row.phone,
        row.status ?? "pending"
      ]
    );
  }
}

async function seedWhatsappSettings() {
  const row = await get("SELECT id FROM whatsapp_settings WHERE id = 1");
  if (row) return;
  await run(
    `INSERT INTO whatsapp_settings (
      id, sender_phone, api_token, phone_number_id, api_version, confirmation_template, en_route_template, livree_template, pharmacie_template, mission_livreur_template
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "213555123456",
      "",
      "",
      "v23.0",
      defaultWhatsappTemplates.confirmation,
      defaultWhatsappTemplates.en_route,
      defaultWhatsappTemplates.livree,
      defaultWhatsappTemplates.pharmacie,
      defaultWhatsappTemplates.mission_livreur
    ]
  );
}

async function listOrders() {
  return all(
    `SELECT
      o.*,
      p.first_name || ' ' || p.last_name AS patient_name,
      p.phone AS patient_phone,
      p.email AS patient_email,
      p.address AS patient_address,
      p.postal_code AS patient_postal_code,
      p.wilaya AS patient_wilaya,
      p.area AS patient_area,
      ph.name AS pharmacy_name,
      ph.phone AS pharmacy_phone,
      ph.whatsapp AS pharmacy_whatsapp,
      ph.email AS pharmacy_email,
      ph.address AS pharmacy_address,
      ph.postal_code AS pharmacy_postal_code,
      ph.wilaya AS pharmacy_wilaya,
      ph.area AS pharmacy_area,
      ph.zone_name AS pharmacy_zone_name,
      ph.opening_hours AS pharmacy_opening_hours,
      ph.status AS pharmacy_status,
      d.first_name || ' ' || d.last_name AS driver_name,
      d.phone AS driver_phone,
      d.email AS driver_email,
      d.zone_name AS driver_zone_name,
      d.vehicle AS driver_vehicle,
      d.status AS driver_status
     FROM orders o
     LEFT JOIN patients p ON p.id = o.patient_id
     LEFT JOIN pharmacies ph ON ph.id = o.pharmacy_id
     LEFT JOIN drivers d ON d.id = o.driver_id
     ORDER BY o.created_at DESC`
  );
}

function applyWhatsappTemplate(template, context) {
  return String(template ?? "")
    .replaceAll("{{patient_name}}", context.patient_name ?? "")
    .replaceAll("{{pharmacy_name}}", context.pharmacy_name ?? "")
    .replaceAll("{{driver_name}}", context.driver_name ?? "")
    .replaceAll("{{status}}", context.status ?? "")
    .replaceAll("{{products}}", context.products ?? "")
    .replaceAll("{{amount}}", String(context.amount ?? ""));
}

async function buildWhatsappOrderMessage(orderId, action) {
  const [order, settings] = await Promise.all([
    get(
      `SELECT
        o.*,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.phone AS patient_phone,
        ph.name AS pharmacy_name,
        ph.phone AS pharmacy_phone,
        ph.whatsapp AS pharmacy_whatsapp,
        d.first_name || ' ' || d.last_name AS driver_name,
        d.phone AS driver_phone
       FROM orders o
       LEFT JOIN patients p ON p.id = o.patient_id
       LEFT JOIN pharmacies ph ON ph.id = o.pharmacy_id
       LEFT JOIN drivers d ON d.id = o.driver_id
       WHERE o.id = ?`,
      [orderId]
    ),
    get("SELECT * FROM whatsapp_settings WHERE id = 1")
  ]);

  if (!order || !settings) return null;

  const templateMap = {
    confirmation: settings.confirmation_template,
    en_route: settings.en_route_template,
    livree: settings.livree_template,
    pharmacie: settings.pharmacie_template,
    mission_livreur: settings.mission_livreur_template
  };

  const recipientMap = {
    confirmation: order.patient_phone,
    en_route: order.patient_phone,
    livree: order.patient_phone,
    pharmacie: order.pharmacy_whatsapp || order.pharmacy_phone,
    mission_livreur: order.driver_phone
  };

  const recipient = String(recipientMap[action] ?? "").replace(/\D/g, "");
  if (!recipient) return null;

  const message = applyWhatsappTemplate(templateMap[action], order);
  return {
    recipient,
    message,
    settings,
    url: `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`
  };
}

async function logWhatsappMessage({ orderId = null, recipientPhone, actionKey, messageBody, deliveryStatus, providerMessageId = null, responseBody = null }) {
  await run(
    `INSERT INTO whatsapp_message_logs (order_id, recipient_phone, action_key, message_body, delivery_status, provider_message_id, response_body)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orderId, recipientPhone, actionKey, messageBody, deliveryStatus, providerMessageId, responseBody ? JSON.stringify(responseBody) : null]
  );
}

function sanitizeAuthUser(role, row) {
  if (!row) return null;
  if (role === "admin" || role === "operateur") {
    return { id: row.id, role, first_name: row.first_name, last_name: row.last_name, email: row.email, phone: row.phone, redirectPath: "/admin" };
  }
  if (role === "driver") {
    return { id: row.id, role, first_name: row.first_name, last_name: row.last_name, email: row.email, phone: row.phone, zone_name: row.zone_name, redirectPath: "/driver" };
  }
  if (role === "pharmacy") {
    return { id: row.id, role, name: row.name, manager_name: row.manager_name, email: row.email, phone: row.phone, zone_name: row.zone_name, redirectPath: "/pharmacy" };
  }
  return { id: row.id, role: "patient", first_name: row.first_name, last_name: row.last_name, email: row.email, phone: row.phone, redirectPath: "/patient" };
}

async function findAuthUser(identifier) {
  const normalized = String(identifier ?? "").trim();
  if (!normalized) return null;

  const admin = await get("SELECT * FROM users WHERE (phone = ? OR email = ?) AND status = 'actif' LIMIT 1", [normalized, normalized]);
  if (admin) return { role: admin.role === "admin" ? "admin" : admin.role, row: admin, password: admin.password ?? admin.password_hint ?? "" };

  const driver = await get("SELECT * FROM drivers WHERE (phone = ? OR email = ?) AND status = 'actif' LIMIT 1", [normalized, normalized]);
  if (driver) return { role: "driver", row: driver, password: driver.password ?? driver.phone ?? "" };

  const pharmacy = await get("SELECT * FROM pharmacies WHERE (phone = ? OR email = ?) AND status != 'offline' LIMIT 1", [normalized, normalized]);
  if (pharmacy) return { role: "pharmacy", row: pharmacy, password: pharmacy.password ?? pharmacy.phone ?? "" };

  const patient = await get("SELECT * FROM patients WHERE phone = ? OR email = ? LIMIT 1", [normalized, normalized]);
  if (patient) return { role: "patient", row: patient, password: patient.password ?? patient.phone ?? "" };

  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pandamed-api" });
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier ?? "").trim();
    const password = String(req.body?.password ?? "").trim();
    const authUser = await findAuthUser(identifier);

    if (!authUser || !password || authUser.password !== password) {
      return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
    }

    const user = sanitizeAuthUser(authUser.role, authUser.row);
    setSessionCookie(res, user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", (req, res) => {
  const user = readSessionToken(req);
  res.json({ user: user ?? null });
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/auth/register-patient", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const password = String(payload.password ?? "");
    if (!payload.first_name || !payload.last_name || !payload.phone || !payload.address || password.length < 6) {
      return res.status(400).json({ message: "Informations patient incompletes" });
    }

    const [existingPatient, existingRegistration] = await Promise.all([
      get("SELECT id FROM patients WHERE phone = ? OR email = ?", [payload.phone, payload.email ?? ""]),
      get(
        "SELECT id FROM patient_registrations WHERE (phone = ? OR email = ?) AND status != 'rejected'",
        [payload.phone, payload.email ?? ""]
      )
    ]);
    if (existingPatient || existingRegistration) {
      return res.status(409).json({ message: "Un compte patient existe deja avec ce numero ou cet email" });
    }

    const insert = await run(
      `INSERT INTO patient_registrations (first_name, last_name, phone, email, address, wilaya, area, password, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        payload.first_name,
        payload.last_name,
        payload.phone,
        payload.email ?? null,
        payload.address,
        payload.wilaya ?? "Annaba",
        payload.area ?? null,
        password
      ]
    );
    res.status(201).json({ ok: true, message: "Votre demande d inscription a ete envoyee", id: insert.lastID });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", async (_req, res, next) => {
  try {
    const [totals, recentOrders, topPharmacies, topDrivers] = await Promise.all([
      Promise.all([
        get("SELECT COUNT(*) AS count FROM orders"),
        get("SELECT COUNT(*) AS count FROM patients"),
        get("SELECT COUNT(*) AS count FROM pharmacies"),
        get("SELECT COUNT(*) AS count FROM drivers"),
        get("SELECT COUNT(*) AS count FROM catalog_items"),
        get("SELECT COUNT(*) AS count FROM users"),
        get("SELECT COUNT(*) AS count FROM sponsors"),
        get("SELECT COALESCE(SUM(amount), 0) AS total FROM orders")
      ]),
      all(`SELECT o.id, o.products, o.amount, o.status, p.first_name || ' ' || p.last_name AS patient_name, ph.name AS pharmacy_name
           FROM orders o LEFT JOIN patients p ON p.id = o.patient_id LEFT JOIN pharmacies ph ON ph.id = o.pharmacy_id
           ORDER BY o.created_at DESC LIMIT 5`),
      all("SELECT id, name, zone_name, status FROM pharmacies ORDER BY created_at DESC LIMIT 4"),
      all("SELECT id, first_name, last_name, zone_name, rating, packages_count, revenue FROM drivers ORDER BY rating DESC, packages_count DESC LIMIT 4")
    ]);

    res.json({
      metrics: {
        orders: totals[0].count,
        patients: totals[1].count,
        pharmacies: totals[2].count,
        drivers: totals[3].count,
        catalog: totals[4].count,
        users: totals[5].count,
        sponsors: totals[6].count,
        revenue: totals[7].total
      },
      recentOrders,
      topPharmacies,
      topDrivers
    });
  } catch (error) {
    next(error);
  }
});

for (const [routeName, config] of Object.entries(entityConfig)) {
  app.get(`/api/${routeName}`, async (_req, res, next) => {
    try {
      res.json(await all(`SELECT * FROM ${config.table} ORDER BY ${config.orderBy}`));
    } catch (error) {
      next(error);
    }
  });

  app.post(`/api/${routeName}`, async (req, res, next) => {
    try {
      const payload = sanitizePayload(config.columns, req.body);
      const placeholders = config.columns.map(() => "?").join(", ");
      const insertResult = await run(`INSERT INTO ${config.table} (${config.columns.join(", ")}) VALUES (${placeholders})`, config.columns.map((column) => payload[column]));
      res.status(201).json(await get(`SELECT * FROM ${config.table} WHERE id = ?`, [insertResult.lastID]));
    } catch (error) {
      next(error);
    }
  });

  app.put(`/api/${routeName}/:id`, async (req, res, next) => {
    try {
      const payload = sanitizePayload(config.columns, req.body);
      const assignments = config.columns.map((column) => `${column} = ?`).join(", ");
      await run(`UPDATE ${config.table} SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...config.columns.map((column) => payload[column]), req.params.id]);
      res.json(await get(`SELECT * FROM ${config.table} WHERE id = ?`, [req.params.id]));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`/api/${routeName}/:id`, async (req, res, next) => {
    try {
      await run(`DELETE FROM ${config.table} WHERE id = ?`, [req.params.id]);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}

app.get("/api/orders", async (_req, res, next) => {
  try {
    res.json(await listOrders());
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const insert = await run(
      `INSERT INTO orders (patient_id, pharmacy_id, driver_id, products, amount, status, channel, source, notes, delivered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.patient_id ?? null,
        payload.pharmacy_id ?? null,
        payload.driver_id ?? null,
        payload.products ?? "",
        Number(payload.amount ?? 0),
        payload.status ?? "pending",
        payload.channel ?? null,
        payload.source ?? null,
        payload.notes ?? null,
        payload.status === "delivered" ? new Date().toISOString() : null
      ]
    );
    res.status(201).json(await get("SELECT * FROM orders WHERE id = ?", [insert.lastID]));
  } catch (error) {
    next(error);
  }
});

app.put("/api/orders/:id", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    await run(
      `UPDATE orders
       SET patient_id = ?, pharmacy_id = ?, driver_id = ?, products = ?, amount = ?, status = ?, channel = ?, source = ?, notes = ?, delivered_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.patient_id ?? null,
        payload.pharmacy_id ?? null,
        payload.driver_id ?? null,
        payload.products ?? "",
        Number(payload.amount ?? 0),
        payload.status ?? "pending",
        payload.channel ?? null,
        payload.source ?? null,
        payload.notes ?? null,
        payload.status === "delivered" ? new Date().toISOString() : null,
        req.params.id
      ]
    );
    res.json(await get("SELECT * FROM orders WHERE id = ?", [req.params.id]));
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders/:id/status", async (req, res, next) => {
  try {
    const status = req.body?.status ?? "pending";
    await run(
      "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP, delivered_at = ? WHERE id = ?",
      [status, status === "delivered" ? new Date().toISOString() : null, req.params.id]
    );
    res.json(await get("SELECT * FROM orders WHERE id = ?", [req.params.id]));
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders/:id/whatsapp", async (req, res, next) => {
  try {
    const action = String(req.body?.action ?? "").trim();
    const payload = await buildWhatsappOrderMessage(req.params.id, action);
    if (!payload) {
      return res.status(400).json({ message: "Message WhatsApp impossible pour cette commande" });
    }
    const apiToken = String(payload.settings?.api_token ?? "").trim();
    const phoneNumberId = String(payload.settings?.phone_number_id ?? "").trim();
    const apiVersion = String(payload.settings?.api_version ?? "v23.0").trim();

    if (!apiToken || !phoneNumberId) {
      await logWhatsappMessage({
        orderId: req.params.id,
        recipientPhone: payload.recipient,
        actionKey: action,
        messageBody: payload.message,
        deliveryStatus: "configuration_missing"
      });
      return res.status(400).json({ message: "Configuration WhatsApp Business API incomplete dans Parametres" });
    }

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: payload.recipient,
        type: "text",
        text: {
          preview_url: false,
          body: payload.message
        }
      })
    });

    const responseBody = await response.json().catch(() => ({}));
    const providerMessageId = responseBody?.messages?.[0]?.id ?? null;

    await logWhatsappMessage({
      orderId: req.params.id,
      recipientPhone: payload.recipient,
      actionKey: action,
      messageBody: payload.message,
      deliveryStatus: response.ok ? "sent" : "error",
      providerMessageId,
      responseBody
    });

    if (!response.ok) {
      return res.status(400).json({ message: responseBody?.error?.message ?? "Echec envoi WhatsApp Business API" });
    }

    res.json({
      ok: true,
      recipient: payload.recipient,
      message: payload.message,
      provider_message_id: providerMessageId,
      response: responseBody
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/orders/:id", async (req, res, next) => {
  try {
    await run("DELETE FROM orders WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/api/driver-applications", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const insert = await run(
      `INSERT INTO driver_applications (
        first_name, last_name, phone, whatsapp, email, wilaya, delivery_zone, vehicle, availability, motivation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.first_name ?? "",
        payload.last_name ?? "",
        payload.phone ?? "",
        payload.whatsapp ?? null,
        payload.email ?? null,
        payload.wilaya ?? null,
        payload.delivery_zone ?? null,
        payload.vehicle ?? "",
        Array.isArray(payload.availability) ? payload.availability.join(", ") : payload.availability ?? "",
        payload.motivation ?? null
      ]
    );
    res.status(201).json(await get("SELECT * FROM driver_applications WHERE id = ?", [insert.lastID]));
  } catch (error) {
    next(error);
  }
});

app.post("/api/pharmacy-applications", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const insert = await run(
      `INSERT INTO pharmacy_applications (
        pharmacy_name, manager_name, phone, whatsapp, email, address, wilaya, service_area
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.pharmacy_name ?? "",
        payload.manager_name ?? "",
        payload.phone ?? "",
        payload.whatsapp ?? null,
        payload.email ?? null,
        payload.address ?? "",
        payload.wilaya ?? null,
        payload.service_area ?? null
      ]
    );
    res.status(201).json(await get("SELECT * FROM pharmacy_applications WHERE id = ?", [insert.lastID]));
  } catch (error) {
    next(error);
  }
});

app.get("/api/settings/overview", async (_req, res, next) => {
  try {
    const [driverApplications, pharmacyApplications, patientRegistrations, whatsappSettings, whatsappLogs] = await Promise.all([
      all("SELECT * FROM driver_applications ORDER BY created_at DESC"),
      all("SELECT * FROM pharmacy_applications ORDER BY created_at DESC"),
      all("SELECT * FROM patient_registrations ORDER BY created_at DESC"),
      get("SELECT * FROM whatsapp_settings WHERE id = 1"),
      all("SELECT * FROM whatsapp_message_logs ORDER BY created_at DESC LIMIT 20")
    ]);

    res.json({
      driverApplications,
      pharmacyApplications,
      patientRegistrations,
      whatsappSettings,
      whatsappLogs
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/settings/whatsapp", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    await run(
      `UPDATE whatsapp_settings
       SET sender_phone = ?, api_token = ?, phone_number_id = ?, api_version = ?, confirmation_template = ?, en_route_template = ?, livree_template = ?, pharmacie_template = ?, mission_livreur_template = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        payload.sender_phone ?? "",
        payload.api_token ?? "",
        payload.phone_number_id ?? "",
        payload.api_version ?? "v23.0",
        payload.confirmation_template ?? defaultWhatsappTemplates.confirmation,
        payload.en_route_template ?? defaultWhatsappTemplates.en_route,
        payload.livree_template ?? defaultWhatsappTemplates.livree,
        payload.pharmacie_template ?? defaultWhatsappTemplates.pharmacie,
        payload.mission_livreur_template ?? defaultWhatsappTemplates.mission_livreur
      ]
    );
    res.json(await get("SELECT * FROM whatsapp_settings WHERE id = 1"));
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/driver-applications/:id/approve", async (req, res, next) => {
  try {
    const application = await get("SELECT * FROM driver_applications WHERE id = ?", [req.params.id]);
    if (!application) return res.status(404).json({ message: "Candidature introuvable" });
    if (application.status === "approved") return res.json({ ok: true, status: "approved" });

    await run(
      `INSERT INTO drivers (first_name, last_name, phone, email, zone_name, vehicle, status, rating, packages_count, revenue)
       VALUES (?, ?, ?, ?, ?, ?, 'actif', 0, 0, 0)`,
      [
        application.first_name,
        application.last_name,
        application.phone,
        application.email ?? null,
        application.phone,
        application.delivery_zone ?? application.wilaya ?? null,
        String(application.vehicle ?? "Moto").toLowerCase()
      ]
    );
    await run("UPDATE driver_applications SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: "approved" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/driver-applications/:id/reject", async (req, res, next) => {
  try {
    await run("UPDATE driver_applications SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: "rejected" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/pharmacy-applications/:id/approve", async (req, res, next) => {
  try {
    const application = await get("SELECT * FROM pharmacy_applications WHERE id = ?", [req.params.id]);
    if (!application) return res.status(404).json({ message: "Demande introuvable" });
    if (application.status === "approved") return res.json({ ok: true, status: "approved" });

    await run(
      `INSERT INTO pharmacies (name, manager_name, phone, whatsapp, email, address, wilaya, area, zone_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'online')`,
      [
        application.pharmacy_name,
        application.manager_name,
        application.phone,
        application.whatsapp ?? null,
        application.email ?? null,
        application.phone,
        application.address,
        application.wilaya ?? null,
        application.service_area ?? null,
        application.service_area ?? null
      ]
    );
    await run("UPDATE pharmacy_applications SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: "approved" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/pharmacy-applications/:id/reject", async (req, res, next) => {
  try {
    await run("UPDATE pharmacy_applications SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: "rejected" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/patient-registrations/:id/approve", async (req, res, next) => {
  try {
    const registration = await get("SELECT * FROM patient_registrations WHERE id = ?", [req.params.id]);
    if (!registration) return res.status(404).json({ message: "Inscription patient introuvable" });
    if (registration.status === "approved") return res.json({ ok: true, status: "approved" });

    await run(
      `INSERT INTO patients (first_name, last_name, phone, email, address, wilaya, area, conditions, allergies, notes, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registration.first_name,
        registration.last_name,
        registration.phone,
        registration.email ?? null,
        registration.address ?? null,
        registration.wilaya ?? null,
        registration.area ?? null,
        registration.conditions ?? null,
        registration.allergies ?? null,
        registration.notes ?? null
        ,
        registration.password ?? registration.phone
      ]
    );
    await run("UPDATE patient_registrations SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: "approved" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/patient-registrations/:id/reject", async (req, res, next) => {
  try {
    await run("UPDATE patient_registrations SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: "rejected" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/driver-space/:id", async (req, res, next) => {
  try {
    const [driver, orders] = await Promise.all([
      get("SELECT id, first_name, last_name, zone_name, vehicle, rating, packages_count, revenue FROM drivers WHERE id = ?", [req.params.id]),
      all(
        `SELECT
          o.*,
          p.first_name || ' ' || p.last_name AS patient_name,
          ph.id AS pharmacy_ref_id,
          ph.name AS pharmacy_name,
          ph.manager_name AS pharmacy_manager_name,
          ph.phone AS pharmacy_phone,
          ph.whatsapp AS pharmacy_whatsapp,
          ph.email AS pharmacy_email,
          ph.address AS pharmacy_address,
          ph.postal_code AS pharmacy_postal_code,
          ph.wilaya AS pharmacy_wilaya,
          ph.area AS pharmacy_area,
          ph.zone_name AS pharmacy_zone_name,
          ph.opening_hours AS pharmacy_opening_hours,
          ph.status AS pharmacy_status
         FROM orders o
         LEFT JOIN patients p ON p.id = o.patient_id
         LEFT JOIN pharmacies ph ON ph.id = o.pharmacy_id
         WHERE o.driver_id = ?
         ORDER BY o.created_at DESC`,
        [req.params.id]
      )
    ]);
    res.json({ driver, orders });
  } catch (error) {
    next(error);
  }
});

app.post("/api/driver-space/:id/orders/:orderId/status", async (req, res, next) => {
  try {
    const status = req.body?.status ?? "dispatch";
    await run("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP, delivered_at = ? WHERE id = ? AND driver_id = ?", [
      status,
      status === "delivered" ? new Date().toISOString() : null,
      req.params.orderId,
      req.params.id
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/pharmacy-space/:id", async (req, res, next) => {
  try {
    const [pharmacy, orders] = await Promise.all([
      get("SELECT id, name, manager_name, zone_name, status FROM pharmacies WHERE id = ?", [req.params.id]),
      all(
        `SELECT o.*, p.first_name || ' ' || p.last_name AS patient_name, d.first_name || ' ' || d.last_name AS driver_name
         FROM orders o
         LEFT JOIN patients p ON p.id = o.patient_id
         LEFT JOIN drivers d ON d.id = o.driver_id
         WHERE o.pharmacy_id = ?
         ORDER BY o.created_at DESC`,
        [req.params.id]
      )
    ]);
    res.json({ pharmacy, orders });
  } catch (error) {
    next(error);
  }
});

app.post("/api/pharmacy-space/:id/orders/:orderId/accept", async (req, res, next) => {
  try {
    await run("UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND pharmacy_id = ?", [req.params.orderId, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/patient-space/:id", async (req, res, next) => {
  try {
    const [patient, orders] = await Promise.all([
      get("SELECT id, first_name, last_name, phone, email, wilaya, area, address, conditions FROM patients WHERE id = ?", [req.params.id]),
      all(
        `SELECT
          o.*,
          ph.id AS pharmacy_ref_id,
          ph.name AS pharmacy_name,
          ph.manager_name AS pharmacy_manager_name,
          ph.phone AS pharmacy_phone,
          ph.whatsapp AS pharmacy_whatsapp,
          ph.email AS pharmacy_email,
          ph.address AS pharmacy_address,
          ph.postal_code AS pharmacy_postal_code,
          ph.wilaya AS pharmacy_wilaya,
          ph.area AS pharmacy_area,
          ph.zone_name AS pharmacy_zone_name,
          ph.opening_hours AS pharmacy_opening_hours,
          ph.status AS pharmacy_status,
          d.first_name || ' ' || d.last_name AS driver_name
         FROM orders o
         LEFT JOIN pharmacies ph ON ph.id = o.pharmacy_id
         LEFT JOIN drivers d ON d.id = o.driver_id
         WHERE o.patient_id = ?
         ORDER BY o.created_at DESC`,
        [req.params.id]
      )
    ]);
    res.json({ patient, orders });
  } catch (error) {
    next(error);
  }
});

app.get("/api/settings/backup", async (_req, res, next) => {
  try {
    const payload = { exported_at: new Date().toISOString(), tables: {} };
    for (const tableName of backupTables) {
      payload.tables[tableName] = await all(`SELECT * FROM ${tableName} ORDER BY id ASC`);
    }
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/restore", async (req, res, next) => {
  try {
    const payload = req.body?.tables;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ message: "Sauvegarde invalide" });
    }

    await run("BEGIN TRANSACTION");
    try {
      for (const tableName of restoreDeleteOrder) {
        await run(`DELETE FROM ${tableName}`);
      }

      for (const tableName of backupTables) {
        const rows = Array.isArray(payload[tableName]) ? payload[tableName] : [];
        if (!rows.length) continue;

        for (const row of rows) {
          const columns = Object.keys(row);
          const placeholders = columns.map(() => "?").join(", ");
          await run(
            `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`,
            columns.map((column) => row[column] ?? null)
          );
        }
      }

      for (const tableName of [
        "users",
        "sponsors",
        "patients",
        "patient_registrations",
        "pharmacies",
        "pharmacy_applications",
        "drivers",
        "driver_applications",
        "catalog_items",
        "orders",
        "whatsapp_message_logs"
      ]) {
        await resetTableSequence(tableName);
      }

      await run("COMMIT");
    } catch (error) {
      await run("ROLLBACK");
      throw error;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Unexpected server error" });
});

let initPromise;

export async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await createTables();
      if (shouldSeedDemoData) {
        await seedDatabase();
      }
    })();
  }
  return initPromise;
}

async function start() {
  await ensureInitialized();
  app.listen(port, () => {
    console.log(`PandaMed API running on http://localhost:${port}`);
  });
}

export default app;

if (isDirectRun) {
  start().catch((error) => {
    console.error("Failed to start PandaMed app", error);
    process.exit(1);
  });
}
