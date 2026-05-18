import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const STATUSES = [
  { key:"prospect",  label:"Prospect",     color:"#6b7280", bg:"#f3f4f6", dot:"#9ca3af" },
  { key:"shown",     label:"Site Shown",   color:"#d97706", bg:"#fffbeb", dot:"#f59e0b" },
  { key:"approved",  label:"Approved ✅",  color:"#059669", bg:"#ecfdf5", dot:"#10b981" },
  { key:"rejected",  label:"Rejected ❌",  color:"#dc2626", bg:"#fef2f2", dot:"#ef4444" },
  { key:"delivered", label:"Delivered 🚀", color:"#7c3aed", bg:"#f5f3ff", dot:"#8b5cf6" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]));

// ─── API ─────────────────────────────────────────────────────────────────────
async function apiFetch(method, path, body) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function catIcon(cat = "") {
  if (/auto|glass|windshield|car/i.test(cat)) return "🪟";
  if (/food|restaurant|grill|pizza/i.test(cat)) return "🍽️";
  if (/salon|hair|beauty|nail/i.test(cat)) return "💇";
  if (/clean/i.test(cat)) return "🧹";
  if (/landscape|lawn/i.test(cat)) return "🌿";
  if (/tutor|school/i.test(cat)) return "📚";
  return "🏢";
}

function StatusBadge({ status, sm }) {
  const s = STATUS_MAP[status] || STATUSES[0];
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background:s.bg, color:s.color,
      padding:sm?"2px 9px":"4px 12px", borderRadius:50,
      fontSize:sm?10:11, fontWeight:600,
      border:`1px solid ${s.dot}44`, whiteSpace:"nowrap"
    }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:s.dot, display:"inline-block" }}/>
      {s.label}
    </span>
  );
}

function Spinner({ size=14, dark=false }) {
  return <span style={{
    display:"inline-block", width:size, height:size,
    border:`2px solid ${dark?"rgba(0,0,0,.15)":"rgba(255,255,255,.3)"}`,
    borderTopColor:dark?"#333":"#fff",
    borderRadius:"50%", animation:"spin .7s linear infinite",
    flexShrink:0
  }}/>;
}

function Btn({ onClick, disabled, style={}, children, variant="dark" }) {
  const base = {
    border:"none", cursor:disabled?"not-allowed":"pointer",
    borderRadius:9, fontWeight:700, fontSize:12,
    display:"inline-flex", alignItems:"center", gap:6,
    padding:"9px 16px", transition:".15s", opacity:disabled?.6:1,
    fontFamily:"inherit",
  };
  const variants = {
    dark:  { background:"#111", color:"#fff" },
    green: { background:"#10b981", color:"#fff" },
    red:   { background:"#fef2f2", color:"#ef4444" },
    ghost: { background:"#f3f4f6", color:"#374151" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ─── AREA SEARCH ─────────────────────────────────────────────────────────────
function AreaSearch({ onAdded }) {
  const [area, setArea]         = useState("Ballantyne, Charlotte NC");
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [building, setBuilding] = useState(new Set());
  const [liveUrls, setLiveUrls] = useState({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function doSearch() {
    if (!area.trim()) return;
    setLoading(true); setError(""); setResults([]); setSelected(new Set()); setLiveUrls({});
    try {
      const data = await apiFetch("POST", "api/search", { area });
      setResults(data.map((b, i) => ({ ...b, _tid: `t${i}` })));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function toggleSelect(tid) {
    setSelected(p => { const n = new Set(p); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });
  }

  async function buildPreview(biz) {
    setBuilding(p => new Set([...p, biz._tid]));
    try {
      // Save to DB first
      const saved = await apiFetch("POST", "api/businesses", {
        ...biz, area_searched: area, status: "prospect",
      });
      // Generate site → get permanent URL
      const gen = await apiFetch("POST", `api/generate/${saved.id}`);
      setLiveUrls(p => ({ ...p, [biz._tid]: { url: gen.url, id: saved.id } }));
      setSelected(p => new Set([...p, biz._tid]));
    } catch (e) { setError(e.message); }
    setBuilding(p => { const n = new Set(p); n.delete(biz._tid); return n; });
  }

  async function addSelected() {
    setSaving(true);
    try {
      for (const biz of results.filter(r => selected.has(r._tid))) {
        // Only save if not already saved during buildPreview
        if (!liveUrls[biz._tid]) {
          await apiFetch("POST", "api/businesses", {
            ...biz, area_searched: area, status: "prospect",
          });
        }
      }
      onAdded();
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div style={{ padding:"28px 32px", maxWidth:1100 }}>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, marginBottom:5 }}>
        Find Businesses Without Websites
      </h2>
      <p style={{ color:"#6b7280", fontSize:13, marginBottom:22 }}>
        Enter a neighborhood — AI finds local businesses that need a website.
      </p>

      {/* Search bar */}
      <div style={{ display:"flex", gap:10, marginBottom:22 }}>
        <input
          value={area} onChange={e => setArea(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="e.g. NoDa Charlotte NC, Ballantyne, SouthEnd..."
          style={{ flex:1, padding:"11px 15px", borderRadius:11, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", fontFamily:"inherit" }}
        />
        <Btn onClick={doSearch} disabled={loading} style={{ padding:"11px 24px", borderRadius:11, fontSize:14 }}>
          {loading ? <><Spinner/> Searching...</> : "🔍 Search"}
        </Btn>
      </div>

      {error && (
        <div style={{ background:"#fef2f2", color:"#dc2626", padding:"11px 15px", borderRadius:10, fontSize:13, marginBottom:16 }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Toolbar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>
              {results.length} businesses found · no website detected
            </span>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="ghost" onClick={() => setSelected(p => p.size===results.length ? new Set() : new Set(results.map(r=>r._tid)))}>
                {selected.size===results.length ? "Deselect All" : "Select All"}
              </Btn>
              {selected.size > 0 && (
                <Btn onClick={addSelected} disabled={saving}>
                  {saving ? <><Spinner size={11}/> Saving...</> : `+ Add ${selected.size} to Pipeline`}
                </Btn>
              )}
            </div>
          </div>

          {/* Results list */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {results.map(biz => {
              const tid = biz._tid;
              const live = liveUrls[tid];
              const isBuilding = building.has(tid);
              const isSel = selected.has(tid);
              return (
                <div key={tid} style={{
                  background:"#fff", borderRadius:13, padding:"14px 18px",
                  border:`1.5px solid ${isSel?"#111":"#f0f0f0"}`,
                  display:"flex", alignItems:"center", gap:13, transition:".15s"
                }}>
                  {/* Checkbox */}
                  <div onClick={() => toggleSelect(tid)} style={{
                    width:20, height:20, borderRadius:5, flexShrink:0,
                    border:`2px solid ${isSel?"#111":"#d1d5db"}`,
                    background:isSel?"#111":"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"
                  }}>
                    {isSel && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                  </div>

                  {/* Icon */}
                  <div style={{ width:40, height:40, borderRadius:11, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {catIcon(biz.category)}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, fontFamily:"'Syne',sans-serif" }}>{biz.name}</div>
                    <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{biz.category} · {biz.address}</div>
                    <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{biz.reason}</div>
                  </div>

                  {/* Rating */}
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b" }}>★ {biz.rating}</div>
                    <div style={{ fontSize:10, color:"#9ca3af" }}>{biz.review_count} reviews</div>
                  </div>

                  <span style={{ padding:"3px 9px", background:"#fef2f2", color:"#ef4444", borderRadius:50, fontSize:10, fontWeight:700, flexShrink:0 }}>
                    No Website
                  </span>

                  {/* Build / View */}
                  {live ? (
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <a href={live.url} target="_blank" rel="noreferrer"
                        style={{ padding:"6px 14px", background:"#10b981", color:"#fff", borderRadius:8, textDecoration:"none", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:4 }}>
                        🌐 Live Preview ↗
                      </a>
                    </div>
                  ) : (
                    <Btn onClick={() => buildPreview(biz)} disabled={isBuilding} style={{ flexShrink:0, minWidth:110 }}>
                      {isBuilding ? <><Spinner size={11}/> Building...</> : "⚡ Build Site"}
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div style={{ textAlign:"center", padding:"70px 20px", color:"#9ca3af" }}>
          <div style={{ fontSize:52, marginBottom:14 }}>🗺️</div>
          <div style={{ fontWeight:700, fontSize:15, color:"#374151" }}>Enter an area and hit Search</div>
          <div style={{ fontSize:13, marginTop:6 }}>AI finds local businesses that need a professional website</div>
        </div>
      )}
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({ biz, onClose, onUpdated, onDeleted }) {
  const [notes, setNotes]   = useState(biz.notes || "");
  const [status, setStatus] = useState(biz.status);
  const [liveUrl, setLiveUrl] = useState(
    biz.preview_slug ? `${API}/preview/${biz.preview_slug}` : ""
  );
  const [building, setBuilding] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function changeStatus(s) {
    setStatus(s);
    try { await apiFetch("PUT", `api/businesses/${biz.id}`, { status: s }); onUpdated(); }
    catch (e) { setError(e.message); }
  }

  async function saveNotes() {
    setSaving(true);
    try { await apiFetch("PUT", `api/businesses/${biz.id}`, { notes }); onUpdated(); }
    catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function buildSite() {
    setBuilding(true);
    try {
      const gen = await apiFetch("POST", `api/generate/${biz.id}`);
      setLiveUrl(gen.url);
      onUpdated();
    } catch (e) { setError(e.message); }
    setBuilding(false);
  }

  async function deleteBiz() {
    if (!confirm(`Delete "${biz.name}"?`)) return;
    await apiFetch("DELETE", `api/businesses/${biz.id}`);
    onDeleted();
  }

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:80 }}/>
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:410, background:"#fff", zIndex:81, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,.12)" }}>
        {/* Header */}
        <div style={{ padding:"20px 22px 16px", borderBottom:"1px solid #f0f0f0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, marginBottom:6 }}>{biz.name}</h3>
              <StatusBadge status={status}/>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:18 }}>✕</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>
          {error && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px", borderRadius:8, fontSize:12, marginBottom:14 }}>{error}</div>}

          {/* Info */}
          {[
            ["📍", biz.address],
            ["📞", biz.phone],
            ["🏷️", biz.category],
            ["⭐", `${biz.rating} · ${biz.review_count} reviews`],
            ["🕐", biz.hours],
            ["🌐", biz.website || "❌ No website"],
          ].map(([ic, v]) => (
            <div key={ic} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start", fontSize:12 }}>
              <span>{ic}</span>
              <span style={{ color: v?.includes("No website") ? "#ef4444" : "#374151", lineHeight:1.5 }}>{v}</span>
            </div>
          ))}

          {/* Live Preview Link */}
          {liveUrl && (
            <div style={{ background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:10, padding:"12px 14px", marginTop:6, marginBottom:14 }}>
              <div style={{ fontSize:11, color:"#166534", fontWeight:700, marginBottom:6 }}>✅ Site Preview is Live</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input readOnly value={liveUrl}
                  style={{ flex:1, fontSize:11, padding:"5px 8px", borderRadius:6, border:"1px solid #bbf7d0", background:"#fff", color:"#374151", outline:"none" }}
                  onClick={e => e.target.select()}/>
                <a href={liveUrl} target="_blank" rel="noreferrer"
                  style={{ padding:"5px 10px", background:"#10b981", color:"#fff", borderRadius:6, textDecoration:"none", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                  Open ↗
                </a>
              </div>
              <div style={{ fontSize:10, color:"#166534", marginTop:6 }}>
                Share this link with the business owner to show them their new site
              </div>
            </div>
          )}

          {/* Status */}
          <div style={{ background:"#f9fafb", borderRadius:11, padding:"12px", marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#374151", letterSpacing:".06em", textTransform:"uppercase", marginBottom:9 }}>Pipeline Status</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => changeStatus(s.key)} style={{
                  padding:"4px 11px", borderRadius:50, fontSize:10, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${status===s.key?s.dot:"#e5e7eb"}`,
                  background:status===s.key?s.bg:"#fff", color:status===s.key?s.color:"#6b7280",
                  fontFamily:"inherit"
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#374151", letterSpacing:".06em", textTransform:"uppercase", marginBottom:7 }}>Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Meeting notes, follow-up dates, objections..."
              style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e5e7eb", fontSize:12, resize:"vertical", minHeight:90, outline:"none", fontFamily:"inherit" }}/>
            <Btn onClick={saveNotes} disabled={saving} style={{ marginTop:7 }}>
              {saving ? <><Spinner size={11}/> Saving...</> : "Save Notes"}
            </Btn>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"13px 22px", borderTop:"1px solid #f0f0f0", display:"flex", gap:7 }}>
          <Btn onClick={buildSite} disabled={building} style={{ flex:1, justifyContent:"center" }}>
            {building ? <><Spinner size={12}/> Building...</> : liveUrl ? "🔄 Rebuild Site" : "⚡ Build Site"}
          </Btn>
          <Btn variant="red" onClick={deleteBiz}>🗑</Btn>
        </div>
      </div>
    </>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function Pipeline({ refreshKey, onSelect }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter !== "all") p.set("status", filter);
      if (search) p.set("q", search);
      const data = await apiFetch("GET", `api/businesses?${p}`);
      setBusinesses(data);
    } catch {}
    setLoading(false);
  }, [filter, search, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const counts = Object.fromEntries(STATUSES.map(s => [s.key, businesses.filter(b => b.status===s.key).length]));

  return (
    <div style={{ padding:"28px 32px", maxWidth:1100 }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:26 }}>
        {STATUSES.map(s => (
          <div key={s.key} onClick={() => setFilter(p => p===s.key ? "all" : s.key)}
            style={{ background:"#fff", borderRadius:12, padding:"13px 15px", cursor:"pointer", border:`1.5px solid ${filter===s.key?s.dot:"#f0f0f0"}`, transition:".15s" }}>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.dot }}>{counts[s.key]||0}</div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:18, maxWidth:380 }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#9ca3af" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search businesses..."
          style={{ width:"100%", padding:"9px 13px 9px 34px", borderRadius:10, border:"1.5px solid #e5e7eb", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:60 }}><Spinner size={30} dark/></div>
      ) : businesses.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:"#9ca3af" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
          <div style={{ fontWeight:700, fontSize:15, color:"#374151" }}>No businesses yet</div>
          <div style={{ fontSize:13, marginTop:5 }}>Use Area Search to find prospects</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {businesses.map(biz => {
            const previewUrl = biz.preview_slug ? `${API}/preview/${biz.preview_slug}` : null;
            return (
              <div key={biz.id} onClick={() => onSelect(biz)}
                style={{ background:"#fff", borderRadius:13, padding:"14px 18px", cursor:"pointer", border:"1.5px solid #f0f0f0", display:"flex", alignItems:"center", gap:13, transition:".15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="#111"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#f0f0f0"}>
                <div style={{ width:42, height:42, borderRadius:12, background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, flexShrink:0 }}>
                  {catIcon(biz.category)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, fontFamily:"'Syne',sans-serif" }}>{biz.name}</div>
                  <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{biz.category} · {biz.address}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b" }}>★ {biz.rating}</div>
                    <div style={{ fontSize:10, color:"#9ca3af" }}>{biz.review_count} reviews</div>
                  </div>
                  <StatusBadge status={biz.status} sm/>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ padding:"5px 12px", background:"#10b981", color:"#fff", borderRadius:7, textDecoration:"none", fontSize:11, fontWeight:700 }}>
                      🌐 Live
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("search");
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefresh] = useState(0);
  const [stats, setStats]       = useState({ total:0, delivered:0 });

  async function loadStats() {
    try {
      const data = await apiFetch("GET", "api/businesses");
      setStats({ total: data.length, delivered: data.filter(b=>b.status==="delivered").length });
    } catch {}
  }

  useEffect(() => { loadStats(); }, [refreshKey]);

  function refresh() { setRefresh(k=>k+1); setTab("pipeline"); }

  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fa", fontFamily:"'DM Sans','Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ position:"fixed", left:0, top:0, bottom:0, width:215, background:"#111", display:"flex", flexDirection:"column", zIndex:50 }}>
        <div style={{ padding:"22px 18px 18px" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:19, color:"#fff" }}>
            Site<span style={{ color:"#a8ff78" }}>Sprint</span>
          </div>
          <div style={{ fontSize:10, color:"#4b5563", marginTop:2 }}>Business CMS</div>
        </div>

        <nav style={{ padding:"0 10px", flex:1 }}>
          {[
            { id:"search",   icon:"🗺️", label:"Area Search" },
            { id:"pipeline", icon:"📋", label:"Pipeline", count: stats.total },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"9px 11px", borderRadius:9, border:"none", cursor:"pointer", marginBottom:2,
              background:tab===item.id?"#1f2937":"transparent",
              color:tab===item.id?"#fff":"#9ca3af",
              fontSize:12, fontWeight:500, textAlign:"left", fontFamily:"inherit"
            }}>
              <span style={{ display:"flex", alignItems:"center", gap:7 }}>{item.icon} {item.label}</span>
              {item.count > 0 && (
                <span style={{ background:"#374151", borderRadius:50, padding:"1px 7px", fontSize:10, fontWeight:700, color:"#a8ff78" }}>
                  {item.count}
                </span>
              )}
            </button>
          ))}

          {/* Pipeline breakdown */}
          <div style={{ borderTop:"1px solid #1f2937", margin:"10px 0 8px", paddingTop:10 }}>
            <div style={{ fontSize:9, color:"#4b5563", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:7, padding:"0 4px" }}>
              Status Breakdown
            </div>
            {STATUSES.map(s => (
              <div key={s.key} style={{ display:"flex", justifyContent:"space-between", padding:"3px 7px", fontSize:11 }}>
                <span style={{ color:"#9ca3af", display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:s.dot, display:"inline-block" }}/>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </nav>

        {/* Delivered counter */}
        <div style={{ padding:"10px 14px 20px", borderTop:"1px solid #1f2937" }}>
          <div style={{ background:"#1f2937", borderRadius:11, padding:"12px 14px" }}>
            <div style={{ fontSize:9, color:"#6b7280", marginBottom:5 }}>🚀 Sites Delivered</div>
            <div style={{ fontSize:28, fontWeight:800, color:"#a8ff78", fontFamily:"'Syne',sans-serif" }}>
              {stats.delivered}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ marginLeft:215, minHeight:"100vh" }}>
        {/* Top bar */}
        <div style={{ padding:"14px 26px", background:"#fff", borderBottom:"1px solid #f0f0f0", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:40 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17 }}>
            {tab==="search" ? "🗺️ Area Search" : "📋 Pipeline"}
          </h1>
          <span style={{ fontSize:11, color:"#9ca3af" }}>SiteSprint CMS</span>
        </div>

        {tab==="search" && <AreaSearch onAdded={refresh}/>}
        {tab==="pipeline" && <Pipeline refreshKey={refreshKey} onSelect={setSelected}/>}
      </div>

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          biz={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setRefresh(k=>k+1); loadStats(); }}
          onDeleted={() => { setSelected(null); setRefresh(k=>k+1); loadStats(); }}
        />
      )}
    </div>
  );
}
