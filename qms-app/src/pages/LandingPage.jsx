// LandingPage.jsx
// MBL QMS — Introduction & entry point

export default function LandingPage({ onEnter }) {
  const modules = [
    { icon: "📊", name: "KPI Dashboard",       desc: "15 quality indicators · ISO 15189 §7.5–7.8" },
    { icon: "⚙",  name: "Equipment Log",        desc: "Calibration · Maintenance · Breakdown" },
    { icon: "📄", name: "Document Control",     desc: "SOPs · Policies · Version control" },
    { icon: "⚠",  name: "NCR / CAPA",           desc: "Non-conformance · Root cause · Closure" },
    { icon: "🧪", name: "Sample Management",    desc: "Pre-analytical · Rejection · Transit" },
    { icon: "🎓", name: "Training & Competency",desc: "Staff records · Assessment · Matrix" },
    { icon: "👥", name: "Customer Feedback",    desc: "Complaints · Satisfaction · Resolution" },
    { icon: "📋", name: "Management Review",    desc: "MRM minutes · Action tracking · KPIs" },
  ];

  const depts = [
    { count: 11, label: "Technical",            color: "#185FA5" },
    { count: 9,  label: "Non-technical",        color: "#0F6E56" },
    { count: 5,  label: "Customer interactive", color: "#854F0B" },
    { count: 4,  label: "Control",              color: "#534AB7" },
    { count: 1,  label: "Administration",       color: "#A32D2D" },
  ];

  return (
    <div style={{
      fontFamily: "'Inter',system-ui,sans-serif",
      background: "#0A0F0D",
      minHeight: "100vh",
      color: "#F0EEE8",
    }}>

      {/* Nav bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 40px",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
        background: "rgba(10,15,13,0.95)",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: "#1D9E75",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
          }}>M</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>MBL QMS</div>
            <div style={{ fontSize: 10, color: "#5DCAA5", letterSpacing: "0.06em" }}>
              ISO 15189 : 2022
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 11, padding: "3px 12px", borderRadius: 20,
            border: "0.5px solid #1D9E75", color: "#5DCAA5",
          }}>
            Microbiological Laboratory
          </span>
          <button
            onClick={onEnter}
            style={{
              padding: "8px 20px", background: "#1D9E75", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseOver={e => e.target.style.background = "#0F6E56"}
            onMouseOut={e => e.target.style.background = "#1D9E75"}
          >
            Sign in →
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        padding: "80px 40px 60px",
        maxWidth: 900, margin: "0 auto",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
          color: "#5DCAA5", textTransform: "uppercase",
          border: "0.5px solid #1D9E75", padding: "4px 14px", borderRadius: 20,
          marginBottom: 24,
        }}>
          Quality Management System
        </div>

        <h1 style={{
          fontSize: 48, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: "-0.03em", margin: "0 0 20px",
          background: "linear-gradient(135deg, #F0EEE8 0%, #5DCAA5 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          MBL Quality<br />Management System
        </h1>

        <p style={{
          fontSize: 16, color: "#8B9E96", lineHeight: 1.7,
          maxWidth: 560, margin: "0 auto 40px",
        }}>
          A comprehensive ISO 15189:2022 compliant QMS for Microbiological Laboratory —
          covering 30 departments, 15 quality indicators, and all pre-analytical to
          post-analytical workflows.
        </p>

        <button
          onClick={onEnter}
          style={{
            padding: "13px 36px", background: "#1D9E75", color: "#fff",
            border: "none", borderRadius: 10, fontSize: 15, fontWeight: 500,
            cursor: "pointer", letterSpacing: "-0.01em",
            boxShadow: "0 0 40px rgba(29,158,117,0.3)",
            transition: "all 0.15s",
          }}
          onMouseOver={e => { e.target.style.background = "#0F6E56"; e.target.style.transform = "translateY(-1px)"; }}
          onMouseOut={e => { e.target.style.background = "#1D9E75"; e.target.style.transform = "translateY(0)"; }}
        >
          Enter QMS Portal →
        </button>
      </div>

      {/* Dept stats strip */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 0,
        borderTop: "0.5px solid rgba(255,255,255,0.06)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        padding: "20px 40px",
        flexWrap: "wrap",
      }}>
        {depts.map((d, i) => (
          <div key={i} style={{
            textAlign: "center", padding: "0 28px",
            borderRight: i < depts.length - 1 ? "0.5px solid rgba(255,255,255,0.08)" : "none",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.color }}>{d.count}</div>
            <div style={{ fontSize: 11, color: "#8B9E96", marginTop: 2 }}>{d.label}</div>
            <div style={{ fontSize: 10, color: "#4A5550" }}>departments</div>
          </div>
        ))}
        <div style={{
          textAlign: "center", padding: "0 28px",
          borderLeft: "0.5px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#5DCAA5" }}>15</div>
          <div style={{ fontSize: 11, color: "#8B9E96", marginTop: 2 }}>Quality</div>
          <div style={{ fontSize: 10, color: "#4A5550" }}>indicators</div>
        </div>
      </div>

      {/* Modules grid */}
      <div style={{ padding: "60px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
          color: "#5DCAA5", textTransform: "uppercase", marginBottom: 24,
          textAlign: "center",
        }}>
          Integrated modules
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}>
          {modules.map((m, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "18px 20px",
              transition: "all 0.15s", cursor: "default",
            }}
              onMouseOver={e => {
                e.currentTarget.style.background = "rgba(29,158,117,0.08)";
                e.currentTarget.style.borderColor = "rgba(29,158,117,0.3)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#F0EEE8", marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ fontSize: 11, color: "#5A6E65", lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ISO strip */}
      <div style={{
        textAlign: "center", padding: "30px 40px 50px",
        borderTop: "0.5px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: 11, color: "#4A5550", letterSpacing: "0.08em" }}>
          DESIGNED FOR &nbsp;·&nbsp; ISO 15189 : 2022 &nbsp;·&nbsp;
          NABL ACCREDITATION &nbsp;·&nbsp; MICROBIOLOGICAL LABORATORY
        </div>
      </div>

    </div>
  );
}
