import { useState, useEffect } from "react";

const API = "https://sitesprint-backend-production.up.railway.app";
const api = async (method, path, body) => {
  const r = await fetch(`${API}/${path.replace(/^\//,"")}`, {
    method, headers:{"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(text); }
};

const STATUS_COLORS = {
  prospect:"#6366f1","site shown":"#f59e0b",approved:"#10b981",rejected:"#ef4444",delivered:"#8b5cf6"
};
const STATUS_LIST = ["prospect","site shown","approved","rejected","delivered"];

export default function App() {
  const [page, setPage]               = useState("google");
  const [businesses, setBusinesses]   = useState([]);
  const [selected, setSelected]       = useState(null);
  const [searchArea, setSearchArea]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [building, setBuilding]       = useState({});
  const [liveUrls, setLiveUrls]       = useState({});
  const [notification, setNotification] = useState(null);

  // Google URL mode
  const [googleUrl, setGoogleUrl]     = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleResult, setGoogleResult]   = useState(null);

  useEffect(() => { loadBusinesses(); }, []);

  const loadBusinesses = async () => {
    try { setBusinesses(await api("GET","api/businesses")); }
    catch(e) { notify("Error: "+e.message,"error"); }
  };

  const notify = (msg, type="success") => {
    setNotification({msg,type});
    setTimeout(()=>setNotification(null),4000);
  };

  // ── GOOGLE URL BUILD ──────────────────────────────────────────────────────
  const handleGoogleBuild = async () => {
    if (!googleUrl.trim()) return;
    setGoogleLoading(true);
    setGoogleResult(null);
    try {
      const r = await api("POST","api/from-google",{url:googleUrl.trim()});
      const previewUrl = `${API}/preview/${r.slug}`;
      setGoogleResult({...r, previewUrl});
      await loadBusinesses();
      notify("✅ Site built from Google profile!");
    } catch(e) {
      notify("Failed: "+e.message,"error");
    }
    setGoogleLoading(false);
  };

  // ── AREA SEARCH ───────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchArea.trim()) return;
    setSearching(true); setSearchResults([]);
    try { setSearchResults(await api("POST","api/search",{area:searchArea.trim()})); }
    catch(e) { notify("Search failed: "+e.message,"error"); }
    setSearching(false);
  };

  const addToPipeline = async (biz) => {
    try {
      const saved = await api("POST","api/businesses",{...biz,area_searched:searchArea,status:"prospect"});
      setBusinesses(prev=>[saved,...prev]);
      notify(saved.name+" added to pipeline!");
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const buildSearchSite = async (biz, index) => {
    setBuilding(prev=>({...prev,[index]:true}));
    try {
      const saved = await api("POST","api/businesses",{...biz,area_searched:searchArea,status:"prospect"});
      setBusinesses(prev=>[saved,...prev]);
      const result = await api("POST",`api/generate/${saved.id}`,saved);
      const slug = result.slug||`b-${saved.id}`;
      await api("PUT",`api/businesses/${saved.id}`,{preview_slug:slug,status:"site shown"});
      await loadBusinesses();
      setLiveUrls(prev=>({...prev,[index]:`${API}/preview/${slug}`}));
      notify("✅ Premium site generated!");
    } catch(e) { notify("Build failed: "+e.message,"error"); }
    setBuilding(prev=>({...prev,[index]:false}));
  };

  const buildPipelineSite = async (biz) => {
    notify("Building site...");
    try {
      const result = await api("POST",`api/generate/${biz.id}`,biz);
      const slug = result.slug||`b-${biz.id}`;
      const updated = await api("PUT",`api/businesses/${biz.id}`,{preview_slug:slug,status:"site shown"});
      await loadBusinesses();
      setSelected(updated);
      notify("✅ Site updated!");
    } catch(e) { notify("Build failed: "+e.message,"error"); }
  };

  const updateStatus = async (id, status) => {
    try {
      const updated = await api("PUT",`api/businesses/${id}`,{status});
      setBusinesses(prev=>prev.map(b=>b.id===id?updated:b));
      setSelected(updated);
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const saveNotes = async (id, notes) => {
    try { await api("PUT",`api/businesses/${id}`,{notes}); notify("Notes saved!"); }
    catch(e) { notify("Error: "+e.message,"error"); }
  };

  const getPreviewUrl = (biz) => biz?.preview_slug ? `${API}/preview/${biz.preview_slug}` : null;

  const pipelineCount = STATUS_LIST.reduce((acc,s)=>{ acc[s]=businesses.filter(b=>b.status===s).length; return acc; },{});

  const S = {
    sidebar:{width:210,background:"#16161f",borderRight:"1px solid #2d2d3d",display:"flex",flexDirection:"column",padding:"20px 0"},
    main:{flex:1,overflow:"auto"},
    card:{background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:12,padding:20,marginBottom:12},
    btn:(bg="#6366f1")=>({padding:"8px 18px",background:bg,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:13}),
  };

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"Inter,sans-serif",background:"#0f0f13",color:"#e2e8f0"}}>
      
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{padding:"0 20px 24px",borderBottom:"1px solid #2d2d3d"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#6366f1"}}>SiteSprint</div>
          <div style={{fontSize:11,color:"#64748b"}}>Business CMS</div>
        </div>
        <div style={{padding:"16px 0"}}>
          {[
            {id:"google",icon:"🔗",label:"From Google URL"},
            {id:"search",icon:"🔍",label:"Area Search"},
            {id:"pipeline",icon:"📋",label:`Pipeline (${businesses.length})`},
          ].map(p=>(
            <button key={p.id} onClick={()=>setPage(p.id)} style={{
              width:"100%",padding:"10px 20px",background:page===p.id?"#6366f1":"transparent",
              color:page===p.id?"#fff":"#94a3b8",border:"none",cursor:"pointer",
              textAlign:"left",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8
            }}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
        {page==="pipeline" && (
          <div style={{padding:"12px 20px",borderTop:"1px solid #2d2d3d",marginTop:"auto"}}>
            <div style={{fontSize:10,color:"#475569",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Status</div>
            {STATUS_LIST.map(s=>(
              <div key={s} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}>
                <span style={{color:STATUS_COLORS[s],textTransform:"capitalize"}}>{s}</span>
                <span style={{color:"#64748b"}}>{pipelineCount[s]||0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={S.main}>

        {/* ── GOOGLE URL PAGE ── */}
        {page==="google" && (
          <div style={{padding:40,maxWidth:720}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:8}}>Build from Google Profile</h1>
            <p style={{color:"#64748b",marginBottom:32}}>Paste any Google Maps business link — we'll extract the real info and build a site instantly.</p>

            <div style={{background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:16,padding:28,marginBottom:28}}>
              <div style={{fontSize:13,color:"#94a3b8",marginBottom:12,fontWeight:600}}>Google Maps URL</div>
              <div style={{display:"flex",gap:12,marginBottom:8}}>
                <input
                  value={googleUrl} onChange={e=>setGoogleUrl(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleGoogleBuild()}
                  placeholder="https://maps.google.com/... or https://www.google.com/maps/place/..."
                  style={{flex:1,padding:"13px 16px",background:"#0f0f13",border:"1px solid #2d2d3d",borderRadius:10,color:"#e2e8f0",fontSize:14}}
                />
                <button onClick={handleGoogleBuild} disabled={googleLoading} style={{
                  padding:"13px 28px",background:"#6366f1",color:"#fff",border:"none",borderRadius:10,
                  cursor:googleLoading?"not-allowed":"pointer",fontWeight:700,fontSize:14,opacity:googleLoading?0.7:1,
                  whiteSpace:"nowrap"
                }}>
                  {googleLoading ? "⏳ Building..." : "⚡ Build Site"}
                </button>
              </div>
              <div style={{fontSize:12,color:"#475569"}}>
                Works with: maps.google.com · google.com/maps/place/ · maps.app.goo.gl
              </div>
            </div>

            {/* Tips */}
            <div style={{background:"#0f1a10",border:"1px solid #1a3a20",borderRadius:12,padding:20,marginBottom:28}}>
              <div style={{fontSize:13,color:"#4ade80",fontWeight:600,marginBottom:12}}>💡 How to get the link</div>
              <ol style={{fontSize:12,color:"#64748b",lineHeight:2,paddingLeft:20}}>
                <li>Open Google Maps and search for the business</li>
                <li>Click on the business name to open its profile</li>
                <li>Click "Share" → "Copy link" — or just copy the URL from your browser</li>
                <li>Paste it above and hit Build Site</li>
              </ol>
            </div>

            {/* Result */}
            {googleResult && (
              <div style={{background:"#0f2d1f",border:"1px solid #10b981",borderRadius:16,padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                  <div>
                    <div style={{fontSize:11,color:"#10b981",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>✅ Site Built Successfully</div>
                    <div style={{fontSize:20,fontWeight:700}}>{googleResult.business?.name}</div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{googleResult.business?.category} · {googleResult.business?.address}</div>
                    <div style={{fontSize:13,color:"#f59e0b",marginTop:4}}>★ {googleResult.business?.rating} ({googleResult.business?.review_count} reviews)</div>
                  </div>
                  <button onClick={()=>window.open(googleResult.previewUrl,"_blank")} style={{
                    padding:"12px 24px",background:"#10b981",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14
                  }}>
                    🌐 Open Preview
                  </button>
                </div>
                <div style={{fontSize:12,color:"#475569",wordBreak:"break-all"}}>{googleResult.previewUrl}</div>
              </div>
            )}
          </div>
        )}

        {/* ── AREA SEARCH PAGE ── */}
        {page==="search" && (
          <div style={{padding:40,maxWidth:800}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:8}}>Find Businesses Without Websites</h1>
            <p style={{color:"#64748b",marginBottom:32}}>Enter a neighborhood to find local businesses that need a website.</p>
            <div style={{display:"flex",gap:12,marginBottom:32}}>
              <input value={searchArea} onChange={e=>setSearchArea(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                placeholder="e.g. Ballantyne, Charlotte NC"
                style={{flex:1,padding:"12px 16px",background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:8,color:"#e2e8f0",fontSize:15}}
              />
              <button onClick={handleSearch} disabled={searching} style={{
                padding:"12px 24px",background:"#6366f1",color:"#fff",border:"none",borderRadius:8,
                cursor:searching?"not-allowed":"pointer",fontWeight:600,fontSize:15,opacity:searching?0.7:1
              }}>
                {searching?"Searching...":"Search"}
              </button>
            </div>
            {searchResults.map((biz,i)=>{
              const added = businesses.some(b=>b.name===biz.name);
              const liveUrl = liveUrls[i];
              return (
                <div key={i} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:15,marginBottom:4}}>{biz.name}</div>
                    <div style={{color:"#64748b",fontSize:12}}>{biz.category} · {biz.address}</div>
                    <div style={{color:"#f59e0b",fontSize:12,marginTop:4}}>★ {biz.rating} ({biz.review_count} reviews)</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {liveUrl ? (
                      <button onClick={()=>window.open(liveUrl,"_blank")} style={S.btn("#10b981")}>🌐 Open Preview</button>
                    ) : (
                      <>
                        <button onClick={()=>buildSearchSite(biz,i)} disabled={building[i]} style={S.btn("#8b5cf6")}>
                          {building[i]?"⏳ Building...":"⚡ Build Site"}
                        </button>
                        <button onClick={()=>addToPipeline(biz)} disabled={added} style={{
                          ...S.btn(added?"#2d2d3d":"#6366f1"),
                          color:added?"#64748b":"#fff",cursor:added?"default":"pointer"
                        }}>
                          {added?"Added ✓":"+ Add"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PIPELINE PAGE ── */}
        {page==="pipeline" && (
          <div style={{padding:40}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:24}}>Pipeline</h1>
            {businesses.length===0 ? (
              <div style={{color:"#64748b",textAlign:"center",marginTop:80}}>
                <div style={{fontSize:48,marginBottom:16}}>📋</div>
                <div>No businesses yet. Use Google URL or Area Search to add some.</div>
              </div>
            ) : businesses.map(biz=>{
              const previewUrl = getPreviewUrl(biz);
              return (
                <div key={biz.id} onClick={()=>setSelected(biz)} style={{
                  ...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",
                  cursor:"pointer",border:`1px solid ${selected?.id===biz.id?"#6366f1":"#2d2d3d"}`,
                  background:selected?.id===biz.id?"#1a1a2e":"#1e1e2e"
                }}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{biz.name}</div>
                    <div style={{color:"#64748b",fontSize:12,marginTop:3}}>{biz.category} · {biz.address||"No address"}</div>
                    {biz.google_url && <div style={{fontSize:11,color:"#4ade80",marginTop:3}}>📍 From Google Profile</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {previewUrl && (
                      <button onClick={e=>{e.stopPropagation();window.open(previewUrl,"_blank");}}
                        style={{...S.btn("#10b981"),fontSize:12,padding:"5px 12px"}}>View Site</button>
                    )}
                    <span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:500,
                      background:STATUS_COLORS[biz.status]+"22",color:STATUS_COLORS[biz.status],textTransform:"capitalize"}}>
                      {biz.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{width:360,background:"#16161f",borderLeft:"1px solid #2d2d3d",padding:28,overflow:"auto",display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <h2 style={{fontSize:17,fontWeight:700,margin:0}}>{selected.name}</h2>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:22}}>×</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:13,color:"#94a3b8"}}>
            {selected.address && <div>📍 {selected.address}</div>}
            {selected.phone && <div>📞 {selected.phone}</div>}
            {selected.category && <div>🏷️ {selected.category}</div>}
            {selected.rating>0 && <div>⭐ {selected.rating} ({selected.review_count} reviews)</div>}
            {selected.hours && <div>🕐 {selected.hours}</div>}
            {selected.google_url && <div style={{color:"#4ade80",fontSize:12}}>✅ From Google Profile</div>}
            {!selected.website && <div style={{color:"#ef4444"}}>🌐 No website — opportunity!</div>}
          </div>

          {getPreviewUrl(selected) && (
            <div style={{background:"#0f2d1f",border:"1px solid #10b981",borderRadius:8,padding:14}}>
              <div style={{fontSize:12,color:"#10b981",fontWeight:600,marginBottom:10}}>✓ Site Live</div>
              <button onClick={()=>window.open(getPreviewUrl(selected),"_blank")}
                style={{width:"100%",padding:10,background:"#10b981",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>
                Open Preview ↗
              </button>
            </div>
          )}

          <div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Pipeline Status</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {STATUS_LIST.map(s=>(
                <button key={s} onClick={()=>updateStatus(selected.id,s)} style={{
                  padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:500,cursor:"pointer",
                  background:selected.status===s?STATUS_COLORS[s]:STATUS_COLORS[s]+"22",
                  color:selected.status===s?"#fff":STATUS_COLORS[s],
                  border:`1px solid ${STATUS_COLORS[s]}`,textTransform:"capitalize"
                }}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Notes</div>
            <textarea id={`notes-${selected.id}`} defaultValue={selected.notes||""} placeholder="Meeting notes..."
              style={{width:"100%",height:90,background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:8,padding:10,color:"#e2e8f0",fontSize:13,resize:"vertical",boxSizing:"border-box"}} />
            <button onClick={()=>saveNotes(selected.id,document.getElementById(`notes-${selected.id}`)?.value||"")}
              style={{marginTop:8,...S.btn("#2d2d3d"),color:"#e2e8f0"}}>Save Notes</button>
          </div>

          <button onClick={()=>buildPipelineSite(selected)}
            style={{padding:14,background:"#6366f1",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:15}}>
            {getPreviewUrl(selected)?"🔄 Rebuild Site":"⚡ Build Site"}
          </button>
        </div>
      )}

      {notification && (
        <div style={{position:"fixed",bottom:24,right:24,padding:"12px 20px",
          background:notification.type==="error"?"#ef4444":"#10b981",
          color:"#fff",borderRadius:10,fontWeight:500,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.3)",zIndex:9999}}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
