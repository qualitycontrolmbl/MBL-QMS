// HomePage.jsx
// MBL QMS — Main dashboard home after login

export default function HomePage({ setActivePage, userName, userDept, userRole }) {

  const quickLinks = [
    { key: "kpi",       icon: "📊", label: "KPI dashboard",     color: "#0F6E56", bg: "#E1F5EE",
      desc: "View all 15 quality indicators" },
    { key: "equipment", icon: "⚙",  label: "Equipment log",      color: "#185FA5", bg: "#E6F1FB",
      desc: "Calibration & breakdown records" },
    { key: "ncr",       icon: "⚠",  label: "NCR / CAPA",         color: "#A32D2D", bg: "#FCEBEB",
      desc: "3 open non-conformances" },
    { key: "documents", icon: "📄", label: "Document control",   color: "#534AB7", bg: "#EEEDFB",
      desc: "SOPs, policies & forms" },
    { key: "training",  icon: "🎓", label: "Training matrix",    color: "#854F0B", bg: "#FAEEDA",
      desc: "Staff competency records" },
    { key: "samples",   icon: "🧪", label: "Sample management",  color: "#5F5E5A", bg: "#F1EFE8",
      desc: "Pre-analytical tracking" },
  ];

  const alerts = [
    { color: "#A32D2D", bg: "#FCEBEB", text: "3 open NCRs — CAPA response required",           time: "Today" },
    { color: "#854F0B", bg: "#FAEEDA", text: "Sysmex XN-1000 calibration due in 5 days",       time: "Jun 14" },
    { color: "#854F0B", bg: "#FAEEDA", text: "11 staff training records expired",               time: "This week" },
    { color: "#185FA5", bg: "#E6F1FB", text: "MRM scheduled — agenda pending",                  time: "Jun 14" },
    { color: "#0F6E56", bg: "#E1F5EE", text: "IQC all controls in range today",                 time: "Today" },
  ];

  const kpiHighlights = [
    { label: "Registration error",  val: "0.6%",  limit: "≤1%",  pass: true },
    { label: "Sample rejection",    val: "0.8%",  limit: "≤1%",  pass: true },
    { label: "TAT breach",          val: "6.0%",  limit: "≤10%", pass: true },
    { label: "IQC failure",         val: "4.2%",  limit: "≤10%", pass: true },
    { label: "Customer complaints", val: "1.2%",  limit: "≤5%",  pass: true },
    { label: "BC contamination",    val: "1.2%",  limit: "<3%",  pass: true },
  ];

  return (
    <div style={{
      fontFamily: "'Inter',system-ui,sans-serif",
      background: "#F7F6F2", minHeight: "100vh", padding: "20px 24px",
    }}>

      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#2C2C2A", letterSpacing: "-0.02em" }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {userName?.split(" ")[0] || "User"} 👋
        </div>
        <div style={{ fontSize: 13, color: "#888780", marginTop: 3 }}>
          {userDept} &nbsp;·&nbsp;{" "}
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          &nbsp;·&nbsp; ISO 15189 : 2022
        </div>
      </div>

      {/* Summary row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 10, marginBottom: 18,
      }}>
        {[
          { label: "Open NCRs",        val: "3",   sub: "Action required",    color: "#A32D2D" },
          { label: "KPIs within limit",val: "13/15",sub: "This month",        color: "#0F6E56" },
          { label: "Equipment due",    val: "2",   sub: "Calibration in 30d", color: "#854F0B" },
          { label: "Docs pending",     val: "7",   sub: "Awaiting approval",  color: "#854F0B" },
        ].map((c, i) => (
          <div key={i} style={{
            background: "#fff", border: "0.5px solid #E0DDD6",
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: "#888780", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div>

          {/* Quick access */}
          <div style={{
            background: "#fff", border: "0.5px solid #E0DDD6",
            borderRadius: 12, overflow: "hidden", marginBottom: 14,
          }}>
            <div style={{
              padding: "11px 16px", borderBottom: "0.5px solid #E0DDD6",
              fontSize: 13, fontWeight: 500, color: "#2C2C2A",
            }}>
              Quick access
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 0,
            }}>
              {quickLinks.map((q, i) => (
                <div
                  key={q.key}
                  onClick={() => setActivePage(q.key)}
                  style={{
                    padding: "16px",
                    borderRight: i % 3 !== 2 ? "0.5px solid #F1EFE8" : "none",
                    borderBottom: i < 3 ? "0.5px solid #F1EFE8" : "none",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "#FAFAF8"}
                  onMouseOut={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: q.bg, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 16, marginBottom: 8,
                  }}>{q.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{q.label}</div>
                  <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{q.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI highlights */}
          <div style={{
            background: "#fff", border: "0.5px solid #E0DDD6",
            borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{
              padding: "11px 16px", borderBottom: "0.5px solid #E0DDD6",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>KPI snapshot — June 2025</div>
              <div
                onClick={() => setActivePage("kpi")}
                style={{ fontSize: 11, color: "#1D9E75", cursor: "pointer" }}
              >
                View all 15 →
              </div>
            </div>
            {kpiHighlights.map((k, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                padding: "9px 16px", borderBottom: "0.5px solid #F1EFE8",
                gap: 10,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: k.pass ? "#1D9E75" : "#E24B4A",
                }} />
                <div style={{ flex: 1, fontSize: 12, color: "#2C2C2A" }}>{k.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: k.pass ? "#0F6E56" : "#A32D2D" }}>
                  {k.val}
                </div>
                <div style={{ fontSize: 11, color: "#B4B2A9", width: 50, textAlign: "right" }}>
                  {k.limit}
                </div>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                  background: k.pass ? "#E1F5EE" : "#FCEBEB",
                  color: k.pass ? "#085041" : "#791F1F",
                }}>
                  {k.pass ? "Within limit" : "Exceeds"}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Alerts panel */}
        <div>
          <div style={{
            background: "#fff", border: "0.5px solid #E0DDD6",
            borderRadius: 12, overflow: "hidden", marginBottom: 14,
          }}>
            <div style={{
              padding: "11px 16px", borderBottom: "0.5px solid #E0DDD6",
              fontSize: 13, fontWeight: 500, color: "#2C2C2A",
            }}>
              Alerts &amp; notifications
            </div>
            {alerts.map((a, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "10px 16px",
                borderBottom: "0.5px solid #F1EFE8", alignItems: "flex-start",
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: a.color, marginTop: 5,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#2C2C2A", lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: "#B4B2A9", marginTop: 3 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ISO clause reference */}
          <div style={{
            background: "#0A0F0D", borderRadius: 12, padding: "16px",
            border: "0.5px solid #1D3D2F",
          }}>
            <div style={{ fontSize: 11, color: "#5DCAA5", marginBottom: 10, fontWeight: 500 }}>
              ISO 15189 : 2022
            </div>
            {[
              { clause: "§6.4", label: "Equipment requirements" },
              { clause: "§7.3", label: "Pre-examination" },
              { clause: "§7.4", label: "Examination processes" },
              { clause: "§7.5", label: "Quality indicators" },
              { clause: "§8.4", label: "Nonconformity & CAPA" },
              { clause: "§8.6", label: "Management review" },
            ].map((c, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: i < 5 ? "0.5px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <span style={{ fontSize: 11, color: "#4A5550", fontFamily: "monospace" }}>{c.clause}</span>
                <span style={{ fontSize: 11, color: "#8B9E96" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
