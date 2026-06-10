// EquipmentLog.jsx
// ISO 15189:2022 — Equipment Management Module
// Covers: Calibration records, Preventive maintenance, Breakdown/repair history
//
// Firestore collections:
//   equipmentList/{equipmentId}         — master equipment register
//   calibrationRecords/{id}             — calibration entries
//   maintenanceRecords/{id}             — preventive maintenance entries
//   actionRequests/{id}                 — breakdown requests (existing collection)

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

// ─── Constants ───────────────────────────────────────────────────────────────

const EQUIPMENT_LIST = [
  { id: "EQ001", name: "Sysmex XN-1000",          dept: "Haematology",     type: "Analyser" },
  { id: "EQ002", name: "Cobas e411",               dept: "Serology",        type: "Analyser" },
  { id: "EQ003", name: "Cobas c311",               dept: "Biochemistry",    type: "Analyser" },
  { id: "EQ004", name: "BD BACTEC FX40",           dept: "Microbiology",    type: "Incubator" },
  { id: "EQ005", name: "Vitek 2 Compact",          dept: "Microbiology",    type: "Analyser" },
  { id: "EQ006", name: "Biosafety Cabinet",        dept: "Microbiology",    type: "Safety" },
  { id: "EQ007", name: "Autoclave",                dept: "Microbiology",    type: "Steriliser" },
  { id: "EQ008", name: "ELISA Reader",             dept: "Serology",        type: "Analyser" },
  { id: "EQ009", name: "PCR Machine",              dept: "Molecular Biology", type: "Analyser" },
  { id: "EQ010", name: "Refrigerator",             dept: "All",             type: "Storage" },
  { id: "EQ011", name: "Deep Freezer",             dept: "All",             type: "Storage" },
  { id: "EQ012", name: "Centrifuge",               dept: "All",             type: "Equipment" },
  { id: "EQ013", name: "Microscope",               dept: "All",             type: "Equipment" },
  { id: "EQ014", name: "Water Bath",               dept: "All",             type: "Equipment" },
  { id: "EQ015", name: "Incubator",                dept: "Microbiology",    type: "Incubator" },
];

const CALIBRATION_TYPES = [
  "Internal calibration",
  "External calibration",
  "Verification",
  "Performance check",
  "Temperature verification",
  "Linearity check",
];

const MAINTENANCE_TYPES = [
  "Daily maintenance",
  "Weekly maintenance",
  "Monthly maintenance",
  "Quarterly maintenance",
  "Annual maintenance",
  "Filter replacement",
  "Lamp replacement",
  "Probe cleaning",
  "Software update",
];

const RESULT_OPTIONS = ["Pass", "Fail", "Conditional pass"];
const STATUS_OPTIONS  = ["Active", "Under maintenance", "Out of service", "Decommissioned"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function dueBadge(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`, color: "#A32D2D", bg: "#FCEBEB" };
  if (d <= 7)  return { label: `Due in ${d}d`,           color: "#854F0B", bg: "#FAEEDA" };
  if (d <= 30) return { label: `Due in ${d}d`,           color: "#185FA5", bg: "#E6F1FB" };
  return       { label: `Due in ${d}d`,                  color: "#0F6E56", bg: "#E1F5EE" };
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 500,
      padding: "2px 8px", borderRadius: 20,
      background: bg, color,
    }}>{label}</span>
  );
}

function StatusDot({ status }) {
  const colors = {
    "Active":             "#1D9E75",
    "Under maintenance":  "#EF9F27",
    "Out of service":     "#E24B4A",
    "Decommissioned":     "#888780",
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: colors[status] || "#888780",
        display: "inline-block",
      }} />
      {status}
    </span>
  );
}

function FormField({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#5F5E5A", fontWeight: 500 }}>
        {label}{required && <span style={{ color: "#E24B4A" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  padding: "7px 10px",
  border: "0.5px solid #D3D1C7",
  borderRadius: 7,
  fontSize: 12,
  background: "#fff",
  color: "#2C2C2A",
  width: "100%",
};

const selectStyle = { ...inputStyle };

function SectionHeader({ title, sub, action }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px",
      borderBottom: "0.5px solid #E0DDD6",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SumCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#F7F6F2", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#888780", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || "#2C2C2A" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, width: "100%", maxWidth: 600,
        maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "0.5px solid #E0DDD6",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>{title}</div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, color: "#888780", lineHeight: 1,
          }}>✕</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EquipmentLog() {
  const [activeTab, setActiveTab]         = useState("register");
  const [selectedEq, setSelectedEq]       = useState(null);
  const [modal, setModal]                 = useState(null); // "calibration" | "maintenance" | "breakdown"
  const [filterDept, setFilterDept]       = useState("All");
  const [filterStatus, setFilterStatus]   = useState("All");
  const [calibrations, setCalibrations]   = useState([]);
  const [maintenances, setMaintenances]   = useState([]);
  const [breakdowns, setBreakdowns]       = useState([]);
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);

  // Form states
  const [calForm, setCalForm] = useState({
    equipmentId: "", equipmentName: "", calibrationType: "",
    calibrationDate: today(), nextCalibrationDate: "",
    performedBy: "", result: "Pass", certificateNumber: "",
    referenceStandard: "", remarks: "",
  });

  const [maintForm, setMaintForm] = useState({
    equipmentId: "", equipmentName: "", maintenanceType: "",
    maintenanceDate: today(), nextMaintenanceDate: "",
    performedBy: "", findings: "", actionTaken: "", status: "Completed",
  });

  const [bdForm, setBdForm] = useState({
    equipmentId: "", equipmentName: "", department: "",
    breakdownDate: today(), breakdownTime: "",
    description: "", reportedBy: "",
  });

  // Load records from Firestore
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [calSnap, maintSnap, bdSnap] = await Promise.all([
        getDocs(query(collection(db, "calibrationRecords"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "maintenanceRecords"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "actionRequests"),
          where("addressedDepartment", "==", "Biomedical"),
          orderBy("createdAt", "desc"))),
      ]);
      setCalibrations(calSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMaintenances(maintSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBreakdowns(bdSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // Prefill equipment name when ID changes
  const handleEqSelect = (id, setter) => {
    const eq = EQUIPMENT_LIST.find(e => e.id === id);
    setter(prev => ({
      ...prev,
      equipmentId: id,
      equipmentName: eq?.name || "",
      department: eq?.dept || "",
    }));
  };

  // Save calibration
  const saveCalibration = async () => {
    if (!calForm.equipmentId || !calForm.calibrationType || !calForm.performedBy) {
      alert("Please fill all required fields."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "calibrationRecords"), {
        ...calForm,
        addedBy: auth.currentUser?.email || "",
        createdAt: serverTimestamp(),
      });
      setModal(null);
      setCalForm({
        equipmentId: "", equipmentName: "", calibrationType: "",
        calibrationDate: today(), nextCalibrationDate: "",
        performedBy: "", result: "Pass", certificateNumber: "",
        referenceStandard: "", remarks: "",
      });
      loadRecords();
    } catch (e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Save maintenance
  const saveMaintenance = async () => {
    if (!maintForm.equipmentId || !maintForm.maintenanceType || !maintForm.performedBy) {
      alert("Please fill all required fields."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "maintenanceRecords"), {
        ...maintForm,
        addedBy: auth.currentUser?.email || "",
        createdAt: serverTimestamp(),
      });
      setModal(null);
      setMaintForm({
        equipmentId: "", equipmentName: "", maintenanceType: "",
        maintenanceDate: today(), nextMaintenanceDate: "",
        performedBy: "", findings: "", actionTaken: "", status: "Completed",
      });
      loadRecords();
    } catch (e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Save breakdown
  const saveBreakdown = async () => {
    if (!bdForm.equipmentId || !bdForm.description || !bdForm.reportedBy) {
      alert("Please fill all required fields."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "actionRequests"), {
        ...bdForm,
        addressedDepartment: "Biomedical",
        status: "Open",
        createdAt: serverTimestamp(),
        addedBy: auth.currentUser?.email || "",
      });
      setModal(null);
      setBdForm({
        equipmentId: "", equipmentName: "", department: "",
        breakdownDate: today(), breakdownTime: "",
        description: "", reportedBy: "",
      });
      loadRecords();
    } catch (e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Close breakdown
  const closeBreakdown = async (id) => {
    const closedBy = auth.currentUser?.email || "unknown";
    await updateDoc(doc(db, "actionRequests", id), {
      status: "Closed",
      closedAt: serverTimestamp(),
      closedBy,
    });
    loadRecords();
  };

  // Derived stats
  const depts = ["All", ...new Set(EQUIPMENT_LIST.map(e => e.dept))];
  const filteredEq = EQUIPMENT_LIST.filter(e =>
    (filterDept === "All" || e.dept === filterDept)
  );

  const getLastCal = (eqId) => calibrations.find(c => c.equipmentId === eqId);
  const getLastMaint = (eqId) => maintenances.find(m => m.equipmentId === eqId);
  const getOpenBreakdowns = (eqId) => breakdowns.filter(b => b.equipmentId === eqId && b.status === "Open");

  const overdueCalCount = EQUIPMENT_LIST.filter(eq => {
    const cal = getLastCal(eq.id);
    return cal?.nextCalibrationDate && daysUntil(cal.nextCalibrationDate) < 0;
  }).length;

  const openBdCount = breakdowns.filter(b => b.status === "Open").length;

  const dueSoonCount = EQUIPMENT_LIST.filter(eq => {
    const cal = getLastCal(eq.id);
    const d = daysUntil(cal?.nextCalibrationDate);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  // ─── Styles ────────────────────────────────────────────────────────────────

  const card = {
    background: "#fff",
    border: "0.5px solid #E0DDD6",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  };

  const btnPrimary = {
    padding: "7px 14px", background: "#0F6E56", color: "#E1F5EE",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer",
  };

  const btnSecondary = {
    padding: "7px 14px", background: "#F7F6F2", color: "#2C2C2A",
    border: "0.5px solid #D3D1C7", borderRadius: 8, fontSize: 12,
    cursor: "pointer",
  };

  const tabStyle = (active) => ({
    padding: "10px 16px", fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? "#0F6E56" : "#888780",
    borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
    cursor: "pointer", background: "none", border: "none",
    borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
  });

  const tableHead = {
    display: "flex", padding: "7px 16px",
    background: "#F7F6F2", borderBottom: "0.5px solid #E0DDD6", gap: 8,
  };

  const th = { fontSize: 10, fontWeight: 500, color: "#888780" };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" }}>

      {/* Top bar */}
      <div style={{
        background: "#fff", borderBottom: "0.5px solid #E0DDD6",
        padding: "10px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#185FA5",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#E6F1FB", fontSize: 16,
          }}>⚙</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>Equipment log</div>
            <div style={{ fontSize: 11, color: "#888780" }}>
              Calibration · Maintenance · Breakdown history · ISO 15189:2022 §6.4
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSecondary} onClick={() => setModal("calibration")}>
            + Calibration record
          </button>
          <button style={btnSecondary} onClick={() => setModal("maintenance")}>
            + Maintenance record
          </button>
          <button style={{ ...btnPrimary, background: "#A32D2D" }} onClick={() => setModal("breakdown")}>
            ⚠ Report breakdown
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: "#fff", borderBottom: "0.5px solid #E0DDD6",
        padding: "0 20px", display: "flex", gap: 0,
      }}>
        {[
          { key: "register",    label: "Equipment register" },
          { key: "calibration", label: "Calibration" },
          { key: "maintenance", label: "Maintenance" },
          { key: "breakdown",   label: `Breakdowns${openBdCount > 0 ? ` (${openBdCount} open)` : ""}` },
        ].map(t => (
          <button key={t.key} style={tabStyle(activeTab === t.key)}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          <SumCard label="Total equipment" value={EQUIPMENT_LIST.length} sub="In register" />
          <SumCard label="Calibration overdue" value={overdueCalCount}
            sub="Immediate action" color={overdueCalCount > 0 ? "#A32D2D" : "#0F6E56"} />
          <SumCard label="Due in 30 days" value={dueSoonCount}
            sub="Plan calibration" color={dueSoonCount > 0 ? "#854F0B" : "#0F6E56"} />
          <SumCard label="Open breakdowns" value={openBdCount}
            sub="Pending repair" color={openBdCount > 0 ? "#A32D2D" : "#0F6E56"} />
        </div>

        {/* ── EQUIPMENT REGISTER TAB ──────────────────────── */}
        {activeTab === "register" && (
          <div style={card}>
            <SectionHeader
              title="Equipment register"
              sub={`${EQUIPMENT_LIST.length} items · Filter by department`}
              action={
                <select style={{ ...selectStyle, width: "auto" }}
                  value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  {depts.map(d => <option key={d}>{d}</option>)}
                </select>
              }
            />
            <div style={{ ...tableHead, gridTemplateColumns: "80px 1fr 120px 100px 120px 120px 80px" }}>
              {["Eq ID", "Equipment", "Department", "Type", "Last calibration", "Next calibration", "Status"].map((h, i) => (
                <div key={i} style={th}>{h}</div>
              ))}
            </div>
            {filteredEq.map(eq => {
              const cal = getLastCal(eq.id);
              const openBd = getOpenBreakdowns(eq.id);
              const badge = dueBadge(cal?.nextCalibrationDate);
              return (
                <div key={eq.id}
                  onClick={() => setSelectedEq(eq)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 120px 100px 120px 120px 80px",
                    padding: "9px 16px", borderBottom: "0.5px solid #F1EFE8",
                    gap: 8, alignItems: "center", cursor: "pointer",
                    background: selectedEq?.id === eq.id ? "#F0F9F6" : "#fff",
                    transition: "background 0.1s",
                  }}>
                  <div style={{ fontSize: 11, color: "#888780", fontFamily: "monospace" }}>{eq.id}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{eq.name}</div>
                    {openBd.length > 0 && (
                      <Badge label={`${openBd.length} open breakdown`} color="#A32D2D" bg="#FCEBEB" />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#888780" }}>{eq.dept}</div>
                  <div style={{ fontSize: 11, color: "#888780" }}>{eq.type}</div>
                  <div style={{ fontSize: 11, color: "#5F5E5A" }}>
                    {cal?.calibrationDate || <span style={{ color: "#B4B2A9" }}>Not recorded</span>}
                  </div>
                  <div>
                    {badge
                      ? <Badge label={badge.label} color={badge.color} bg={badge.bg} />
                      : <span style={{ fontSize: 11, color: "#B4B2A9" }}>Not set</span>
                    }
                  </div>
                  <div>
                    <StatusDot status={openBd.length > 0 ? "Under maintenance" : "Active"} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CALIBRATION TAB ─────────────────────────────── */}
        {activeTab === "calibration" && (
          <div style={card}>
            <SectionHeader
              title="Calibration records"
              sub="All calibration and verification entries"
              action={
                <button style={btnPrimary} onClick={() => setModal("calibration")}>
                  + Add calibration
                </button>
              }
            />
            {loading && <div style={{ padding: 20, color: "#888780", fontSize: 13 }}>Loading…</div>}
            {!loading && calibrations.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#888780", fontSize: 13 }}>
                No calibration records yet. Add the first one using the button above.
              </div>
            )}
            {calibrations.map(rec => {
              const badge = dueBadge(rec.nextCalibrationDate);
              return (
                <div key={rec.id} style={{
                  padding: "11px 16px", borderBottom: "0.5px solid #F1EFE8",
                  display: "grid", gridTemplateColumns: "1fr 120px 110px 110px 90px 90px",
                  gap: 8, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>
                      {rec.equipmentName}
                      <span style={{ fontSize: 10, color: "#888780", marginLeft: 6, fontFamily: "monospace" }}>
                        {rec.equipmentId}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>
                      {rec.calibrationType} · {rec.referenceStandard || "—"}
                    </div>
                    {rec.certificateNumber && (
                      <div style={{ fontSize: 10, color: "#888780" }}>
                        Cert: {rec.certificateNumber}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#5F5E5A" }}>{rec.calibrationDate}</div>
                  <div style={{ fontSize: 11, color: "#888780" }}>{rec.performedBy}</div>
                  <div>
                    {badge
                      ? <Badge label={badge.label} color={badge.color} bg={badge.bg} />
                      : <span style={{ fontSize: 11, color: "#B4B2A9" }}>No due date</span>
                    }
                  </div>
                  <div>
                    <Badge
                      label={rec.result}
                      color={rec.result === "Pass" ? "#085041" : rec.result === "Fail" ? "#791F1F" : "#633806"}
                      bg={rec.result === "Pass" ? "#E1F5EE" : rec.result === "Fail" ? "#FCEBEB" : "#FAEEDA"}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "#B4B2A9" }}>
                    {rec.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MAINTENANCE TAB ─────────────────────────────── */}
        {activeTab === "maintenance" && (
          <div style={card}>
            <SectionHeader
              title="Preventive maintenance records"
              sub="Scheduled and completed maintenance entries"
              action={
                <button style={btnPrimary} onClick={() => setModal("maintenance")}>
                  + Add maintenance
                </button>
              }
            />
            {loading && <div style={{ padding: 20, color: "#888780", fontSize: 13 }}>Loading…</div>}
            {!loading && maintenances.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#888780", fontSize: 13 }}>
                No maintenance records yet. Add the first one using the button above.
              </div>
            )}
            {maintenances.map(rec => {
              const badge = dueBadge(rec.nextMaintenanceDate);
              return (
                <div key={rec.id} style={{
                  padding: "11px 16px", borderBottom: "0.5px solid #F1EFE8",
                  display: "grid", gridTemplateColumns: "1fr 120px 110px 110px 90px",
                  gap: 8, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>
                      {rec.equipmentName}
                      <span style={{ fontSize: 10, color: "#888780", marginLeft: 6, fontFamily: "monospace" }}>
                        {rec.equipmentId}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>
                      {rec.maintenanceType}
                    </div>
                    {rec.findings && (
                      <div style={{ fontSize: 11, color: "#5F5E5A", marginTop: 2 }}>
                        Findings: {rec.findings}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#5F5E5A" }}>{rec.maintenanceDate}</div>
                  <div style={{ fontSize: 11, color: "#888780" }}>{rec.performedBy}</div>
                  <div>
                    {badge
                      ? <Badge label={badge.label} color={badge.color} bg={badge.bg} />
                      : <span style={{ fontSize: 11, color: "#B4B2A9" }}>No due date</span>
                    }
                  </div>
                  <div>
                    <Badge
                      label={rec.status || "Completed"}
                      color={rec.status === "Completed" ? "#085041" : "#633806"}
                      bg={rec.status === "Completed" ? "#E1F5EE" : "#FAEEDA"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BREAKDOWN TAB ──────────────────────────────── */}
        {activeTab === "breakdown" && (
          <div style={card}>
            <SectionHeader
              title="Breakdown & repair history"
              sub="All reported equipment breakdowns — auto-feeds KPI 7.6.10"
              action={
                <button style={{ ...btnPrimary, background: "#A32D2D" }}
                  onClick={() => setModal("breakdown")}>
                  ⚠ Report breakdown
                </button>
              }
            />
            {loading && <div style={{ padding: 20, color: "#888780", fontSize: 13 }}>Loading…</div>}
            {!loading && breakdowns.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#888780", fontSize: 13 }}>
                No breakdown records found.
              </div>
            )}
            {breakdowns.map(rec => {
              const created = rec.createdAt?.toDate?.();
              const closed = rec.closedAt?.toDate?.();
              const durationHours = created && closed
                ? ((closed - created) / (1000 * 60 * 60)).toFixed(1)
                : null;
              return (
                <div key={rec.id} style={{
                  padding: "11px 16px", borderBottom: "0.5px solid #F1EFE8",
                  display: "grid", gridTemplateColumns: "1fr 110px 110px 80px 90px 100px",
                  gap: 8, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>
                      {rec.equipmentName || rec.equipment || "—"}
                      <span style={{ fontSize: 10, color: "#888780", marginLeft: 6, fontFamily: "monospace" }}>
                        {rec.equipmentId}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>
                      {rec.description}
                    </div>
                    <div style={{ fontSize: 10, color: "#B4B2A9", marginTop: 2 }}>
                      Reported by: {rec.reportedBy || rec.addedBy || "—"}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#5F5E5A" }}>
                    {created?.toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric"
                    }) || rec.breakdownDate || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#888780" }}>
                    {closed?.toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short"
                    }) || "—"}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: durationHours ? "#2C2C2A" : "#B4B2A9" }}>
                    {durationHours ? `${durationHours}h` : "Open"}
                  </div>
                  <div>
                    <Badge
                      label={rec.status}
                      color={rec.status === "Closed" ? "#085041" : "#791F1F"}
                      bg={rec.status === "Closed" ? "#E1F5EE" : "#FCEBEB"}
                    />
                  </div>
                  <div>
                    {rec.status === "Open" && (
                      <button
                        onClick={() => closeBreakdown(rec.id)}
                        style={{
                          padding: "5px 10px", background: "#0F6E56", color: "#E1F5EE",
                          border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        }}>
                        Mark closed
                      </button>
                    )}
                    {rec.status === "Closed" && (
                      <span style={{ fontSize: 10, color: "#888780" }}>
                        {rec.closedBy || "—"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── CALIBRATION MODAL ──────────────────────────── */}
      {modal === "calibration" && (
        <Modal title="Add calibration record — ISO 15189:2022 §6.4.3" onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Equipment" required>
              <select style={selectStyle} value={calForm.equipmentId}
                onChange={e => handleEqSelect(e.target.value, setCalForm)}>
                <option value="">Select equipment</option>
                {EQUIPMENT_LIST.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.id} — {eq.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Calibration type" required>
              <select style={selectStyle} value={calForm.calibrationType}
                onChange={e => setCalForm(p => ({ ...p, calibrationType: e.target.value }))}>
                <option value="">Select type</option>
                {CALIBRATION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Calibration date" required>
              <input style={inputStyle} type="date" value={calForm.calibrationDate}
                onChange={e => setCalForm(p => ({ ...p, calibrationDate: e.target.value }))} />
            </FormField>
            <FormField label="Next calibration date">
              <input style={inputStyle} type="date" value={calForm.nextCalibrationDate}
                onChange={e => setCalForm(p => ({ ...p, nextCalibrationDate: e.target.value }))} />
            </FormField>
            <FormField label="Performed by" required>
              <input style={inputStyle} type="text" placeholder="Name / Organisation"
                value={calForm.performedBy}
                onChange={e => setCalForm(p => ({ ...p, performedBy: e.target.value }))} />
            </FormField>
            <FormField label="Result" required>
              <select style={selectStyle} value={calForm.result}
                onChange={e => setCalForm(p => ({ ...p, result: e.target.value }))}>
                {RESULT_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="Certificate number">
              <input style={inputStyle} type="text" placeholder="Cert / Report no."
                value={calForm.certificateNumber}
                onChange={e => setCalForm(p => ({ ...p, certificateNumber: e.target.value }))} />
            </FormField>
            <FormField label="Reference standard">
              <input style={inputStyle} type="text" placeholder="e.g. NABL traceable"
                value={calForm.referenceStandard}
                onChange={e => setCalForm(p => ({ ...p, referenceStandard: e.target.value }))} />
            </FormField>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Remarks">
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3}
                  value={calForm.remarks}
                  onChange={e => setCalForm(p => ({ ...p, remarks: e.target.value }))} />
              </FormField>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>Cancel</button>
            <button style={btnPrimary} onClick={saveCalibration} disabled={saving}>
              {saving ? "Saving…" : "Save calibration record"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MAINTENANCE MODAL ──────────────────────────── */}
      {modal === "maintenance" && (
        <Modal title="Add maintenance record — ISO 15189:2022 §6.4.6" onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Equipment" required>
              <select style={selectStyle} value={maintForm.equipmentId}
                onChange={e => handleEqSelect(e.target.value, setMaintForm)}>
                <option value="">Select equipment</option>
                {EQUIPMENT_LIST.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.id} — {eq.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Maintenance type" required>
              <select style={selectStyle} value={maintForm.maintenanceType}
                onChange={e => setMaintForm(p => ({ ...p, maintenanceType: e.target.value }))}>
                <option value="">Select type</option>
                {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Maintenance date" required>
              <input style={inputStyle} type="date" value={maintForm.maintenanceDate}
                onChange={e => setMaintForm(p => ({ ...p, maintenanceDate: e.target.value }))} />
            </FormField>
            <FormField label="Next maintenance date">
              <input style={inputStyle} type="date" value={maintForm.nextMaintenanceDate}
                onChange={e => setMaintForm(p => ({ ...p, nextMaintenanceDate: e.target.value }))} />
            </FormField>
            <FormField label="Performed by" required>
              <input style={inputStyle} type="text" placeholder="Name / Engineer"
                value={maintForm.performedBy}
                onChange={e => setMaintForm(p => ({ ...p, performedBy: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <select style={selectStyle} value={maintForm.status}
                onChange={e => setMaintForm(p => ({ ...p, status: e.target.value }))}>
                <option>Completed</option>
                <option>In progress</option>
                <option>Pending</option>
              </select>
            </FormField>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Findings">
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2}
                  placeholder="Observations during maintenance"
                  value={maintForm.findings}
                  onChange={e => setMaintForm(p => ({ ...p, findings: e.target.value }))} />
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Action taken">
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={2}
                  placeholder="Parts replaced, adjustments made, etc."
                  value={maintForm.actionTaken}
                  onChange={e => setMaintForm(p => ({ ...p, actionTaken: e.target.value }))} />
              </FormField>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>Cancel</button>
            <button style={btnPrimary} onClick={saveMaintenance} disabled={saving}>
              {saving ? "Saving…" : "Save maintenance record"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── BREAKDOWN MODAL ───────────────────────────── */}
      {modal === "breakdown" && (
        <Modal title="Report equipment breakdown — ISO 15189:2022 §6.4.7" onClose={() => setModal(null)}>
          <div style={{
            background: "#FCEBEB", border: "0.5px solid #E24B4A",
            borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#791F1F",
          }}>
            ⚠ This will create an open action request for the Biomedical department and
            automatically count towards KPI 7.6.10 (Equipment downtime).
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Equipment" required>
              <select style={selectStyle} value={bdForm.equipmentId}
                onChange={e => handleEqSelect(e.target.value, setBdForm)}>
                <option value="">Select equipment</option>
                {EQUIPMENT_LIST.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.id} — {eq.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Department">
              <input style={{ ...inputStyle, background: "#F7F6F2" }} type="text"
                value={bdForm.department} readOnly />
            </FormField>
            <FormField label="Breakdown date" required>
              <input style={inputStyle} type="date" value={bdForm.breakdownDate}
                onChange={e => setBdForm(p => ({ ...p, breakdownDate: e.target.value }))} />
            </FormField>
            <FormField label="Breakdown time">
              <input style={inputStyle} type="time" value={bdForm.breakdownTime}
                onChange={e => setBdForm(p => ({ ...p, breakdownTime: e.target.value }))} />
            </FormField>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Description of breakdown" required>
                <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3}
                  placeholder="Describe the fault, error message, or symptoms observed"
                  value={bdForm.description}
                  onChange={e => setBdForm(p => ({ ...p, description: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Reported by" required>
              <input style={inputStyle} type="text" placeholder="Your name"
                value={bdForm.reportedBy}
                onChange={e => setBdForm(p => ({ ...p, reportedBy: e.target.value }))} />
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button style={btnSecondary} onClick={() => setModal(null)}>Cancel</button>
            <button style={{ ...btnPrimary, background: "#A32D2D" }}
              onClick={saveBreakdown} disabled={saving}>
              {saving ? "Saving…" : "Submit breakdown report"}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
