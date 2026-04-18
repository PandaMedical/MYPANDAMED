import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "/api";

const categoryMap = {
  all: "Tous",
  otc: "Medicaments",
  para: "Parapharmacie"
};

const sponsorTypePriority = {
  platinum: 0,
  premium: 1,
  gold: 2,
  silver: 3,
  standard: 4,
  partenaire: 5
};

const adminSections = [
  ["overview", "Vue d'ensemble"],
  ["orders", "Commandes"],
  ["patients", "Patients"],
  ["pharmacies", "Pharmacies"],
  ["drivers", "Livreurs"],
  ["catalog", "Catalogue"],
  ["users", "Utilisateurs"],
  ["sponsors", "Sponsors"],
  ["settings", "Parametres"]
];

const sectionTitles = Object.fromEntries(adminSections);

const adminEntityConfig = {
  orders: {
    title: "Commande",
    endpoint: "/orders",
    empty: {
      patient_id: "",
      pharmacy_id: "",
      driver_id: "",
      products: "",
      amount: 0,
      status: "pending",
      channel: "whatsapp",
      source: "web",
      notes: ""
    }
  },
  patients: {
    title: "Patient",
    endpoint: "/patients",
    empty: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      date_of_birth: "",
      sex: "",
      address: "",
      postal_code: "",
      wilaya: "",
      area: "",
      conditions: "",
      allergies: "",
      notes: ""
    }
  },
  pharmacies: {
    title: "Pharmacie",
    endpoint: "/pharmacies",
    empty: {
      name: "",
      manager_name: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      postal_code: "",
      wilaya: "",
      area: "",
      zone_name: "",
      opening_hours: "",
      status: "online"
    }
  },
  drivers: {
    title: "Livreur",
    endpoint: "/drivers",
    empty: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      zone_name: "",
      vehicle: "moto",
      status: "actif",
      rating: 0,
      packages_count: 0,
      revenue: 0
    }
  },
  catalog: {
    title: "Produit",
    endpoint: "/catalog",
    empty: {
      name: "",
      category: "otc",
      form: "",
      unit: "",
      price: 0,
      reference: "",
      image: "",
      contraindications: "",
      is_active: 1
    }
  },
  users: {
    title: "Utilisateur",
    endpoint: "/users",
    empty: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      role: "operateur",
      status: "actif",
      password_hint: ""
    }
  },
  sponsors: {
    title: "Sponsor",
    endpoint: "/sponsors",
    empty: {
      name: "",
      slogan: "",
      logo: "",
      type: "premium",
      website: "",
      is_active: 1
    }
  }
};

const productVisuals = {
  DOL1G: { tone: "sun", accent: "red" },
  IBU400: { tone: "rose", accent: "crimson" },
  VENT: { tone: "sky", accent: "blue" },
  SERUM: { tone: "mint", accent: "teal" },
  GLUCO: { tone: "gold", accent: "amber" },
  FFP2: { tone: "violet", accent: "indigo" }
};

const emptyDriverApplication = {
  first_name: "",
  last_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  wilaya: "Annaba",
  delivery_zone: "",
  vehicle: "Moto",
  availability: [],
  motivation: ""
};

const emptyPharmacyApplication = {
  pharmacy_name: "",
  manager_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  wilaya: "Annaba",
  service_area: ""
};

const emptyLoginForm = {
  identifier: "",
  password: ""
};

const emptyRegisterForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address: "",
  password: "",
  confirmPassword: ""
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      },
      ...options
    });
  } catch (error) {
    throw new Error("Connexion au serveur impossible. Verifiez que le backend tourne bien.");
  }

  if (!response.ok) {
    let message = "Impossible de charger les donnees";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      try {
        const fallbackText = await response.text();
        if (fallbackText?.includes("NOT_FOUND")) {
          message = "Route API introuvable sur Vercel. Le deploiement des routes serveur est incomplet.";
        } else if (fallbackText?.includes("FUNCTION_PAYLOAD_TOO_LARGE") || fallbackText?.includes("413")) {
          message = "L image est trop volumineuse. Reduisez-la puis reessayez.";
        } else if (fallbackText?.trim()) {
          message = fallbackText.trim().slice(0, 180);
        }
      } catch {}
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image invalide."));
    image.src = dataUrl;
  });
}

async function optimizeImageFile(file, { maxWidth, maxHeight, type = "image/webp", quality = 0.82 }) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(originalDataUrl);
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");

  if (!context) return originalDataUrl;

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const optimizedDataUrl = canvas.toDataURL(type, quality);
  return optimizedDataUrl.length < originalDataUrl.length ? optimizedDataUrl : originalDataUrl;
}

function buildSponsorPayload(row) {
  return {
    name: row.name ?? "",
    slogan: row.slogan ?? "",
    logo: row.logo ?? "",
    type: row.type ?? "standard",
    website: row.website ?? "",
    is_active: row.is_active ? 1 : 0
  };
}

function getTherapeuticClass(item) {
  const name = item.name.toLowerCase();
  if (name.includes("doliprane") || name.includes("ibuprofene") || name.includes("aspirine")) return "Analgesique";
  if (name.includes("ventoline") || name.includes("serum")) return "Respiratoire";
  if (item.category === "para") return "Parapharmacie";
  return "Generale";
}

function ProductCard({ item, onAdd }) {
  const visual = productVisuals[item.reference] ?? { tone: "silver", accent: "slate" };
  const therapeuticClass = getTherapeuticClass(item);

  return (
    <article className="product-card">
      <div className="product-card-body">
        <div className="product-copy">
          <span className="product-chip">{therapeuticClass}</span>
          <h3>{item.name}</h3>
          <p>
            {item.form} - {item.unit}
          </p>
          <div className="product-footer">
            <strong>{Number(item.price).toLocaleString("fr-FR")} DA</strong>
          </div>
        </div>

        <div className={`product-media tone-${visual.tone}`}>
          {item.image ? (
            <img src={item.image} alt={item.name} className="product-image" />
          ) : (
            <div className={`product-pack accent-${visual.accent}`}>{item.name.slice(0, 2).toUpperCase()}</div>
          )}
          <button type="button" className="product-add-button" onClick={() => onAdd(item)} title="Ajouter au panier" aria-label={`Ajouter ${item.name} au panier`}>
            +
          </button>
        </div>
      </div>
    </article>
  );
}

function getSponsorLogoContent(logo, name) {
  const safeLogo = String(logo ?? "").trim();
  if (safeLogo.startsWith("http://") || safeLogo.startsWith("https://") || safeLogo.startsWith("data:image")) {
    return <img src={safeLogo} alt={name} className="sponsor-logo-image" />;
  }
  if (safeLogo) {
    return <span className="sponsor-logo-text">{safeLogo}</span>;
  }
  return <span className="sponsor-logo-text">{name.slice(0, 2).toUpperCase()}</span>;
}

function getSponsorWebsiteLabel(website) {
  const value = String(website ?? "").trim();
  if (!value) return "Site web";

  try {
    const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
    const hostname = new URL(normalized).hostname.replace(/^www\./i, "");
    return hostname || value;
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "") || "Site web";
  }
}

const orderStatusLabels = {
  pending: "En attente",
  confirmed: "Confirmee",
  dispatch: "En livraison",
  delivered: "Livree",
  cancelled: "Annulee"
};

function getOrderStatusLabel(status) {
  return orderStatusLabels[String(status ?? "").toLowerCase()] ?? String(status ?? "-");
}

const pharmacyStatusLabels = {
  online: "En ligne",
  busy: "Occupee",
  offline: "Hors ligne"
};

function getPharmacyStatusLabel(status) {
  return pharmacyStatusLabels[String(status ?? "").toLowerCase()] ?? String(status ?? "-");
}

const activeStatusLabels = {
  actif: "Actif",
  inactif: "Inactif",
  active: "Actif",
  inactive: "Inactif"
};

function getActiveStatusLabel(status) {
  return activeStatusLabels[String(status ?? "").toLowerCase()] ?? String(status ?? "-");
}

const reviewStatusLabels = {
  pending: "En attente",
  approved: "Validee",
  rejected: "Refusee"
};

function getReviewStatusLabel(status) {
  return reviewStatusLabels[String(status ?? "").toLowerCase()] ?? String(status ?? "-");
}

function getDisplayStatusLabel(status) {
  const value = String(status ?? "-");
  const orderLabel = getOrderStatusLabel(status);
  if (orderLabel !== value) return orderLabel;
  const pharmacyLabel = getPharmacyStatusLabel(status);
  if (pharmacyLabel !== value) return pharmacyLabel;
  const activeLabel = getActiveStatusLabel(status);
  if (activeLabel !== value) return activeLabel;
  return getReviewStatusLabel(status);
}

const roleLabels = {
  admin: "Administrateur",
  operateur: "Operateur",
  pharmacien: "Pharmacien",
  livreur: "Livreur",
  pharmacy: "Pharmacie",
  patient: "Patient",
  driver: "Livreur"
};

function getRoleLabel(role) {
  return roleLabels[String(role ?? "").toLowerCase()] ?? String(role ?? "-");
}

const channelLabels = {
  whatsapp: "WhatsApp",
  email: "Email",
  call: "Appel"
};

function getChannelLabel(channel) {
  return channelLabels[String(channel ?? "").toLowerCase()] ?? String(channel ?? "-");
}

const sourceLabels = {
  web: "Site web",
  wa: "WhatsApp",
  call: "Appel"
};

function getSourceLabel(source) {
  return sourceLabels[String(source ?? "").toLowerCase()] ?? String(source ?? "-");
}

function getCatalogCategoryLabel(category) {
  return {
    otc: "Medicaments sans ordonnance",
    para: "Parapharmacie"
  }[String(category ?? "").toLowerCase()] ?? String(category ?? "-");
}

function getStatusBadgeClass(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (["delivered", "livree", "approved", "actif", "online", "confirmed"].includes(normalized)) return "status-badge success";
  if (["dispatch", "en livraison", "occupied", "occupee", "en_route"].includes(normalized)) return "status-badge info";
  if (["pending", "en attente"].includes(normalized)) return "status-badge warning";
  if (["cancelled", "annulee", "rejected", "refusee", "offline"].includes(normalized)) return "status-badge danger";
  return "status-badge neutral";
}

function formatOrderDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatOrderDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getTimelineStepIndex(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (["pending", "en attente"].includes(normalized)) return 0;
  if (["confirmed", "confirmee"].includes(normalized)) return 1;
  if (["dispatch", "en livraison"].includes(normalized)) return 2;
  if (["delivered", "livree"].includes(normalized)) return 3;
  if (["cancelled", "annulee"].includes(normalized)) return -1;
  return 0;
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCatalogSpreadsheet(text) {
  const normalized = String(text ?? "").replace(/^\uFEFF/, "");
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Le fichier est vide ou ne contient pas de lignes de donnees.");
  }

  const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = parseDelimitedLine(lines[0], delimiter).map((item) => item.toLowerCase());
  const required = ["name", "category", "price"];

  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Colonne obligatoire manquante : ${field}`);
    }
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseDelimitedLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const price = Number(String(row.price ?? "0").replace(",", "."));

    if (!row.name?.trim()) throw new Error(`Ligne ${rowIndex + 2} : nom manquant`);
    if (!row.category?.trim()) throw new Error(`Ligne ${rowIndex + 2} : categorie manquante`);
    if (!Number.isFinite(price)) throw new Error(`Ligne ${rowIndex + 2} : prix invalide`);

    return {
      name: row.name.trim(),
      category: row.category.trim().toLowerCase() === "para" ? "para" : "otc",
      form: row.form?.trim() ?? "",
      unit: row.unit?.trim() ?? "",
      price,
      reference: row.reference?.trim() ?? "",
      image: row.image?.trim() ?? "",
      contraindications: row.contraindications?.trim() ?? "",
      is_active: String(row.is_active ?? "1").trim() === "0" ? 0 : 1
    };
  });
}

function AdminMetric({ label, value }) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminTable({ columns, rows, emptyText, renderRow }) {
  return (
    <div className="admin-table-shell">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map(renderRow)
          ) : (
            <tr>
              <td colSpan={columns.length} className="admin-empty">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdminCrudModal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close admin-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}

function RoleSpaceLayout({ title, subtitle, accentClass, onLogout, children }) {
  return (
    <div className={`role-space ${accentClass}`}>
      <header className="role-space-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="role-space-actions">
          <a href="/">↗</a>
          <button type="button" onClick={onLogout} title="Deconnexion" aria-label="Deconnexion">
            ⎋
          </button>
        </div>
      </header>
      <main className="role-space-body">{children}</main>
    </div>
  );
}

function PartnerVisualModal({ title, zone, data, onClose }) {
  const mapQuery = encodeURIComponent(`${data.address ?? ""}, ${data.wilaya ?? ""}, ${data.area ?? ""}`);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="partner-visual-modal" onClick={(event) => event.stopPropagation()}>
        <div className="partner-visual-head">
          <div>
            <h2>{title}</h2>
            <p>Zone: {zone ?? "-"}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="partner-visual-body">
          <section className="partner-info-block">
            <h3>Informations generales</h3>
            <div className="partner-info-grid">
              <span>Statut</span>
                <strong>{getDisplayStatusLabel(data.status)}</strong>
              <span>Horaires</span>
              <strong>{data.opening_hours ?? "-"}</strong>
            </div>
          </section>

          <section className="partner-info-block">
            <h3>Contact</h3>
            <div className="partner-info-grid">
              <span>Telephone</span>
              <strong>{data.phone ?? "-"}</strong>
              <span>WhatsApp</span>
              <strong>{data.whatsapp ?? "-"}</strong>
              <span>Email</span>
              <strong>{data.email ?? "-"}</strong>
            </div>
          </section>

          <section className="partner-info-block">
            <h3>Localisation</h3>
            <div className="partner-info-grid">
              <span>Adresse</span>
              <strong>{data.address ?? "-"}</strong>
              <span>Code Postal</span>
              <strong>{data.postal_code ?? "-"}</strong>
              <span>Wilaya</span>
              <strong>{data.wilaya ?? "-"}</strong>
              <span>Localite</span>
              <strong>{data.area ?? "-"}</strong>
            </div>
            <div className="partner-map-card">
              {data.address ? (
                <iframe
                  title={`Carte ${title}`}
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : null}
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">
                Ouvrir dans Google Maps
              </a>
            </div>
          </section>

          <section className="partner-info-block">
            <h3>Actions rapides</h3>
            <div className="partner-quick-actions">
              <a href={`https://wa.me/${String(data.whatsapp ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a href={`mailto:${data.email ?? ""}`}>Email</a>
              <a href={`tel:${data.phone ?? ""}`}>Appel</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function openWhatsappUrl(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function SimpleOrdersTable({ rows, actions }) {
  const timelineLabels = ["En attente", "Confirmee", "En livraison", "Livree"];
  const [sortKey, setSortKey] = useState("recent_desc");
  const sortedRows = useMemo(() => {
    const clonedRows = [...rows];
    return clonedRows.sort((left, right) => {
      if (sortKey === "recent_asc" || sortKey === "recent_desc") {
        const leftTime = new Date(left.created_at ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? 0).getTime();
        return sortKey === "recent_desc" ? rightTime - leftTime : leftTime - rightTime;
      }

      if (sortKey === "amount_desc" || sortKey === "amount_asc") {
        const leftAmount = Number(left.amount ?? 0);
        const rightAmount = Number(right.amount ?? 0);
        return sortKey === "amount_desc" ? rightAmount - leftAmount : leftAmount - rightAmount;
      }

      if (sortKey === "status_asc") {
        return getOrderStatusLabel(left.status).localeCompare(getOrderStatusLabel(right.status), "fr");
      }

      return 0;
    });
  }, [rows, sortKey]);

  return (
    <div className="admin-table-shell">
      <div className="orders-toolbar">
        <span>{rows.length} commande{rows.length > 1 ? "s" : ""}</span>
        <label className="orders-sort">
          <span>Trier</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            <option value="recent_desc">Plus recentes</option>
            <option value="recent_asc">Plus anciennes</option>
            <option value="amount_desc">Montant decroissant</option>
            <option value="amount_asc">Montant croissant</option>
            <option value="status_asc">Statut</option>
          </select>
        </label>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Commande</th>
            <th>Pharmacie</th>
            <th>Livreur</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Suivi</th>
            {actions ? <th>Actions</th> : null}
          </tr>
          </thead>
          <tbody>
            {sortedRows.length ? (
              sortedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="order-line-main">{row.products}</div>
                    <div className="order-line-sub">Le {formatOrderDateTime(row.created_at)}</div>
                  </td>
                  <td>{row.pharmacy_name ?? "-"}</td>
                  <td>{row.driver_name ?? "-"}</td>
                <td>{Number(row.amount).toLocaleString("fr-FR")} DA</td>
                <td>
                  <span className={getStatusBadgeClass(row.status)}>
                    {getOrderStatusLabel(row.status)}
                  </span>
                </td>
                <td>
                  {getTimelineStepIndex(row.status) >= 0 ? (
                    <div className="order-timeline">
                      {timelineLabels.map((label, index) => (
                        <div key={label} className={index <= getTimelineStepIndex(row.status) ? "timeline-step active" : "timeline-step"}>
                          <span className="timeline-dot" />
                          <small>{label}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="order-line-sub">Commande annulee</span>
                  )}
                </td>
                {actions ? <td>{actions(row)}</td> : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={actions ? 7 : 6} className="admin-empty">
                Aucune commande
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DriverSpaceApp({ currentUser, onLogout }) {
  const [data, setData] = useState({ driver: null, orders: [] });
  const [pageError, setPageError] = useState("");
  const [authError, setAuthError] = useState("");
  const [driverError, setDriverError] = useState("");
  const [pharmacyError, setPharmacyError] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  async function load() {
    try {
      setData(await request(`/driver-space/${currentUser.id}`));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, [currentUser.id]);

  async function updateStatus(orderId, status) {
    await request(`/driver-space/${currentUser.id}/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    const action = status === "dispatch" ? "en_route" : status === "delivered" ? "livree" : "";
    if (action) {
      try {
        await request(`/orders/${orderId}/whatsapp`, {
          method: "POST",
          body: JSON.stringify({ action })
        });
      } catch {}
    }
    await load();
  }

  return (
    <RoleSpaceLayout title="Espace Livreur" subtitle={`${currentUser.first_name} ${currentUser.last_name}`} accentClass="driver-space-shell" onLogout={onLogout}>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="role-metrics">
        <AdminMetric label="Commandes assignees" value={data.orders.length} />
        <AdminMetric label="Zone" value={data.driver?.zone_name ?? "-"} />
        <AdminMetric label="Vehicule" value={data.driver?.vehicle ?? "-"} />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Mes commandes</h2>
        </div>
        <SimpleOrdersTable
          rows={data.orders}
          actions={(row) => (
            <div className="admin-actions-inline">
              <button
                type="button"
                className="admin-table-button"
                onClick={() => setSelectedPharmacy(row)}
                title="Voir la pharmacie"
                aria-label="Voir la pharmacie"
              >
                🏥
              </button>
              <button type="button" className="admin-table-button" onClick={() => updateStatus(row.id, "dispatch")} title="En livraison" aria-label="Passer en livraison">
                ↗
              </button>
              <button type="button" className="admin-primary-button" onClick={() => updateStatus(row.id, "delivered")} title="Livree" aria-label="Marquer comme livree">
                ✓
              </button>
            </div>
          )}
        />
      </section>

      {selectedPharmacy ? (
        <PartnerVisualModal
          title={selectedPharmacy.pharmacy_name ?? "Pharmacie"}
          zone={selectedPharmacy.pharmacy_zone_name ?? selectedPharmacy.pharmacy_area}
          data={{
            status: selectedPharmacy.pharmacy_status,
            opening_hours: selectedPharmacy.pharmacy_opening_hours,
            phone: selectedPharmacy.pharmacy_phone,
            whatsapp: selectedPharmacy.pharmacy_whatsapp,
            email: selectedPharmacy.pharmacy_email,
            address: selectedPharmacy.pharmacy_address,
            postal_code: selectedPharmacy.pharmacy_postal_code,
            wilaya: selectedPharmacy.pharmacy_wilaya,
            area: selectedPharmacy.pharmacy_area
          }}
          onClose={() => setSelectedPharmacy(null)}
        />
      ) : null}
    </RoleSpaceLayout>
  );
}

function PharmacySpaceApp({ currentUser, onLogout }) {
  const [data, setData] = useState({ pharmacy: null, orders: [] });
  const [error, setError] = useState("");

  async function load() {
    try {
      setData(await request(`/pharmacy-space/${currentUser.id}`));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, [currentUser.id]);

  async function acceptOrder(orderId) {
    await request(`/pharmacy-space/${currentUser.id}/orders/${orderId}/accept`, { method: "POST" });
    try {
      await request(`/orders/${orderId}/whatsapp`, {
        method: "POST",
        body: JSON.stringify({ action: "confirmation" })
      });
    } catch {}
    await load();
  }

  return (
    <RoleSpaceLayout title="Espace Pharmacie" subtitle={currentUser.name ?? currentUser.manager_name ?? ""} accentClass="pharmacy-space-shell" onLogout={onLogout}>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="role-metrics">
        <AdminMetric label="Pharmacie" value={data.pharmacy?.name ?? "-"} />
        <AdminMetric label="Zone" value={data.pharmacy?.zone_name ?? "-"} />
        <AdminMetric label="Commandes" value={data.orders.length} />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Commandes pharmacie</h2>
        </div>
        <SimpleOrdersTable
          rows={data.orders}
          actions={(row) => (
            <button type="button" className="admin-primary-button" onClick={() => acceptOrder(row.id)} title="Accepter" aria-label="Accepter la commande">
              ✓
            </button>
          )}
        />
      </section>
    </RoleSpaceLayout>
  );
}

function PatientSpaceApp({ currentUser, onLogout }) {
  const [data, setData] = useState({ patient: null, orders: [] });
  const [error, setError] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  useEffect(() => {
    request(`/patient-space/${currentUser.id}`)
      .then(setData)
      .catch((loadError) => setPageError(loadError.message));
  }, [currentUser.id]);

  return (
    <RoleSpaceLayout title="Espace Patient" subtitle={`${currentUser.first_name} ${currentUser.last_name}`} accentClass="patient-space-shell" onLogout={onLogout}>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="role-metrics">
        <AdminMetric label="Patient" value={`${data.patient?.first_name ?? ""} ${data.patient?.last_name ?? ""}`.trim() || "-"} />
        <AdminMetric label="Wilaya" value={data.patient?.wilaya ?? "-"} />
        <AdminMetric label="Historique" value={data.orders.length} />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Mes commandes et livraisons</h2>
        </div>
        <SimpleOrdersTable
          rows={data.orders}
          actions={(row) => (
            <button type="button" className="admin-table-button" onClick={() => setSelectedPharmacy(row)} title="Voir la pharmacie" aria-label="Voir la pharmacie">
              🏥
            </button>
          )}
        />
      </section>

      {selectedPharmacy ? (
        <PartnerVisualModal
          title={selectedPharmacy.pharmacy_name ?? "Pharmacie"}
          zone={selectedPharmacy.pharmacy_zone_name ?? selectedPharmacy.pharmacy_area}
          data={{
            status: selectedPharmacy.pharmacy_status,
            opening_hours: selectedPharmacy.pharmacy_opening_hours,
            phone: selectedPharmacy.pharmacy_phone,
            whatsapp: selectedPharmacy.pharmacy_whatsapp,
            email: selectedPharmacy.pharmacy_email,
            address: selectedPharmacy.pharmacy_address,
            postal_code: selectedPharmacy.pharmacy_postal_code,
            wilaya: selectedPharmacy.pharmacy_wilaya,
            area: selectedPharmacy.pharmacy_area
          }}
          onClose={() => setSelectedPharmacy(null)}
        />
      ) : null}
    </RoleSpaceLayout>
  );
}

function StorefrontApp({ currentUser, onLogin, onLogout }) {
  const [catalog, setCatalog] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [therapeuticClass, setTherapeuticClass] = useState("all");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutPharmacies, setCheckoutPharmacies] = useState([]);
  const [checkoutForm, setCheckoutForm] = useState({
    pharmacy_id: "",
    address: "",
    notes: "",
    channel: "whatsapp"
  });
  const [pageError, setPageError] = useState("");
  const [authError, setAuthError] = useState("");
  const [driverError, setDriverError] = useState("");
  const [pharmacyError, setPharmacyError] = useState("");
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState(emptyDriverApplication);
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [driverSuccess, setDriverSuccess] = useState("");
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [pharmacyForm, setPharmacyForm] = useState(emptyPharmacyApplication);
  const [pharmacySubmitting, setPharmacySubmitting] = useState(false);
  const [pharmacySuccess, setPharmacySuccess] = useState("");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [authTab, setAuthTab] = useState("login");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState("");
  const [authFeedbackType, setAuthFeedbackType] = useState("info");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [sponsorIndex, setSponsorIndex] = useState(0);

  useEffect(() => {
    Promise.all([request("/catalog"), request("/sponsors")])
      .then(([catalogData, sponsorData]) => {
        setCatalog(catalogData.filter((item) => item.is_active));
        setSponsors(sponsorData.filter((item) => item.is_active));
      })
      .catch((loadError) => setPageError(loadError.message));
  }, []);

  const classOptions = useMemo(() => {
    const classes = Array.from(new Set(catalog.map(getTherapeuticClass))).sort();
    return ["all", ...classes];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const haystack = `${item.name} ${item.reference} ${item.form}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesCategory = category === "all" || item.category === category;
      const matchesClass = therapeuticClass === "all" || getTherapeuticClass(item) === therapeuticClass;
      return matchesSearch && matchesCategory && matchesClass;
    });
  }, [catalog, search, category, therapeuticClass]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartItems = useMemo(
    () =>
      cart
        .map((entry) => {
          const product = catalog.find((item) => item.id === entry.id);
          return product ? { ...product, quantity: entry.quantity } : null;
        })
        .filter(Boolean),
    [cart, catalog]
  );
  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const orderedSponsors = useMemo(() => {
    const activeSponsors = sponsors.filter((item) => item.is_active);
    return [...activeSponsors].sort((a, b) => {
      const aPriority = sponsorTypePriority[String(a.type ?? "").toLowerCase()] ?? 99;
      const bPriority = sponsorTypePriority[String(b.type ?? "").toLowerCase()] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
  }, [sponsors]);

  const activeSponsor = orderedSponsors[sponsorIndex] ?? {
    name: "ASMIDAL",
    slogan: "We invest now, we build the future",
    type: "Platinum",
    logo: ""
  };

  useEffect(() => {
    if (orderedSponsors.length <= 1) return;
    const timer = window.setInterval(() => {
      setSponsorIndex((current) => (current + 1) % orderedSponsors.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [orderedSponsors]);

  useEffect(() => {
    if (!orderedSponsors.length) {
      setSponsorIndex(0);
      return;
    }
    setSponsorIndex((current) => current % orderedSponsors.length);
  }, [orderedSponsors]);

  function addToCart(item) {
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) => (entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      }
      return [...current, { id: item.id, quantity: 1 }];
    });
  }

  function updateCartQuantity(itemId, delta) {
    setCart((current) =>
      current
        .map((entry) => (entry.id === itemId ? { ...entry, quantity: Math.max(0, entry.quantity + delta) } : entry))
        .filter((entry) => entry.quantity > 0)
    );
  }

  function clearCart() {
    setCart([]);
  }

  async function openCheckoutModal() {
    if (!cartItems.length) {
      setPageError("Votre panier est vide.");
      return;
    }

    if (!currentUser) {
      setCartOpen(false);
      setAuthTab("login");
      setAuthError("");
      setAuthFeedback("Connectez-vous ou inscrivez-vous comme patient pour finaliser la commande.");
      setAuthFeedbackType("info");
      openLoginModal();
      return;
    }

    if (currentUser.role !== "patient") {
      setPageError("Seul un compte patient peut passer une commande depuis le panier.");
      return;
    }

    try {
      setPageError("");
      const pharmacies = await request("/pharmacies");
      const activePharmacies = pharmacies.filter((item) => String(item.status ?? "").toLowerCase() !== "offline");
      setCheckoutPharmacies(activePharmacies);
      setCheckoutForm((current) => ({
        ...current,
        pharmacy_id: current.pharmacy_id || String(activePharmacies[0]?.id ?? ""),
        address: current.address || "",
        notes: current.notes || "",
        channel: current.channel || "whatsapp"
      }));
      setCartOpen(false);
      setCheckoutModalOpen(true);
    } catch (error) {
      setPageError(error.message);
    }
  }

  async function submitCartOrder() {
    if (!cartItems.length) {
      setPageError("Votre panier est vide.");
      return;
    }

    setCheckoutSubmitting(true);
    setPageError("");

    try {
      const patientSpace = await request(`/patient-space/${currentUser.id}`);
      const resolvedPatientId = patientSpace?.patient?.id ?? currentUser.id;

      if (!checkoutForm.pharmacy_id) {
        throw new Error("Choisissez une pharmacie pour finaliser la commande.");
      }
      if (!checkoutForm.address.trim()) {
        throw new Error("Renseignez l adresse de livraison.");
      }

      const products = cartItems
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ");

      await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          patient_id: resolvedPatientId,
          pharmacy_id: Number(checkoutForm.pharmacy_id),
          products,
          amount: cartTotal,
          status: "pending",
          channel: checkoutForm.channel,
          source: "web",
          notes: [checkoutForm.address.trim(), checkoutForm.notes.trim()].filter(Boolean).join(" | ")
        })
      });

      setCart([]);
      setCartOpen(false);
      setCheckoutModalOpen(false);
      setCheckoutForm({
        pharmacy_id: "",
        address: "",
        notes: "",
        channel: "whatsapp"
      });
      setAuthFeedbackType("success");
      setAuthFeedback("Votre commande a bien ete enregistree.");

      if (typeof window !== "undefined") {
        window.history.pushState({}, "", "/patient");
      }
      onLogin({ ...currentUser, redirectPath: "/patient" });
    } catch (checkoutError) {
      setPageError(checkoutError.message);
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  function updateCheckoutField(name, value) {
    setCheckoutForm((current) => ({ ...current, [name]: value }));
  }

  function updateDriverField(name, value) {
    setDriverForm((current) => ({ ...current, [name]: value }));
  }

  function toggleAvailability(value) {
    setDriverForm((current) => ({
      ...current,
      availability: current.availability.includes(value)
        ? current.availability.filter((item) => item !== value)
        : [...current.availability, value]
    }));
  }

  async function submitDriverApplication(event) {
    event.preventDefault();
    setDriverSubmitting(true);
    setDriverError("");
    setDriverSuccess("");
    try {
      await request("/driver-applications", {
        method: "POST",
        body: JSON.stringify(driverForm)
      });
      setDriverSuccess("Votre candidature a bien ete envoyee.");
      setDriverForm(emptyDriverApplication);
      setTimeout(() => {
        setDriverModalOpen(false);
        setDriverSuccess("");
      }, 1200);
    } catch (submitError) {
      setDriverError(submitError.message);
    } finally {
      setDriverSubmitting(false);
    }
  }

  function updatePharmacyField(name, value) {
    setPharmacyForm((current) => ({ ...current, [name]: value }));
  }

  async function submitPharmacyApplication(event) {
    event.preventDefault();
    setPharmacySubmitting(true);
    setPharmacyError("");
    setPharmacySuccess("");
    try {
      await request("/pharmacy-applications", {
        method: "POST",
        body: JSON.stringify(pharmacyForm)
      });
      setPharmacySuccess("Votre demande partenaire a bien ete envoyee.");
      setPharmacyForm(emptyPharmacyApplication);
      setTimeout(() => {
        setPharmacyModalOpen(false);
        setPharmacySuccess("");
      }, 1200);
    } catch (submitError) {
      setPharmacyError(submitError.message);
    } finally {
      setPharmacySubmitting(false);
    }
  }

  function submitLogin(event) {
    event.preventDefault();
    setLoginSubmitting(true);
    setAuthError("");
    setAuthFeedback("");
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(loginForm)
    })
      .then(({ user }) => {
        onLogin(user);
        setLoginModalOpen(false);
        window.history.pushState({}, "", user.redirectPath);
        window.dispatchEvent(new Event("popstate"));
      })
      .catch((loginError) => setAuthError(loginError.message))
      .finally(() => setLoginSubmitting(false));
  }

  function updateRegisterField(name, value) {
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  function openLoginModal() {
    setAuthError("");
    setAuthFeedback("");
    setAuthTab("login");
    setLoginModalOpen(true);
  }

  function closeLoginModal() {
    setLoginModalOpen(false);
    setAuthError("");
    setAuthFeedback("");
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmPassword(false);
  }

  function switchAuthTab(nextTab) {
    setAuthTab(nextTab);
    setAuthError("");
    setAuthFeedback("");
  }

  async function submitRegister(event) {
    event.preventDefault();
    setAuthError("");
    setAuthFeedback("");
    if (registerForm.password.length < 6) {
      setAuthError("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError("Les mots de passe ne correspondent pas");
      return;
    }

    setRegisterSubmitting(true);
    try {
      const result = await request("/auth/register-patient", {
        method: "POST",
        body: JSON.stringify(registerForm)
      });
      setRegisterForm(emptyRegisterForm);
      setShowRegisterPassword(false);
      setShowRegisterConfirmPassword(false);
      setAuthFeedbackType("success");
      setAuthFeedback(result.message);
      onLogin(result.user);
      setLoginModalOpen(false);
      window.history.pushState({}, "", result.user?.redirectPath ?? "/patient");
      window.dispatchEvent(new Event("popstate"));
    } catch (registerError) {
      setAuthError(registerError.message);
    } finally {
      setRegisterSubmitting(false);
    }
  }

  return (
    <div className="storefront">
      <header className="store-header">
        <div className="brand-panel">
          <img src="/logopandamed.png" alt="MyPandaMed" />
        </div>

        <div className="sponsor-panel">
          <div className="sponsor-logo">{getSponsorLogoContent(activeSponsor.logo, activeSponsor.name)}</div>
            <div className="sponsor-copy">
              <strong>{activeSponsor.name}</strong>
              <span>{activeSponsor.slogan}</span>
            </div>
            <div className="sponsor-meta">
              <div className="sponsor-tag">{getSponsorWebsiteLabel(activeSponsor.website)}</div>
              {orderedSponsors.length > 1 ? (
                <div className="sponsor-dots" aria-label="Carrousel sponsors">
                  {orderedSponsors.map((item, index) => (
                  <button
                    key={`${item.id ?? item.name}-${index}`}
                    type="button"
                    className={index === sponsorIndex ? "sponsor-dot active" : "sponsor-dot"}
                    onClick={() => setSponsorIndex(index)}
                    title={item.name}
                    aria-label={item.name}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="header-actions">
          <button type="button" className="header-button driver" onClick={() => setDriverModalOpen(true)} title="Devenir Livreur" aria-label="Devenir Livreur">
            Devenir Livreur
          </button>
          <button type="button" className="header-button pharmacy" onClick={() => setPharmacyModalOpen(true)} title="Pharmacie - Cliquer ici" aria-label="Pharmacie - Cliquer ici">
            Pharmacie - Cliquer ici
          </button>
          <button
            type="button"
            className="header-button login"
            onClick={() => {
              if (currentUser?.redirectPath) {
                window.history.pushState({}, "", currentUser.redirectPath);
                onLogin(currentUser);
                return;
              }
              openLoginModal();
            }}
            title="Se connecter"
            aria-label="Se connecter"
          >
            {currentUser ? "Mon compte" : "Se connecter"}
          </button>
          {currentUser ? (
            <button type="button" className="header-button login" onClick={onLogout} title="Deconnexion" aria-label="Deconnexion">
              Deconnexion
            </button>
          ) : null}
          <button type="button" className="cart-button" title="Chariot des commandes" aria-label="Chariot des commandes" onClick={() => setCartOpen(true)}>
            <span>Panier</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      <div className="store-body">
        <section className="store-hero">
          <h1>MY PANDAMED</h1>
          <p className="store-hero-subtitle">Votre pharmacie chez vous de jour comme de nuit 7/7</p>
        </section>

        <section className="filters-panel">
          <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." />

          <div className="filter-group filter-group-categories">
            <h2>Categorie</h2>
            <div className="filter-pills-row">
              {Object.entries(categoryMap).map(([key, label]) => (
                <button key={key} type="button" className={category === key ? "filter-pill active" : "filter-pill"} onClick={() => setCategory(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group filter-group-therapeutic">
            <h2>Classe therapeutique</h2>
            <select value={therapeuticClass} onChange={(event) => setTherapeuticClass(event.target.value)}>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Toutes les classes" : option}
                </option>
              ))}
            </select>
          </div>
        </section>

        <main className="catalog-shell">
          {pageError ? <div className="error-banner">{pageError}</div> : null}
          <div className="catalog-grid">
            {filteredCatalog.map((item) => (
              <ProductCard key={item.id} item={item} onAdd={addToCart} />
            ))}
          </div>
        </main>
      </div>

      <footer className="store-footer">
        <span>© 2025 PandaMed - Annaba - Algerie</span>
        <span>Vos medicaments livres 24/24 partout en Algerie</span>
      </footer>

      {cartOpen ? (
        <div className="modal-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-modal" onClick={(event) => event.stopPropagation()}>
            <div className="cart-modal-head">
              <h2>Mon panier</h2>
              <button type="button" className="modal-close" onClick={() => setCartOpen(false)}>
                Ã—
              </button>
            </div>

            <div className="cart-modal-body">
              {cartItems.length ? (
                <>
                  <div className="cart-items-list">
                    {cartItems.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-copy">
                          <strong>{item.name}</strong>
                          <span>
                            {item.quantity} x {Number(item.price).toLocaleString("fr-FR")} DA
                          </span>
                        </div>
                        <div className="cart-item-actions">
                          <button type="button" onClick={() => updateCartQuantity(item.id, -1)} aria-label={`Retirer un ${item.name}`}>
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateCartQuantity(item.id, 1)} aria-label={`Ajouter un ${item.name}`}>
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cart-summary">
                    <strong>Total</strong>
                    <span>{cartTotal.toLocaleString("fr-FR")} DA</span>
                  </div>

                  <div className="cart-footer-actions">
                    <button type="button" className="secondary-action" onClick={clearCart}>
                      Vider
                    </button>
                    <button type="button" className="primary-action login-action" onClick={openCheckoutModal} disabled={checkoutSubmitting}>
                      Commander
                    </button>
                  </div>
                </>
              ) : (
                <div className="cart-empty-state">
                  <strong>Votre panier est vide</strong>
                  <span>Ajoutez des produits pour preparer une commande.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {checkoutModalOpen ? (
        <div className="modal-overlay" onClick={() => setCheckoutModalOpen(false)}>
          <div className="cart-modal checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="cart-modal-head">
              <h2>Valider la commande</h2>
              <button type="button" className="modal-close" onClick={() => setCheckoutModalOpen(false)}>
                Ã—
              </button>
            </div>

            <div className="cart-modal-body checkout-body">
              <label className="checkout-field">
                <span>Choix pharmacie</span>
                <select value={checkoutForm.pharmacy_id} onChange={(event) => updateCheckoutField("pharmacy_id", event.target.value)}>
                  <option value="">Selectionner</option>
                  {checkoutPharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name} - {pharmacy.zone_name || pharmacy.area || pharmacy.wilaya || "Annaba"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="checkout-field">
                <span>Adresse de livraison</span>
                <textarea
                  value={checkoutForm.address}
                  onChange={(event) => updateCheckoutField("address", event.target.value)}
                  placeholder="Saisissez l adresse exacte de livraison"
                />
              </label>

              <label className="checkout-field">
                <span>Notes patient</span>
                <textarea
                  value={checkoutForm.notes}
                  onChange={(event) => updateCheckoutField("notes", event.target.value)}
                  placeholder="Informations utiles pour la pharmacie ou le livreur"
                />
              </label>

              <label className="checkout-field">
                <span>Mode de contact</span>
                <select value={checkoutForm.channel} onChange={(event) => updateCheckoutField("channel", event.target.value)}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="call">Appel</option>
                  <option value="email">Email</option>
                </select>
              </label>

              <div className="cart-summary">
                <strong>Total</strong>
                <span>{cartTotal.toLocaleString("fr-FR")} DA</span>
              </div>

              <div className="cart-footer-actions">
                <button type="button" className="secondary-action" onClick={() => setCheckoutModalOpen(false)}>
                  Annuler
                </button>
                <button type="button" className="primary-action login-action" onClick={submitCartOrder} disabled={checkoutSubmitting}>
                  {checkoutSubmitting ? "Envoi..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {driverModalOpen ? (
        <div className="modal-overlay" onClick={() => setDriverModalOpen(false)}>
          <div className="driver-modal" onClick={(event) => event.stopPropagation()}>
            <div className="driver-modal-head">
              <h2>Devenir Livreur</h2>
              <button type="button" className="modal-close" onClick={() => setDriverModalOpen(false)}>
                ×
              </button>
            </div>

            <form className="driver-form" onSubmit={submitDriverApplication}>
              <div className="driver-callout">
                <strong>Rejoignez l'equipe PandaMed !</strong>
                <span>Livrez des medicaments a domicile a Annaba. Horaires flexibles, paiement rapide, equipe sympa.</span>
              </div>

              <div className="driver-grid-form">
                <label>
                  <span>Prenom *</span>
                  <input value={driverForm.first_name} onChange={(event) => updateDriverField("first_name", event.target.value)} placeholder="Votre prenom" required />
                </label>
                <label>
                  <span>Nom *</span>
                  <input value={driverForm.last_name} onChange={(event) => updateDriverField("last_name", event.target.value)} placeholder="Votre nom" required />
                </label>
                <label>
                  <span>Telephone *</span>
                  <input value={driverForm.phone} onChange={(event) => updateDriverField("phone", event.target.value)} placeholder="0555 xx xx xx" required />
                </label>
                <label>
                  <span>Whatsapp</span>
                  <input value={driverForm.whatsapp} onChange={(event) => updateDriverField("whatsapp", event.target.value)} placeholder="Si different du tel." />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={driverForm.email} onChange={(event) => updateDriverField("email", event.target.value)} placeholder="votre@email.com" />
                </label>
                <label>
                  <span>Wilaya</span>
                  <select value={driverForm.wilaya} onChange={(event) => updateDriverField("wilaya", event.target.value)}>
                    <option value="Annaba">Annaba</option>
                    <option value="El Tarf">El Tarf</option>
                    <option value="Skikda">Skikda</option>
                  </select>
                </label>
                <label>
                  <span>Zone de livraison souhaitee</span>
                  <input value={driverForm.delivery_zone} onChange={(event) => updateDriverField("delivery_zone", event.target.value)} placeholder="Ex: Centre, El Bouni..." />
                </label>
                <label>
                  <span>Vehicule *</span>
                  <select value={driverForm.vehicle} onChange={(event) => updateDriverField("vehicle", event.target.value)} required>
                    <option value="Moto">Moto</option>
                    <option value="Voiture">Voiture</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Velo">Velo</option>
                  </select>
                </label>
              </div>

              <div className="driver-availability">
                <span>Disponibilites</span>
                {["Matin", "Apres-midi", "Soir", "Weekend"].map((slot) => (
                  <label key={slot}>
                    <input type="checkbox" checked={driverForm.availability.includes(slot)} onChange={() => toggleAvailability(slot)} />
                    {slot}
                  </label>
                ))}
              </div>

              <label className="driver-message">
                <span>Message / Motivation (optionnel)</span>
                <textarea value={driverForm.motivation} onChange={(event) => updateDriverField("motivation", event.target.value)} placeholder="Dites-nous pourquoi vous souhaitez rejoindre PandaMed..." />
              </label>

              {driverSuccess ? <div className="success-banner">{driverSuccess}</div> : null}
              {driverError ? <div className="auth-feedback error">{driverError}</div> : null}

              <div className="driver-actions">
                <button type="button" className="secondary-action" onClick={() => setDriverModalOpen(false)} title="Annuler" aria-label="Annuler">
                  ✕
                </button>
                <button type="submit" className="primary-action" disabled={driverSubmitting} title="Envoyer ma candidature" aria-label="Envoyer ma candidature">
                  {driverSubmitting ? "…" : "📨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pharmacyModalOpen ? (
        <div className="modal-overlay" onClick={() => setPharmacyModalOpen(false)}>
          <div className="driver-modal pharmacy-modal" onClick={(event) => event.stopPropagation()}>
            <div className="driver-modal-head pharmacy-modal-head">
              <h2>Devenir Partenaire</h2>
              <button type="button" className="modal-close" onClick={() => setPharmacyModalOpen(false)}>
                ×
              </button>
            </div>

            <form className="driver-form" onSubmit={submitPharmacyApplication}>
              <div className="driver-callout pharmacy-callout">
                <strong>Rejoignez notre reseau de pharmacies !</strong>
                <span>Augmentez votre clientele grace a notre service de livraison a domicile. Inscription rapide, sans engagement.</span>
              </div>

              <div className="driver-grid-form">
                <label className="full-span">
                  <span>Nom de la pharmacie *</span>
                  <input value={pharmacyForm.pharmacy_name} onChange={(event) => updatePharmacyField("pharmacy_name", event.target.value)} placeholder="Pharmacie El Amel..." required />
                </label>
                <label>
                  <span>Responsable (pharmacien) *</span>
                  <input value={pharmacyForm.manager_name} onChange={(event) => updatePharmacyField("manager_name", event.target.value)} placeholder="Dr. Mohamed Benali" required />
                </label>
                <label>
                  <span>Telephone *</span>
                  <input value={pharmacyForm.phone} onChange={(event) => updatePharmacyField("phone", event.target.value)} placeholder="038 xx xx xx" required />
                </label>
                <label>
                  <span>Whatsapp</span>
                  <input value={pharmacyForm.whatsapp} onChange={(event) => updatePharmacyField("whatsapp", event.target.value)} placeholder="0550 xx xx xx" />
                </label>
                <label className="full-span">
                  <span>Email</span>
                  <input type="email" value={pharmacyForm.email} onChange={(event) => updatePharmacyField("email", event.target.value)} placeholder="pharmacie@email.dz" />
                </label>
                <label className="full-span">
                  <span>Adresse *</span>
                  <input value={pharmacyForm.address} onChange={(event) => updatePharmacyField("address", event.target.value)} placeholder="Rue, numero..." required />
                </label>
                <label>
                  <span>Wilaya</span>
                  <select value={pharmacyForm.wilaya} onChange={(event) => updatePharmacyField("wilaya", event.target.value)}>
                    <option value="Annaba">Annaba</option>
                    <option value="El Tarf">El Tarf</option>
                    <option value="Skikda">Skikda</option>
                  </select>
                </label>
                <label>
                  <span>Zone desservie</span>
                  <input value={pharmacyForm.service_area} onChange={(event) => updatePharmacyField("service_area", event.target.value)} placeholder="Annaba Centre, El Bouni..." />
                </label>
              </div>

              {pharmacySuccess ? <div className="success-banner">{pharmacySuccess}</div> : null}
              {pharmacyError ? <div className="auth-feedback error">{pharmacyError}</div> : null}

              <div className="driver-actions">
                <button type="button" className="secondary-action" onClick={() => setPharmacyModalOpen(false)} title="Annuler" aria-label="Annuler">
                  ✕
                </button>
                <button type="submit" className="primary-action pharmacy-action" disabled={pharmacySubmitting} title="Envoyer ma demande" aria-label="Envoyer ma demande">
                  {pharmacySubmitting ? "…" : "📨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {loginModalOpen ? (
        <div className="modal-overlay" onClick={closeLoginModal}>
          <div className="login-modal" onClick={(event) => event.stopPropagation()}>
            <div className="login-head">
              <h2>24/7 Medicine Delivery - Annaba</h2>
              <button type="button" className="modal-close login-close" onClick={closeLoginModal}>
                ×
              </button>
            </div>
            <div className="auth-tabs">
              <button type="button" className={authTab === "login" ? "auth-tab active" : "auth-tab"} onClick={() => switchAuthTab("login")}>
                Connexion
              </button>
              <button type="button" className={authTab === "register" ? "auth-tab active register" : "auth-tab register"} onClick={() => switchAuthTab("register")}>
                S'inscrire
              </button>
            </div>

            {authTab === "login" ? (
              <form className="login-form" onSubmit={submitLogin}>
                <label>
                  <span>Numero de telephone ou email</span>
                  <input value={loginForm.identifier} onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))} placeholder="0555 123 456" />
                </label>
                <label>
                  <span>Mot de passe</span>
                  <div className="password-input-wrap">
                    <input type={showLoginPassword ? "text" : "password"} value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} placeholder="••••••••" />
                    <button type="button" className="password-toggle" onClick={() => setShowLoginPassword((current) => !current)} title={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {showLoginPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>
                <button type="submit" className="primary-action login-action wide-action" disabled={loginSubmitting}>
                  {loginSubmitting ? "..." : "Se connecter"}
                </button>
              </form>
            ) : (
              <form className="login-form register-form" onSubmit={submitRegister}>
                <div className="driver-grid-form">
                  <label>
                    <span>Prenom</span>
                    <input value={registerForm.first_name} onChange={(event) => updateRegisterField("first_name", event.target.value)} placeholder="Amira" />
                  </label>
                  <label>
                    <span>Nom</span>
                    <input value={registerForm.last_name} onChange={(event) => updateRegisterField("last_name", event.target.value)} placeholder="Merakchi" />
                  </label>
                </div>
                <label>
                  <span>Telephone</span>
                  <input value={registerForm.phone} onChange={(event) => updateRegisterField("phone", event.target.value)} placeholder="0555 123 456" />
                </label>
                <label>
                  <span>Email</span>
                  <input value={registerForm.email} onChange={(event) => updateRegisterField("email", event.target.value)} placeholder="votre@email.dz" />
                </label>
                <label>
                  <span>Adresse</span>
                  <input value={registerForm.address} onChange={(event) => updateRegisterField("address", event.target.value)} placeholder="12 Rue Didouche Mourad, Annaba" />
                </label>
                <label>
                  <span>Mot de passe</span>
                  <div className="password-input-wrap">
                    <input type={showRegisterPassword ? "text" : "password"} value={registerForm.password} onChange={(event) => updateRegisterField("password", event.target.value)} placeholder="Minimum 6 caracteres" />
                    <button type="button" className="password-toggle" onClick={() => setShowRegisterPassword((current) => !current)} title={showRegisterPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-label={showRegisterPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {showRegisterPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>
                <label>
                  <span>Confirmer le mot de passe</span>
                  <div className="password-input-wrap">
                    <input type={showRegisterConfirmPassword ? "text" : "password"} value={registerForm.confirmPassword} onChange={(event) => updateRegisterField("confirmPassword", event.target.value)} placeholder="Repeter le mot de passe" />
                    <button type="button" className="password-toggle" onClick={() => setShowRegisterConfirmPassword((current) => !current)} title={showRegisterConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-label={showRegisterConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {showRegisterConfirmPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>
                <button type="submit" className="primary-action pharmacy-action wide-action" disabled={registerSubmitting}>
                  {registerSubmitting ? "..." : "Creer mon compte"}
                </button>
              </form>
            )}

            {authError ? <div className="auth-feedback error">{authError}</div> : null}
            {!authError && authFeedback ? <div className={`auth-feedback ${authFeedbackType}`}>{authFeedback}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminApp({ onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [entities, setEntities] = useState({
    orders: [],
    patients: [],
    pharmacies: [],
    drivers: [],
    catalog: [],
    users: [],
    sponsors: []
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [adminModal, setAdminModal] = useState(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [settingsData, setSettingsData] = useState({
    driverApplications: [],
    pharmacyApplications: [],
    patientRegistrations: [],
    whatsappSettings: null,
    whatsappLogs: []
  });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [catalogImportBusy, setCatalogImportBusy] = useState(false);
  const [restorePayload, setRestorePayload] = useState("");
  const [adminOrderSort, setAdminOrderSort] = useState("recent_desc");
  const [whatsappDraft, setWhatsappDraft] = useState({
    sender_phone: "",
    api_token: "",
    phone_number_id: "",
    api_version: "v23.0",
    confirmation_template: "",
    en_route_template: "",
    livree_template: "",
    pharmacie_template: "",
    mission_livreur_template: ""
  });
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const catalogImportInputRef = useRef(null);
  const [selectedAdminPharmacy, setSelectedAdminPharmacy] = useState(null);
  const [selectedAdminLocation, setSelectedAdminLocation] = useState(null);

  const sectionRequestMap = {
    orders: "/orders",
    patients: "/patients",
    pharmacies: "/pharmacies",
    drivers: "/drivers",
    catalog: "/catalog",
    users: "/users",
    sponsors: "/sponsors"
  };

  function mergeEntityRow(entityName, row) {
    setEntities((current) => ({
      ...current,
      [entityName]: current[entityName].map((item) => (item.id === row.id ? { ...item, ...row } : item))
    }));
  }

  function appendEntityRow(entityName, row) {
    setEntities((current) => ({
      ...current,
      [entityName]: [row, ...current[entityName]]
    }));
  }

  function removeEntityRow(entityName, rowId) {
    setEntities((current) => ({
      ...current,
      [entityName]: current[entityName].filter((item) => item.id !== rowId)
    }));
  }

  async function loadDashboardData() {
    const dashboardData = await request("/dashboard");
    setDashboard(dashboardData);
  }

  async function loadAdminSection(section) {
    if (section === "overview") {
      await loadDashboardData();
      return;
    }

    if (section === "settings") {
      const settingsOverview = await request("/settings/overview");
      setSettingsData(settingsOverview);
      if (settingsOverview?.whatsappSettings) {
        setWhatsappDraft(settingsOverview.whatsappSettings);
      }
      return;
    }

    const endpoint = sectionRequestMap[section];
    if (!endpoint) return;

    const rows = await request(endpoint);
    setEntities((current) => ({
      ...current,
      [section]: rows
    }));
  }

  async function refreshAdminView(section = activeSection) {
    setError("");
    try {
      await loadDashboardData();
      await loadAdminSection(section);
    } catch (loadError) {
      const label = section === "overview" ? "dashboard" : section;
      setError(`Chargement admin impossible: ${label}`);
    }
  }

  useEffect(() => {
    refreshAdminView("overview");
  }, []);

  useEffect(() => {
    if (activeSection === "overview") return;
    refreshAdminView(activeSection);
  }, [activeSection]);

  const filteredRows = useMemo(() => {
    const rows = entities[activeSection] ?? [];
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
  }, [activeSection, entities, query]);

  const sortedAdminOrderRows = useMemo(() => {
    if (activeSection !== "orders") return filteredRows;
    const rows = [...filteredRows];
    return rows.sort((left, right) => {
      if (adminOrderSort === "recent_asc" || adminOrderSort === "recent_desc") {
        const leftTime = new Date(left.created_at ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? 0).getTime();
        return adminOrderSort === "recent_desc" ? rightTime - leftTime : leftTime - rightTime;
      }

      if (adminOrderSort === "amount_desc" || adminOrderSort === "amount_asc") {
        const leftAmount = Number(left.amount ?? 0);
        const rightAmount = Number(right.amount ?? 0);
        return adminOrderSort === "amount_desc" ? rightAmount - leftAmount : leftAmount - rightAmount;
      }

      if (adminOrderSort === "status_asc") {
        return getOrderStatusLabel(left.status).localeCompare(getOrderStatusLabel(right.status), "fr");
      }

      return 0;
    });
  }, [activeSection, adminOrderSort, filteredRows]);

  const adminSelects = useMemo(
    () => ({
      patients: entities.patients.map((item) => ({ value: item.id, label: `${item.first_name} ${item.last_name}` })),
      pharmacies: entities.pharmacies.map((item) => ({ value: item.id, label: item.name })),
      drivers: entities.drivers.map((item) => ({ value: item.id, label: `${item.first_name} ${item.last_name}` })),
      catalog: entities.catalog.map((item) => ({
        value: item.name,
        label: `${item.name} - ${Number(item.price || 0).toLocaleString("fr-FR")} DA`
      }))
    }),
    [entities]
  );

  async function ensureOrderSelectData() {
    const loaders = [];
    if (!entities.patients.length) loaders.push(loadAdminSection("patients"));
    if (!entities.pharmacies.length) loaders.push(loadAdminSection("pharmacies"));
    if (!entities.drivers.length) loaders.push(loadAdminSection("drivers"));
    if (!entities.catalog.length) loaders.push(loadAdminSection("catalog"));
    if (loaders.length) {
      await Promise.all(loaders);
    }
  }

  async function openAdminModal(entity, row = null) {
    const config = adminEntityConfig[entity];
    setError("");
    try {
      if (entity === "orders") {
        await ensureOrderSelectData();
      }
    } catch (loadError) {
      setError(`Chargement admin impossible: ${entity}`);
      return;
    }
    setAdminModal({
      entity,
      rowId: row?.id ?? null,
      values: row ? { ...row } : { ...config.empty }
    });
  }

  function updateAdminField(name, value) {
    setAdminModal((current) => ({ ...current, values: { ...current.values, [name]: value } }));
  }

  function updateOrderProduct(productName) {
    const selectedItem = entities.catalog.find((item) => item.name === productName);
    setAdminModal((current) => ({
      ...current,
      values: {
        ...current.values,
        products: productName,
        amount:
          selectedItem && (!Number(current.values.amount) || Number(current.values.amount) <= 0)
            ? selectedItem.price
            : current.values.amount
      }
    }));
  }

  function openAdminOrderPharmacy(row) {
    setSelectedAdminPharmacy({
      id: row.pharmacy_id ?? row.pharmacy_ref_id ?? null,
      name: row.pharmacy_name ?? "Pharmacie",
      zone_name: row.pharmacy_zone_name ?? row.pharmacy_area ?? "",
      status: row.pharmacy_status ?? "",
      opening_hours: row.pharmacy_opening_hours ?? "",
      phone: row.pharmacy_phone ?? "",
      whatsapp: row.pharmacy_whatsapp ?? "",
      email: row.pharmacy_email ?? "",
      address: row.pharmacy_address ?? "",
      postal_code: row.pharmacy_postal_code ?? "",
      wilaya: row.pharmacy_wilaya ?? "",
      area: row.pharmacy_area ?? ""
    });
  }

  function updateCatalogImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    optimizeImageFile(file, { maxWidth: 640, maxHeight: 640 })
      .then((result) => {
        if (result.length > 320_000) {
          throw new Error("L image produit est encore trop volumineuse. Utilisez une image plus legere.");
        }
        updateAdminField("image", result);
      })
      .catch((error) => setError(error.message));
  }

  function updateSponsorLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    optimizeImageFile(file, { maxWidth: 420, maxHeight: 180 })
      .then((result) => {
        if (result.length > 240_000) {
          throw new Error("Le logo est encore trop volumineux. Reduisez-le puis reessayez.");
        }
        updateAdminField("logo", result);
      })
      .catch((error) => setError(error.message));
  }

  async function saveAdminEntity(event) {
    event.preventDefault();
    if (!adminModal) return;
    setAdminSaving(true);
    setError("");
    try {
      const config = adminEntityConfig[adminModal.entity];
      const body = { ...adminModal.values };
      if (adminModal.entity === "orders") {
        body.amount = Number(body.amount || 0);
        body.patient_id = body.patient_id ? Number(body.patient_id) : null;
        body.pharmacy_id = body.pharmacy_id ? Number(body.pharmacy_id) : null;
        body.driver_id = body.driver_id ? Number(body.driver_id) : null;
      }
      if (adminModal.entity === "drivers") {
        body.rating = Number(body.rating || 0);
        body.packages_count = Number(body.packages_count || 0);
        body.revenue = Number(body.revenue || 0);
      }
      if (adminModal.entity === "catalog") {
        body.price = Number(body.price || 0);
        if (String(body.image ?? "").startsWith("data:image") && String(body.image).length > 320_000) {
          throw new Error("L image produit est trop volumineuse pour la sauvegarde. Utilisez une image plus legere.");
        }
      }
      if (adminModal.entity === "sponsors") {
        Object.assign(body, buildSponsorPayload(body));
        if (String(body.logo ?? "").startsWith("data:image") && String(body.logo).length > 240_000) {
          throw new Error("Le logo est trop volumineux pour la sauvegarde. Utilisez une image plus legere.");
        }
      }

      if (adminModal.rowId) {
        const updatedRow = await request(`${config.endpoint}/${adminModal.rowId}`, {
          method: "PUT",
          body: JSON.stringify(body)
        });
        mergeEntityRow(adminModal.entity, updatedRow);
      } else {
        const createdRow = await request(config.endpoint, {
          method: "POST",
          body: JSON.stringify(body)
        });
        appendEntityRow(adminModal.entity, createdRow);
      }

      setAdminModal(null);
      refreshAdminView(adminModal.entity === "settings" ? "settings" : adminModal.entity);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setAdminSaving(false);
    }
  }

  async function deleteAdminEntity() {
    if (!adminModal?.rowId) return;
    setAdminSaving(true);
    setError("");
    try {
      const config = adminEntityConfig[adminModal.entity];
      await request(`${config.endpoint}/${adminModal.rowId}`, { method: "DELETE" });
      removeEntityRow(adminModal.entity, adminModal.rowId);
      setAdminModal(null);
      refreshAdminView(adminModal.entity);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setAdminSaving(false);
    }
  }

  async function toggleSponsor(row) {
    setError("");
    try {
      const updatedSponsor = await request(`/sponsors/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...buildSponsorPayload(row),
          is_active: row.is_active ? 0 : 1
        })
      });
      mergeEntityRow("sponsors", updatedSponsor);
      refreshAdminView("sponsors");
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  async function reviewSettingItem(group, rowId, action) {
    setSettingsBusy(true);
    setError("");
    try {
      await request("/settings/review", {
        method: "POST",
        body: JSON.stringify({ group, rowId, action })
      });
      setSettingsData((current) => {
        const nextStatus = action === "approve" ? "approved" : "rejected";
        const updateOrRemoveRows = (rows) =>
          (rows ?? []).flatMap((row) => {
            if (String(row.id) !== String(rowId)) return [row];
            if (action === "approve" || action === "reject") return [];
            return [{ ...row, status: nextStatus }];
          });

        if (group === "driver-applications") {
          return { ...current, driverApplications: updateOrRemoveRows(current.driverApplications) };
        }
        if (group === "pharmacy-applications") {
          return { ...current, pharmacyApplications: updateOrRemoveRows(current.pharmacyApplications) };
        }
        if (group === "patient-registrations") {
          return { ...current, patientRegistrations: updateOrRemoveRows(current.patientRegistrations) };
        }
        return current;
      });
    } catch (reviewError) {
      const groupLabel =
        group === "pharmacy-applications"
          ? "la demande pharmacie"
          : group === "driver-applications"
            ? "la candidature livreur"
            : "l inscription patient";
      const actionLabel = action === "approve" ? "validation" : "refus";
      setError(`${actionLabel} impossible pour ${groupLabel} : ${reviewError.message}`);
    } finally {
      setSettingsBusy(false);
    }
  }

  async function quickDeleteEntity(entityName, rowId) {
    const confirmed = window.confirm("Voulez-vous vraiment supprimer cet element ?");
    if (!confirmed) return;

    setAdminSaving(true);
    setError("");
    try {
      const config = adminEntityConfig[entityName];
      await request(`${config.endpoint}/${rowId}`, { method: "DELETE" });
      removeEntityRow(entityName, rowId);
      refreshAdminView(entityName);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setAdminSaving(false);
    }
  }

  async function downloadBackup() {
    setSettingsBusy(true);
    setError("");
    try {
      const payload = await request("/settings/backup");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pandamed-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (backupError) {
      setError(backupError.message);
    } finally {
      setSettingsBusy(false);
    }
  }

  function loadRestoreFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRestorePayload(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  }

  async function restoreBackup() {
    setSettingsBusy(true);
    setError("");
    try {
      const confirmed = window.confirm("La restauration va ecraser la base actuelle. Voulez-vous continuer ?");
      if (!confirmed) return;
      const payload = JSON.parse(restorePayload);
      await request("/settings/restore", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await refreshAdminView(activeSection);
    } catch (restoreError) {
      setError(restoreError.message || "Sauvegarde invalide");
    } finally {
      setSettingsBusy(false);
    }
  }

  function applyWhatsappTemplate(key) {
    setWhatsappMessage(whatsappDraft[`${key}_template`] ?? "");
  }

  async function saveWhatsappSettings() {
    setSettingsBusy(true);
    setError("");
    try {
      const saved = await request("/settings/whatsapp", {
        method: "PUT",
        body: JSON.stringify(whatsappDraft)
      });
      setSettingsData((current) => ({ ...current, whatsappSettings: saved }));
      setWhatsappDraft(saved);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSettingsBusy(false);
    }
  }

  function sendWhatsappMessage() {
    setError("L'envoi direct passe maintenant par l'API WhatsApp Business configuree sur vos actions metier.");
  }

  function downloadCatalogTemplate() {
    const template = [
      "name;category;form;unit;price;reference;image;contraindications;is_active",
      "Doliprane 1g;otc;Comprime;boite;280;DOL1G;;Insuffisance hepatique severe;1",
      "Masque FFP2;para;Masque;boite;890;FFP2;;;1"
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "catalogue-import-modele.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCatalogFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCatalogImportBusy(true);
    setError("");
    try {
      const text = await file.text();
      const rows = parseCatalogSpreadsheet(text);
      for (const row of rows) {
        await request("/catalog", {
          method: "POST",
          body: JSON.stringify(row)
        });
      }
      if (catalogImportInputRef.current) {
        catalogImportInputRef.current.value = "";
      }
      await refreshAdminView("catalog");
    } catch (importError) {
      setError(`Import catalogue impossible : ${importError.message}`);
    } finally {
      setCatalogImportBusy(false);
    }
  }

  async function triggerOrderWhatsapp(orderId, action) {
    try {
      await request(`/orders/${orderId}/whatsapp`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      await refreshAdminView("orders");
    } catch (whatsappError) {
      setError(whatsappError.message);
    }
  }

  async function adminUpdateOrderStatus(orderId, status, whatsappAction = "") {
    setError("");
    try {
      await request(`/orders/${orderId}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      if (whatsappAction) {
        await triggerOrderWhatsapp(orderId, whatsappAction);
      }
      await refreshAdminView("orders");
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <img className="admin-logo" src="/logopandamed.png" alt="MyPandaMed" />
        <div className="admin-nav">
          {adminSections.map(([id, label]) => (
            <button key={id} type="button" className={activeSection === id ? "admin-nav-item active" : "admin-nav-item"} onClick={() => setActiveSection(id)}>
              {label}
            </button>
          ))}
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>{sectionTitles[activeSection]}</h1>
            <p>Back-office compact</p>
          </div>
          <div className="admin-topbar-actions">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Recherche..." />
            {activeSection === "catalog" ? (
              <>
                <input
                  ref={catalogImportInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={importCatalogFile}
                  style={{ display: "none" }}
                />
                <button type="button" className="admin-table-button" onClick={downloadCatalogTemplate} title="Telecharger le modele d import" aria-label="Telecharger le modele d import">
                  ⇩
                </button>
                <button type="button" className="admin-table-button" onClick={() => catalogImportInputRef.current?.click()} title="Importer un fichier Excel compatible" aria-label="Importer un fichier Excel compatible" disabled={catalogImportBusy}>
                  ⇪
                </button>
              </>
            ) : null}
            {adminEntityConfig[activeSection] ? (
              <button type="button" className="admin-primary-button" onClick={() => openAdminModal(activeSection)} title="Nouveau" aria-label="Nouveau">
                ＋
              </button>
            ) : null}
            <a className="admin-link-home" href="/" title="Voir le front" aria-label="Voir le front">↗</a>
            <button type="button" className="admin-danger-button" onClick={onLogout} title="Deconnexion" aria-label="Deconnexion">⎋</button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {activeSection === "overview" ? (
          <section className="admin-overview">
            <div className="admin-metrics-grid">
              <AdminMetric label="Commandes" value={dashboard?.metrics.orders ?? 0} />
              <AdminMetric label="Patients" value={dashboard?.metrics.patients ?? 0} />
              <AdminMetric label="Pharmacies" value={dashboard?.metrics.pharmacies ?? 0} />
              <AdminMetric label="Livreurs" value={dashboard?.metrics.drivers ?? 0} />
              <AdminMetric label="Catalogue" value={dashboard?.metrics.catalog ?? 0} />
              <AdminMetric label="Utilisateurs" value={dashboard?.metrics.users ?? 0} />
              <AdminMetric label="Sponsors" value={dashboard?.metrics.sponsors ?? 0} />
              <AdminMetric label="CA" value={`${Number(dashboard?.metrics.revenue ?? 0).toLocaleString("fr-FR")} DA`} />
            </div>

            <div className="admin-panels">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Commandes recentes</h2>
                </div>
                <AdminTable
                  columns={["Patient", "Pharmacie", "Montant", "Statut"]}
                  rows={dashboard?.recentOrders ?? []}
                  emptyText="Aucune commande"
                  renderRow={(row) => (
                    <tr key={row.id}>
                      <td>{row.patient_name ?? "-"}</td>
                      <td>{row.pharmacy_name ?? "-"}</td>
                      <td>{Number(row.amount).toLocaleString("fr-FR")} DA</td>
                        <td>{getOrderStatusLabel(row.status)}</td>
                    </tr>
                  )}
                />
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Pharmacies actives</h2>
                </div>
                <div className="admin-list-stack">
                  {(dashboard?.topPharmacies ?? []).map((item) => (
                    <div key={item.id} className="admin-list-card">
                      <strong>{item.name}</strong>
                      <span>{item.zone_name}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>Livreurs en performance</h2>
              </div>
              <div className="admin-driver-grid">
                {(dashboard?.topDrivers ?? []).map((driver) => (
                  <div key={driver.id} className="admin-driver-card">
                    <strong>
                      {driver.first_name} {driver.last_name}
                    </strong>
                    <span>{driver.zone_name}</span>
                    <div className="admin-driver-stats">
                      <small>Note: {driver.rating}</small>
                      <small>Colis: {driver.packages_count}</small>
                      <small>CA: {Number(driver.revenue).toLocaleString("fr-FR")} DA</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {activeSection === "orders" ? (
            <section className="admin-panel">
              <div className="orders-toolbar">
                <span>{sortedAdminOrderRows.length} commande{sortedAdminOrderRows.length > 1 ? "s" : ""}</span>
                <label className="orders-sort">
                  <span>Trier</span>
                  <select value={adminOrderSort} onChange={(event) => setAdminOrderSort(event.target.value)}>
                    <option value="recent_desc">Plus recentes</option>
                    <option value="recent_asc">Plus anciennes</option>
                    <option value="amount_desc">Montant decroissant</option>
                    <option value="amount_asc">Montant croissant</option>
                    <option value="status_asc">Statut</option>
                  </select>
                </label>
              </div>
              <AdminTable
                columns={["Patient", "Pharmacie", "Livreur", "Montant", "Statut", "Date / Heure", "Actions"]}
                rows={sortedAdminOrderRows}
                emptyText="Aucune commande"
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td>{row.patient_name ?? "-"}</td>
                    <td>{row.pharmacy_name ?? "-"}</td>
                    <td>{row.driver_name ?? "-"}</td>
                    <td>{Number(row.amount).toLocaleString("fr-FR")} DA</td>
                    <td>{getOrderStatusLabel(row.status)}</td>
                    <td>{formatOrderDateTime(row.created_at)}</td>
                    <td>
                      <div className="admin-actions-inline">
                       <button type="button" className="admin-table-button" onClick={() => openAdminOrderPharmacy(row)} title="Voir la pharmacie" aria-label="Voir la pharmacie">🏥</button>
                      <button type="button" className="admin-primary-button" onClick={() => adminUpdateOrderStatus(row.id, "confirmed", "confirmation")} title="Confirmer" aria-label="Confirmer la commande">✓</button>
                      <button type="button" className="admin-table-button" onClick={() => triggerOrderWhatsapp(row.id, "mission_livreur")} title="Affecter livreur" aria-label="Envoyer mission livreur" disabled={!row.driver_id}>🛵</button>
                      <button type="button" className="admin-table-button" onClick={() => adminUpdateOrderStatus(row.id, "delivered", "livree")} title="Livree" aria-label="Marquer la commande comme livree">📦</button>
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("orders", row)} title="Modifier" aria-label="Modifier la commande">✎</button>
                      <button type="button" className="admin-danger-button" onClick={() => quickDeleteEntity("orders", row.id)} title="Supprimer" aria-label="Supprimer la commande">🗑</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

          {activeSection === "patients" ? (
            <section className="admin-panel">
              <AdminTable
                columns={["Prenom", "Nom", "Telephone", "Wilaya", "Creation", "Pathologies", "Actions"]}
                rows={filteredRows}
                emptyText="Aucun patient"
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td>{row.first_name}</td>
                    <td>{row.last_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.wilaya}</td>
                    <td>{formatOrderDateTime(row.created_at)}</td>
                    <td>{row.conditions}</td>
                    <td>
                      <div className="admin-actions-inline">
                        <button
                        type="button"
                        className="admin-table-button"
                        onClick={() =>
                          setSelectedAdminLocation({
                            title: `${row.first_name} ${row.last_name}`,
                            zone: row.area ?? row.wilaya,
                            data: {
                              status: "Patient",
                              opening_hours: "-",
                              phone: row.phone,
                              whatsapp: row.phone,
                              email: row.email,
                              address: row.address,
                              postal_code: row.postal_code,
                              wilaya: row.wilaya,
                              area: row.area
                            }
                          })
                        }
                        title="Voir localisation"
                        aria-label="Voir localisation patient"
                      >
                        📍
                      </button>
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("patients", row)} title="Modifier" aria-label="Modifier le patient">✎</button>
                      <button type="button" className="admin-danger-button" onClick={() => quickDeleteEntity("patients", row.id)} title="Supprimer" aria-label="Supprimer le patient">🗑</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

          {activeSection === "pharmacies" ? (
            <section className="admin-panel">
              <AdminTable
                columns={["Nom", "Responsable", "Telephone", "Zone", "Creation", "Statut", "Actions"]}
                rows={filteredRows}
                emptyText="Aucune pharmacie"
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.manager_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.zone_name}</td>
                    <td>{formatOrderDateTime(row.created_at)}</td>
                    <td>{getPharmacyStatusLabel(row.status)}</td>
                    <td>
                      <div className="admin-actions-inline">
                        <button
                        type="button"
                        className="admin-table-button"
                        onClick={() =>
                          setSelectedAdminLocation({
                            title: row.name,
                            zone: row.zone_name ?? row.area,
                            data: {
                              status: getPharmacyStatusLabel(row.status),
                              opening_hours: row.opening_hours,
                              phone: row.phone,
                              whatsapp: row.whatsapp,
                              email: row.email,
                              address: row.address,
                              postal_code: row.postal_code,
                              wilaya: row.wilaya,
                              area: row.area
                            }
                          })
                        }
                        title="Voir localisation"
                        aria-label="Voir localisation pharmacie"
                      >
                        📍
                      </button>
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("pharmacies", row)} title="Modifier" aria-label="Modifier la pharmacie">✎</button>
                      <button type="button" className="admin-danger-button" onClick={() => quickDeleteEntity("pharmacies", row.id)} title="Supprimer" aria-label="Supprimer la pharmacie">🗑</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

        {activeSection === "drivers" ? (
          <section className="admin-panel">
            <AdminTable
              columns={["Prenom", "Nom", "Zone", "Vehicule", "Note", "Colis", "Actions"]}
              rows={filteredRows}
              emptyText="Aucun livreur"
              renderRow={(row) => (
                <tr key={row.id}>
                  <td>{row.first_name}</td>
                  <td>{row.last_name}</td>
                  <td>{row.zone_name}</td>
                  <td>{row.vehicle}</td>
                  <td>{row.rating}</td>
                  <td>{row.packages_count}</td>
                  <td>
                    <div className="admin-actions-inline">
                      <button
                        type="button"
                        className="admin-table-button"
                        onClick={() =>
                          setSelectedAdminLocation({
                            title: `${row.first_name} ${row.last_name}`,
                            zone: row.zone_name,
                            data: {
                              status: getActiveStatusLabel(row.status),
                              opening_hours: row.vehicle,
                              phone: row.phone,
                              whatsapp: row.phone,
                              email: row.email,
                              address: row.zone_name,
                              postal_code: "-",
                              wilaya: "-",
                              area: row.zone_name
                            }
                          })
                        }
                        title="Voir localisation"
                        aria-label="Voir localisation livreur"
                      >
                        📍
                      </button>
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("drivers", row)} title="Modifier" aria-label="Modifier le livreur">✎</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

        {activeSection === "catalog" ? (
          <section className="admin-panel">
            <AdminTable
              columns={["Produit", "Categorie", "Forme", "Prix", "Reference", "Actions"]}
              rows={filteredRows}
              emptyText="Aucun produit"
              renderRow={(row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{getCatalogCategoryLabel(row.category)}</td>
                  <td>{row.form}</td>
                  <td>{Number(row.price).toLocaleString("fr-FR")} DA</td>
                  <td>{row.reference}</td>
                  <td>
                    <div className="admin-actions-inline">
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("catalog", row)} title="Modifier" aria-label="Modifier le produit">✎</button>
                      <button type="button" className="admin-danger-button" onClick={() => quickDeleteEntity("catalog", row.id)} title="Supprimer" aria-label="Supprimer le produit">🗑</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

        {activeSection === "users" ? (
          <section className="admin-panel">
            <AdminTable
              columns={["Prenom", "Nom", "Role", "Email", "Statut", "Actions"]}
              rows={filteredRows}
              emptyText="Aucun utilisateur"
              renderRow={(row) => (
                <tr key={row.id}>
                  <td>{row.first_name}</td>
                  <td>{row.last_name}</td>
                  <td>{getRoleLabel(row.role)}</td>
                  <td>{row.email}</td>
                  <td>{getActiveStatusLabel(row.status)}</td>
                  <td>
                    <div className="admin-actions-inline">
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("users", row)} title="Modifier" aria-label="Modifier l utilisateur">✎</button>
                      <button type="button" className="admin-danger-button" onClick={() => quickDeleteEntity("users", row.id)} title="Supprimer" aria-label="Supprimer l utilisateur">🗑</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

        {activeSection === "sponsors" ? (
          <section className="admin-panel">
            <AdminTable
              columns={["Nom", "Type", "Slogan", "Actif", "Actions"]}
              rows={filteredRows}
              emptyText="Aucun sponsor"
              renderRow={(row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.type}</td>
                  <td>{row.slogan}</td>
                  <td>{row.is_active ? "Oui" : "Non"}</td>
                  <td>
                    <div className="admin-actions-inline">
                      <button type="button" className="admin-table-button" onClick={() => toggleSponsor(row)} title={row.is_active ? "Desactiver" : "Activer"} aria-label={row.is_active ? "Desactiver le sponsor" : "Activer le sponsor"}>
                        {row.is_active ? "◔" : "◕"}
                      </button>
                      <button type="button" className="admin-table-button" onClick={() => openAdminModal("sponsors", row)} title="Modifier" aria-label="Modifier le sponsor">✎</button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </section>
        ) : null}

        {activeSection === "settings" ? (
          <section className="admin-settings">
            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>Candidatures livreurs</h2>
              </div>
              <AdminTable
                columns={["Nom", "Telephone", "Zone", "Statut", "Actions"]}
                rows={settingsData.driverApplications}
                emptyText="Aucune candidature livreur"
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.delivery_zone || row.wilaya || "-"}</td>
                    <td>{getReviewStatusLabel(row.status)}</td>
                    <td>
                      <div className="admin-actions-inline">
                        <button type="button" className="admin-primary-button" onClick={() => reviewSettingItem("driver-applications", row.id, "approve")} title="Valider" aria-label="Valider la candidature livreur" disabled={settingsBusy || row.status === "approved"}>✓</button>
                        <button type="button" className="admin-danger-button" onClick={() => reviewSettingItem("driver-applications", row.id, "reject")} title="Refuser" aria-label="Refuser la candidature livreur" disabled={settingsBusy || row.status === "rejected"}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>Demandes pharmacies</h2>
              </div>
              <AdminTable
                columns={["Pharmacie", "Responsable", "Telephone", "Statut", "Actions"]}
                rows={settingsData.pharmacyApplications}
                emptyText="Aucune demande pharmacie"
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td>{row.pharmacy_name}</td>
                    <td>{row.manager_name}</td>
                    <td>{row.phone}</td>
                    <td>{getReviewStatusLabel(row.status)}</td>
                    <td>
                      <div className="admin-actions-inline">
                        <button type="button" className="admin-primary-button" onClick={() => reviewSettingItem("pharmacy-applications", row.id, "approve")} title="Valider" aria-label="Valider la pharmacie" disabled={settingsBusy || row.status === "approved"}>✓</button>
                        <button type="button" className="admin-danger-button" onClick={() => reviewSettingItem("pharmacy-applications", row.id, "reject")} title="Refuser" aria-label="Refuser la pharmacie" disabled={settingsBusy || row.status === "rejected"}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>Inscriptions patients</h2>
              </div>
              <AdminTable
                columns={["Nom", "Telephone", "Wilaya", "Statut", "Actions"]}
                rows={settingsData.patientRegistrations}
                emptyText="Aucune inscription patient"
                renderRow={(row) => (
                  <tr key={row.id}>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.wilaya ?? "-"}</td>
                    <td>{getReviewStatusLabel(row.status)}</td>
                    <td>
                      <div className="admin-actions-inline">
                        <button type="button" className="admin-primary-button" onClick={() => reviewSettingItem("patient-registrations", row.id, "approve")} title="Valider" aria-label="Valider le patient" disabled={settingsBusy || row.status === "approved"}>✓</button>
                        <button type="button" className="admin-danger-button" onClick={() => reviewSettingItem("patient-registrations", row.id, "reject")} title="Refuser" aria-label="Refuser le patient" disabled={settingsBusy || row.status === "rejected"}>✕</button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>WhatsApp Business - Envoi direct</h2>
              </div>
              <div className="whatsapp-settings-shell">
                <div className="whatsapp-compose-card">
                  <strong>Nouveau message</strong>
                  <div className="whatsapp-row">
                    <input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="Numero : 213555123456 (format international sans +)" />
                    <button type="button" className="whatsapp-send-button" onClick={sendWhatsappMessage}>Envoyer</button>
                  </div>
                  <div className="whatsapp-templates">
                    <span>Modeles :</span>
                    <div className="whatsapp-template-list">
                      <button type="button" onClick={() => applyWhatsappTemplate("confirmation")}>Confirmation</button>
                      <button type="button" onClick={() => applyWhatsappTemplate("en_route")}>En route</button>
                      <button type="button" onClick={() => applyWhatsappTemplate("livree")}>Livree</button>
                      <button type="button" onClick={() => applyWhatsappTemplate("pharmacie")}>Pharmacie</button>
                      <button type="button" onClick={() => applyWhatsappTemplate("mission_livreur")}>Mission livreur</button>
                    </div>
                  </div>
                  <textarea value={whatsappMessage} onChange={(event) => setWhatsappMessage(event.target.value)} placeholder="Redigez ou selectionnez un modele..." />
                </div>

                <div className="whatsapp-config-grid">
                  <div className="admin-settings-card">
                    <strong>Configuration</strong>
                    <input value={whatsappDraft.sender_phone ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, sender_phone: event.target.value }))} placeholder="Numero WhatsApp Business" />
                    <input value={whatsappDraft.phone_number_id ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, phone_number_id: event.target.value }))} placeholder="Phone Number ID Meta" />
                    <input value={whatsappDraft.api_version ?? "v23.0"} onChange={(event) => setWhatsappDraft((current) => ({ ...current, api_version: event.target.value }))} placeholder="Version API Meta" />
                    <textarea value={whatsappDraft.api_token ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, api_token: event.target.value }))} placeholder="Access Token Meta WhatsApp Business API" />
                    <textarea value={whatsappDraft.confirmation_template ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, confirmation_template: event.target.value }))} placeholder="Modele confirmation" />
                    <textarea value={whatsappDraft.en_route_template ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, en_route_template: event.target.value }))} placeholder="Modele en route" />
                    <textarea value={whatsappDraft.livree_template ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, livree_template: event.target.value }))} placeholder="Modele livree" />
                    <textarea value={whatsappDraft.pharmacie_template ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, pharmacie_template: event.target.value }))} placeholder="Modele pharmacie" />
                    <textarea value={whatsappDraft.mission_livreur_template ?? ""} onChange={(event) => setWhatsappDraft((current) => ({ ...current, mission_livreur_template: event.target.value }))} placeholder="Modele mission livreur" />
                    <button type="button" className="admin-primary-button" onClick={saveWhatsappSettings} title="Enregistrer WhatsApp" aria-label="Enregistrer WhatsApp" disabled={settingsBusy}>💾</button>
                  </div>

                  <div className="admin-settings-card">
                    <strong>Journal WhatsApp</strong>
                    <div className="whatsapp-log-list">
                      {(settingsData.whatsappLogs ?? []).map((log) => (
                        <div key={log.id} className="whatsapp-log-item">
                          <span>{log.created_at}</span>
                          <strong>{log.action_key}</strong>
                          <small>{log.recipient_phone}</small>
                          <em>{log.delivery_status}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <h2>Sauvegarde et restauration</h2>
              </div>
              <div className="admin-settings-tools">
                <div className="admin-settings-card">
                  <strong>Sauvegarde</strong>
                  <p>Exporter toute la base au format JSON.</p>
                  <button type="button" className="admin-primary-button" onClick={downloadBackup} title="Telecharger la sauvegarde" aria-label="Telecharger la sauvegarde" disabled={settingsBusy}>⭳</button>
                </div>
                <div className="admin-settings-card">
                  <strong>Restauration</strong>
                  <p>Importer une sauvegarde JSON complete.</p>
                  <input type="file" accept="application/json" onChange={loadRestoreFile} />
                  <textarea value={restorePayload} onChange={(event) => setRestorePayload(event.target.value)} placeholder="Collez ici le JSON de sauvegarde..." />
                  <button type="button" className="admin-danger-button" onClick={restoreBackup} title="Restaurer la base" aria-label="Restaurer la base" disabled={settingsBusy || !restorePayload.trim()}>⭱</button>
                </div>
              </div>
            </section>
          </section>
        ) : null}
      </main>

      {selectedAdminPharmacy ? (
        <PartnerVisualModal
          title={selectedAdminPharmacy.name ?? "Pharmacie"}
          zone={selectedAdminPharmacy.zone_name ?? selectedAdminPharmacy.area}
          data={{
            status: selectedAdminPharmacy.status,
            opening_hours: selectedAdminPharmacy.opening_hours,
            phone: selectedAdminPharmacy.phone,
            whatsapp: selectedAdminPharmacy.whatsapp,
            email: selectedAdminPharmacy.email,
            address: selectedAdminPharmacy.address,
            postal_code: selectedAdminPharmacy.postal_code,
            wilaya: selectedAdminPharmacy.wilaya,
            area: selectedAdminPharmacy.area
          }}
          onClose={() => setSelectedAdminPharmacy(null)}
        />
      ) : null}

      {selectedAdminLocation ? (
        <PartnerVisualModal
          title={selectedAdminLocation.title}
          zone={selectedAdminLocation.zone}
          data={selectedAdminLocation.data}
          onClose={() => setSelectedAdminLocation(null)}
        />
      ) : null}

      {adminModal ? (
        <AdminCrudModal title={`${adminModal.rowId ? "Modifier" : "Nouveau"} ${adminEntityConfig[adminModal.entity].title}`} onClose={() => setAdminModal(null)}>
          <form className="admin-form" onSubmit={saveAdminEntity}>
            {adminModal.entity === "orders" ? (
              <div className="admin-form-grid">
                <label><span>Patient</span><select value={adminModal.values.patient_id ?? ""} onChange={(event) => updateAdminField("patient_id", event.target.value)}><option value="">Selectionner</option>{adminSelects.patients.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label><span>Pharmacie</span><select value={adminModal.values.pharmacy_id ?? ""} onChange={(event) => updateAdminField("pharmacy_id", event.target.value)}><option value="">Selectionner</option>{adminSelects.pharmacies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label><span>Livreur</span><select value={adminModal.values.driver_id ?? ""} onChange={(event) => updateAdminField("driver_id", event.target.value)}><option value="">Selectionner</option>{adminSelects.drivers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label><span>Montant</span><input type="number" value={adminModal.values.amount ?? 0} onChange={(event) => updateAdminField("amount", event.target.value)} /></label>
                 <label className="full-span">
                   <span>Produits</span>
                   <select value={adminModal.values.products ?? ""} onChange={(event) => updateOrderProduct(event.target.value)}>
                     <option value="">Selectionner un produit</option>
                     {adminSelects.catalog.map((option) => (
                       <option key={option.value} value={option.value}>
                         {option.label}
                       </option>
                     ))}
                   </select>
                 </label>
                 <label><span>Statut</span><select value={adminModal.values.status ?? "pending"} onChange={(event) => updateAdminField("status", event.target.value)}><option value="pending">En attente</option><option value="confirmed">Confirmee</option><option value="dispatch">En livraison</option><option value="delivered">Livree</option><option value="cancelled">Annulee</option></select></label>
                 <label><span>Canal</span><select value={adminModal.values.channel ?? "whatsapp"} onChange={(event) => updateAdminField("channel", event.target.value)}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">Appel</option></select></label>
                 <label><span>Source</span><select value={adminModal.values.source ?? "web"} onChange={(event) => updateAdminField("source", event.target.value)}><option value="web">Site web</option><option value="call">Appel</option><option value="wa">WhatsApp</option></select></label>
                <label className="full-span"><span>Notes</span><textarea value={adminModal.values.notes ?? ""} onChange={(event) => updateAdminField("notes", event.target.value)} /></label>
              </div>
            ) : null}

            {adminModal.entity === "patients" ? (
              <div className="admin-form-grid">
                <label><span>Prenom</span><input value={adminModal.values.first_name ?? ""} onChange={(event) => updateAdminField("first_name", event.target.value)} /></label>
                <label><span>Nom</span><input value={adminModal.values.last_name ?? ""} onChange={(event) => updateAdminField("last_name", event.target.value)} /></label>
                <label><span>Telephone</span><input value={adminModal.values.phone ?? ""} onChange={(event) => updateAdminField("phone", event.target.value)} /></label>
                <label><span>Email</span><input value={adminModal.values.email ?? ""} onChange={(event) => updateAdminField("email", event.target.value)} /></label>
                <label><span>Mot de passe</span><input value={adminModal.values.password ?? ""} onChange={(event) => updateAdminField("password", event.target.value)} /></label>
                <label><span>Date de naissance</span><input type="date" value={adminModal.values.date_of_birth ?? ""} onChange={(event) => updateAdminField("date_of_birth", event.target.value)} /></label>
                <label><span>Sexe</span><select value={adminModal.values.sex ?? ""} onChange={(event) => updateAdminField("sex", event.target.value)}><option value="">Selectionner</option><option value="Feminin">Feminin</option><option value="Masculin">Masculin</option></select></label>
                <label><span>Wilaya</span><input value={adminModal.values.wilaya ?? ""} onChange={(event) => updateAdminField("wilaya", event.target.value)} /></label>
                <label><span>Zone</span><input value={adminModal.values.area ?? ""} onChange={(event) => updateAdminField("area", event.target.value)} /></label>
                <label><span>Code postal</span><input value={adminModal.values.postal_code ?? ""} onChange={(event) => updateAdminField("postal_code", event.target.value)} /></label>
                <label className="full-span"><span>Adresse</span><input value={adminModal.values.address ?? ""} onChange={(event) => updateAdminField("address", event.target.value)} /></label>
                <label className="full-span"><span>Pathologies</span><textarea value={adminModal.values.conditions ?? ""} onChange={(event) => updateAdminField("conditions", event.target.value)} /></label>
                <label className="full-span"><span>Allergies</span><textarea value={adminModal.values.allergies ?? ""} onChange={(event) => updateAdminField("allergies", event.target.value)} /></label>
                <label className="full-span"><span>Notes</span><textarea value={adminModal.values.notes ?? ""} onChange={(event) => updateAdminField("notes", event.target.value)} /></label>
              </div>
            ) : null}

            {adminModal.entity === "pharmacies" ? (
              <div className="admin-form-grid">
                <label><span>Nom</span><input value={adminModal.values.name ?? ""} onChange={(event) => updateAdminField("name", event.target.value)} /></label>
                <label><span>Responsable</span><input value={adminModal.values.manager_name ?? ""} onChange={(event) => updateAdminField("manager_name", event.target.value)} /></label>
                <label><span>Telephone</span><input value={adminModal.values.phone ?? ""} onChange={(event) => updateAdminField("phone", event.target.value)} /></label>
                <label><span>Whatsapp</span><input value={adminModal.values.whatsapp ?? ""} onChange={(event) => updateAdminField("whatsapp", event.target.value)} /></label>
                <label><span>Email</span><input value={adminModal.values.email ?? ""} onChange={(event) => updateAdminField("email", event.target.value)} /></label>
                <label><span>Mot de passe</span><input value={adminModal.values.password ?? ""} onChange={(event) => updateAdminField("password", event.target.value)} /></label>
                 <label><span>Statut</span><select value={adminModal.values.status ?? "online"} onChange={(event) => updateAdminField("status", event.target.value)}><option value="online">En ligne</option><option value="busy">Occupee</option><option value="offline">Hors ligne</option></select></label>
                <label><span>Wilaya</span><input value={adminModal.values.wilaya ?? ""} onChange={(event) => updateAdminField("wilaya", event.target.value)} /></label>
                <label><span>Zone</span><input value={adminModal.values.zone_name ?? ""} onChange={(event) => updateAdminField("zone_name", event.target.value)} /></label>
                <label><span>Secteur</span><input value={adminModal.values.area ?? ""} onChange={(event) => updateAdminField("area", event.target.value)} /></label>
                <label><span>Code postal</span><input value={adminModal.values.postal_code ?? ""} onChange={(event) => updateAdminField("postal_code", event.target.value)} /></label>
                <label className="full-span"><span>Adresse</span><input value={adminModal.values.address ?? ""} onChange={(event) => updateAdminField("address", event.target.value)} /></label>
                <label className="full-span"><span>Horaires</span><input value={adminModal.values.opening_hours ?? ""} onChange={(event) => updateAdminField("opening_hours", event.target.value)} /></label>
              </div>
            ) : null}

            {adminModal.entity === "drivers" ? (
              <div className="admin-form-grid">
                <label><span>Prenom</span><input value={adminModal.values.first_name ?? ""} onChange={(event) => updateAdminField("first_name", event.target.value)} /></label>
                <label><span>Nom</span><input value={adminModal.values.last_name ?? ""} onChange={(event) => updateAdminField("last_name", event.target.value)} /></label>
                <label><span>Telephone</span><input value={adminModal.values.phone ?? ""} onChange={(event) => updateAdminField("phone", event.target.value)} /></label>
                <label><span>Email</span><input value={adminModal.values.email ?? ""} onChange={(event) => updateAdminField("email", event.target.value)} /></label>
                <label><span>Mot de passe</span><input value={adminModal.values.password ?? ""} onChange={(event) => updateAdminField("password", event.target.value)} /></label>
                <label><span>Zone</span><input value={adminModal.values.zone_name ?? ""} onChange={(event) => updateAdminField("zone_name", event.target.value)} /></label>
                <label><span>Vehicule</span><select value={adminModal.values.vehicle ?? "moto"} onChange={(event) => updateAdminField("vehicle", event.target.value)}><option value="moto">moto</option><option value="voiture">voiture</option><option value="scooter">scooter</option></select></label>
                 <label><span>Statut</span><select value={adminModal.values.status ?? "actif"} onChange={(event) => updateAdminField("status", event.target.value)}><option value="actif">Actif</option><option value="inactif">Inactif</option></select></label>
                <label><span>Note</span><input type="number" step="0.1" value={adminModal.values.rating ?? 0} onChange={(event) => updateAdminField("rating", event.target.value)} /></label>
                <label><span>Colis</span><input type="number" value={adminModal.values.packages_count ?? 0} onChange={(event) => updateAdminField("packages_count", event.target.value)} /></label>
                <label><span>CA</span><input type="number" value={adminModal.values.revenue ?? 0} onChange={(event) => updateAdminField("revenue", event.target.value)} /></label>
              </div>
            ) : null}

            {adminModal.entity === "users" ? (
              <div className="admin-form-grid">
                <label><span>Prenom</span><input value={adminModal.values.first_name ?? ""} onChange={(event) => updateAdminField("first_name", event.target.value)} /></label>
                <label><span>Nom</span><input value={adminModal.values.last_name ?? ""} onChange={(event) => updateAdminField("last_name", event.target.value)} /></label>
                <label><span>Telephone</span><input value={adminModal.values.phone ?? ""} onChange={(event) => updateAdminField("phone", event.target.value)} /></label>
                <label><span>Email</span><input value={adminModal.values.email ?? ""} onChange={(event) => updateAdminField("email", event.target.value)} /></label>
                <label><span>Mot de passe</span><input value={adminModal.values.password ?? ""} onChange={(event) => updateAdminField("password", event.target.value)} /></label>
                 <label><span>Role</span><select value={adminModal.values.role ?? "operateur"} onChange={(event) => updateAdminField("role", event.target.value)}><option value="admin">Administrateur</option><option value="operateur">Operateur</option><option value="pharmacien">Pharmacien</option><option value="livreur">Livreur</option></select></label>
                 <label><span>Statut</span><select value={adminModal.values.status ?? "actif"} onChange={(event) => updateAdminField("status", event.target.value)}><option value="actif">Actif</option><option value="inactif">Inactif</option></select></label>
                <label className="full-span"><span>Indice mot de passe</span><input value={adminModal.values.password_hint ?? ""} onChange={(event) => updateAdminField("password_hint", event.target.value)} /></label>
              </div>
            ) : null}

            {adminModal.entity === "catalog" ? (
              <div className="admin-form-grid">
                <label className="full-span"><span>Produit</span><input value={adminModal.values.name ?? ""} onChange={(event) => updateAdminField("name", event.target.value)} /></label>
                 <label><span>Categorie</span><select value={adminModal.values.category ?? "otc"} onChange={(event) => updateAdminField("category", event.target.value)}><option value="otc">Medicaments sans ordonnance</option><option value="para">Parapharmacie</option></select></label>
                <label><span>Forme</span><input value={adminModal.values.form ?? ""} onChange={(event) => updateAdminField("form", event.target.value)} /></label>
                <label><span>Unite</span><input value={adminModal.values.unit ?? ""} onChange={(event) => updateAdminField("unit", event.target.value)} /></label>
                <label><span>Prix</span><input type="number" value={adminModal.values.price ?? 0} onChange={(event) => updateAdminField("price", event.target.value)} /></label>
                <label><span>Reference</span><input value={adminModal.values.reference ?? ""} onChange={(event) => updateAdminField("reference", event.target.value)} /></label>
                <label className="full-span">
                  <span>Photo du medicament</span>
                  <input value={adminModal.values.image ?? ""} onChange={(event) => updateAdminField("image", event.target.value)} placeholder="URL image ou data:image" />
                </label>
                <label className="full-span">
                  <span>Choisir une image</span>
                  <input type="file" accept="image/*" onChange={updateCatalogImage} />
                </label>
                {adminModal.values.image ? (
                  <div className="admin-image-preview full-span">
                    <img src={adminModal.values.image} alt={adminModal.values.name || "Apercu produit"} />
                  </div>
                ) : null}
                <label className="full-span"><span>Contre-indications</span><textarea value={adminModal.values.contraindications ?? ""} onChange={(event) => updateAdminField("contraindications", event.target.value)} /></label>
                <label className="admin-check"><input type="checkbox" checked={Boolean(adminModal.values.is_active)} onChange={(event) => updateAdminField("is_active", event.target.checked ? 1 : 0)} /><span>Actif</span></label>
              </div>
            ) : null}

            {adminModal.entity === "sponsors" ? (
              <div className="admin-form-grid">
                <label><span>Nom</span><input value={adminModal.values.name ?? ""} onChange={(event) => updateAdminField("name", event.target.value)} /></label>
                <label><span>Type</span><select value={adminModal.values.type ?? "premium"} onChange={(event) => updateAdminField("type", event.target.value)}><option value="platinum">platinum</option><option value="premium">premium</option><option value="gold">gold</option><option value="silver">silver</option><option value="standard">standard</option><option value="partenaire">partenaire</option></select></label>
                <label className="full-span"><span>Slogan</span><input value={adminModal.values.slogan ?? ""} onChange={(event) => updateAdminField("slogan", event.target.value)} /></label>
                <label className="full-span"><span>Logo</span><input value={adminModal.values.logo ?? ""} onChange={(event) => updateAdminField("logo", event.target.value)} placeholder="URL image ou data:image" /></label>
                <label className="full-span">
                  <span>Telecharger un logo</span>
                  <input type="file" accept="image/*" onChange={updateSponsorLogo} />
                </label>
                {adminModal.values.logo &&
                (String(adminModal.values.logo).startsWith("data:image") ||
                  String(adminModal.values.logo).startsWith("http://") ||
                  String(adminModal.values.logo).startsWith("https://")) ? (
                  <div className="admin-image-preview full-span">
                    <img src={adminModal.values.logo} alt={adminModal.values.name || "Apercu sponsor"} />
                  </div>
                ) : null}
                <label className="full-span"><span>Site web</span><input value={adminModal.values.website ?? ""} onChange={(event) => updateAdminField("website", event.target.value)} /></label>
                <label className="admin-check"><input type="checkbox" checked={Boolean(adminModal.values.is_active)} onChange={(event) => updateAdminField("is_active", event.target.checked ? 1 : 0)} /><span>Actif</span></label>
              </div>
            ) : null}

            <div className="admin-form-actions">
              {adminModal.rowId ? <button type="button" className="admin-danger-button" onClick={deleteAdminEntity} title="Supprimer" aria-label="Supprimer">🗑</button> : <span />}
              <button type="submit" className="admin-primary-button" title="Enregistrer" aria-label="Enregistrer">{adminSaving ? "…" : "💾"}</button>
            </div>
          </form>
        </AdminCrudModal>
      ) : null}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [pathname, setPathname] = useState(typeof window !== "undefined" ? window.location.pathname : "/");

  useEffect(() => {
    request("/auth/me")
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncPathname = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPathname);
    return () => window.removeEventListener("popstate", syncPathname);
  }, []);

  function handleLogin(user) {
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }

  async function handleLogout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {}
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
      setPathname("/");
    }
  }

  if (pathname.startsWith("/admin")) return currentUser && ["admin", "operateur"].includes(currentUser.role) ? <AdminApp onLogout={handleLogout} /> : <StorefrontApp currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} />;
  if (pathname.startsWith("/driver")) return currentUser?.role === "driver" ? <DriverSpaceApp currentUser={currentUser} onLogout={handleLogout} /> : <StorefrontApp currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} />;
  if (pathname.startsWith("/pharmacy")) return currentUser?.role === "pharmacy" ? <PharmacySpaceApp currentUser={currentUser} onLogout={handleLogout} /> : <StorefrontApp currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} />;
  if (pathname.startsWith("/patient")) return currentUser?.role === "patient" ? <PatientSpaceApp currentUser={currentUser} onLogout={handleLogout} /> : <StorefrontApp currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} />;
  return <StorefrontApp currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} />;
}
