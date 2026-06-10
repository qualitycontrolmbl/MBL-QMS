// KPIDashboard.jsx
// ISO 15189:2022 — Quality Indicators Dashboard (Sections 7.5 – 7.8)
// Integrates with Firebase Firestore for monthly data entry and retrieval.
// Reads equipment downtime from "actionRequests" collection (Biomedical closures).
//
// Firestore collections used:
//   kpiData/{YYYY-MM}  — monthly KPI numerator/denominator entries
//   actionRequests     — equipment downtime (status:"Closed", equipment, createdAt, closedAt)

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

// ─── KPI definitions ────────────────────────────────────────────────────────

const KPI_DEFS = [
  {
    id: "7.5.1",
    seq: "01",
    name: "Registration error",
    short: "Reg error",
    formula: "Errors in registration ÷ Total registrations × 100",
    numLabel: "Errors in registration",
    denLabel: "Total registrations",
    limit: 1,
    limitNote: "≤ 1%",
    group: "pre",
  },
  {
    id: "7.5.2",
    seq: "02",
    name: "Sample collection error",
    short: "Collection error",
    formula: "Errors in collection ÷ Total samples collected × 100",
    numLabel: "Collection errors",
    denLabel: "Total samples collected",
    limit: 1,
    limitNote: "≤ 1%",
    group: "pre",
  },
  {
    id: "7.5.3",
    seq: "03",
    name: "Sample transport error",
    short: "Transport error",
    formula: "Out-of-range temperature readings ÷ Samples transported × 100",
    numLabel: "Out-of-range temperature readings",
    denLabel: "Samples transported",
    limit: 1,
    limitNote: "≤ 1%",
    group: "pre",
  },
  {
    id: "7.5.4",
    seq: "04",
    name: "Sample rejection",
    short: "Rejection",
    formula: "Samples rejected ÷ Samples received × 100",
    numLabel: "Samples rejected",
    denLabel: "Samples received",
    limit: 1,
    limitNote: "≤ 1%",
    group: "pre",
  },
  {
    id: "7.5.5",
    seq: "05",
    name: "Sample processing error",
    short: "Processing error",
    formula: "Wrongly analyzed samples ÷ Total analyzed × 100",
    numLabel: "Wrongly analyzed samples",
    denLabel: "Total samples analyzed",
    limit: 0.5,
    limitNote: "≤ 0.5%",
    group: "analytical",
  },
  {
    id: "7.5.6",
    seq: "06",
    name: "IQC failure rate",
    short: "IQC failure",
    formula: "Failed IQC results ÷ Total IQC values × 100",
    numLabel: "Failed IQC results",
    denLabel: "Total IQC values",
    limit: 10,
    limitNote: "≤ 10%",
    group: "analytical",
  },
  {
    id: "7.5.7",
    seq: "07",
    name: "EQA failure rate",
    short: "EQA failure",
    formula: "Failed proficiency tests ÷ Total proficiency tests × 100",
    numLabel: "Failed proficiency tests",
    denLabel: "Total proficiency tests",
    limit: 10,
    limitNote: "≤ 10%",
    group: "analytical",
  },
  {
    id: "7.5.8",
    seq: "08",
    name: "Report error rate",
    short: "Report error",
    formula: "Failed / error reports ÷ Total reports issued × 100",
    numLabel: "Failed / error reports",
    denLabel: "Total reports issued",
    limit: 1,
    limitNote: "≤ 1%",
    group: "post",
  },
  {
    id: "7.5.9",
    seq: "09",
    name: "Negative customer feedback",
    short: "Neg feedback",
    formula: "Negative feedback ÷ Total feedback received × 100",
    numLabel: "Negative feedback count",
    denLabel: "Total feedback received",
    limit: 2,
    limitNote: "≤ 2%",
    group: "post",
  },
  {
    id: "7.6.10",
    seq: "10",
    name: "Equipment downtime",
    short: "Downtime",
    formula: "Machine breakdowns ÷ Total breakdown events × 100",
    numLabel: "Machine breakdowns (auto from Biomedical)",
    denLabel: "Total breakdown events",
    limit: 10,
    limitNote: "≤ 10%",
    group: "equipment",
    autoFromBiomedical: true,
  },
  {
    id: "7.7.11",
    seq: "11",
    name: "TAT breach rate",
    short: "TAT breach",
    formula: "Reports released beyond TAT ÷ Total reports released × 100",
    numLabel: "Reports beyond TAT",
    denLabel: "Total reports released",
    limit: 10,
    limitNote: "≤ 10%",
    group: "post",
  },
  {
    id: "7.7.12",
    seq: "12",
    name: "Customer complaint rate",
    short: "Complaints",
    formula: "Complaints ÷ Total patients × 100",
    numLabel: "Total complaints",
    denLabel: "Total patients",
    limit: 5,
    limitNote: "≤ 5%",
    group: "post",
  },
  {
    id: "7.7.13",
    seq: "13",
    name: "Sample transit time breach",
    short: "Transit time",
    formula: "Samples out of time limit ÷ Total samples × 100",
    numLabel: "Samples out of time limit",
    denLabel: "Total samples",
    limit: 5,
    limitNote: "≤ 5%",
    group: "pre",
  },
  {
    id: "7.7.14",
    seq: "14",
    name: "Blood culture contamination",
    short: "BC contamination",
    formula: "Contaminated cultures ÷ Total blood cultures × 100",
    numLabel: "Contaminated cultures",
    denLabel: "Total blood cultures",
    limit: 3,
    limitNote: "< 3%",
    group: "analytical",
  },
  {
    id: "7.7.15",
    seq: "15",
    name: "Coefficient of variation (CV%)",
    short: "CV %",
    formula: "CV% expressed as percentage per instrument / analyte",
    numLabel: "Sum of CV% values recorded",
    denLabel: "Number of analytes measured",
    limit: 10,
    limitNote: "< 10%",
    group: "analytical",
  },
];

const BIOMEDICAL_EQUIPMENT = [
  "Sysmex XN-1000",
  "Cobas e411",
  "Cobas c311",
  "BD BACTEC FX40",
  "Vitek 2 Compact",
  "Biosafety Cabinet",
  "Autoclave",
  "ELISA Reader",
  "PCR Machine",
  "Refrigerator",
  "Deep Freezer",
  "Centrifuge",
  "Microscope",
  "Water Bath",
  "Incubator",
];

const GROUP_LABELS = {
  pre: "Pre-analytical",
  analytical: "Analytical",
  post: "Post-analytical",
  equipment: "Equipment",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcPct(num, den) {
  const n = parseFloat(num);
  const d = parseFloat(den);
  if (!isNaN(n) && !isNaN(d) && d > 0) return (n / d) * 100;
  return null;
}

function getStatus(val, limit) {
  if (val === null) return "none";
  if (val <= limit * 0.8) return "pass";
  if (val <= limit) return "warn";
  return "fail";
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    opts.push({ key, label });
  }
  return opts;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    pass: { bg: "#E1F5EE", color: "#085041", text: "Within limit" },
    warn: { bg: "#FAEEDA", color: "#633806", text: "Near limit" },
    fail: { bg: "#FCEBEB", color: "#791F1F", text: "Exceeds limit" },
    none: { bg: "#F1EFE8", color: "#5F5E5A", text: "No data" },
  };
  const c = cfg[status] || cfg.none;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 9px",
        borderRadius: 20,
        background: c.bg,
        color: c.color,
        whiteSpace: "nowrap",
      }}
    >
      {c.text}
    </span>
  );
}

function BarFill({ val, limit }) {
  if (val === null) return null;
  const pct = Math.min(100, (val / limit) * 100);
  const color =
    val <= limit * 0.8 ? "#1D9E75" : val <= limit ? "#EF9F27" : "#E24B4A";
  return (
    <div
      style={{
        height: 4,
        background: "#E8E8E5",
        borderRadius: 4,
        marginTop: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: "#F7F6F2",
        borderRadius: 8,
        padding: "12px 14px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, color: "#888780", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || "#2C2C2A" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#5F5E5A", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ─── Mini SVG bar chart ──────────────────────────────────────────────────────

function MiniBarChart({ items }) {
  const W = 300, H = 110, PAD = { l: 8, r: 8, t: 8, b: 28 };
  const bw = Math.max(10, (W - PAD.l - PAD.r) / items.length - 6);
  const maxVal = Math.max(...items.map((i) => i.limit), ...items.map((i) => i.val ?? 0), 1);

  const xPos = (i) =>
    PAD.l + i * ((W - PAD.l - PAD.r) / items.length) + (W - PAD.l - PAD.r) / items.length / 2 - bw / 2;

  const yH = (v) => ((v / maxVal) * (H - PAD.t - PAD.b));
  const yTop = (v) => H - PAD.b - yH(v);

  const color = (v, lim) =>
    v === null ? "#D3D1C7" : v <= lim * 0.8 ? "#1D9E75" : v <= lim ? "#EF9F27" : "#E24B4A";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      {items.map((item, i) => {
        const x = xPos(i);
        const v = item.val ?? 0;
        const h = Math.max(2, yH(v));
        const lh = yH(item.limit);
        return (
          <g key={item.seq}>
            <rect
              x={x} y={yTop(v)} width={bw} height={h}
              fill={color(item.val, item.limit)} rx={2}
            />
            <line
              x1={x - 2} x2={x + bw + 2}
              y1={H - PAD.b - lh} y2={H - PAD.b - lh}
              stroke="#E24B4A" strokeWidth={1.2} strokeDasharray="3 2"
            />
            <text
              x={x + bw / 2} y={H - 8}
              textAnchor="middle" fontSize={9} fill="#888780"
            >
              {item.seq}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function KPIDashboard() {
  const MONTH_OPTS = monthOptions();
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTS[0].key);
  const [activeTab, setActiveTab] = useState("overview"); // overview | entry | equipment
  const [entries, setEntries] = useState({}); // { kpiId: { num, den } }
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [equipmentData, setEquipmentData] = useState([]); // from actionRequests
  const [selectedEquipment, setSelectedEquipment] = useState("All");

  // Load KPI data for selected month from Firestore
  const loadMonthData = useCallback(async (mk) => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "kpiData", mk));
      if (snap.exists()) {
        setEntries(snap.data().indicators || {});
      } else {
        setEntries({});
      }
    } catch (e) {
      console.error("Error loading KPI data:", e);
    }
    setLoading(false);
  }, []);

  // Load equipment downtime from actionRequests (Biomedical closed requests)
  const loadEquipmentData = useCallback(async (mk) => {
    try {
      const [year, month] = mk.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const q = query(
        collection(db, "actionRequests"),
        where("status", "==", "Closed"),
        where("addressedDepartment", "==", "Biomedical")
      );
      const snap = await getDocs(q);
      const rows = [];
      snap.forEach((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.();
        const closed = data.closedAt?.toDate?.();
        if (!created || created < start || created >= end) return;
        const durationHours =
          closed && created ? (closed - created) / (1000 * 60 * 60) : null;
        rows.push({
          id: d.id,
          equipment: data.equipment || "Unknown",
          createdAt: created,
          closedAt: closed,
          durationHours,
          closedBy: data.closedBy || "",
        });
      });
      setEquipmentData(rows);
    } catch (e) {
      console.error("Error loading equipment data:", e);
    }
  }, []);

  useEffect(() => {
    loadMonthData(selectedMonth);
    loadEquipmentData(selectedMonth);
  }, [selectedMonth, loadMonthData, loadEquipmentData]);

  // Auto-fill KPI 7.6.10 from equipment data
  useEffect(() => {
    const totalBreakdowns = equipmentData.length;
    if (totalBreakdowns > 0) {
      setEntries((prev) => ({
        ...prev,
        "7.6.10": {
          ...(prev["7.6.10"] || {}),
          num: String(totalBreakdowns),
          den: prev["7.6.10"]?.den || String(totalBreakdowns),
        },
      }));
    }
  }, [equipmentData]);

  const handleEntry = (kpiId, field, value) => {
    setEntries((prev) => ({
      ...prev,
      [kpiId]: { ...(prev[kpiId] || {}), [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "kpiData", selectedMonth),
        {
          month: selectedMonth,
          indicators: entries,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || "",
        },
        { merge: true }
      );
      setSaved(true);
    } catch (e) {
      console.error("Error saving KPI data:", e);
      alert("Error saving data. Please try again.");
    }
    setSaving(false);
  };

  // Compute values
  const computed = {};
  KPI_DEFS.forEach((k) => {
    const e = entries[k.id] || {};
    computed[k.id] = calcPct(e.num, e.den);
  });

  const passCount = KPI_DEFS.filter((k) => getStatus(computed[k.id], k.limit) === "pass").length;
  const failCount = KPI_DEFS.filter((k) => getStatus(computed[k.id], k.limit) === "fail").length;
  const enteredCount = KPI_DEFS.filter((k) => computed[k.id] !== null).length;

  const monthLabel = MONTH_OPTS.find((m) => m.key === selectedMonth)?.label || selectedMonth;

  const groups = ["pre", "analytical", "post", "equipment"];

  // Filtered equipment downtime
  const filteredEquip =
    selectedEquipment === "All"
      ? equipmentData
      : equipmentData.filter((r) => r.equipment === selectedEquipment);

  const totalDowntimeHours = filteredEquip
    .filter((r) => r.durationHours !== null)
    .reduce((a, r) => a + r.durationHours, 0);

  // ─── Styles ────────────────────────────────────────────────────────────────

  const S = {
    wrap: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: "#F7F6F2",
      minHeight: "100vh",
      padding: 0,
    },
    topbar: {
      background: "#fff",
      borderBottom: "0.5px solid #E0DDD6",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10,
    },
    logoIcon: {
      width: 32, height: 32, borderRadius: 8,
      background: "#0F6E56",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#E1F5EE", fontSize: 16, flexShrink: 0,
    },
    isoBadge: {
      fontSize: 11, padding: "3px 10px", borderRadius: 20,
      background: "#E1F5EE", color: "#085041",
      border: "0.5px solid #5DCAA5",
    },
    tabs: {
      background: "#fff",
      borderBottom: "0.5px solid #E0DDD6",
      padding: "0 20px",
      display: "flex", gap: 0,
    },
    tab: (active) => ({
      padding: "10px 16px",
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      color: active ? "#0F6E56" : "#888780",
      cursor: "pointer",
      background: "none",
      border: "none",
      borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
    }),
    content: { padding: "16px 20px", maxWidth: 1100, margin: "0 auto" },
    card: {
      background: "#fff",
      border: "0.5px solid #E0DDD6",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 14,
    },
    cardHeader: {
      padding: "11px 16px",
      borderBottom: "0.5px solid #E0DDD6",
      display: "flex", alignItems: "center", gap: 8,
    },
    sectionLabel: {
      fontSize: 10, fontWeight: 500,
      textTransform: "uppercase", letterSpacing: "0.08em",
      color: "#888780", padding: "8px 16px 4px",
      background: "#F7F6F2",
      borderBottom: "0.5px solid #E0DDD6",
    },
    kpiRow: {
      display: "grid",
      gridTemplateColumns: "26px 1fr 80px 70px 50px 95px",
      padding: "9px 16px",
      borderBottom: "0.5px solid #F1EFE8",
      alignItems: "center",
      gap: 8,
      cursor: "default",
    },
    kpiRowHover: {
      background: "#FAFAF8",
    },
    input: {
      padding: "5px 8px",
      border: "0.5px solid #D3D1C7",
      borderRadius: 7,
      fontSize: 12,
      background: "#fff",
      color: "#2C2C2A",
      width: "100%",
    },
    saveBtn: {
      padding: "8px 20px",
      background: "#0F6E56", color: "#E1F5EE",
      border: "none", borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      cursor: "pointer",
    },
    select: {
      padding: "5px 8px",
      border: "0.5px solid #D3D1C7",
      borderRadius: 7,
      fontSize: 12,
      background: "#fff",
      color: "#2C2C2A",
    },
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logoIcon}>📊</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>
              Quality indicators — KPI dashboard
            </div>
            <div style={{ fontSize: 11, color: "#888780" }}>
              Sections 7.5 – 7.8 &nbsp;·&nbsp; 15 indicators &nbsp;·&nbsp; Monthly monitoring
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={S.isoBadge}>ISO 15189 : 2022</span>
          <select
            style={S.select}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTH_OPTS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { key: "overview", label: "Overview" },
          { key: "entry", label: "Monthly data entry" },
          { key: "equipment", label: "Equipment downtime" },
        ].map((t) => (
          <button
            key={t.key}
            style={S.tab(activeTab === t.key)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={S.content}>

        {/* ── Summary cards ─────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
          <SummaryCard label="Month" value={monthLabel.split(" ")[0]} sub={monthLabel.split(" ")[1]} />
          <SummaryCard label="Entered / 15" value={`${enteredCount}/15`}
            sub={enteredCount < 15 ? `${15 - enteredCount} pending entry` : "All entered"}
            color={enteredCount === 15 ? "#0F6E56" : "#854F0B"} />
          <SummaryCard label="Within limit" value={passCount}
            sub={`${Math.round((passCount / 15) * 100)}% compliant`} color="#0F6E56" />
          <SummaryCard label="Exceeds limit" value={failCount}
            sub={failCount > 0 ? "Action required" : "All clear"}
            color={failCount > 0 ? "#A32D2D" : "#0F6E56"} />
        </div>

        {/* ── OVERVIEW TAB ──────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* Mini charts by group */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { key: "pre", color: "#1D9E75" },
                { key: "analytical", color: "#378ADD" },
                { key: "post", color: "#534AB7" },
                { key: "equipment", color: "#EF9F27" },
              ].map(({ key, color }) => {
                const items = KPI_DEFS.filter((k) => k.group === key).map((k) => ({
                  seq: k.seq, short: k.short, val: computed[k.id], limit: k.limit,
                }));
                return (
                  <div key={key} style={S.card}>
                    <div style={{ ...S.cardHeader }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>
                        {GROUP_LABELS[key]} indicators
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#888780" }}>
                        {items.filter((i) => i.val !== null && i.val > i.limit).length} exceeding
                      </span>
                    </div>
                    <div style={{ padding: "10px 12px 6px" }}>
                      <MiniBarChart items={items} />
                      <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#888780" }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
                          Value %
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#888780" }}>
                          <span style={{ width: 14, height: 2, background: "#E24B4A", display: "inline-block" }} />
                          Limit %
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full KPI table */}
            <div style={S.card}>
              <div style={{ ...S.cardHeader }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>
                  All 15 quality indicators — {monthLabel}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#888780" }}>
                  Acceptability limits per ISO 15189 : 2022 §7.8
                </span>
              </div>

              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "26px 1fr 80px 70px 50px 95px",
                padding: "7px 16px",
                background: "#F7F6F2",
                borderBottom: "0.5px solid #E0DDD6",
                gap: 8,
              }}>
                {["#", "Indicator & formula", "Value %", "Limit", "vs prev", "Status"].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 500, color: "#888780", textAlign: i > 1 ? "right" : "left" }}>
                    {h}
                  </div>
                ))}
              </div>

              {groups.map((grp) => (
                <div key={grp}>
                  <div style={S.sectionLabel}>{GROUP_LABELS[grp]}</div>
                  {KPI_DEFS.filter((k) => k.group === grp).map((k) => {
                    const val = computed[k.id];
                    const status = getStatus(val, k.limit);
                    const valColor =
                      status === "pass" ? "#0F6E56" :
                      status === "warn" ? "#854F0B" :
                      status === "fail" ? "#A32D2D" : "#888780";
                    return (
                      <div key={k.id} style={S.kpiRow}>
                        <div style={{ fontSize: 11, color: "#B4B2A9", fontWeight: 500 }}>{k.seq}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>
                            {k.name}
                            <span style={{ fontSize: 10, fontWeight: 400, color: "#B4B2A9", marginLeft: 6 }}>
                              §{k.id}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888780", marginTop: 1 }}>{k.formula}</div>
                          <div style={{ width: "80%" }}>
                            <BarFill val={val} limit={k.limit} />
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: valColor, textAlign: "right" }}>
                          {val !== null ? `${val.toFixed(2)}%` : "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "#888780", textAlign: "right" }}>{k.limitNote}</div>
                        <div style={{ fontSize: 11, textAlign: "right", color: "#B4B2A9" }}>—</div>
                        <div style={{ textAlign: "right" }}><StatusBadge status={status} /></div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── DATA ENTRY TAB ────────────────────────────── */}
        {activeTab === "entry" && (
          <div style={S.card}>
            <div style={{ ...S.cardHeader, justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>
                  Monthly data entry — {monthLabel}
                </div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>
                  Enter numerator and denominator for each indicator. Value % is calculated automatically.
                </div>
              </div>
              <button
                style={S.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save all data"}
              </button>
            </div>

            {loading && (
              <div style={{ padding: 20, color: "#888780", fontSize: 13 }}>Loading data…</div>
            )}

            {groups.map((grp) => (
              <div key={grp}>
                <div style={S.sectionLabel}>{GROUP_LABELS[grp]}</div>
                {KPI_DEFS.filter((k) => k.group === grp).map((k) => {
                  const e = entries[k.id] || {};
                  const val = calcPct(e.num, e.den);
                  const status = getStatus(val, k.limit);
                  const valColor =
                    status === "pass" ? "#0F6E56" :
                    status === "warn" ? "#854F0B" :
                    status === "fail" ? "#A32D2D" : "#888780";
                  return (
                    <div key={k.id} style={{
                      display: "grid",
                      gridTemplateColumns: "26px 1fr 180px 180px 90px 95px",
                      padding: "9px 16px",
                      borderBottom: "0.5px solid #F1EFE8",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <div style={{ fontSize: 11, color: "#B4B2A9", fontWeight: 500 }}>{k.seq}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{k.name}</div>
                        <div style={{ fontSize: 10, color: "#888780" }}>Limit: {k.limitNote}</div>
                        {k.autoFromBiomedical && (
                          <div style={{ fontSize: 10, color: "#185FA5", marginTop: 2 }}>
                            ↳ Auto-filled from Biomedical equipment log
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#888780", marginBottom: 3 }}>{k.numLabel}</div>
                        <input
                          style={S.input}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={e.num || ""}
                          readOnly={k.autoFromBiomedical}
                          onChange={(ev) => handleEntry(k.id, "num", ev.target.value)}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#888780", marginBottom: 3 }}>{k.denLabel}</div>
                        <input
                          style={S.input}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={e.den || ""}
                          onChange={(ev) => handleEntry(k.id, "den", ev.target.value)}
                        />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#888780", marginBottom: 3 }}>Calculated</div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: valColor }}>
                          {val !== null ? `${val.toFixed(2)}%` : "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#888780", marginBottom: 5 }}>Status</div>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
              <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : saved ? "✓ Saved to Firestore" : "Save all data"}
              </button>
              <span style={{ fontSize: 11, color: "#888780" }}>
                Saved to kpiData/{selectedMonth} · Updated by {auth.currentUser?.email || "unknown"}
              </span>
            </div>
          </div>
        )}

        {/* ── EQUIPMENT DOWNTIME TAB ────────────────────── */}
        {activeTab === "equipment" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              <SummaryCard label="Total breakdowns" value={equipmentData.length} sub={monthLabel} />
              <SummaryCard
                label="Avg downtime per event"
                value={
                  equipmentData.filter((r) => r.durationHours !== null).length > 0
                    ? `${(totalDowntimeHours / equipmentData.filter((r) => r.durationHours !== null).length).toFixed(1)}h`
                    : "—"
                }
                sub="Hours per event"
              />
              <SummaryCard
                label="KPI 7.6.10 status"
                value={computed["7.6.10"] !== null ? `${computed["7.6.10"].toFixed(1)}%` : "No data"}
                sub={`Limit ≤ 10%`}
                color={
                  computed["7.6.10"] === null ? "#888780" :
                  computed["7.6.10"] <= 10 * 0.8 ? "#0F6E56" :
                  computed["7.6.10"] <= 10 ? "#854F0B" : "#A32D2D"
                }
              />
            </div>

            <div style={S.card}>
              <div style={{ ...S.cardHeader, justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>
                  Equipment breakdown log — {monthLabel}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#888780" }}>Filter:</span>
                  <select
                    style={S.select}
                    value={selectedEquipment}
                    onChange={(e) => setSelectedEquipment(e.target.value)}
                  >
                    <option value="All">All equipment</option>
                    {BIOMEDICAL_EQUIPMENT.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 140px 80px 100px",
                padding: "7px 16px",
                background: "#F7F6F2",
                borderBottom: "0.5px solid #E0DDD6",
                gap: 8,
              }}>
                {["Equipment", "Breakdown raised", "Closed at", "Duration", "Closed by"].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 500, color: "#888780" }}>{h}</div>
                ))}
              </div>

              {filteredEquip.length === 0 ? (
                <div style={{ padding: "20px 16px", fontSize: 13, color: "#888780" }}>
                  No breakdown records found for {monthLabel}.
                  {" "}Records are pulled automatically from Biomedical closed action requests.
                </div>
              ) : (
                filteredEquip.map((r) => (
                  <div key={r.id} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 140px 80px 100px",
                    padding: "9px 16px",
                    borderBottom: "0.5px solid #F1EFE8",
                    gap: 8,
                    alignItems: "center",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{r.equipment}</div>
                    <div style={{ fontSize: 11, color: "#888780" }}>
                      {r.createdAt?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#888780" }}>
                      {r.closedAt?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) || "Pending"}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: r.durationHours !== null ? "#2C2C2A" : "#E24B4A" }}>
                      {r.durationHours !== null ? `${r.durationHours.toFixed(1)}h` : "Open"}
                    </div>
                    <div style={{ fontSize: 11, color: "#888780" }}>{r.closedBy || "—"}</div>
                  </div>
                ))
              )}

              {filteredEquip.length > 0 && (
                <div style={{ padding: "10px 16px", background: "#F7F6F2", borderTop: "0.5px solid #E0DDD6", display: "flex", justifyContent: "flex-end", gap: 16 }}>
                  <span style={{ fontSize: 12, color: "#888780" }}>
                    Total events: <strong style={{ color: "#2C2C2A" }}>{filteredEquip.length}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "#888780" }}>
                    Total downtime: <strong style={{ color: "#2C2C2A" }}>{totalDowntimeHours.toFixed(1)}h</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Per-equipment summary */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>
                  Downtime by equipment — {monthLabel}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, padding: 14 }}>
                {BIOMEDICAL_EQUIPMENT.map((eq) => {
                  const rows = equipmentData.filter((r) => r.equipment === eq);
                  const hours = rows
                    .filter((r) => r.durationHours !== null)
                    .reduce((a, r) => a + r.durationHours, 0);
                  return (
                    <div key={eq} style={{
                      background: rows.length > 0 ? "#FFF8F0" : "#F7F6F2",
                      border: `0.5px solid ${rows.length > 0 ? "#FAC775" : "#E0DDD6"}`,
                      borderRadius: 8, padding: "10px 12px",
                    }}>
                      <div style={{ fontSize: 11, color: "#5F5E5A", fontWeight: 500, marginBottom: 4 }}>{eq}</div>
                      <div style={{ fontSize: 18, fontWeight: 500, color: rows.length > 0 ? "#854F0B" : "#B4B2A9" }}>
                        {rows.length > 0 ? `${hours.toFixed(1)}h` : "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "#888780" }}>
                        {rows.length} event{rows.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
