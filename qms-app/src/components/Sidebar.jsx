// Sidebar.jsx
// MBL QMS — Main navigation sidebar with role-aware menu

export default function Sidebar({ activePage, setActivePage, userRole, userName, userDept, onSignOut }) {

  const navSections = [
    {
      label: "Overview",
      items: [
        { key: "dashboard", icon: "🏠", label: "Dashboard" },
      ],
    },
    {
      label: "Quality management",
      items: [
        { key: "kpi",       icon: "📊", label: "KPI dashboard",    roles: ["quality_manager","quality_executive","hod","admin","erp_admin"] },
        { key: "ncr",       icon: "⚠",  label: "NCR / CAPA",       badge: 3 },
        { key: "documents", icon: "📄", label: "Document control" },
        { key: "audit",     icon: "📋", label: "Internal audit",   roles: ["quality_manager","hod","admin"] },
        { key: "mrm",       icon: "🗂",  label: "Management review",roles: ["quality_manager","admin","managing_director"] },
      ],
    },
    {
      label: "Laboratory",
      items: [
        { key: "samples",   icon: "🧪", label: "Sample management" },
        { key: "iqc",       icon: "📈", label: "IQC / EQA" },
        { key: "equipment", icon: "⚙",  label: "Equipment log" },
        { key: "reports",   icon: "📝", label: "Report errors" },
      ],
    },
    {
      label: "People",
      items: [
        { key: "training",  icon: "🎓", label: "Training & competency" },
        { key: "feedback",  icon: "👥", label: "Customer feedback" },
        { key: "complaints",icon: "💬", label: "Complaints" },
      ],
    },
    {
      label: "Administration",
      items: [
        { key: "users",     icon: "🔐", label: "User management",  roles: ["admin","erp_admin"] },
        { key: "amendment", icon: "✏",  label: "Record amendments" },
        { key: "biosafety", icon: "🦠", label: "Biosafety log" },
        { key: "suppliers", icon: "🚚", label: "Supplier register" },
      ],
    },
  ];

  const isAllowed = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  const roleColors = {
    hod:              { bg: "#E6F1FB", color: "#185FA5" },
    quality_manager:  { bg: "#E1F5EE", color: "#085041" },
    admin:            { bg: "#FCEBEB", color: "#791F1F" },
    erp_admin:        { bg: "#F0EDE8", color: "#3C3489" },
    supervisor:       { bg: "#FAEEDA", color: "#633806" },
    staff:            { bg: "#F7F6F2", color: "#5F5E5A" },
  };

  const rc = roleColors[userRole] || roleColors.staff;
  const roleLabel = (userRole || "staff").replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: "#fff",
      borderRight: "0.5px solid #E0DDD6",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      overflow: "hidden",
    }}>

      {/* Logo */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "0.5px solid #E0DDD6",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: "#0A0F0D",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#1D9E75", flexShrink: 0,
        }}>M</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A", letterSpacing: "-0.01em" }}>
            MBL QMS
          </div>
          <div style={{ fontSize: 10, color: "#5DCAA5" }}>ISO 15189 : 2022</div>
        </div>
      </div>

      {/* User chip */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "0.5px solid #E0DDD6",
        background: "#FAFAF8",
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A", marginBottom: 3 }}>
          {userName || "User"}
        </div>
        <div style={{ fontSize: 11, color: "#888780", marginBottom: 6 }}>
          {userDept || "Department"}
        </div>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 10,
          background: rc.bg, color: rc.color, fontWeight: 500,
        }}>
          {roleLabel}
        </span>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {navSections.map(section => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            <div style={{
              padding: "6px 16px 3px",
              fontSize: 10, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: "#B4B2A9",
            }}>
              {section.label}
            </div>
            {section.items.filter(isAllowed).map(item => {
              const active = activePage === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => setActivePage(item.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 16px",
                    cursor: "pointer",
                    fontSize: 13,
                    color: active ? "#0F6E56" : "#5F5E5A",
                    background: active ? "#E1F5EE" : "transparent",
                    borderLeft: active ? "2px solid #0F6E56" : "2px solid transparent",
                    fontWeight: active ? 500 : 400,
                    transition: "all 0.1s",
                  }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.background = "#F7F6F2"; }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 10,
                      background: "#FCEBEB", color: "#A32D2D", fontWeight: 500,
                    }}>{item.badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "0.5px solid #E0DDD6", padding: "8px 0" }}>
        <div
          onClick={() => setActivePage("help")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 16px", cursor: "pointer", fontSize: 13, color: "#888780",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#F7F6F2"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>❓</span>
          Help
        </div>
        <div
          onClick={onSignOut}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 16px", cursor: "pointer", fontSize: 13, color: "#A32D2D",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#FFF5F5"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>🚪</span>
          Sign out
        </div>
      </div>

    </div>
  );
}
