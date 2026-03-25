import { useState } from "react";

function useNetlifyAuth() {
  // Simplified: just check if widget exists
  const ni = typeof window !== "undefined" ? window.netlifyIdentity : null;
  const user = ni?.currentUser();
  const login = () => ni?.open("login") || window.location.href = "/.netlify/identity#signup";
  const logout = () => ni?.logout();
  return { user, login, logout };
}

function LoginGate() {
  return (
    <div style={{minHeight:"100vh",background:"#0f1117",color:"#e8e4f8",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"420px"}}>
        <h1 style={{fontSize:"32px",fontWeight:"800",color:"#e8e4f8",marginBottom:"8px",textAlign:"center"}}>CareerForge</h1>
        <button 
          onClick={() => window.netlifyIdentity?.open("login") || window.location.href = "/.netlify/identity#signup"}
          style={{width:"100%",background:"#ffffff",color:"#1a1a2e",border:"none",borderRadius:"8px",padding:"13px",fontSize:"15px",fontWeight:"600",cursor:"pointer"}}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { user, login, logout } = useNetlifyAuth();

  if (!user) return <LoginGate />;

  return (
    <div style={{minHeight:"100vh",background:"#050716",color:"#e8e4f8",padding:"40px",fontFamily:"system-ui, sans-serif"}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"40px"}}>
          <h1 style={{fontSize:"28px",fontWeight:"800",margin:0}}>CareerForge</h1>
          <button onClick={logout} style={{padding:"10px 20px",background:"transparent",color:"#a8a0c8",border:"1px solid #3a3d5c",borderRadius:"6px",cursor:"pointer"}}>
            Log out
          </button>
        </header>
        
        <div style={{background:"#181a2e",border:"1px solid #2e3050",borderRadius:"12px",padding:"32px"}}>
          <h2 style={{fontSize:"20px",margin:"0 0 16px 0"}}>✅ Render works</h2>
          <p style={{margin:0,color:"#a8a0c8",fontSize:"15px"}}>
            Login successful. Basic shell renders. Next: add tabs.
          </p>
        </div>
      </div>
    </div>
  );
}
