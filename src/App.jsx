import { useState, useEffect } from "react";

const API = "https://sitesprint-backend-production.up.railway.app";
const TOKEN_KEY = "sitesprint_token";
const USER_KEY  = "sitesprint_user";

// ── API helper (auto-attaches Bearer token) ────────────────────────────
const api = async (method, path, body) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}/${path.replace(/^\//, "")}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { throw new Error(text || `HTTP ${r.status}`); }
  if (r.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.reload();
  }
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
};

const photoUrl = (p) => (p?.startsWith("http") ? p : `${API}${p}`);

const STATUS_COLORS = {
  prospect: "#6366f1", "site shown": "#f59e0b", approved: "#10b981",
  rejected: "#ef4444", delivered: "#8b5cf6",
};
const STATUS_LIST = ["prospect", "site shown", "approved", "rejected", "delivered"];

// ═══════════════════════════════════════════════════════════════════════
// ROOT: decide between LoginScreen and the authenticated app
// ═══════════════════════════════════════════════════════════════════════
export default function Root() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const login = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  if (!user) return <LoginScreen onLogin={login} />;
  return <App user={user} onLogout={logout} />;
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("loading"); // loading | login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/auth/state`)
      .then(r => r.json())
      .then(d => setMode(d.registration_open ? "register" : "login"))
      .catch(() => setMode("login"));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register" ? { email, password, name } : { email, password };
      const r = await fetch(`${API}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Authentication failed");
      onLogin(d.token, d.user);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const input = {
    width: "100%", padding: "13px 16px",
    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box", transition: "all .2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, rgba(99,102,241,.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(168,85,247,.1), transparent 50%), #06060c",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif",
      color: "#e2e8f0", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(20,20,30,.7)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,.08)", borderRadius: 20,
        padding: 40, boxShadow: "0 20px 60px rgba(0,0,0,.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-block", padding: "0 2px",
            fontSize: 32, fontWeight: 800, letterSpacing: -1,
            background: "linear-gradient(135deg,#818cf8,#c084fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>SiteSprint</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>AI websites for local businesses</div>
        </div>

        {mode === "loading" && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading…</div>
        )}

        {mode !== "loading" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {mode === "register" ? "Create admin account" : "Welcome back"}
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              {mode === "register"
                ? "No accounts exist yet. You'll be the admin."
                : "Sign in to your account."}
            </p>

            <form onSubmit={submit}>
              {mode === "register" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={input} required />
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={input} required autoFocus />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                  style={input} required minLength={mode === "register" ? 8 : 1} />
              </div>

              {error && (
                <div style={{
                  fontSize: 13, color: "#fca5a5", padding: "10px 14px", marginBottom: 14,
                  background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8,
                }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: 14,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", border: "none", borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? .6 : 1, transition: "all .2s",
                boxShadow: "0 10px 30px rgba(99,102,241,.3)", fontFamily: "inherit",
              }}>
                {loading ? "Please wait…" : (mode === "register" ? "Create Account →" : "Sign In →")}
              </button>
            </form>

            <div style={{ marginTop: 24, fontSize: 12, color: "#475569", textAlign: "center" }}>
              {mode === "register"
                ? "Once you're set up, you can create accounts for teammates from inside the app."
                : "Need an account? Ask your admin to create one for you."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUTHENTICATED APP
// ═══════════════════════════════════════════════════════════════════════
function App({ user, onLogout }) {
  const [page, setPage] = useState("discover");
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notification, setNotification] = useState(null);

  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [discoverResults, setDiscoverResults] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverMeta, setDiscoverMeta] = useState(null);

  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState(null);

  const [building, setBuilding] = useState({});
  const [builtUrls, setBuiltUrls] = useState({});
  const [showDomainModal, setShowDomainModal] = useState(null);

  useEffect(() => { loadBusinesses(); }, []);

  const loadBusinesses = async () => {
    try { setBusinesses(await api("GET", "api/businesses")); }
    catch (e) { notify("Load failed: " + e.message, "error"); }
  };
  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDiscover = async () => {
    if (!area.trim()) return;
    setDiscovering(true); setDiscoverResults([]); setDiscoverMeta(null); setBuiltUrls({});
    try {
      const r = await api("POST", "api/discover", {
        area: area.trim(), category: category || undefined, limit: 50, deep: deepScan,
      });
      setDiscoverResults(r.businesses || []);
      setDiscoverMeta({
        scanned: r.scanned, count: r.count, queries_used: r.queries_used,
        details_checked: r.details_checked, details_from_cache: r.details_from_cache,
        estimated_cost_usd: r.estimated_cost_usd,
      });
      if (!r.businesses?.length) notify("No website-less businesses found here. Try a wider area.", "error");
      else notify(`Found ${r.businesses.length} businesses without a website!`);
    } catch (e) { notify("Discovery failed: " + e.message, "error"); }
    setDiscovering(false);
  };

  const handleBuild = async (biz, idx) => {
    setBuilding(prev => ({ ...prev, [idx]: true }));
    try {
      const r = await api("POST", "api/build", { place_id: biz.place_id, area_searched: area });
      setBuiltUrls(prev => ({ ...prev, [idx]: `${API}${r.previewUrl}` }));
      await loadBusinesses();
      notify("✅ Unique site generated for " + biz.name);
    } catch (e) { notify("Build failed: " + e.message, "error"); }
    setBuilding(prev => ({ ...prev, [idx]: false }));
  };

  const handleFromUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true); setUrlResult(null);
    try {
      const r = await api("POST", "api/from-url", { url: url.trim() });
      setUrlResult({ ...r, previewUrl: `${API}${r.previewUrl}` });
      await loadBusinesses();
      notify("✅ Unique site generated!");
    } catch (e) { notify("Failed: " + e.message, "error"); }
    setUrlLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const upd = await api("PUT", `api/businesses/${id}`, { status });
      setBusinesses(prev => prev.map(b => b.id === id ? upd : b));
      setSelected(upd);
    } catch (e) { notify(e.message, "error"); }
  };
  const rebuildSite = async (id) => {
    notify("Regenerating unique site… ~60s");
    try {
      await api("POST", `api/rebuild/${id}`);
      const all = await api("GET", "api/businesses");
      setBusinesses(all); setSelected(all.find(b => b.id === id));
      notify("✅ Fresh unique site built!");
    } catch (e) { notify(e.message, "error"); }
  };
  const saveNotes = async (id, notes) => {
    try { await api("PUT", `api/businesses/${id}`, { notes }); notify("Notes saved"); }
    catch (e) { notify(e.message, "error"); }
  };
  const downloadHtml = async (id, name) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const r = await fetch(`${API}/api/export/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).error || "Download failed");
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(name || "site").toLowerCase().replace(/[^a-z0-9]/g, "-")}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify("✅ HTML downloaded");
    } catch (e) { notify("Download failed: " + e.message, "error"); }
  };

  const getPreviewUrl = (biz) => biz?.preview_slug ? `${API}/preview/${biz.preview_slug}` : null;
  const pipelineCount = STATUS_LIST.reduce((acc, s) => { acc[s] = businesses.filter(b => b.status === s).length; return acc; }, {});

  const S = {
    sidebar: { width: 240, background: "#0a0a14", borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column" },
    main: { flex: 1, overflow: "auto" },
    card: { background: "linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.01))", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 18, marginBottom: 14, transition: "all .2s" },
    btn: (bg = "#6366f1") => ({ padding: "9px 18px", background: bg, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }),
    input: { flex: 1, padding: "12px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit" },
    h1: { fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 },
    subt: { color: "#64748b", marginBottom: 28, fontSize: 14 },
  };

  const userInitials = (user.name || user.email || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: "flex", height: "100vh",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif",
      background: "radial-gradient(ellipse at top left, rgba(99,102,241,.04), transparent 50%), #06060c",
      color: "#e2e8f0",
    }}>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={{ padding: "22px 22px 20px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 }}>SiteSprint</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>v10 · AI Local Sites</div>
        </div>

        <div style={{ padding: "14px 0" }}>
          {[
            { id: "discover", icon: "🔍", label: "Discover" },
            { id: "url", icon: "🔗", label: "From URL" },
            { id: "pipeline", icon: "📋", label: `Pipeline (${businesses.length})` },
            ...(user.role === "admin" ? [{ id: "users", icon: "👥", label: "Team" }] : []),
            { id: "account", icon: "⚙️", label: "Account" },
          ].map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              width: "100%", padding: "11px 22px",
              background: page === p.id ? "rgba(99,102,241,.13)" : "transparent",
              borderLeft: page === p.id ? "3px solid #6366f1" : "3px solid transparent",
              color: page === p.id ? "#a5b4fc" : "#94a3b8",
              border: "none", cursor: "pointer", textAlign: "left",
              fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit",
            }}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        {page === "pipeline" && businesses.length > 0 && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>By status</div>
            {STATUS_LIST.map(s => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: STATUS_COLORS[s], textTransform: "capitalize" }}>{s}</span>
                <span style={{ color: "#64748b" }}>{pipelineCount[s] || 0}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", padding: "16px 18px", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || user.email.split("@")[0]}</div>
            <div style={{ fontSize: 10, color: user.role === "admin" ? "#a5b4fc" : "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{user.role}</div>
          </div>
          <button onClick={onLogout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, fontSize: 18, fontFamily: "inherit" }}>↪</button>
        </div>
      </div>

      <div style={S.main}>

        {page === "discover" && (
          <div style={{ padding: "40px 48px", maxWidth: 1000 }}>
            <h1 style={S.h1}>Find Businesses Without Websites</h1>
            <p style={S.subt}>Pulls real Google profiles in any area — filters out ones that already have a site.</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <input value={area} onChange={e => setArea(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleDiscover()}
                placeholder="Area (e.g. Ballantyne Charlotte NC)"
                style={{ ...S.input, minWidth: 280 }} />
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ ...S.input, flex: "0 0 240px", cursor: "pointer" }}>
                <option value="">All (default scan, ~$2)</option>
                <optgroup label="── Personal care & beauty ──">
                  <option value="barber shops">Barbershops</option>
                  <option value="nail salons">Nail Salons</option>
                  <option value="hair salons">Hair Salons</option>
                  <option value="tattoo shops">Tattoo Shops</option>
                  <option value="tailors">Tailors</option>
                  <option value="dry cleaners">Dry Cleaners</option>
                  <option value="massage therapists">Massage Therapists</option>
                </optgroup>
                <optgroup label="── Auto ──">
                  <option value="auto repair">Auto Repair</option>
                  <option value="tire shops">Tire Shops</option>
                  <option value="car detailing">Car Detailing</option>
                  <option value="car wash">Car Wash</option>
                </optgroup>
                <optgroup label="── Food ──">
                  <option value="taquerias">Taquerias</option>
                  <option value="food trucks">Food Trucks</option>
                  <option value="donut shops">Donut Shops</option>
                  <option value="small family restaurants">Small Restaurants</option>
                  <option value="bakeries">Bakeries</option>
                  <option value="cafes">Cafes</option>
                  <option value="pizzerias">Pizzerias</option>
                  <option value="bbq joints">BBQ Joints</option>
                </optgroup>
                <optgroup label="── Home & services ──">
                  <option value="handymen">Handymen</option>
                  <option value="locksmiths">Locksmiths</option>
                  <option value="lawn care">Lawn Care</option>
                  <option value="plumbers">Plumbers</option>
                  <option value="electricians">Electricians</option>
                  <option value="cleaning services">Cleaning</option>
                  <option value="pet groomers">Pet Groomers</option>
                </optgroup>
                <optgroup label="── Retail & professional ──">
                  <option value="florists">Florists</option>
                  <option value="ethnic markets">Ethnic Markets</option>
                  <option value="tax preparers">Tax Preparers</option>
                  <option value="dentists">Dentists</option>
                </optgroup>
              </select>
              <button onClick={handleDiscover} disabled={discovering} style={{
                ...S.btn("#6366f1"), padding: "12px 28px",
                opacity: discovering ? .6 : 1, cursor: discovering ? "not-allowed" : "pointer",
              }}>{discovering ? "🔎 Searching..." : "Discover"}</button>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, fontSize: 12, color: "#94a3b8", flexWrap: "wrap" }}>
              {!category && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={deepScan} onChange={e => setDeepScan(e.target.checked)} style={{ accentColor: "#8b5cf6" }} />
                  <span>Deep scan (49 categories, ~$6 each)</span>
                </label>
              )}
              <span style={{ color: "#475569", marginLeft: "auto" }}>💡 Re-searching same area is nearly free (cached)</span>
            </div>

            {discoverMeta && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 24, display: "flex", gap: 18, flexWrap: "wrap" }}>
                <span>🔎 Scanned <b style={{ color: "#94a3b8" }}>{discoverMeta.scanned}</b> across <b style={{ color: "#94a3b8" }}>{discoverMeta.queries_used}</b> {discoverMeta.queries_used === 1 ? "query" : "categories"}</span>
                <span>📋 Checked <b style={{ color: "#94a3b8" }}>{discoverMeta.details_checked}</b> ({discoverMeta.details_from_cache || 0} from cache)</span>
                <span style={{ color: "#10b981" }}>✅ Found <b>{discoverMeta.count}</b> without a website</span>
                {discoverMeta.estimated_cost_usd && (
                  <span style={{ color: "#fbbf24" }}>💰 Est. cost: <b>${discoverMeta.estimated_cost_usd}</b></span>
                )}
              </div>
            )}

            {discoverResults.length === 0 && !discovering && (
              <div style={{ textAlign: "center", padding: 90, color: "#475569" }}>
                <div style={{ fontSize: 50, marginBottom: 14 }}>🌎</div>
                <div style={{ fontSize: 14 }}>Enter an area to discover local businesses.</div>
              </div>
            )}

            {discoverResults.map((biz, i) => {
              const hero = biz.photos?.[0] ? photoUrl(biz.photos[0]) : null;
              const liveUrl = builtUrls[i];
              return (
                <div key={biz.place_id || i} style={{ ...S.card, display: "flex", gap: 18 }}>
                  {hero ? (
                    <div style={{ width: 150, minWidth: 150, height: 150, borderRadius: 10, background: `url('${hero}') center/cover`, border: "1px solid rgba(255,255,255,.05)" }} />
                  ) : (
                    <div style={{ width: 150, minWidth: 150, height: 150, borderRadius: 10, background: "linear-gradient(135deg,#1e293b,#0f172a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#475569" }}>📷</div>
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{biz.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{biz.category} · {biz.address}</div>
                      {biz.phone && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>📞 {biz.phone}</div>}
                      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, flexWrap: "wrap" }}>
                        <span style={{ color: "#fbbf24" }}>★ {biz.rating} ({biz.review_count})</span>
                        <span style={{ color: "#ef4444" }}>🚫 No website</span>
                        <span style={{ color: "#10b981" }}>📷 {biz.photos?.length || 0} photos</span>
                        <span style={{ color: "#a78bfa" }}>💬 {biz.reviews?.length || 0} reviews</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {liveUrl ? (
                        <>
                          <a href={liveUrl} target="_blank" rel="noreferrer" style={{ ...S.btn("#10b981"), display: "inline-block", textDecoration: "none" }}>🌐 Open Site</a>
                          <button onClick={() => handleBuild(biz, i)} disabled={building[i]} style={{ ...S.btn("#1e293b"), cursor: building[i] ? "not-allowed" : "pointer", opacity: building[i] ? .6 : 1 }}>
                            {building[i] ? "⏳ Rebuilding..." : "🔄 Regenerate"}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleBuild(biz, i)} disabled={building[i]} style={{ ...S.btn(building[i] ? "#475569" : "#8b5cf6"), cursor: building[i] ? "not-allowed" : "pointer", opacity: building[i] ? .65 : 1 }}>
                          {building[i] ? "⏳ Generating (~60s)..." : "⚡ Build Unique Site"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {page === "url" && (
          <div style={{ padding: "40px 48px", maxWidth: 820 }}>
            <h1 style={S.h1}>Build from a Google Profile URL</h1>
            <p style={S.subt}>Paste any Google Maps link — we pull real data and design a one-of-a-kind site.</p>

            <div style={{ ...S.card, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFromUrl()}
                  placeholder="https://maps.google.com/... or maps.app.goo.gl/..." style={S.input} />
                <button onClick={handleFromUrl} disabled={urlLoading} style={{
                  ...S.btn("#6366f1"), padding: "12px 28px",
                  opacity: urlLoading ? .6 : 1, cursor: urlLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                }}>{urlLoading ? "⏳ Building..." : "⚡ Build"}</button>
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>
                Supports: maps.google.com · google.com/maps/place/ · maps.app.goo.gl · share.google
              </div>
            </div>

            {urlResult && (
              <div style={{ background: "rgba(16,185,129,.07)", border: "1px solid #10b981", borderRadius: 14, padding: 22 }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                  {urlResult.business?.photos_json?.[0] && (
                    <div style={{ width: 100, height: 100, borderRadius: 10, background: `url('${photoUrl(urlResult.business.photos_json[0])}') center/cover` }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>✅ Site Built</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{urlResult.business?.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{urlResult.business?.category} · {urlResult.business?.address}</div>
                  </div>
                </div>
                <a href={urlResult.previewUrl} target="_blank" rel="noreferrer" style={{
                  display: "block", padding: 14, background: "#10b981", color: "#fff", borderRadius: 10,
                  fontWeight: 700, textAlign: "center", textDecoration: "none",
                }}>🌐 Open Preview Site</a>
              </div>
            )}
          </div>
        )}

        {page === "pipeline" && (
          <div style={{ padding: "40px 48px" }}>
            <h1 style={S.h1}>Pipeline</h1>
            <p style={S.subt}>All your generated sites. Click any to manage status, download, or rebuild.</p>
            {businesses.length === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", marginTop: 80 }}>
                <div style={{ fontSize: 50, marginBottom: 14 }}>📋</div>
                <div>No businesses yet — head to Discover or From URL.</div>
              </div>
            ) : businesses.map(biz => {
              const previewUrl = getPreviewUrl(biz);
              const thumb = (biz.photos_json || [])[0];
              return (
                <div key={biz.id} onClick={() => setSelected(biz)} style={{
                  ...S.card, display: "flex", gap: 16, alignItems: "center", cursor: "pointer",
                  border: selected?.id === biz.id ? "1px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.06)",
                  background: selected?.id === biz.id ? "rgba(99,102,241,.05)" : S.card.background,
                }}>
                  {thumb ? (
                    <div style={{ width: 64, height: 64, minWidth: 64, borderRadius: 8, background: `url('${photoUrl(thumb)}') center/cover` }} />
                  ) : (
                    <div style={{ width: 64, height: 64, minWidth: 64, borderRadius: 8, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>📷</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{biz.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{biz.category} · {biz.address || "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {previewUrl && (
                      <button onClick={e => { e.stopPropagation(); window.open(previewUrl, "_blank"); }}
                        style={{ ...S.btn("#10b981"), fontSize: 12, padding: "6px 14px" }}>View Site</button>
                    )}
                    <span style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: STATUS_COLORS[biz.status] + "22", color: STATUS_COLORS[biz.status], textTransform: "capitalize",
                    }}>{biz.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {page === "users" && user.role === "admin" && (
          <UsersPage onNotify={notify} />
        )}

        {page === "account" && (
          <AccountPage user={user} onNotify={notify} onLogout={onLogout} />
        )}
      </div>

      {selected && (
        <div style={{ width: 400, background: "#0a0a14", borderLeft: "1px solid rgba(255,255,255,.06)", padding: 28, overflow: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{selected.name}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 22 }}>×</button>
          </div>

          {(selected.photos_json || [])[0] && (
            <div style={{ width: "100%", height: 160, borderRadius: 12, background: `url('${photoUrl(selected.photos_json[0])}') center/cover` }} />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#94a3b8" }}>
            {selected.address && <div>📍 {selected.address}</div>}
            {selected.phone && <div>📞 {selected.phone}</div>}
            {selected.category && <div>🏷️ {selected.category}</div>}
            {selected.rating > 0 && <div>⭐ {selected.rating} ({selected.review_count} reviews)</div>}
            {selected.website
              ? <div style={{ color: "#10b981" }}>🌐 Has website</div>
              : <div style={{ color: "#ef4444" }}>🌐 No website — opportunity!</div>}
          </div>

          {getPreviewUrl(selected) && (
            <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.3)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>✓ SITE LIVE</div>
              <a href={getPreviewUrl(selected)} target="_blank" rel="noreferrer" style={{
                display: "block", padding: 11, background: "#10b981", color: "#fff",
                borderRadius: 8, textDecoration: "none", textAlign: "center", fontWeight: 600, marginBottom: 8,
              }}>Open Preview ↗</a>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => downloadHtml(selected.id, selected.name)} style={{
                  flex: 1, padding: 10, background: "rgba(255,255,255,.05)", color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, cursor: "pointer",
                  fontWeight: 600, fontSize: 12, fontFamily: "inherit",
                }}>⬇ Download HTML</button>
                <button onClick={() => setShowDomainModal(selected)} style={{
                  flex: 1, padding: 10, background: "rgba(255,255,255,.05)", color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, cursor: "pointer",
                  fontWeight: 600, fontSize: 12, fontFamily: "inherit",
                }}>🌐 Attach Domain</button>
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>Status</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUS_LIST.map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                  padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                  cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit",
                  background: selected.status === s ? STATUS_COLORS[s] : STATUS_COLORS[s] + "22",
                  color: selected.status === s ? "#fff" : STATUS_COLORS[s],
                  border: `1px solid ${STATUS_COLORS[s]}`,
                }}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 2 }}>Notes</div>
            <textarea id={`notes-${selected.id}`} defaultValue={selected.notes || ""}
              placeholder="Meeting notes, contact attempts, deal terms..."
              style={{ width: "100%", height: 90, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: 10, color: "#e2e8f0", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            <button onClick={() => saveNotes(selected.id, document.getElementById(`notes-${selected.id}`)?.value || "")}
              style={{ marginTop: 8, width: "100%", padding: 9, background: "rgba(255,255,255,.05)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>Save Notes</button>
          </div>

          <button onClick={() => rebuildSite(selected.id)} style={{
            padding: 13, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
          }}>🔄 Regenerate Unique Site</button>
        </div>
      )}

      {showDomainModal && (
        <DomainModal business={showDomainModal} onClose={() => setShowDomainModal(null)} onDownload={() => downloadHtml(showDomainModal.id, showDomainModal.name)} />
      )}

      {notification && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "13px 22px",
          background: notification.type === "error" ? "#ef4444" : "#10b981",
          color: "#fff", borderRadius: 10, fontWeight: 500, fontSize: 13,
          boxShadow: "0 10px 30px rgba(0,0,0,.4)", zIndex: 9999, maxWidth: 380,
        }}>{notification.msg}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
function UsersPage({ onNotify }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try { const d = await api("GET", "api/auth/users"); setUsers(d.users || []); }
    catch (e) { onNotify(e.message, "error"); }
  };
  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await api("POST", "api/auth/users", { email, password, name, role });
      setEmail(""); setPassword(""); setName(""); setRole("user");
      onNotify("✅ User created"); load();
    } catch (e) { onNotify(e.message, "error"); }
    setCreating(false);
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user permanently?")) return;
    try { await api("DELETE", `api/auth/users/${id}`); onNotify("User deleted"); load(); }
    catch (e) { onNotify(e.message, "error"); }
  };

  const input = { padding: "11px 14px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Team</h1>
      <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>Create accounts for your teammates. They'll be able to sign in and use the system.</p>

      <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.01))", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 22, marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Create new user</h3>
        <form onSubmit={createUser} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" style={input} />
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" required style={input} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password (min 8 chars)" minLength={8} required style={input} />
          <select value={role} onChange={e => setRole(e.target.value)} style={{ ...input, cursor: "pointer" }}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={creating} style={{
            gridColumn: "1 / 3", padding: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff", border: "none", borderRadius: 10, cursor: creating ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 14, opacity: creating ? .6 : 1, fontFamily: "inherit",
          }}>{creating ? "Creating…" : "Create User"}</button>
        </form>
      </div>

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#94a3b8" }}>Active users ({users.length})</h3>
        {users.map(u => (
          <div key={u.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: 14,
            background: "linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.01))",
            border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, marginBottom: 10,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: u.role === "admin" ? "linear-gradient(135deg,#a855f7,#c084fc)" : "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
              {(u.name || u.email)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || u.email.split("@")[0]}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>
            </div>
            <span style={{
              padding: "4px 11px", borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
              background: u.role === "admin" ? "rgba(168,85,247,.18)" : "rgba(99,102,241,.18)",
              color: u.role === "admin" ? "#c084fc" : "#a5b4fc",
            }}>{u.role}</span>
            <button onClick={() => deleteUser(u.id)} title="Delete user" style={{
              background: "none", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5",
              padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
function AccountPage({ user, onNotify, onLogout }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);

  const change = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api("POST", "api/auth/change-password", { current_password: current, new_password: next });
      onNotify("✅ Password changed");
      setCurrent(""); setNext("");
    } catch (e) { onNotify(e.message, "error"); }
    setLoading(false);
  };

  const input = { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 520 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>Account</h1>
      <p style={{ color: "#64748b", marginBottom: 28, fontSize: 14 }}>Manage your account settings.</p>

      <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.01))", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Signed in as</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{user.name || "—"}</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{user.email}</div>
        <div style={{ marginTop: 12, display: "inline-block", padding: "4px 11px", borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, background: user.role === "admin" ? "rgba(168,85,247,.18)" : "rgba(99,102,241,.18)", color: user.role === "admin" ? "#c084fc" : "#a5b4fc" }}>{user.role}</div>
      </div>

      <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.01))", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Change password</h3>
        <form onSubmit={change} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current password" required style={input} />
          <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="New password (min 8)" minLength={8} required style={input} />
          <button type="submit" disabled={loading} style={{
            padding: 11, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 14, opacity: loading ? .6 : 1, fontFamily: "inherit", marginTop: 4,
          }}>{loading ? "Updating…" : "Change Password"}</button>
        </form>
      </div>

      <button onClick={onLogout} style={{
        width: "100%", padding: 12, background: "transparent",
        border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5",
        borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit",
      }}>Log out</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
function DomainModal({ business, onClose, onDownload }) {
  const [domain, setDomain] = useState("");
  const safeName = (business.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const d = domain || "yourdomain.com";

  const nginx = `# /etc/nginx/sites-available/${d}
server {
    listen 80;
    server_name ${d} www.${d};
    root /var/www/${d};
    index index.html;
    location / { try_files $uri /index.html; }
}`;

  const copy = (txt) => { navigator.clipboard.writeText(txt); };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0a0a14", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20,
        padding: 32, maxWidth: 680, width: "100%", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Attach a custom domain</h2>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Self-host <b style={{ color: "#a5b4fc" }}>{business.name}</b> on your VPS</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 18 }}>
          The site's images load from sitesprint backend via absolute URLs — they keep working anywhere you host the HTML.
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Your client's domain</label>
          <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="clientdomain.com"
            style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>

        <ol style={{ paddingLeft: 22, lineHeight: 1.9, fontSize: 13, color: "#cbd5e1", marginBottom: 16 }}>
          <li>
            <b style={{ color: "#e2e8f0" }}>Point DNS to your VPS</b>
            <div style={{ fontSize: 12, color: "#64748b" }}>In your domain registrar, create an A record: <code style={{ color: "#a5b4fc" }}>{d}</code> → your VPS IP</div>
          </li>
          <li>
            <b style={{ color: "#e2e8f0" }}>Download the site HTML</b>
            <div style={{ marginTop: 6 }}>
              <button onClick={onDownload} style={{
                padding: "8px 14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit",
              }}>⬇ Download {safeName}.html</button>
            </div>
          </li>
          <li>
            <b style={{ color: "#e2e8f0" }}>Upload to VPS & configure Nginx</b>
            <Code text={`sudo mkdir -p /var/www/${d}
# upload your HTML there as index.html:
scp ${safeName}.html user@vps:/var/www/${d}/index.html`} onCopy={copy} />
            <Code text={nginx} onCopy={copy} />
            <Code text={`sudo ln -s /etc/nginx/sites-available/${d} /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx`} onCopy={copy} />
          </li>
          <li>
            <b style={{ color: "#e2e8f0" }}>Add HTTPS (free with Let's Encrypt)</b>
            <Code text={`sudo certbot --nginx -d ${d} -d www.${d}`} onCopy={copy} />
          </li>
        </ol>

        <div style={{ padding: 14, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 10, fontSize: 12, color: "#a5b4fc" }}>
          💡 <b>Tip:</b> For multiple client sites, repeat for each domain. Each gets its own Nginx config and folder.
          DNS usually takes 5–30 min to propagate.
        </div>
      </div>
    </div>
  );
}

function Code({ text, onCopy }) {
  return (
    <div style={{ position: "relative", marginTop: 8, marginBottom: 8 }}>
      <pre style={{
        background: "#06060c", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8,
        padding: "12px 14px", fontSize: 11.5, color: "#a5b4fc", overflow: "auto",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace", margin: 0,
      }}>{text}</pre>
      <button onClick={() => onCopy(text)} style={{
        position: "absolute", top: 6, right: 6,
        background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
        color: "#94a3b8", padding: "3px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer",
        fontFamily: "inherit",
      }}>Copy</button>
    </div>
  );
}
