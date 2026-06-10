// LoginPage.jsx
// MBL QMS — Firebase email login with department + role selector

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const DEPARTMENTS = [
  // Technical
  "Microbiology", "Serology", "Histopathology & Cytopathology",
  "Flow Cytometry", "Cytogenetics", "Biochemistry",
  "Haematology", "Clinical Pathology", "Molecular Biology", "Molecular Genetics",
  // Non-technical
  "Quality", "Human Resource", "Biomedical Engineering",
  "Purchase", "Maintenance", "Housekeeping",
  "Information Technology", "Kitchen", "Security",
  // Customer interactive
  "Collection", "Front Office", "Back Office",
  "Sample Collection Centre", "Call Centre",
  // Control
  "Accounts", "Administration", "Design", "Marketing",
  // Admin
  "ERP Administration",
];

const ROLE_MAP = {
  "Microbiology":                  ["HOD","Supervisor","Staff"],
  "Serology":                      ["HOD","Supervisor","Staff"],
  "Histopathology & Cytopathology":["HOD","Supervisor","Staff"],
  "Flow Cytometry":                ["HOD","Supervisor","Staff"],
  "Cytogenetics":                  ["HOD","Supervisor","Staff"],
  "Biochemistry":                  ["HOD","Supervisor","Staff"],
  "Haematology":                   ["HOD","Supervisor","Staff"],
  "Clinical Pathology":            ["HOD","Supervisor","Staff"],
  "Molecular Biology":             ["HOD","Supervisor","Staff"],
  "Molecular Genetics":            ["HOD","Supervisor","Staff"],
  "Quality":                       ["Quality Manager","Quality Executive"],
  "Human Resource":                ["HRM","HRE"],
  "Biomedical Engineering":        ["BME"],
  "Purchase":                      ["Purchase Manager","Purchase User"],
  "Maintenance":                   ["Manager"],
  "Housekeeping":                  ["HK Incharge","HK Staff"],
  "Information Technology":        ["IT Manager","IT Executive"],
  "Kitchen":                       ["Kitchen Incharge","Kitchen Staff"],
  "Security":                      ["Security Incharge","Staff"],
  "Collection":                    ["Incharge","Phlebotomist"],
  "Front Office":                  ["Incharge","Staff"],
  "Back Office":                   ["Incharge","Staff"],
  "Sample Collection Centre":      ["Incharge","Staff"],
  "Call Centre":                   ["Incharge","Staff"],
  "Accounts":                      ["Incharge"],
  "Administration":                ["Managing Director","Deputy Director"],
  "Design":                        ["Incharge"],
  "Marketing":                     ["Manager","Assistant Manager","Executive"],
  "ERP Administration":            ["Admin","Assistant Admin"],
};

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "0.5px solid #D3D1C7", borderRadius: 8,
  fontSize: 13, background: "#fff", color: "#2C2C2A",
  outline: "none", boxSizing: "border-box",
};

export default function LoginPage({ onSuccess, onBack }) {
  const [dept, setDept]         = useState("");
  const [role, setRole]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const roles = dept ? (ROLE_MAP[dept] || []) : [];

  const handleDeptChange = (e) => {
    setDept(e.target.value);
    setRole("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!dept || !role) { setError("Please select department and role."); return; }
    if (!email || !password) { setError("Please enter email and password."); return; }

    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      onSuccess(result.user, {
        name: result.user.displayName || email.split("@")[0],
        email: result.user.email,
        department: dept,
        role: role.toLowerCase().replace(/ /g, "_"),
        roleLabel: role,
      });
    } catch (err) {
      const msgs = {
        "auth/user-not-found":    "No account found with this email.",
        "auth/wrong-password":    "Incorrect password.",
        "auth/invalid-email":     "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/invalid-credential":"Invalid email or password.",
      };
      setError(msgs[err.code] || "Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      fontFamily: "'Inter',system-ui,sans-serif",
      minHeight: "100vh",
      background: "#0A0F0D",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "#1D9E75",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "#fff",
            margin: "0 auto 14px",
          }}>M</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#F0EEE8", letterSpacing: "-0.02em" }}>
            Sign in to MBL QMS
          </div>
          <div style={{ fontSize: 12, color: "#5A6E65", marginTop: 4 }}>
            ISO 15189 : 2022 · Quality Management System
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: 28,
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          <form onSubmit={handleLogin}>

            {/* Department */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Department <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <select style={inputStyle} value={dept} onChange={handleDeptChange} required>
                <option value="">Select your department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Role */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Role <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <select style={inputStyle} value={role}
                onChange={e => setRole(e.target.value)} required disabled={!dept}>
                <option value="">Select your role</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Email / Employee ID <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <input
                style={inputStyle} type="email"
                placeholder="you@mbl.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Password <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={inputStyle}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: "#888780",
                  }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#FCEBEB", border: "0.5px solid #E24B4A",
                borderRadius: 8, padding: "9px 12px",
                fontSize: 12, color: "#791F1F", marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "11px",
              background: loading ? "#88C4AF" : "#0F6E56",
              color: "#fff", border: "none", borderRadius: 9,
              fontSize: 14, fontWeight: 500, cursor: loading ? "default" : "pointer",
              transition: "background 0.15s",
            }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>

          </form>
        </div>

        {/* Back */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", color: "#5A6E65",
            fontSize: 12, cursor: "pointer",
          }}>
            ← Back to home
          </button>
        </div>

      </div>
    </div>
  );
}
