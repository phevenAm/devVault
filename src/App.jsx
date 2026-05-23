import { useState, useEffect, useCallback } from "react";
import { firebaseConfig, hasBundledFirebaseConfig } from "./firebaseConfig";

let collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query;
let signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged;

const FIREBASE_CONFIG_KEY = "devvault_firebase_config";

const ENTRY_TYPES = [
  { id: "snippet", label: "Snippet",      icon: "⌥", color: "#00d4aa" },
  { id: "link",    label: "Link",         icon: "⇗", color: "#ff6b6b" },
  { id: "note",    label: "Note",         icon: "◈", color: "#ffd93d" },
  { id: "mistake", label: "Mistake/Fix",  icon: "⚡", color: "#c77dff" },
];

const DEFAULT_CATEGORIES = ["JavaScript","CSS","React","Python","SQL","DevOps","General", "Backend", "Frontend", "Tooling", "Testing", "Performance", "Security", "Other"];

function highlight(code) {
  if (!code) return "";
  let h = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  h = h.replace(/(["'`])(.*?)\1/g,'<span style="color:#a8ff78">$1$2$1</span>');
  h = h.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,'<span style="color:#636e72;font-style:italic">$1</span>');
  h = h.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|from|async|await|new|this|try|catch|throw|typeof|null|undefined|true|false)\b/g,'<span style="color:#74b9ff;font-weight:600">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g,'<span style="color:#fdcb6e">$1</span>');
  return h;
}

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onConnect }) {
  const [cfg, setCfg] = useState(firebaseConfig);
  const [err, setErr] = useState("");
  const fields = [
    {k:"apiKey",l:"API Key",p:"AIzaSy..."},
    {k:"authDomain",l:"Auth Domain",p:"yourapp.firebaseapp.com"},
    {k:"projectId",l:"Project ID",p:"yourapp-abc12"},
    {k:"storageBucket",l:"Storage Bucket",p:"yourapp.appspot.com"},
    {k:"messagingSenderId",l:"Messaging Sender ID",p:"123456789"},
    {k:"appId",l:"App ID",p:"1:123:web:abc"},
  ];
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:"2rem"}}>
      <div style={{width:"100%",maxWidth:520,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"2.5rem",boxShadow:"0 0 60px rgba(0,212,170,0.08)"}}>
        <div style={{fontSize:40,marginBottom:8}}>⌬</div>
        <h1 style={{fontFamily:"'DM Mono',monospace",fontSize:22,color:"var(--text)",margin:"0 0 8px"}}>DevVault Setup</h1>
        <p style={{color:"var(--muted)",fontSize:13,marginBottom:16,lineHeight:1.7}}>
          Connect your Firebase project. <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{color:"#00d4aa"}}>Create one free →</a>
        </p>
        <div style={{padding:"10px 14px",background:"#00d4aa10",border:"1px solid #00d4aa30",borderRadius:8,fontSize:12,color:"#00d4aa",lineHeight:1.8,marginBottom:16}}>
          <strong>Before connecting, in Firebase console:</strong><br/>
          1. Enable <strong>Firestore Database</strong><br/>
          2. Enable <strong>Authentication → Google</strong> sign-in<br/>
          3. Add Firestore rules (see below)
        </div>
        <details style={{marginBottom:16}}>
          <summary style={{fontSize:12,color:"var(--muted)",cursor:"pointer"}}>Show required Firestore security rules</summary>
          <pre style={{fontSize:11,background:"var(--bg)",padding:10,borderRadius:6,marginTop:6,color:"#a8ff78",overflow:"auto",border:"1px solid var(--border)"}}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}`}</pre>
        </details>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {fields.map(f=>(
            <div key={f.k}>
              <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>{f.l}</label>
              <input style={{marginTop:4}} placeholder={f.p} value={cfg[f.k]} onChange={e=>setCfg(p=>({...p,[f.k]:e.target.value}))} />
            </div>
          ))}
        </div>
        {err && <p style={{color:"#ff6b6b",fontSize:13,marginTop:10}}>{err}</p>}
        <button onClick={()=>{
          if(!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.storageBucket || !cfg.messagingSenderId || !cfg.appId){
            setErr("All Firebase config fields are required.");
            return;
          }
          localStorage.setItem(FIREBASE_CONFIG_KEY,JSON.stringify(cfg));
          onConnect(cfg);
        }} style={{marginTop:16,width:"100%",padding:"12px",background:"#00d4aa",border:"none",borderRadius:8,color:"#0a0f0e",fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          CONNECT →
        </button>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onSignIn, error }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <div style={{textAlign:"center",padding:"3rem",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,maxWidth:360,width:"90%",boxShadow:"0 0 60px rgba(0,212,170,0.08)"}}>
        <div style={{fontSize:52,marginBottom:12}}>⌬</div>
        <h1 style={{fontFamily:"'DM Mono',monospace",fontSize:22,color:"var(--text)",margin:"0 0 8px"}}>DevVault</h1>
        <p style={{color:"var(--muted)",fontSize:13,marginBottom:28,lineHeight:1.6}}>Your personal code knowledge base.<br/>Sign in to access your vault.</p>
        <button onClick={onSignIn} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"12px 20px",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",color:"var(--text)",fontFamily:"'DM Mono',monospace",fontSize:14,transition:"border-color 0.2s,background 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#00d4aa";e.currentTarget.style.background="#00d4aa10";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.background="var(--bg)";}}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        {error && <p style={{color:"#ff6b6b",fontSize:12,marginTop:12}}>{error}</p>}
        <p style={{color:"var(--muted)",fontSize:11,marginTop:20}}>Only your Google account can access your data.</p>
      </div>
    </div>
  );
}

// ── Entry Form ────────────────────────────────────────────────────────────────
function EntryForm({ onSave, onCancel, initial, categories }) {
  const blank = {title:"",type:"snippet",category:"",content:"",url:"",notes:"",fix:"",pinned:false};
  const [form, setForm] = useState(initial ? {...initial} : blank);
  const [tagInput, setTagInput] = useState((initial?.tags||[]).join(", "));
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const type = ENTRY_TYPES.find(t=>t.id===form.type);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
      onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div style={{width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,padding:"2rem",boxShadow:"0 0 80px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <h2 style={{fontFamily:"'DM Mono',monospace",color:"var(--text)",margin:0,fontSize:18}}>{initial?"Edit Entry":"New Entry"}</h2>
          <button onClick={onCancel} style={{background:"none",border:"none",color:"var(--muted)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {ENTRY_TYPES.map(t=>(
            <button key={t.id} onClick={()=>set("type",t.id)} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",border:form.type===t.id?`1.5px solid ${t.color}`:"1px solid var(--border)",background:form.type===t.id?`${t.color}18`:"transparent",color:form.type===t.id?t.color:"var(--muted)",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,transition:"all 0.2s"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>Title <span style={{color:"#ff6b6b"}}>*</span></label>
            <input style={{marginTop:4}} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="What did you learn?" />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>Category</label>
              <select style={{marginTop:4}} value={form.category} onChange={e=>set("category",e.target.value)}>
                <option value="">— pick one —</option>
                {categories.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>Tags (comma separated)</label>
              <input style={{marginTop:4}} value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="hooks, state, async" />
            </div>
          </div>
          {form.type==="link" && (
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>URL</label>
              <input style={{marginTop:4}} value={form.url} onChange={e=>set("url",e.target.value)} placeholder="https://..." />
            </div>
          )}
          {(form.type==="snippet"||form.type==="mistake") && (
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>{form.type==="mistake"?"The Mistake (code)":"Code"}</label>
              <textarea style={{marginTop:4,fontFamily:"'DM Mono',monospace",fontSize:13,resize:"vertical"}} value={form.content} onChange={e=>set("content",e.target.value)} placeholder={form.type==="mistake"?"// the broken code...":"// your snippet..."} rows={6} />
            </div>
          )}
          {form.type==="mistake" && (
            <div>
              <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>The Fix (code)</label>
              <textarea style={{marginTop:4,fontFamily:"'DM Mono',monospace",fontSize:13,resize:"vertical"}} value={form.fix||""} onChange={e=>set("fix",e.target.value)} placeholder="// the fixed code..." rows={6} />
            </div>
          )}
          <div>
            <label style={{fontSize:11,color:"var(--muted)",fontFamily:"'DM Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>{form.type==="snippet"?"Notes / explanation":form.type==="link"?"Description":"Content"}</label>
            <textarea style={{marginTop:4,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Explain it in your own words..." rows={form.type==="note"?8:3} />
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:"var(--muted)",fontSize:13}}>
            <input type="checkbox" style={{width:"auto !important"}} checked={form.pinned} onChange={e=>set("pinned",e.target.checked)} /> Pin this entry
          </label>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{padding:"10px 20px",background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--muted)",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:13}}>Cancel</button>
          <button onClick={()=>{
            if(!form.title.trim())return;
            onSave({...form,tags:tagInput.split(",").map(t=>t.trim()).filter(Boolean)});
          }} style={{padding:"10px 24px",background:type.color,border:"none",borderRadius:8,color:"#0a0f0e",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13}}>Save →</button>
        </div>
      </div>
    </div>
  );
}

// ── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete, onTogglePin }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const type = ENTRY_TYPES.find(t=>t.id===entry.type)||ENTRY_TYPES[0];
  const copy = text => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1500); };
  return (
    <div style={{background:"var(--surface)",border:`1px solid var(--border)`,borderLeft:`3px solid ${type.color}`,borderRadius:12,padding:"1.2rem",transition:"box-shadow 0.2s,transform 0.2s"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow=`0 4px 24px ${type.color}18`;e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
        <span style={{fontSize:16}}>{type.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <h3 style={{fontFamily:"'DM Mono',monospace",color:"var(--text)",margin:0,fontSize:14,fontWeight:600}}>{entry.title}</h3>
            {entry.pinned && <span title="Pinned">📌</span>}
          </div>
          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
            {entry.category && <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:`${type.color}18`,color:type.color,fontFamily:"'DM Mono',monospace"}}>{entry.category}</span>}
            {(entry.tags||[]).map(tag=><span key={tag} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"var(--bg)",color:"var(--muted)",fontFamily:"'DM Mono',monospace"}}>#{tag}</span>)}
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
          {[["📌","Pin",()=>onTogglePin(entry)],["✎","Edit",()=>onEdit(entry)],["⌫","Delete",()=>onDelete(entry.id)]].map(([icon,title,fn])=>(
            <button key={title} title={title} onClick={e=>{e.stopPropagation();fn();}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:14,padding:"2px 5px",borderRadius:4,transition:"color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
              onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>{icon}</button>
          ))}
        </div>
      </div>
      {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#00d4aa",fontFamily:"'DM Mono',monospace",display:"block",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>⇗ {entry.url}</a>}
      {entry.notes && <p style={{fontSize:13,color:"var(--muted)",margin:"0 0 10px",lineHeight:1.6,display:!expanded?"-webkit-box":"block",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:expanded?"visible":"hidden"}}>{entry.notes}</p>}
      {entry.content && (
        <div style={{position:"relative",marginBottom:entry.fix?8:0}}>
          {entry.type==="mistake" && <div style={{fontSize:11,color:"#ff6b6b",fontFamily:"'DM Mono',monospace",marginBottom:4}}>✕ MISTAKE</div>}
          <pre style={{background:"var(--bg)",borderRadius:8,padding:"12px 16px",margin:0,overflow:"auto",fontSize:12,fontFamily:"'DM Mono',monospace",lineHeight:1.7,maxHeight:expanded?"none":120,border:"1px solid var(--border)"}} dangerouslySetInnerHTML={{__html:highlight(entry.content)}} />
          <button onClick={()=>copy(entry.content)} style={{position:"absolute",top:8,right:8,background:copied?"#00d4aa":"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",color:copied?"#0a0f0e":"var(--muted)",fontFamily:"'DM Mono',monospace",transition:"all 0.2s"}}>
            {copied?"✓ copied":"copy"}
          </button>
        </div>
      )}
      {entry.fix && (
        <div style={{marginTop:8}}>
          <div style={{fontSize:11,color:"#00d4aa",fontFamily:"'DM Mono',monospace",marginBottom:4}}>✓ FIX</div>
          <pre style={{background:"var(--bg)",borderRadius:8,padding:"12px 16px",margin:0,overflow:"auto",fontSize:12,fontFamily:"'DM Mono',monospace",lineHeight:1.7,maxHeight:expanded?"none":120,border:"1px solid #00d4aa30"}} dangerouslySetInnerHTML={{__html:highlight(entry.fix)}} />
        </div>
      )}
      {(entry.content||entry.notes?.length>120) && (
        <button onClick={()=>setExpanded(p=>!p)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,marginTop:8,fontFamily:"'DM Mono',monospace",padding:0}}>
          {expanded?"▲ show less":"▼ show more"}
        </button>
      )}
      <div style={{fontSize:11,color:"var(--muted)",marginTop:10,fontFamily:"'DM Mono',monospace"}}>
        {new Date(entry.createdAt?.seconds*1000||entry.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function DevVault() {
  const [dark, setDark] = useState(true);
  const [phase, setPhase] = useState("boot");
  const [user, setUser] = useState(null);
  const [authErr, setAuthErr] = useState("");
  const [firestoreDb, setFirestoreDb] = useState(null);
  const [authInst, setAuthInst] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const theme = dark
    ? {"--bg":"#0d1117","--surface":"#161b22","--border":"#21262d","--text":"#e6edf3","--muted":"#7d8590"}
    : {"--bg":"#f6f8fa","--surface":"#ffffff","--border":"#d0d7de","--text":"#1f2328","--muted":"#656d76"};


  const initFirebase = useCallback(async (config) => {
    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      const fs = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const au = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      collection=fs.collection; addDoc=fs.addDoc; updateDoc=fs.updateDoc; deleteDoc=fs.deleteDoc;
      doc=fs.doc; onSnapshot=fs.onSnapshot; orderBy=fs.orderBy; query=fs.query;
      signInWithPopup=au.signInWithPopup; GoogleAuthProvider=au.GoogleAuthProvider;
      signOut=au.signOut; onAuthStateChanged=au.onAuthStateChanged;
      const apps = getApps();
      const app = apps.length ? apps[0] : initializeApp(config);
      const fdb = fs.getFirestore(app);
      const auth = au.getAuth(app);
      setFirestoreDb(fdb);
      setAuthInst(auth);
      onAuthStateChanged(auth, u => {
        if (u) { setUser(u); setPhase("app"); }
        else { setUser(null); setPhase("login"); }
      });
    } catch(e) {
      console.error(e);
      localStorage.removeItem(FIREBASE_CONFIG_KEY);
      setPhase("setup");
    }
  }, []);

  useEffect(() => {
    if (hasBundledFirebaseConfig) {
      initFirebase(firebaseConfig);
      return;
    }

    const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (saved) {
      try {
        initFirebase(JSON.parse(saved));
      } catch {
        localStorage.removeItem(FIREBASE_CONFIG_KEY);
        setPhase("setup");
      }
      return;
    }

    setPhase("setup");
  }, [initFirebase]);

  useEffect(() => {
    if (!firestoreDb || !user) return;
    const q = query(collection(firestoreDb,`users/${user.uid}/entries`), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      setEntries(data);
      setCategories([...new Set([...DEFAULT_CATEGORIES,...data.map(e=>e.category).filter(Boolean)])]);
    });
    return () => unsub();
  }, [firestoreDb, user]);

  const handleSignIn = async () => {
    try {
      setAuthErr("");
      await signInWithPopup(authInst, new GoogleAuthProvider());
    } catch(e) {
      setAuthErr(e.code==="auth/popup-closed-by-user"?"Sign-in cancelled.":"Sign-in failed: "+e.message);
    }
  };

  const handleSave = async data => {
    if (!firestoreDb||!user) return;
    const col = collection(firestoreDb,`users/${user.uid}/entries`);
    if (editEntry) await updateDoc(doc(firestoreDb,`users/${user.uid}/entries`,editEntry.id),{...data,updatedAt:new Date()});
    else await addDoc(col,{...data,createdAt:new Date()});
    setShowForm(false); setEditEntry(null);
  };

  const handleDelete = async id => {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(firestoreDb,`users/${user.uid}/entries`,id));
  };

  const handleTogglePin = async entry =>
    updateDoc(doc(firestoreDb,`users/${user.uid}/entries`,entry.id),{pinned:!entry.pinned});

  const filtered = entries
    .filter(e=>filterType==="all"||e.type===filterType)
    .filter(e=>filterCat==="all"||e.category===filterCat)
    .filter(e=>{
      if(!search) return true;
      const q=search.toLowerCase();
      return e.title?.toLowerCase().includes(q)||e.notes?.toLowerCase().includes(q)||
        e.content?.toLowerCase().includes(q)||e.url?.toLowerCase().includes(q)||
        (e.tags||[]).some(t=>t.toLowerCase().includes(q))||e.category?.toLowerCase().includes(q);
    })
    .sort((a,b)=>{
      if(sortBy==="newest") return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
      if(sortBy==="oldest") return (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0);
      if(sortBy==="pinned") return (b.pinned?1:0)-(a.pinned?1:0);
      if(sortBy==="title") return (a.title||"").localeCompare(b.title||"");
      return 0;
    });

  const displayed = [...filtered.filter(e=>e.pinned),...filtered.filter(e=>!e.pinned)];

  const selStyle = {background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none",padding:"6px 10px",cursor:"pointer"};

  return (
    <div style={{...theme,minHeight:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"'DM Mono',monospace",transition:"background 0.3s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      <style>{`
        input,select,textarea{background:var(--bg)!important;border:1px solid var(--border)!important;border-radius:8px!important;color:var(--text)!important;font-family:'DM Mono',monospace!important;font-size:13px!important;outline:none!important;padding:8px 12px!important;width:100%!important;box-sizing:border-box!important;transition:border-color 0.2s!important;}
        input:focus,select:focus,textarea:focus{border-color:#00d4aa!important;}
        select option{background:#161b22;color:#e6edf3;}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
      `}</style>

      {phase==="boot" && <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:14}}>Loading...</div>}
      {phase==="setup" && <SetupScreen onConnect={cfg=>{localStorage.setItem(FIREBASE_CONFIG_KEY,JSON.stringify(cfg));initFirebase(cfg);}} />}
      {phase==="login" && <LoginScreen onSignIn={handleSignIn} error={authErr} />}

      {phase==="app" && <>
        {/* Header */}
        <header style={{position:"sticky",top:0,zIndex:50,background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 1.5rem",display:"flex",alignItems:"center",gap:14,height:56}}>
          <span style={{fontSize:22}}>⌬</span>
          <span style={{fontWeight:600,fontSize:15,letterSpacing:1}}>DevVault</span>
          <div style={{flex:1,maxWidth:420,position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",fontSize:14,pointerEvents:"none",zIndex:1}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search titles, code, notes, tags..." style={{paddingLeft:"32px!important"}} />
            {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",padding:0,width:"auto",color:"var(--muted)",cursor:"pointer",fontSize:13}}>✕</button>}
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            {user?.photoURL && <img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:"50%",border:"2px solid var(--border)"}} />}
            <span style={{fontSize:12,color:"var(--muted)",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"none"}} className="name">{user?.displayName}</span>
            <button onClick={()=>setDark(p=>!p)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"5px 9px",cursor:"pointer",color:"var(--text)",fontSize:14}}>{dark?"☀":"◑"}</button>
            <button onClick={()=>signOut(authInst).then(()=>setEntries([]))} style={{...selStyle,color:"var(--muted)"}}>Sign out</button>
            <button onClick={()=>{setEditEntry(null);setShowForm(true);}} style={{background:"#00d4aa",border:"none",borderRadius:8,padding:"8px 14px",color:"#0a0f0e",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>+ New</button>
          </div>
        </header>

        {/* Filter bar */}
        <div style={{padding:"10px 1.5rem",borderBottom:"1px solid var(--border)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {[{id:"all",label:"All",icon:"◈",color:"var(--text)"},...ENTRY_TYPES].map(t=>(
            <button key={t.id} onClick={()=>setFilterType(t.id)} style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:12,border:filterType===t.id?`1.5px solid ${t.color}`:"1px solid var(--border)",background:filterType===t.id?`${t.color}15`:"transparent",color:filterType===t.id?t.color:"var(--muted)",fontFamily:"'DM Mono',monospace",transition:"all 0.15s"}}>
              {t.icon} {t.label}
            </button>
          ))}
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...selStyle,width:"auto"}}>
            <option value="all">All categories</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...selStyle,width:"auto",marginLeft:"auto"}}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="pinned">Pinned first</option>
            <option value="title">A–Z</option>
          </select>
        </div>

        {/* Stats */}
        <div style={{padding:"7px 1.5rem",borderBottom:"1px solid var(--border)",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          {ENTRY_TYPES.map(t=>(
            <span key={t.id} style={{fontSize:12,color:"var(--muted)"}}>
              <span style={{color:t.color}}>{t.icon}</span> {entries.filter(e=>e.type===t.id).length}
            </span>
          ))}
          <span style={{marginLeft:"auto",fontSize:12,color:"var(--muted)"}}>{filtered.length} / {entries.length} entries</span>
        </div>

        {/* Grid */}
        <main style={{padding:"1.5rem",maxWidth:1200,margin:"0 auto"}}>
          {displayed.length===0 ? (
            <div style={{textAlign:"center",color:"var(--muted)",padding:"5rem"}}>
              <div style={{fontSize:48,marginBottom:16}}>⌬</div>
              <p style={{fontSize:14}}>{search?"No entries match your search.":"Your vault is empty. Hit + New to add your first entry!"}</p>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:16}}>
              {displayed.map(entry=>(
                <EntryCard key={entry.id} entry={entry}
                  onEdit={e=>{setEditEntry(e);setShowForm(true);}}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
        </main>
      </>}

      {showForm && <EntryForm initial={editEntry} categories={categories} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditEntry(null);}} />}
    </div>
  );
}