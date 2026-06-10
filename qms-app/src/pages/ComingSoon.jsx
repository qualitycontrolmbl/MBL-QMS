// ComingSoon.jsx
// Placeholder for modules not yet built

export default function ComingSoon({ pageName, icon }) {
  return (
    <div style={{
      fontFamily: "'Inter',system-ui,sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "80vh", padding: 40,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon || "🔧"}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#2C2C2A", marginBottom: 8 }}>
          {pageName}
        </div>
        <div style={{ fontSize: 13, color: "#888780", lineHeight: 1.6, marginBottom: 20 }}>
          This module is being built. It will be available in the next update.
        </div>
        <div style={{
          display: "inline-block", fontSize: 11, padding: "4px 14px",
          borderRadius: 20, background: "#E1F5EE", color: "#0F6E56",
          border: "0.5px solid #5DCAA5",
        }}>
          Coming soon
        </div>
      </div>
    </div>
  );
}
