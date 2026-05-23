import { useState, useEffect } from "react";

const API = "https://sitesprint-backend-production.up.railway.app";

const api = async (method, path, body) => {
  const r = await fetch(`${API}/${path.replace(/^\//, "")}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(text || `HTTP ${r.status}`); }
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
};

const STATUS_COLORS = {
  prospect: "#6366f1",
  "site shown": "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
  delivered: "#8b5cf6",
};
const STATUS_LIST = ["prospect", "site shown", "approved", "rejected", "delivered"];

// Absolute URL for any photo (DB photos are stored as /photo?ref=...)
const photoUrl = (p) => (p?.startsWith("http") ? p : `${API}${p}`);

export default function App() {
  const [page, setPage] = useState("discover");
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notification, setNotification] = useState(null);

  // Discover
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [discoverResults, setDiscoverResults] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverMeta, setDiscoverMeta] = useState(null);

  // URL
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState(null);

  // Build state
  const [building, setBuilding] = useState({});
  const [builtUrls, setBuiltUrls] = useState({});

  useEffect(() => { loadBusinesses(); }, []);

  const loadBusinesses = async () => {
    try { setBusinesses(await api("GET", "api/businesses")); }
    catch (e) { notify("Load failed: " + e.message, "error"); }
  };

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── DISCOVER ───────────────────────────────────────────────────
  const handleDiscover = async () => {
    if (!area.trim()) return;
    setDiscovering(true);
    setDiscoverResults([]);
    setDiscoverMeta(null);
    setBuiltUrls({});
    try {
      const r = await api("POST", "api/discover", {
        area: area.trim(),
        category: category || undefined,
        limit: 50,
        deep: deepScan,
      });
      setDiscoverResults(r.businesses || []);
      setDiscoverMeta({
        scanned: r.scanned,
        count: r.count,
        queries_used: r.queries_used,
        details_checked: r.details_checked,
        details_from_cache: r.details_from_cache,
        estimated_cost_usd: r.estimated_cost_usd,
      });
      if (!r.businesses?.length) notify("No website-less businesses found here. Try a wider area.", "error");
      else notify(`Found ${r.businesses.length} businesses without a website!`);
    } catch (e) {
      notify("Discovery failed: " + e.message, "error");
    }
    setDiscovering(false);
  };

  // ── BUILD ──────────────────────────────────────────────────────
  const handleBuild = async (biz, idx) => {
    setBuilding(prev => ({ ...prev, [idx]: true }));
    try {
      const r = await api("POST", "api/build", {
        place_id: biz.place_id,
        area_searched: area,
      });
      const fullUrl = `${API}${r.previewUrl}`;
      setBuiltUrls(prev => ({ ...prev, [idx]: fullUrl }));
      await loadBusinesses();
      notify("✅ Unique site generated for " + biz.name);
    } catch (e) {
      notify("Build failed: " + e.message, "error");
    }
    setBuilding(prev => ({ ...prev, [idx]: false }));
  };

  // ── FROM URL ───────────────────────────────────────────────────
  const handleFromUrl = async () => {
    if (!url.trim()) return;
    setUrlLoading(true);
    setUrlResult(null);
    try {
      const r = await api("POST", "api/from-url", { url: url.trim() });
      setUrlResult({ ...r, previewUrl: `${API}${r.previewUrl}` });
      await loadBusinesses();
      notify("✅ Unique site generated!");
    } catch (e) {
      notify("Failed: " + e.message, "error");
    }
    setUrlLoading(false);
  };

  // ── PIPELINE ───────────────────────────────────────────────────
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
      setBusinesses(all);
      setSelected(all.find(b => b.id === id));
      notify("✅ Fresh unique site built!");
    } catch (e) { notify(e.message, "error"); }
  };

  const saveNotes = async (id, notes) => {
    try {
      await api("PUT", `api/businesses/${id}`, { notes });
      notify("Notes saved");
    } catch (e) { notify(e.message, "error"); }
  };

  const getPreviewUrl = (biz) => biz?.preview_slug ? `${API}/preview/${biz.preview_slug}` : null;

  const pipelineCount = STATUS_LIST.reduce((acc, s) => {
    acc[s] = businesses.filter(b => b.status === s).length; return acc;
  }, {});

  // ── styles ─────────────────────────────────────────────────────
  const S = {
    sidebar: { width: 220, background: "#0a0a12", borderRight: "1px solid #1c1c28", display: "flex", flexDirection: "column", padding: "22px 0" },
    main: { flex: 1, overflow: "auto" },
    card: { background: "#14141e", border: "1px solid #1c1c28", borderRadius: 14, padding: 18, marginBottom: 14 },
    btn: (bg = "#6366f1") => ({ padding: "9px 18px", background: bg, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13 }),
    input: { flex: 1, padding: "12px 16px", background: "#0a0a12", border: "1px solid #2a2a3a", borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none" },
    h1: { fontSize: 27, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 },
    subt: { color: "#64748b", marginBottom: 26, fontSize: 14 },
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif", background: "#06060c", color: "#e2e8f0" }}>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ padding: "0 22px 22px", borderBottom: "1px solid #1c1c28" }}>
          <div style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SiteSprint</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>AI sites for local biz</div>
        </div>
        <div style={{ padding: "14px 0" }}>
          {[
            { id: "discover", icon: "🔍", label: "Discover" },
            { id: "url", icon: "🔗", label: "From URL" },
            { id: "pipeline", icon: "📋", label: `Pipeline (${businesses.length})` },
          ].map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{
              width: "100%", padding: "11px 22px",
              background: page === p.id ? "rgba(99,102,241,.13)" : "transparent",
              borderLeft: page === p.id ? "3px solid #6366f1" : "3px solid transparent",
              color: page === p.id ? "#a5b4fc" : "#94a3b8",
              border: "none", cursor: "pointer", textAlign: "left",
              fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        {page === "pipeline" && businesses.length > 0 && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid #1c1c28", marginTop: 12 }}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>By status</div>
            {STATUS_LIST.map(s => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: STATUS_COLORS[s], textTransform: "capitalize" }}>{s}</span>
                <span style={{ color: "#64748b" }}>{pipelineCount[s] || 0}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", padding: "16px 22px", borderTop: "1px solid #1c1c28", fontSize: 10, color: "#475569" }}>
          v9 · Real Google + AI-unique
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>

        {/* DISCOVER */}
        {page === "discover" && (
          <div style={{ padding: "40px 48px", maxWidth: 980 }}>
            <h1 style={S.h1}>Find Businesses Without Websites</h1>
            <p style={S.subt}>Pulls real Google profiles in any area — filters out ones that already have a site. Click Build for a fully unique AI-designed site.</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
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
                  <option value="beauty salons">Beauty Salons</option>
                  <option value="tattoo shops">Tattoo Shops</option>
                  <option value="piercing studios">Piercing Studios</option>
                  <option value="lash studios">Lash Studios</option>
                  <option value="brow studios">Brow Studios</option>
                  <option value="massage therapists">Massage Therapists</option>
                  <option value="tailors">Tailors</option>
                  <option value="dry cleaners">Dry Cleaners</option>
                  <option value="shoe repair">Shoe Repair</option>
                </optgroup>
                <optgroup label="── Auto ──">
                  <option value="auto repair">Auto Repair</option>
                  <option value="tire shops">Tire Shops</option>
                  <option value="car detailing">Car Detailing</option>
                  <option value="car wash">Car Wash</option>
                  <option value="auto body shops">Auto Body</option>
                  <option value="oil change shops">Oil Change</option>
                  <option value="mobile mechanics">Mobile Mechanics</option>
                  <option value="auto glass repair">Auto Glass</option>
                </optgroup>
                <optgroup label="── Food ──">
                  <option value="taquerias">Taquerias</option>
                  <option value="food trucks">Food Trucks</option>
                  <option value="donut shops">Donut Shops</option>
                  <option value="ice cream shops">Ice Cream Shops</option>
                  <option value="small family restaurants">Small Restaurants</option>
                  <option value="bakeries">Bakeries</option>
                  <option value="sandwich shops">Sandwich Shops</option>
                  <option value="pizzerias">Pizzerias</option>
                  <option value="bbq joints">BBQ Joints</option>
                  <option value="juice bars">Juice Bars</option>
                  <option value="smoothie shops">Smoothie Shops</option>
                  <option value="boba tea shops">Boba Tea</option>
                  <option value="halal restaurants">Halal Restaurants</option>
                  <option value="vietnamese restaurants">Vietnamese</option>
                  <option value="ethiopian restaurants">Ethiopian</option>
                  <option value="cafes">Cafes</option>
                </optgroup>
                <optgroup label="── Home & services ──">
                  <option value="handymen">Handymen</option>
                  <option value="locksmiths">Locksmiths</option>
                  <option value="lawn care">Lawn Care</option>
                  <option value="plumbers">Plumbers</option>
                  <option value="electricians">Electricians</option>
                  <option value="cleaning services">Cleaning</option>
                  <option value="pet groomers">Pet Groomers</option>
                  <option value="junk removal">Junk Removal</option>
                  <option value="moving companies">Moving</option>
                  <option value="painters">Painters</option>
                  <option value="fence contractors">Fence</option>
                  <option value="hvac repair">HVAC Repair</option>
                </optgroup>
                <optgroup label="── Retail ──">
                  <option value="convenience stores">Convenience Stores</option>
                  <option value="ethnic markets">Ethnic Markets</option>
                  <option value="florists">Florists</option>
                  <option value="smoke shops">Smoke Shops</option>
                  <option value="thrift stores">Thrift Stores</option>
                  <option value="consignment shops">Consignment</option>
                </optgroup>
                <optgroup label="── Professional & specialty ──">
                  <option value="tax preparers">Tax Preparers</option>
                  <option value="notaries">Notaries</option>
                  <option value="tutors">Tutors</option>
                  <option value="music lessons">Music Lessons</option>
                  <option value="dance studios">Dance Studios</option>
                  <option value="martial arts dojos">Martial Arts</option>
                  <option value="photographers">Photographers</option>
                  <option value="dentists">Dentists</option>
                  <option value="medical clinics">Medical Clinics</option>
                  <option value="lawyers">Lawyers</option>
                </optgroup>
              </select>
              <button onClick={handleDiscover} disabled={discovering} style={{
                ...S.btn("#6366f1"), padding: "12px 28px",
                opacity: discovering ? .6 : 1, cursor: discovering ? "not-allowed" : "pointer",
              }}>
                {discovering ? "🔎 Searching..." : "Discover"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, fontSize: 12, color: "#94a3b8", flexWrap: "wrap" }}>
              {!category && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={deepScan} onChange={e => setDeepScan(e.target.checked)} style={{ accentColor: "#8b5cf6" }} />
                  <span>Deep scan (49 categories, ~$6 each — 3x more results, 3x cost)</span>
                </label>
              )}
              <span style={{ color: "#475569", marginLeft: "auto" }}>
                💡 Re-searching same area is nearly free (place details cached in DB)
              </span>
            </div>

            {discoverMeta && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 24, display: "flex", gap: 18, flexWrap: "wrap" }}>
                <span>🔎 Scanned <b style={{ color: "#94a3b8" }}>{discoverMeta.scanned}</b> across <b style={{ color: "#94a3b8" }}>{discoverMeta.queries_used}</b> {discoverMeta.queries_used === 1 ? "query" : "categories"}</span>
                <span>📋 Checked <b style={{ color: "#94a3b8" }}>{discoverMeta.details_checked}</b> ({discoverMeta.details_from_cache || 0} from cache)</span>
                <span style={{ color: "#10b981" }}>✅ Found <b>{discoverMeta.count}</b> without a website</span>
                {discoverMeta.estimated_cost_usd && (
                  <span style={{ color: "#fbbf24" }}>💰 Est. Google cost: <b>${discoverMeta.estimated_cost_usd}</b></span>
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
                    <div style={{ width: 150, minWidth: 150, height: 150, borderRadius: 10, background: `url('${hero}') center/cover`, border: "1px solid #1c1c28" }} />
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
                          <button onClick={() => handleBuild(biz, i)} disabled={building[i]} style={{
                            ...S.btn("#1e293b"),
                            cursor: building[i] ? "not-allowed" : "pointer", opacity: building[i] ? .6 : 1,
                          }}>{building[i] ? "⏳ Rebuilding..." : "🔄 Regenerate"}</button>
                        </>
                      ) : (
                        <button onClick={() => handleBuild(biz, i)} disabled={building[i]} style={{
                          ...S.btn("#8b5cf6"),
                          cursor: building[i] ? "not-allowed" : "pointer", opacity: building[i] ? .65 : 1,
                        }}>
                          {building[i] ? "⏳ Generating unique site (~60s)..." : "⚡ Build Unique Site"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FROM URL */}
        {page === "url" && (
          <div style={{ padding: "40px 48px", maxWidth: 820 }}>
            <h1 style={S.h1}>Build from a Google Profile URL</h1>
            <p style={S.subt}>Paste any Google Maps link — we pull the business's real data and design a one-of-a-kind site.</p>

            <div style={{ background: "#14141e", border: "1px solid #1c1c28", borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFromUrl()}
                  placeholder="https://maps.google.com/... or maps.app.goo.gl/..." style={S.input} />
                <button onClick={handleFromUrl} disabled={urlLoading} style={{
                  ...S.btn("#6366f1"), padding: "12px 28px",
                  opacity: urlLoading ? .6 : 1, cursor: urlLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                }}>
                  {urlLoading ? "⏳ Building..." : "⚡ Build"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>
                Supports: maps.google.com · google.com/maps/place/ · maps.app.goo.gl · share.google
              </div>
            </div>

            <div style={{ background: "rgba(34,197,94,.04)", border: "1px solid rgba(34,197,94,.18)", borderRadius: 12, padding: 18, marginBottom: 22 }}>
              <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 10 }}>💡 How it works</div>
              <ol style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.9, paddingLeft: 22 }}>
                <li>Pulls real business name, phone, address, hours, photos, and reviews from Google</li>
                <li>Sends data to Claude to design a unique site for THIS specific business</li>
                <li>Every site looks different — no fixed templates</li>
              </ol>
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
                    {urlResult.business?.rating > 0 && (
                      <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 4 }}>★ {urlResult.business.rating} ({urlResult.business.review_count} reviews)</div>
                    )}
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

        {/* PIPELINE */}
        {page === "pipeline" && (
          <div style={{ padding: "40px 48px" }}>
            <h1 style={S.h1}>Pipeline</h1>
            {businesses.length === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", marginTop: 80 }}>
                <div style={{ fontSize: 50, marginBottom: 14 }}>📋</div>
                <div>No businesses yet — go to Discover or From URL.</div>
              </div>
            ) : businesses.map(biz => {
              const previewUrl = getPreviewUrl(biz);
              const thumb = (biz.photos_json || [])[0];
              return (
                <div key={biz.id} onClick={() => setSelected(biz)} style={{
                  ...S.card, display: "flex", gap: 16, alignItems: "center",
                  cursor: "pointer", border: `1px solid ${selected?.id === biz.id ? "#6366f1" : "#1c1c28"}`,
                  background: selected?.id === biz.id ? "#181826" : "#14141e",
                }}>
                  {thumb ? (
                    <div style={{ width: 64, height: 64, minWidth: 64, borderRadius: 8, background: `url('${photoUrl(thumb)}') center/cover` }} />
                  ) : (
                    <div style={{ width: 64, height: 64, minWidth: 64, borderRadius: 8, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>📷</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{biz.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{biz.category} · {biz.address || "—"}</div>
                    {biz.place_id && <div style={{ fontSize: 10, color: "#4ade80", marginTop: 3 }}>📍 Real Google data</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {previewUrl && (
                      <button onClick={e => { e.stopPropagation(); window.open(previewUrl, "_blank"); }}
                        style={{ ...S.btn("#10b981"), fontSize: 12, padding: "6px 14px" }}>View Site</button>
                    )}
                    <span style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: STATUS_COLORS[biz.status] + "22",
                      color: STATUS_COLORS[biz.status],
                      textTransform: "capitalize",
                    }}>
                      {biz.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL PANEL */}
      {selected && (
        <div style={{ width: 380, background: "#0a0a12", borderLeft: "1px solid #1c1c28", padding: 26, overflow: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{selected.name}</h2>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 22 }}>×</button>
          </div>

          {(selected.photos_json || [])[0] && (
            <div style={{ width: "100%", height: 150, borderRadius: 10, background: `url('${photoUrl(selected.photos_json[0])}') center/cover` }} />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#94a3b8" }}>
            {selected.address && <div>📍 {selected.address}</div>}
            {selected.phone && <div>📞 {selected.phone}</div>}
            {selected.category && <div>🏷️ {selected.category}</div>}
            {selected.rating > 0 && <div>⭐ {selected.rating} ({selected.review_count} reviews)</div>}
            {selected.website
              ? <div style={{ color: "#10b981" }}>🌐 Has website</div>
              : <div style={{ color: "#ef4444" }}>🌐 No website — opportunity!</div>}
            {selected.place_id && <div style={{ color: "#4ade80", fontSize: 12 }}>✅ Real Google data ({selected.reviews_json?.length || 0} reviews, {selected.photos_json?.length || 0} photos saved)</div>}
          </div>

          {getPreviewUrl(selected) && (
            <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid #10b981", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 10 }}>✓ SITE LIVE</div>
              <a href={getPreviewUrl(selected)} target="_blank" rel="noreferrer" style={{
                display: "block", padding: 10, background: "#10b981", color: "#fff",
                borderRadius: 6, textDecoration: "none", textAlign: "center", fontWeight: 600,
              }}>Open Preview ↗</a>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 2 }}>Status</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUS_LIST.map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                  padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                  cursor: "pointer", textTransform: "capitalize",
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
              style={{ width: "100%", height: 90, background: "#14141e", border: "1px solid #2a2a3a", borderRadius: 8, padding: 10, color: "#e2e8f0", fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            <button onClick={() => saveNotes(selected.id, document.getElementById(`notes-${selected.id}`)?.value || "")}
              style={{ marginTop: 8, ...S.btn("#1e293b"), color: "#e2e8f0", width: "100%" }}>Save Notes</button>
          </div>

          <button onClick={() => rebuildSite(selected.id)} style={{
            padding: 13, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14,
          }}>🔄 Regenerate Unique Site</button>
          <div style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: -10 }}>
            Each regeneration is a fresh unique design (~60s)
          </div>
        </div>
      )}

      {notification && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          padding: "13px 22px",
          background: notification.type === "error" ? "#ef4444" : "#10b981",
          color: "#fff", borderRadius: 10, fontWeight: 500, fontSize: 13,
          boxShadow: "0 10px 30px rgba(0,0,0,.4)", zIndex: 9999, maxWidth: 380,
        }}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
