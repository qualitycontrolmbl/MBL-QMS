// UserManagement.jsx
// MBL QMS — ERP Admin · User Management
// Creates, edits, deactivates users across all 30 departments
// Firebase Auth user creation via Admin SDK is server-side only;
// this page saves user records to Firestore "users" collection
// and the actual Firebase Auth account is created via a Cloud Function
// (or manually in Firebase Console for now).

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";

// ─── Data ────────────────────────────────────────────────────────────────────

const DEPT_ROLES = {
  // Technical
  Microbiology:                   ["HOD", "Supervisor", "Staff"],
  Serology:                       ["HOD", "Supervisor", "Staff"],
  "Histopathology & Cytopathology":["HOD", "Supervisor", "Staff"],
  "Flow Cytometry":               ["HOD", "Supervisor", "Staff"],
  Cytogenetics:                   ["HOD", "Supervisor", "Staff"],
  Biochemistry:                   ["HOD", "Supervisor", "Staff"],
  Haematology:                    ["HOD", "Supervisor", "Staff"],
  "Clinical Pathology":           ["HOD", "Supervisor", "Staff"],
  "Molecular Biology":            ["HOD", "Supervisor", "Staff"],
  "Molecular Genetics":           ["HOD", "Supervisor", "Staff"],
  // Non-technical
  Quality:                        ["Quality Manager", "Quality Executive"],
  "Human Resource":               ["HRM", "HRE"],
  "Biomedical Engineering":       ["BME"],
  Purchase:                       ["Purchase Manager", "Purchase User"],
  Maintenance:                    ["Manager"],
  Housekeeping:                   ["HK Incharge", "HK Staff"],
  "Information Technology":       ["IT Manager", "IT Executive"],
  Kitchen:                        ["Kitchen Incharge", "Kitchen Staff"],
  Security:                       ["Security Incharge", "Staff"],
  // Customer interactive
  Collection:                     ["Incharge", "Phlebotomist"],
  "Front Office":                 ["Incharge", "Staff"],
  "Back Office":                  ["Incharge", "Staff"],
  "Sample Collection Centre":     ["Incharge", "Staff"],
  "Call Centre":                  ["Incharge", "Staff"],
  // Control
  Accounts:                       ["Incharge"],
  Administration:                 ["Managing Director", "Deputy Director"],
  Design:                         ["Incharge"],
  Marketing:                      ["Manager", "Assistant Manager", "Executive"],
  // Admin
  "ERP Administration":           ["Admin", "Assistant Admin"],
};

const DEPT_GROUPS = {
  "Technical departments": [
    "Microbiology","Serology","Histopathology & Cytopathology",
    "Flow Cytometry","Cytogenetics","Biochemistry",
    "Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
  ],
  "Non-technical departments": [
    "Quality","Human Resource","Biomedical Engineering","Purchase",
    "Maintenance","Housekeeping","Information Technology","Kitchen","Security",
  ],
  "Customer interactive": [
    "Collection","Front Office","Back Office","Sample Collection Centre","Call Centre",
  ],
  "Control departments": ["Accounts","Administration","Design","Marketing"],
  "Administration":      ["ERP Administration"],
};

const STATUS_COLORS = {
  Active:      { bg: "#E1F5EE", color: "#085041" },
  Inactive:    { bg: "#F1EFE8", color: "#5F5E5A" },
  Suspended:   { bg: "#FCEBEB", color: "#791F1F" },
};

const EMPTY_FORM = {
  fullName: "", employeeId: "", email: "", phone: "",
  department: "", role: "", status: "Active",
  qualification: "", joinDate: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ["#0F6E56","#185FA5","#534AB7","#854F0B","#A32D2D","#3C6E71"];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name.charCodeAt(i) + h * 31) % colors.length;
  return colors[h];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:1000,padding:16,
    }}>
      <div style={{
        background:"#fff",borderRadius:14,
        width:"100%",maxWidth: wide ? 780 : 560,
        maxHeight:"92vh",overflow:"auto",
        boxShadow:"0 12px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 20px",borderBottom:"0.5px solid #E0DDD6",
          position:"sticky",top:0,background:"#fff",zIndex:1,
        }}>
          <div style={{fontSize:14,fontWeight:500,color:"#2C2C2A"}}>{title}</div>
          <button onClick={onClose} style={{
            background:"none",border:"none",cursor:"pointer",
            fontSize:18,color:"#888780",lineHeight:1,
          }}>✕</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11,fontWeight:500,color:"#5F5E5A"}}>
        {label}{required && <span style={{color:"#E24B4A"}}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {
  padding:"7px 10px",border:"0.5px solid #D3D1C7",borderRadius:7,
  fontSize:12,background:"#fff",color:"#2C2C2A",width:"100%",
  outline:"none",boxSizing:"border-box",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserManagement() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [modal, setModal]           = useState(null); // "add" | "edit" | "view"
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [search, setSearch]         = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeTab, setActiveTab]   = useState("all");
  const [bulkRows, setBulkRows]     = useState([]); // parsed CSV rows
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDone, setBulkDone]     = useState(0);

  const roles = form.department ? (DEPT_ROLES[form.department] || []) : [];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── CSV parser ──────────────────────────────────────────
  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        alert("CSV must have a header row and at least one data row."); return;
      }
      // Skip header row (index 0)
      const rows = lines.slice(1).map((line, i) => {
        // Handle quoted commas
        const cols = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(",");
        const clean = cols.map(c => c.replace(/^"|"$/g,"").trim());
        const [fullName,employeeId,email,phone,department,role,qualification,joinDate,status] = clean;

        // Validate
        let error = "";
        if (!fullName)    error = "Full name is required";
        else if (!email)  error = "Email is required";
        else if (!department) error = "Department is required";
        else if (!role)   error = "Role is required";
        else if (department && !DEPT_ROLES[department])
          error = `Unknown department: ${department}`;
        else if (role && department && DEPT_ROLES[department] &&
          !DEPT_ROLES[department].includes(role))
          error = `Role "${role}" not valid for ${department}`;

        return {
          fullName, employeeId, email, phone,
          department, role, qualification,
          joinDate, status: status || "Active",
          _error: error, _row: i + 2,
        };
      }).filter(r => r.fullName || r.email); // skip blank lines

      if (rows.length > 100) {
        alert("Maximum 100 users per upload. Please split into smaller files."); return;
      }
      setBulkRows(rows);
      setBulkDone(0);
    };
    reader.readAsText(file);
  };

  // ── Bulk save to Firestore ──────────────────────────────
  const handleBulkUpload = async () => {
    const validRows = bulkRows.filter(r => !r._error);
    if (validRows.length === 0) return;
    setBulkSaving(true);
    let count = 0;
    try {
      for (const row of validRows) {
        const { _error, _row, ...data } = row;
        await addDoc(collection(db, "users"), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.email || "",
        });
        count++;
      }
      setBulkDone(count);
      setBulkRows([]);
      loadUsers();
    } catch (e) {
      console.error(e);
      alert(`Uploaded ${count} users before an error occurred.`);
    }
    setBulkSaving(false);
  };

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.department || !form.role) {
      alert("Please fill all required fields."); return;
    }
    setSaving(true);
    try {
      if (modal === "add") {
        await addDoc(collection(db, "users"), {
          ...form,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.email || "",
        });
      } else if (modal === "edit" && selected) {
        await updateDoc(doc(db, "users", selected.id), {
          ...form,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || "",
        });
      }
      setModal(null);
      setForm(EMPTY_FORM);
      setSelected(null);
      loadUsers();
    } catch (e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const openEdit = (u) => {
    setSelected(u);
    setForm({
      fullName: u.fullName || "", employeeId: u.employeeId || "",
      email: u.email || "", phone: u.phone || "",
      department: u.department || "", role: u.role || "",
      status: u.status || "Active", qualification: u.qualification || "",
      joinDate: u.joinDate || "",
    });
    setModal("edit");
  };

  const toggleStatus = async (u) => {
    const newStatus = u.status === "Active" ? "Inactive" : "Active";
    await updateDoc(doc(db, "users", u.id), {
      status: newStatus, updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || "",
    });
    loadUsers();
  };

  // Filters
  const allDepts = ["All", ...Object.keys(DEPT_ROLES)];
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchDept   = filterDept === "All"   || u.department === filterDept;
    const matchStatus = filterStatus === "All" || u.status === filterStatus;
    const matchTab =
      activeTab === "all"      ? true :
      activeTab === "active"   ? u.status === "Active" :
      activeTab === "inactive" ? u.status !== "Active" : true;
    return matchSearch && matchDept && matchStatus && matchTab;
  });

  const activeCount   = users.filter(u => u.status === "Active").length;
  const inactiveCount = users.filter(u => u.status !== "Active").length;

  // Group by department for dept view
  const byDept = {};
  Object.keys(DEPT_ROLES).forEach(d => {
    const us = users.filter(u => u.department === d);
    if (us.length > 0) byDept[d] = us;
  });

  const S = {
    wrap: { fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar: {
      background:"#fff", borderBottom:"0.5px solid #E0DDD6",
      padding:"10px 20px", display:"flex", alignItems:"center",
      justifyContent:"space-between", flexWrap:"wrap", gap:10,
    },
    card: {
      background:"#fff", border:"0.5px solid #E0DDD6",
      borderRadius:12, overflow:"hidden", marginBottom:14,
    },
    tab: (a) => ({
      padding:"9px 16px", fontSize:13,
      fontWeight: a ? 500 : 400,
      color: a ? "#0F6E56" : "#888780",
      cursor:"pointer", background:"none", border:"none",
      borderBottom: a ? "2px solid #0F6E56" : "2px solid transparent",
    }),
    btn: {
      padding:"7px 14px", background:"#0F6E56", color:"#E1F5EE",
      border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
    },
  };

  return (
    <div style={S.wrap}>

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:32,height:32,borderRadius:8,background:"#185FA5",
            display:"flex",alignItems:"center",justifyContent:"center",
            color:"#E6F1FB",fontSize:16,
          }}>👥</div>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:"#2C2C2A"}}>User management</div>
            <div style={{fontSize:11,color:"#888780"}}>
              All 30 departments · Role-based access · ERP Admin
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{
            padding:"7px 14px",background:"#F7F6F2",color:"#2C2C2A",
            border:"0.5px solid #D3D1C7",borderRadius:8,fontSize:12,
            fontWeight:500,cursor:"pointer",
          }} onClick={() => {
            setBulkRows([]); setBulkErrors([]); setBulkDone(0);
            setModal("bulk");
          }}>
            ⬆ Bulk upload
          </button>
          <button style={S.btn} onClick={() => { setForm(EMPTY_FORM); setModal("add"); }}>
            + Add user
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background:"#fff", borderBottom:"0.5px solid #E0DDD6",
        padding:"0 20px", display:"flex",
      }}>
        {[
          { key:"all",      label:`All users (${users.length})` },
          { key:"active",   label:`Active (${activeCount})` },
          { key:"inactive", label:`Inactive (${inactiveCount})` },
          { key:"dept",     label:"By department" },
        ].map(t => (
          <button key={t.key} style={S.tab(activeTab===t.key)}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"16px 20px",maxWidth:1100,margin:"0 auto"}}>

        {/* Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[
            { label:"Total users",       val: users.length,    sub:"Registered",       color:"#2C2C2A" },
            { label:"Active",            val: activeCount,     sub:"Can sign in",      color:"#0F6E56" },
            { label:"Inactive",          val: inactiveCount,   sub:"Access disabled",  color:"#854F0B" },
            { label:"Departments",       val: Object.keys(byDept).length, sub:"With users", color:"#185FA5" },
          ].map((c,i) => (
            <div key={i} style={{background:"#F7F6F2",borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontSize:11,color:"#888780",marginBottom:3}}>{c.label}</div>
              <div style={{fontSize:22,fontWeight:500,color:c.color}}>{c.val}</div>
              <div style={{fontSize:11,color:"#888780",marginTop:2}}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        {activeTab !== "dept" && (
          <div style={{
            display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center",
          }}>
            <input
              style={{...inp, width:220}}
              placeholder="Search name, email, ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={{...inp,width:200}}
              value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              {allDepts.map(d => <option key={d}>{d}</option>)}
            </select>
            <select style={{...inp,width:140}}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All status</option>
              <option>Active</option><option>Inactive</option><option>Suspended</option>
            </select>
            <span style={{fontSize:12,color:"#888780",marginLeft:"auto"}}>
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* ── USER TABLE ────────────────────────────────── */}
        {activeTab !== "dept" && (
          <div style={S.card}>
            {/* Header */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"40px 1fr 160px 140px 80px 100px 80px",
              padding:"7px 16px",background:"#F7F6F2",
              borderBottom:"0.5px solid #E0DDD6",gap:8,
            }}>
              {["","Name","Department","Role","Emp ID","Status",""].map((h,i) => (
                <div key={i} style={{fontSize:10,fontWeight:500,color:"#888780"}}>{h}</div>
              ))}
            </div>

            {loading && (
              <div style={{padding:24,textAlign:"center",color:"#888780",fontSize:13}}>
                Loading users…
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div style={{padding:32,textAlign:"center",color:"#888780",fontSize:13}}>
                {users.length === 0
                  ? "No users yet. Click + Add user to create the first one."
                  : "No users match your filters."}
              </div>
            )}

            {filtered.map(u => {
              const sc = STATUS_COLORS[u.status] || STATUS_COLORS.Active;
              const ac = avatarColor(u.fullName);
              return (
                <div key={u.id} style={{
                  display:"grid",
                  gridTemplateColumns:"40px 1fr 160px 140px 80px 100px 80px",
                  padding:"9px 16px",borderBottom:"0.5px solid #F1EFE8",
                  gap:8,alignItems:"center",
                  transition:"background 0.1s",
                }}
                  onMouseOver={e => e.currentTarget.style.background="#FAFAF8"}
                  onMouseOut={e => e.currentTarget.style.background="#fff"}
                >
                  <div style={{
                    width:30,height:30,borderRadius:"50%",
                    background:ac,display:"flex",alignItems:"center",
                    justifyContent:"center",color:"#fff",
                    fontSize:11,fontWeight:600,flexShrink:0,
                  }}>{initials(u.fullName)}</div>

                  <div>
                    <div style={{fontSize:12,fontWeight:500,color:"#2C2C2A"}}>{u.fullName}</div>
                    <div style={{fontSize:11,color:"#888780"}}>{u.email}</div>
                  </div>

                  <div style={{fontSize:12,color:"#5F5E5A"}}>{u.department}</div>
                  <div style={{fontSize:12,color:"#5F5E5A"}}>{u.role}</div>

                  <div style={{
                    fontSize:11,color:"#888780",fontFamily:"monospace",
                  }}>{u.employeeId || "—"}</div>

                  <div>
                    <span style={{
                      fontSize:10,fontWeight:500,padding:"2px 8px",
                      borderRadius:10,background:sc.bg,color:sc.color,
                    }}>{u.status || "Active"}</span>
                  </div>

                  <div style={{display:"flex",gap:6}}>
                    <button onClick={() => openEdit(u)} style={{
                      padding:"4px 8px",background:"#F7F6F2",
                      border:"0.5px solid #D3D1C7",borderRadius:6,
                      fontSize:11,cursor:"pointer",color:"#5F5E5A",
                    }}>Edit</button>
                    <button onClick={() => toggleStatus(u)} style={{
                      padding:"4px 8px",
                      background: u.status==="Active" ? "#FFF5F5" : "#E1F5EE",
                      border:`0.5px solid ${u.status==="Active" ? "#E24B4A" : "#5DCAA5"}`,
                      borderRadius:6,fontSize:11,cursor:"pointer",
                      color: u.status==="Active" ? "#A32D2D" : "#0F6E56",
                    }}>{u.status==="Active" ? "Disable" : "Enable"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BY DEPARTMENT TAB ─────────────────────────── */}
        {activeTab === "dept" && (
          <>
            {Object.entries(DEPT_GROUPS).map(([groupName, depts]) => (
              <div key={groupName} style={{marginBottom:18}}>
                <div style={{
                  fontSize:10,fontWeight:500,textTransform:"uppercase",
                  letterSpacing:"0.08em",color:"#B4B2A9",marginBottom:8,paddingLeft:2,
                }}>
                  {groupName}
                </div>
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
                  gap:10,
                }}>
                  {depts.map(dept => {
                    const deptUsers = users.filter(u => u.department === dept);
                    const roles = DEPT_ROLES[dept] || [];
                    return (
                      <div key={dept} style={{
                        background:"#fff",border:"0.5px solid #E0DDD6",
                        borderRadius:10,padding:"14px 16px",
                      }}>
                        <div style={{
                          display:"flex",alignItems:"flex-start",
                          justifyContent:"space-between",marginBottom:8,
                        }}>
                          <div>
                            <div style={{fontSize:12,fontWeight:500,color:"#2C2C2A"}}>
                              {dept}
                            </div>
                            <div style={{fontSize:10,color:"#888780",marginTop:2}}>
                              {roles.join(" · ")}
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:18,fontWeight:600,
                              color: deptUsers.length>0 ? "#0F6E56" : "#B4B2A9"}}>
                              {deptUsers.length}
                            </div>
                            <div style={{fontSize:10,color:"#888780"}}>users</div>
                          </div>
                        </div>

                        {deptUsers.length > 0 && (
                          <div style={{marginTop:8}}>
                            {deptUsers.slice(0,3).map(u => {
                              const ac = avatarColor(u.fullName);
                              return (
                                <div key={u.id} style={{
                                  display:"flex",alignItems:"center",gap:8,
                                  padding:"4px 0",
                                  borderBottom:"0.5px solid #F1EFE8",
                                }}>
                                  <div style={{
                                    width:22,height:22,borderRadius:"50%",
                                    background:ac,display:"flex",alignItems:"center",
                                    justifyContent:"center",color:"#fff",
                                    fontSize:9,fontWeight:600,flexShrink:0,
                                  }}>{initials(u.fullName)}</div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:11,color:"#2C2C2A",
                                      whiteSpace:"nowrap",overflow:"hidden",
                                      textOverflow:"ellipsis"}}>
                                      {u.fullName}
                                    </div>
                                    <div style={{fontSize:10,color:"#888780"}}>{u.role}</div>
                                  </div>
                                  <span style={{
                                    fontSize:9,padding:"1px 6px",borderRadius:8,
                                    background: u.status==="Active" ? "#E1F5EE" : "#F1EFE8",
                                    color: u.status==="Active" ? "#085041" : "#5F5E5A",
                                  }}>{u.status || "Active"}</span>
                                </div>
                              );
                            })}
                            {deptUsers.length > 3 && (
                              <div style={{fontSize:10,color:"#888780",
                                padding:"4px 0",textAlign:"center"}}>
                                +{deptUsers.length - 3} more
                              </div>
                            )}
                          </div>
                        )}

                        {deptUsers.length === 0 && (
                          <div style={{
                            fontSize:11,color:"#B4B2A9",textAlign:"center",
                            padding:"10px 0",borderTop:"0.5px solid #F1EFE8",marginTop:4,
                          }}>
                            No users added yet
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setForm({...EMPTY_FORM, department: dept});
                            setModal("add");
                          }}
                          style={{
                            width:"100%",marginTop:10,padding:"6px",
                            background:"#F7F6F2",border:"0.5px solid #E0DDD6",
                            borderRadius:7,fontSize:11,color:"#5F5E5A",cursor:"pointer",
                          }}>
                          + Add user to {dept}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

      </div>

      {/* ── ADD / EDIT MODAL ──────────────────────────────── */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add new user" : `Edit — ${selected?.fullName}`}
          onClose={() => { setModal(null); setForm(EMPTY_FORM); setSelected(null); }}
        >
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

            <Field label="Full name" required>
              <input style={inp} type="text" placeholder="Dr. / Mr. / Ms."
                value={form.fullName}
                onChange={e => setForm(p=>({...p,fullName:e.target.value}))} />
            </Field>

            <Field label="Employee ID">
              <input style={inp} type="text" placeholder="MBL-001"
                value={form.employeeId}
                onChange={e => setForm(p=>({...p,employeeId:e.target.value}))} />
            </Field>

            <Field label="Email address" required>
              <input style={inp} type="email" placeholder="name@mbl.com"
                value={form.email}
                onChange={e => setForm(p=>({...p,email:e.target.value}))} />
            </Field>

            <Field label="Phone number">
              <input style={inp} type="tel" placeholder="+91 00000 00000"
                value={form.phone}
                onChange={e => setForm(p=>({...p,phone:e.target.value}))} />
            </Field>

            <Field label="Department" required>
              <select style={inp} value={form.department}
                onChange={e => setForm(p=>({...p,department:e.target.value,role:""}))}>
                <option value="">Select department</option>
                {Object.entries(DEPT_GROUPS).map(([grp, depts]) => (
                  <optgroup key={grp} label={grp}>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label="Role" required>
              <select style={inp} value={form.role}
                onChange={e => setForm(p=>({...p,role:e.target.value}))}
                disabled={!form.department}>
                <option value="">Select role</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <Field label="Qualification">
              <input style={inp} type="text" placeholder="MBBS, MSc MLT, B.Sc…"
                value={form.qualification}
                onChange={e => setForm(p=>({...p,qualification:e.target.value}))} />
            </Field>

            <Field label="Date of joining">
              <input style={inp} type="date" value={form.joinDate}
                onChange={e => setForm(p=>({...p,joinDate:e.target.value}))} />
            </Field>

            <Field label="Account status">
              <select style={inp} value={form.status}
                onChange={e => setForm(p=>({...p,status:e.target.value}))}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Suspended</option>
              </select>
            </Field>

          </div>

          <div style={{
            marginTop:16,padding:"12px 14px",
            background:"#E6F1FB",borderRadius:8,
            fontSize:11,color:"#185FA5",
          }}>
            ℹ After saving, go to Firebase Console → Authentication → Add user
            with this email to create login credentials. The password is set there.
          </div>

          <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}>
            <button style={{
              padding:"7px 14px",background:"#F7F6F2",color:"#2C2C2A",
              border:"0.5px solid #D3D1C7",borderRadius:8,fontSize:12,cursor:"pointer",
            }} onClick={() => { setModal(null); setForm(EMPTY_FORM); }}>
              Cancel
            </button>
            <button style={{
              padding:"7px 14px",background:"#0F6E56",color:"#E1F5EE",
              border:"none",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",
            }} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : modal==="add" ? "Create user" : "Save changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── BULK UPLOAD MODAL ─────────────────────────── */}
      {modal === "bulk" && (
        <Modal
          title="Bulk upload users — CSV"
          onClose={() => setModal(null)}
          wide
        >
          <div style={{
            background:"#E6F1FB",border:"0.5px solid #85B7EB",
            borderRadius:8,padding:"12px 14px",marginBottom:16,
          }}>
            <div style={{fontSize:12,fontWeight:500,color:"#185FA5",marginBottom:6}}>
              CSV format — required columns in this exact order:
            </div>
            <code style={{
              fontSize:11,color:"#185FA5",background:"rgba(24,95,165,0.08)",
              padding:"6px 10px",borderRadius:6,display:"block",
              fontFamily:"monospace",lineHeight:1.8,
            }}>
              fullName, employeeId, email, phone, department, role, qualification, joinDate, status
            </code>
            <div style={{fontSize:11,color:"#5F5E5A",marginTop:8,lineHeight:1.7}}>
              • First row must be the header row exactly as above<br/>
              • status must be: Active, Inactive, or Suspended<br/>
              • department and role must match the approved list<br/>
              • Maximum 100 users per upload
            </div>
            <button
              style={{
                marginTop:10,padding:"6px 12px",
                background:"#185FA5",color:"#fff",
                border:"none",borderRadius:6,fontSize:11,cursor:"pointer",
              }}
              onClick={() => {
                const header = "fullName,employeeId,email,phone,department,role,qualification,joinDate,status";
                const sample = [
                  "Dr. Sample User,MBL-001,sample@mbl.com,+91 00000 00000,Microbiology,HOD,MBBS,2024-01-01,Active",
                  "Ms. Lab Staff,MBL-002,staff@mbl.com,+91 00000 00001,Haematology,Staff,B.Sc MLT,2024-02-01,Active",
                  "Mr. Front Desk,MBL-003,front@mbl.com,+91 00000 00002,Front Office,Staff,,2024-03-01,Active",
                ].join("\n");
                const blob = new Blob([header+"\n"+sample],{type:"text/csv"});
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href=url; a.download="mbl_users_template.csv"; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              ⬇ Download CSV template
            </button>
          </div>

          {/* Drop zone */}
          <div style={{
            border:"2px dashed #D3D1C7",borderRadius:10,
            padding:"24px",textAlign:"center",marginBottom:16,
            background:"#FAFAF8",cursor:"pointer",
          }}
            onClick={() => document.getElementById("csv-upload-input").click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) parseCSV(file);
            }}
          >
            <div style={{fontSize:28,marginBottom:8}}>📂</div>
            <div style={{fontSize:13,fontWeight:500,color:"#2C2C2A"}}>
              Click to select CSV file or drag and drop
            </div>
            <div style={{fontSize:11,color:"#888780",marginTop:4}}>
              .csv files only · Max 100 users
            </div>
            <input
              id="csv-upload-input" type="file" accept=".csv"
              style={{display:"none"}}
              onChange={e => {
                const file = e.target.files[0];
                if (file) parseCSV(file);
                e.target.value="";
              }}
            />
          </div>

          {/* Preview */}
          {bulkRows.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                marginBottom:8,
              }}>
                <div style={{fontSize:13,fontWeight:500,color:"#2C2C2A"}}>
                  Preview — {bulkRows.length} user{bulkRows.length!==1?"s":""} found
                </div>
                <div style={{fontSize:12,color:"#888780"}}>
                  {bulkRows.filter(r=>!r._error).length} valid ·{" "}
                  <span style={{color:"#A32D2D"}}>
                    {bulkRows.filter(r=>r._error).length} with errors
                  </span>
                </div>
              </div>
              <div style={{
                border:"0.5px solid #E0DDD6",borderRadius:8,overflow:"hidden",
                maxHeight:260,overflowY:"auto",
              }}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"24px 1fr 100px 130px 110px 60px",
                  padding:"6px 12px",background:"#F7F6F2",
                  borderBottom:"0.5px solid #E0DDD6",gap:8,
                }}>
                  {["","Name","Emp ID","Department","Role","Status"].map((h,i)=>(
                    <div key={i} style={{fontSize:10,fontWeight:500,color:"#888780"}}>{h}</div>
                  ))}
                </div>
                {bulkRows.map((row,i) => (
                  <div key={i} style={{
                    display:"grid",
                    gridTemplateColumns:"24px 1fr 100px 130px 110px 60px",
                    padding:"7px 12px",
                    borderBottom:"0.5px solid #F1EFE8",gap:8,alignItems:"center",
                    background: row._error ? "#FFF8F8" : "#fff",
                  }}>
                    <div style={{fontSize:10,fontWeight:500,
                      color:row._error?"#E24B4A":"#0F6E56"}}>
                      {row._error ? "✕" : "✓"}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:"#2C2C2A"}}>
                        {row.fullName||<span style={{color:"#E24B4A"}}>Missing</span>}
                      </div>
                      <div style={{fontSize:10,color:"#888780"}}>{row.email}</div>
                      {row._error&&(
                        <div style={{fontSize:10,color:"#E24B4A",marginTop:2}}>
                          ⚠ {row._error}
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:11,color:"#5F5E5A"}}>{row.employeeId}</div>
                    <div style={{fontSize:11,color:"#5F5E5A"}}>{row.department}</div>
                    <div style={{fontSize:11,color:"#5F5E5A"}}>{row.role}</div>
                    <div>
                      <span style={{
                        fontSize:10,padding:"2px 7px",borderRadius:8,fontWeight:500,
                        background:row.status==="Active"?"#E1F5EE":"#F1EFE8",
                        color:row.status==="Active"?"#085041":"#5F5E5A",
                      }}>{row.status||"Active"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success message */}
          {bulkDone > 0 && (
            <div style={{
              background:"#E1F5EE",border:"0.5px solid #5DCAA5",
              borderRadius:8,padding:"10px 14px",marginBottom:12,
              fontSize:12,color:"#085041",
            }}>
              ✓ {bulkDone} user{bulkDone!==1?"s":""} uploaded to Firestore successfully.
              Go to Firebase Console → Authentication → Add each email to create login credentials.
            </div>
          )}

          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={{
              padding:"7px 14px",background:"#F7F6F2",color:"#2C2C2A",
              border:"0.5px solid #D3D1C7",borderRadius:8,fontSize:12,cursor:"pointer",
            }} onClick={() => setModal(null)}>Close</button>
            {bulkRows.filter(r=>!r._error).length > 0 && (
              <button style={{
                padding:"7px 14px",background:"#0F6E56",color:"#E1F5EE",
                border:"none",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",
              }} onClick={handleBulkUpload} disabled={bulkSaving}>
                {bulkSaving
                  ? "Uploading…"
                  : `Upload ${bulkRows.filter(r=>!r._error).length} valid users`}
              </button>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}
