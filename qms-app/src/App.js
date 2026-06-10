// App.js
// MBL QMS — Main app router
// Flow: Landing → Login (Firebase) → Home (sidebar + modules)

import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import LandingPage  from "./pages/LandingPage";
import LoginPage    from "./pages/LoginPage";
import HomePage     from "./pages/HomePage";
import ComingSoon   from "./pages/ComingSoon";
import Sidebar      from "./components/Sidebar";
import KPIDashboard from "./components/KPIDashboard";
import EquipmentLog from "./components/EquipmentLog"; 
import UserManagement from "./pages/UserManagement";




// ─── App shell with sidebar ───────────────────────────────────────────────────

function AppShell({ user, userProfile, onSignOut }) {
  const [activePage, setActivePage] = useState("dashboard");

  const pageMap = {
    dashboard: <HomePage
      setActivePage={setActivePage}
      userName={userProfile?.name || user?.email}
      userDept={userProfile?.department || ""}
      userRole={userProfile?.role || "staff"}
    />,
    kpi:        <KPIDashboard />,
    equipment:  <EquipmentLog />,
    ncr:        <ComingSoon pageName="NCR / CAPA Tracker"           icon="⚠"  />,
    documents:  <ComingSoon pageName="Document Control"             icon="📄" />,
    audit:      <ComingSoon pageName="Internal Audit"               icon="📋" />,
    mrm:        <ComingSoon pageName="Management Review"            icon="🗂"  />,
    samples:    <ComingSoon pageName="Sample Management"            icon="🧪" />,
    iqc:        <ComingSoon pageName="IQC / EQA"                    icon="📈" />,
    reports:    <ComingSoon pageName="Report Errors"                icon="📝" />,
    training:   <ComingSoon pageName="Training & Competency"        icon="🎓" />,
    feedback:   <ComingSoon pageName="Customer Feedback"            icon="👥" />,
    complaints: <ComingSoon pageName="Customer Complaints"          icon="💬" />,
    users:      <UserManagement />,       
    amendment:  <ComingSoon pageName="Record Amendments"            icon="✏"  />,
    biosafety:  <ComingSoon pageName="Biosafety Log"                icon="🦠" />,
    suppliers:  <ComingSoon pageName="Supplier Register"            icon="🚚" />,
    help:       <ComingSoon pageName="Help & Documentation"         icon="❓" />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        userRole={userProfile?.role || "staff"}
        userName={userProfile?.name || user?.email}
        userDept={userProfile?.department || ""}
        onSignOut={onSignOut}
      />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {pageMap[activePage] || pageMap["dashboard"]}
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  // screen: "landing" | "login" | "app"
  const [screen, setScreen]         = useState("landing");
  const [user, setUser]             = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Load profile from localStorage (set during login)
        const saved = localStorage.getItem("qms_profile");
        if (saved) setUserProfile(JSON.parse(saved));
        setScreen("app");
      } else {
        setUser(null);
        setUserProfile(null);
        if (screen === "app") setScreen("landing");
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []); // eslint-disable-line

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem("qms_profile");
    setScreen("landing");
  };

  const handleLoginSuccess = (firebaseUser, profile) => {
    setUser(firebaseUser);
    setUserProfile(profile);
    localStorage.setItem("qms_profile", JSON.stringify(profile));
    setScreen("app");
  };

  if (!authChecked) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0A0F0D",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>M</div>
          <div style={{ fontSize: 13, color: "#5DCAA5" }}>Loading MBL QMS…</div>
        </div>
      </div>
    );
  }

  if (screen === "landing") {
    return <LandingPage onEnter={() => setScreen("login")} />;
  }

  if (screen === "login") {
    return <LoginPage onSuccess={handleLoginSuccess} onBack={() => setScreen("landing")} />;
  }

  return (
    <AppShell
      user={user}
      userProfile={userProfile}
      onSignOut={handleSignOut}
    />
  );
}
