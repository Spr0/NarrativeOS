import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SEED DATA, CONSTANTS, HELPERS
// (all your existing SEED_PROFILES, SEED_STORIES_BY_PROFILE, COMPETENCIES,
//  TABS, storage helpers, callClaude, callClaudeSearch, DOCX helpers,
//  S styles, Spinner, CopyBtn, JDInput, etc. remain EXACTLY as in your file.)
// ─────────────────────────────────────────────────────────────────────────────

// ... keep all existing code above PROFILE TAB unchanged ...

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE INLINE RESUME UPLOAD GATE
// (replaces missing ResumeUploadGate component)
// ─────────────────────────────────────────────────────────────────────────────

function InlineResumeUploadGate({ profile, onComplete, onSkip }) {
  const [text, setText] = useState(profile.resumeText || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!text.trim()) {
      onSkip?.();
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // Optionally extract contact info from resume text; fall back to existing
      let contact = {};
      try {
        contact = await extractContactFromResume(text);
      } catch {
        contact = {};
      }
      onComplete?.({
        ...profile,
        ...contact,
        resumeText: text,
        resumeUploaded: true,
      });
    } catch (e) {
      setError(e.message || "Failed to process resume.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        background: "#1e2035",
        border: "1px dashed #3a3d5c",
        borderRadius: "8px",
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#e0dcf4",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginBottom: "8px",
        }}
      >
        Upload / paste your resume
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#8880b8",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginBottom: "10px",
        }}
      >
        Paste the full text of your current resume. This becomes the baseline
        for all tailoring. You can skip and add it later if needed.
      </div>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={S.textarea}
        onFocus={(e) => (e.target.style.borderColor = "#4a4abf")}
        onBlur={(e) => (e.target.style.borderColor = "#3a3d5c")}
        placeholder="Paste your resume text here…"
      />
      {error && (
        <div
          style={{
            color: "#c06060",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "12px",
            marginTop: "8px",
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <button
          onClick={handleSave}
          disabled={uploading}
          style={{
            ...S.btn,
            padding: "8px 18px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {uploading ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save resume"
          )}
        </button>
        <button
          onClick={onSkip}
          style={{ ...S.btnGhost, fontSize: "12px", padding: "8px 16px" }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TAB — updated to use InlineResumeUploadGate instead of ResumeUploadGate
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  onUpdateProfile,
  saveJD,
  setSaveJD,
  corrections,
  onUpdateCorrections,
  user,
  logout,
  stories,
  starredCount,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [reupload, setReupload] = useState(false);
  const [driveConnected, setDriveConnected] = useState(
    !!localStorage.getItem("cf:google_token:drive")
  );
  const [gmailConnected, setGmailConnected] = useState(
    !!localStorage.getItem("cf:google_token:gmail")
  );

  const field = (key, label) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <input
        value={form[key] || ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={S.input}
        onFocus={(e) => (e.target.style.borderColor = "#4f6ef7")}
        onBlur={(e) => (e.target.style.borderColor = "#3a3d5c")}
      />
    </div>
  );

  const connectGoogle = (scopeKey, scope, onConnected) => {
    if (!window.google?.accounts?.oauth2) {
      alert(
        "Google services not loaded. Make sure VITE_GOOGLE_CLIENT_ID is set in Netlify environment variables."
      );
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      scope,
      callback: (response) => {
        if (response.access_token) {
          localStorage.setItem(
            `cf:google_token:${scopeKey}`,
            response.access_token
          );
          onConnected(true);
        }
      },
    });
    client.requestAccessToken();
  };

  return (
    <div>
      {/* Account summary */}
      {/* ... keep the rest of ProfileTab UI exactly as in your current file ... */}

      {/* Resume section (only change is here) */}
      <div style={{ ...S.section, marginBottom: "24px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Resume Baseline</div>
        {profile.resumeUploaded ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: reupload ? "16px" : 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#4ade80",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  marginBottom: "4px",
                }}
              >
                ✓ Resume uploaded
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6860a0",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                {(profile.resumeText?.length || 0).toLocaleString()} characters
                · used as baseline for all tailoring
              </div>
            </div>
            <button
              onClick={() => setReupload(!reupload)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px" }}
            >
              {reupload ? "Cancel" : "Replace"}
            </button>
          </div>
        ) : (
          <div
            style={{
              fontSize: "13px",
              color: "#fb923c",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              marginBottom: "16px",
            }}
          >
            ⚠ No resume uploaded — tailoring outputs will use a generic baseline
            and may be missing your contact info.
          </div>
        )}
        {(!profile.resumeUploaded || reupload) && (
          <div style={{ marginTop: "16px" }}>
            <InlineResumeUploadGate
              profile={profile}
              onComplete={(p) => {
                onUpdateProfile(p);
                setReupload(false);
              }}
              onSkip={() => setReupload(false)}
            />
          </div>
        )}
      </div>

      {/* Google integrations, corrections, etc. remain unchanged */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────

function useNetlifyAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) {
      console.warn("Netlify Identity widget not found");
      setAuthLoading(false);
      return;
    }

    const onInit = (u) => {
      setUser(u);
      setAuthLoading(false);
    };
    const onLogin = (u) => {
      setUser(u);
      ni.close();
    };
    const onLogout = () => setUser(null);

    ni.on("init", onInit);
    ni.on("login", onLogin);
    ni.on("logout", onLogout);

    if (ni.currentUser) {
      setUser(ni.currentUser());
      setAuthLoading(false);
    }

    return () => {
      ni.off("init", onInit);
      ni.off("login", onLogin);
      ni.off("logout", onLogout);
    };
  }, []);

  const login = () => {
    const ni = window.netlifyIdentity;
    if (ni) ni.open("login");
    else window.location.href = "/.netlify/identity#signup";
  };
  const logout = () => window.netlifyIdentity?.logout();

  return { user, authLoading, login, logout };
}

function LoginGate() {
  const handleLogin = () => {
    const ni = window.netlifyIdentity;
    if (ni) ni.open("login");
    else window.location.href = "/.netlify/identity#signup";
  };

  // existing LoginGate JSX from your file goes here unchanged
  // (logo, “CareerForge”, buttons, privacy text, etc.)
  return (
    /* paste your existing LoginGate JSX body here */
    <div />
  );
}

export default function App() {
  const { user, authLoading, login, logout } = useNetlifyAuth();

  // all your existing top-level state: selectedProfileId, jd, tab, stories,
  // corrections, saveJD, etc. stays the same and reuses existing components
  // AnalyzeTab, ResumeTab, CoverLetterTab, InterviewPrepTab, ResearchTab,
  // ProfileTab, etc.

  // For brevity, keep your current App() body and only ensure that
  // ProfileTab is imported/used as above and there is NO reference
  // to ResumeUploadGate anywhere.

  return (
    <>
      {/* your existing layout shell and conditional:
          - show loading state
          - if !user → <LoginGate />
          - else main app with tabs */}
    </>
  );
}
