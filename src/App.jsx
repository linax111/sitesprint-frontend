import { useState, useEffect } from "react";

const API = "https://sitesprint-backend-production.up.railway.app";
const req = async (method, path, body) => {
  const r = await fetch(`${API}/${path.replace(/^\//,"")}`, {
    method, headers:{"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error(txt); }
};

const STATUS_COLORS = { prospect:"#6366f1","site shown":"#f59e0b",approved:"#10b981",rejected:"#ef4444",delivered:"#8b5cf6" };
const STATUS_LIST   = ["prospect","site shown","approved","rejected","delivered"];

export default function App() {
  const [page, setPage]         = useState("google");
  const [businesses, setBiz]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [notification, setNote] = useState(null);
  const [searchArea, setArea]   = useState("");
  const [searchResults, setSR]  = useState([]);
  const [searching, setSearching] = useState(false);
  const [building, setBuilding]   = useState({});
  const [liveUrls, setLiveUrls]   = useState({});

  // Google search state
  const [gQuery, setGQuery]     = useState("");
  const [gLoading, setGLoading] = useState(false);
  const [gResult, setGResult]   = useState(null);
  const [gError, setGError]     = useState("");

  useEffect(()=>{ loadBiz(); }, []);

  const loadBiz = async () => {
    try { setBiz(await req("GET","api/businesses")); } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const notify = (msg, type="success") => {
    setNote({msg,type}); setTimeout(()=>setNote(null),5000);
  };

  const handleGoogleSearch = async () => {
    if (!gQuery.trim()) return;
    setGLoading(true); setGResult(null); setGError("");
    try {
      const r = await req("POST","api/search-google",{ query: gQuery.trim() });
      if (r.error) { setGError(r.error); return; }
      setGResult({ ...r, previewUrl: `${API}/preview/${r.slug}` });
      await loadBiz();
      notify("✅ Site built from real Google data!");
    } catch(e) {
      setGError(e.message);
    } finally { setGLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchArea.trim()) return;
    setSearching(true); setSR([]);
    try { setSR(await req("POST","api/search",{area:searchArea.trim()})); }
    catch(e) { notify("Search failed: "+e.message,"error"); }
    setSearching(false);
  };

  const addToPipeline = async (biz) => {
    try {
      const saved = await req("POST","api/businesses",{...biz,area_searched:searchArea,status:"prospect"});
      setBiz(prev=>[saved,...prev]); notify(saved.name+" added!");
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const buildSearchSite = async (biz, idx) => {
    setBuilding(p=>({...p,[idx]:true}));
    try {
      const saved  = await req("POST","api/businesses",{...biz,area_searched:searchArea,status:"prospect"});
      setBiz(prev=>[saved,...prev]);
      const result = await req("POST",`api/generate/${saved.id}`,saved);
      await req("PUT",`api/businesses/${saved.id}`,{preview_slug:result.slug,status:"site shown"});
      await loadBiz();
      setLiveUrls(p=>({...p,[idx]:`${API}/preview/${result.slug}`}));
      notify("✅ Site generated!");
    } catch(e) { notify("Build failed: "+e.message,"error"); }
    setBuilding(p=>({...p,[idx]:false}));
  };

  const buildPipelineSite = async (biz) => {
    notify("Building..."); 
    try {
      const r = await req("POST",`api/generate/${biz.id}`,biz);
      const u = await req("PUT",`api/businesses/${biz.id}`,{preview_slug:r.slug,status:"site shown"});
      await loadBiz(); setSelected(u); notify("✅ Site rebuilt!");
    } catch(e) { notify("Build failed: "+e.message,"error"); }
  };

  const updateStatus = async (id, status) => {
    try {
      const u = await req("PUT",`api/businesses/${id}`,{status});
      setBiz(prev=>prev.map(b=>b.id===id?u:b)); setSelected(u);
    } catch(e) { notify("Error: "+e.message,"error"); }
  };

  const saveNotes = async (id, notes) => {
    try { await req("PUT",`api/businesses/${id}`,{notes}); notify("Notes saved!"); }
    catch(e) { notify("Error: "+e.message,"error"); }
  };

  const previewUrl = b => b?.preview_slug ? `${API}/preview/${b.preview_slug}` : null;

  const S = {
    sidebar: {width:220,background:"#16161f",borderRight:"1px solid #2d2d3d",display:"flex",flexDirection:"column",padding:"20px 0",flexShrink:0},
    main:    {flex:1,overflow:"auto"},
    card:    {background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:12,padding:20,marginBottom:12},
    btn:     (bg="#6366f1")=>({padding:"8px 18px",background:bg,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:13}),
    input:   {flex:1,padding:"12px 16px",background:"#0f0f13",border:"1px solid #2d2d3d",borderRadius:10,color:"#e2e8f0",fontSize:14,outline:"none"},
  };

  const pages = [
    {id:"google", icon:"🔍", label:"Search by Name"},
    {id:"search", icon:"📍", label:"Area Search"},
    {id:"pipeline",icon:"📋",label:`Pipeline (${businesses.length})`},
  ];

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"Inter,sans-serif",background:"#0f0f13",color:"#e2e8f0"}}>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{padding:"0 20px 20px",borderBottom:"1px solid #2d2d3d"}}>
          <div style={{fontSize:19,fontWeight:700,color:"#6366f1"}}>SiteSprint</div>
          <div style={{fontSize:11,color:"#64748b"}}>Business CMS</div>
        </div>
        <div style={{padding:"14px 0"}}>
          {pages.map(p=>(
            <button key={p.id} onClick={()=>setPage(p.id)} style={{
              width:"100%",padding:"10px 20px",
              background:page===p.id?"#6366f1":"transparent",
              color:page===p.id?"#fff":"#94a3b8",
              border:"none",cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:500,
              display:"flex",alignItems:"center",gap:10
            }}>
              <span>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
        {page==="pipeline" && (
          <div style={{padding:"12px 20px",borderTop:"1px solid #2d2d3d",marginTop:"auto"}}>
            {STATUS_LIST.map(s=>(
              <div key={s} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12}}>
                <span style={{color:STATUS_COLORS[s],textTransform:"capitalize"}}>{s}</span>
                <span style={{color:"#64748b"}}>{businesses.filter(b=>b.status===s).length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={S.main}>

        {/* ── GOOGLE SEARCH PAGE ── */}
        {page==="google" && (
          <div style={{padding:40,maxWidth:740}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:6}}>Build from Real Google Data</h1>
            <p style={{color:"#64748b",marginBottom:32}}>Enter a business name + city — we pull real info from Google and build a professional site instantly.</p>

            {/* Search box */}
            <div style={{background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:16,padding:28,marginBottom:24}}>
              <div style={{fontSize:13,color:"#94a3b8",marginBottom:10,fontWeight:600}}>Business Name + City</div>
              <div style={{display:"flex",gap:12}}>
                <input
                  value={gQuery} onChange={e=>{setGQuery(e.target.value);setGError("");}}
                  onKeyDown={e=>e.key==="Enter"&&handleGoogleSearch()}
                  placeholder="e.g.  Joe's Pizza New York NY"
                  style={{...S.input,flex:1}}
                />
                <button onClick={handleGoogleSearch} disabled={gLoading||!gQuery.trim()} style={{
                  padding:"12px 28px",background:"#6366f1",color:"#fff",border:"none",borderRadius:10,
                  cursor:gLoading?"not-allowed":"pointer",fontWeight:700,fontSize:14,opacity:gLoading||!gQuery.trim()?0.6:1,whiteSpace:"nowrap"
                }}>
                  {gLoading?"⏳ Building...":"⚡ Build Site"}
                </button>
              </div>
              {gError && (
                <div style={{marginTop:14,background:"#1a0808",border:"1px solid #ef444488",borderRadius:10,padding:14,fontSize:13,color:"#f87171"}}>
                  ⚠️ {gError}
                </div>
              )}
            </div>

            {/* Tips */}
            <div style={{background:"#0d1a10",border:"1px solid #1e3a22",borderRadius:12,padding:20,marginBottom:24}}>
              <div style={{fontSize:12,color:"#4ade80",fontWeight:700,marginBottom:10}}>💡 Tips for best results</div>
              <ul style={{fontSize:12,color:"#64748b",lineHeight:2.2,paddingLeft:16}}>
                <li>Include the full business name + city + state</li>
                <li>Example: <span style={{color:"#94a3b8"}}>"Mike's Auto Repair Charlotte NC"</span></li>
                <li>Example: <span style={{color:"#94a3b8"}}>"Bella Hair Salon Miami FL"</span></li>
                <li>For <strong style={{color:"#fbbf24"}}>share.google links</strong>: Open the link on your phone → tap Share → Copy Link → paste the <strong>maps.google.com</strong> URL here, or just search by name</li>
              </ul>
            </div>

            {/* Result */}
            {gResult && (
              <div style={{background:"#0a2418",border:"1px solid #10b981",borderRadius:16,padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                  <div>
                    <div style={{fontSize:11,color:"#10b981",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>✅ Site Built from Google Data</div>
                    <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>{gResult.scraped?.name}</div>
                    <div style={{fontSize:13,color:"#64748b",marginBottom:3}}>{gResult.scraped?.category} · {gResult.scraped?.address}</div>
                    <div style={{display:"flex",gap:16,fontSize:13}}>
                      {gResult.scraped?.phone && <span style={{color:"#94a3b8"}}>📞 {gResult.scraped.phone}</span>}
                      <span style={{color:"#f59e0b"}}>★ {gResult.scraped?.rating} · {gResult.scraped?.reviewsFound} reviews loaded</span>
                    </div>
                  </div>
                  <button onClick={()=>window.open(gResult.previewUrl,"_blank")} style={{
                    padding:"12px 22px",background:"#10b981",color:"#fff",border:"none",borderRadius:10,
                    cursor:"pointer",fontWeight:700,fontSize:14,flexShrink:0
                  }}>🌐 Open Preview</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AREA SEARCH ── */}
        {page==="search" && (
          <div style={{padding:40,maxWidth:800}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:8}}>Find Businesses Without Websites</h1>
            <p style={{color:"#64748b",marginBottom:32}}>Enter a neighborhood to find local businesses that need a website.</p>
            <div style={{display:"flex",gap:12,marginBottom:32}}>
              <input value={searchArea} onChange={e=>setArea(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                placeholder="e.g. Ballantyne, Charlotte NC"
                style={{...S.input,padding:"12px 16px",fontSize:15,border:"1px solid #2d2d3d"}}
              />
              <button onClick={handleSearch} disabled={searching} style={{
                padding:"12px 24px",background:"#6366f1",color:"#fff",border:"none",borderRadius:8,
                cursor:"pointer",fontWeight:600,fontSize:15,opacity:searching?0.7:1
              }}>{searching?"Searching...":"Search"}</button>
            </div>
            {searchResults.map((biz,i)=>{
              const added = businesses.some(b=>b.name===biz.name);
              const live  = liveUrls[i];
              return (
                <div key={i} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:15,marginBottom:4}}>{biz.name}</div>
                    <div style={{color:"#64748b",fontSize:12}}>{biz.category} · {biz.address}</div>
                    <div style={{color:"#f59e0b",fontSize:12,marginTop:4}}>★ {biz.rating} ({biz.review_count} reviews)</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {live
                      ? <button onClick={()=>window.open(live,"_blank")} style={S.btn("#10b981")}>🌐 Preview</button>
                      : <>
                          <button onClick={()=>buildSearchSite(biz,i)} disabled={building[i]} style={S.btn("#8b5cf6")}>
                            {building[i]?"⏳ Building...":"⚡ Build Site"}
                          </button>
                          <button onClick={()=>addToPipeline(biz)} disabled={added} style={{
                            ...S.btn(added?"#2d2d3d":"#6366f1"),
                            color:added?"#64748b":"#fff",cursor:added?"default":"pointer"
                          }}>{added?"Added ✓":"+ Add"}</button>
                        </>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PIPELINE ── */}
        {page==="pipeline" && (
          <div style={{padding:40}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:24}}>Pipeline</h1>
            {businesses.length===0 ? (
              <div style={{color:"#64748b",textAlign:"center",marginTop:80}}>
                <div style={{fontSize:48,marginBottom:16}}>📋</div>
                <div>No businesses yet. Use Search by Name or Area Search.</div>
              </div>
            ) : businesses.map(biz=>(
              <div key={biz.id} onClick={()=>setSelected(biz)} style={{
                ...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",
                cursor:"pointer",border:`1px solid ${selected?.id===biz.id?"#6366f1":"#2d2d3d"}`,
                background:selected?.id===biz.id?"#1a1a2e":"#1e1e2e"
              }}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{biz.name}</div>
                  <div style={{color:"#64748b",fontSize:12}}>{biz.category}{biz.address?" · "+biz.address:""}</div>
                  {biz.google_url && <div style={{fontSize:11,color:"#4ade80",marginTop:3}}>📍 From Google</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {previewUrl(biz) && (
                    <button onClick={e=>{e.stopPropagation();window.open(previewUrl(biz),"_blank");}}
                      style={{...S.btn("#10b981"),fontSize:12,padding:"5px 12px"}}>View</button>
                  )}
                  <span style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600,
                    background:STATUS_COLORS[biz.status]+"22",color:STATUS_COLORS[biz.status],textTransform:"capitalize"}}>
                    {biz.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{width:360,background:"#16161f",borderLeft:"1px solid #2d2d3d",padding:28,overflow:"auto",display:"flex",flexDirection:"column",gap:20,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <h2 style={{fontSize:17,fontWeight:700,margin:0,lineHeight:1.3}}>{selected.name}</h2>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:22}}>×</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:13,color:"#94a3b8"}}>
            {selected.address && <div>📍 {selected.address}</div>}
            {selected.phone && <div>📞 {selected.phone}</div>}
            {selected.category && <div>🏷️ {selected.category}</div>}
            {selected.rating>0 && <div>⭐ {selected.rating} ({selected.review_count} reviews)</div>}
            {selected.hours && <div>🕐 {selected.hours?.split(" | ")[0]}</div>}
            {selected.google_url && <div style={{color:"#4ade80",fontSize:11}}>✅ Built from Google</div>}
          </div>
          {previewUrl(selected) && (
            <div style={{background:"#0f2d1f",border:"1px solid #10b981",borderRadius:8,padding:14}}>
              <div style={{fontSize:11,color:"#10b981",fontWeight:700,marginBottom:10}}>✓ Live Site</div>
              <button onClick={()=>window.open(previewUrl(selected),"_blank")}
                style={{width:"100%",padding:10,background:"#10b981",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600}}>
                Open Preview ↗
              </button>
            </div>
          )}
          <div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Status</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {STATUS_LIST.map(s=>(
                <button key={s} onClick={()=>updateStatus(selected.id,s)} style={{
                  padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                  background:selected.status===s?STATUS_COLORS[s]:STATUS_COLORS[s]+"22",
                  color:selected.status===s?"#fff":STATUS_COLORS[s],
                  border:`1px solid ${STATUS_COLORS[s]}`,textTransform:"capitalize"
                }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Notes</div>
            <textarea id={`n-${selected.id}`} defaultValue={selected.notes||""} placeholder="Meeting notes..."
              style={{width:"100%",height:80,background:"#1e1e2e",border:"1px solid #2d2d3d",borderRadius:8,padding:10,color:"#e2e8f0",fontSize:13,resize:"vertical",boxSizing:"border-box"}} />
            <button onClick={()=>saveNotes(selected.id,document.getElementById(`n-${selected.id}`)?.value||"")}
              style={{marginTop:8,...S.btn("#2d2d3d"),color:"#e2e8f0",width:"100%"}}>Save Notes</button>
          </div>
          <button onClick={()=>buildPipelineSite(selected)}
            style={{padding:14,background:"#6366f1",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:15}}>
            {previewUrl(selected)?"🔄 Rebuild Site":"⚡ Build Site"}
          </button>
        </div>
      )}

      {notification && (
        <div style={{position:"fixed",bottom:24,right:24,padding:"13px 22px",
          background:notification.type==="error"?"#ef4444":"#10b981",
          color:"#fff",borderRadius:10,fontWeight:500,fontSize:14,
          boxShadow:"0 4px 20px rgba(0,0,0,.35)",zIndex:9999,maxWidth:400}}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
