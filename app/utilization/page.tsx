"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { COLLEGES, getUpdatedColleges } from "@/lib/colleges";

interface SummaryEntry {
  label: string;
  male: number;
  female: number;
}

interface ProcessResponse {
  file?: string;
  totalRecords?: number;
  matched?: number;
  unmatched?: string[];
  summary?: SummaryEntry[];
  error?: string;
}

interface TemplateStatus {
  usingCustomTemplate: boolean;
  templateName: string;
}

interface AvailableProgram {
  id: string;
  name: string;
  maleRow: number;
  femaleRow: number;
}

type AppState = "idle" | "processing" | "done" | "error";

export default function UtilizationPage() {
  const [pasteData, setPasteData] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [lastProcessedFileBase64, setLastProcessedFileBase64] = useState<string | null>(null);

  const [templateStatus, setTemplateStatus] = useState<TemplateStatus | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeView, setActiveView] = useState<"main" | "template" | "mappings">("main");

  // Add to record / mapping modal
  const [mappingCode, setMappingCode] = useState<string | null>(null);
  const [mappingCodeInput, setMappingCodeInput] = useState("");
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [programs, setPrograms] = useState<AvailableProgram[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingMessage, setMappingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [removedFromUnmatched, setRemovedFromUnmatched] = useState<Set<string>>(new Set());
  const [programSearch, setProgramSearch] = useState("");
  const [mappingModalMode, setMappingModalMode] = useState<"create" | "edit" | "fromUnknown">("fromUnknown");
  const [customMappings, setCustomMappings] = useState<{ code: string; targets: { label: string; maleRow: number; femaleRow: number }[] }[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [editTargets, setEditTargets] = useState<{ maleRow: number; femaleRow: number }[]>([]);

  const templateFileRef = useRef<HTMLInputElement>(null);

  const fetchTemplateStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/upload-template");
      if (res.ok) setTemplateStatus(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchTemplateStatus();
  }, [fetchTemplateStatus]);

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch("/api/course-mappings");
      if (res.ok) {
        const data = await res.json();
        setCustomMappings(data.mappings || []);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/course-mappings/programs");
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (activeView === "mappings") {
      fetchMappings();
      fetchPrograms();
    }
  }, [activeView, fetchMappings, fetchPrograms]);

  useEffect(() => {
    if (mappingCode || showMappingModal) fetchPrograms();
  }, [mappingCode, showMappingModal, fetchPrograms]);

  useEffect(() => {
    if (
      mappingModalMode === "edit" &&
      mappingCode &&
      programs.length > 0 &&
      editTargets.length > 0 &&
      selectedProgramIds.size === 0
    ) {
      const ids = editTargets
        .map((t) => programs.find((p) => p.maleRow === t.maleRow && p.femaleRow === t.femaleRow)?.id)
        .filter((id): id is string => !!id);
      setSelectedProgramIds(new Set(ids));
    }
  }, [mappingModalMode, mappingCode, programs, editTargets, selectedProgramIds.size]);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  async function handleProcess() {
    if (!pasteData.trim()) return;

    setAppState("processing");
    setResult(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);

    try {
      const form = new FormData();
      form.append("pasteData", pasteData);
      if (lastProcessedFileBase64) {
        form.append("baseFile", lastProcessedFileBase64);
      }

      const res = await fetch("/api/process", { method: "POST", body: form });
      const data: ProcessResponse = await res.json();

      if (!res.ok || data.error) {
        setResult(data);
        setAppState("error");
        return;
      }

      const bytes = Uint8Array.from(atob(data.file!), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResult(data);
      setLastProcessedFileBase64(data.file!);
      if (data.summary && data.summary.length > 0) {
        const batchColleges = getUpdatedColleges(data.summary.map((s: SummaryEntry) => s.label));
        setUpdatedCollegesAccumulated((prev) => new Set([...prev, ...batchColleges]));
      }
      setAppState("done");
      // Auto-clear paste when no unknowns so user can paste next batch
      if (!data.unmatched || data.unmatched.length === 0) {
        setPasteData("");
      }
    } catch (err) {
      setResult({ error: `Network error: ${err}` });
      setAppState("error");
    }
  }

  async function handleSaveMapping() {
    const code = mappingModalMode === "create" ? mappingCodeInput.trim() : mappingCode;
    if (!code || selectedProgramIds.size === 0) return;
    setSavingMapping(true);
    setMappingMessage(null);
    try {
      const res = await fetch("/api/course-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, programIds: Array.from(selectedProgramIds) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMappingMessage({ type: "error", text: data.error || "Failed to save" });
      } else {
        setMappingMessage({ type: "success", text: data.message });
        setRemovedFromUnmatched((prev) => new Set(prev).add(code));
        setShowMappingModal(false);
        setMappingCode(null);
        setMappingCodeInput("");
        setSelectedProgramIds(new Set());
        if (activeView === "mappings") fetchMappings();
      }
    } catch {
      setMappingMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSavingMapping(false);
    }
  }

  function toggleProgram(id: string) {
    setSelectedProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [resettingReport, setResettingReport] = useState(false);
  const [updatedCollegesAccumulated, setUpdatedCollegesAccumulated] = useState<Set<string>>(new Set());

  function handleReset() {
    setPasteData("");
    setAppState("idle");
    setResult(null);
    setLastProcessedFileBase64(null);
    setUpdatedCollegesAccumulated(new Set());
    setRemovedFromUnmatched(new Set());
    setMappingCode(null);
    setSelectedProgramIds(new Set());
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  }

  async function handleStartNewReport() {
    setResettingReport(true);
    try {
      const res = await fetch("/api/reset-report", { method: "POST" });
      const data = await res.json();
      handleReset();
      if (res.ok) {
        setTemplateMessage({ type: "success", text: data.message });
        setTimeout(() => setTemplateMessage(null), 4000);
      }
    } catch {
      setTemplateMessage({ type: "error", text: "Failed to reset report." });
    } finally {
      setResettingReport(false);
    }
  }

  async function handleTemplateUpload() {
    const file = templateFileRef.current?.files?.[0];
    if (!file) return;
    setUploadingTemplate(true);
    setTemplateMessage(null);
    try {
      const form = new FormData();
      form.append("template", file);
      const res = await fetch("/api/upload-template", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setTemplateMessage({ type: "error", text: data.error });
      else {
        setTemplateMessage({ type: "success", text: data.message });
        await fetchTemplateStatus();
      }
    } catch {
      setTemplateMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploadingTemplate(false);
      if (templateFileRef.current) templateFileRef.current.value = "";
    }
  }

  async function handleDeleteMapping(code: string) {
    try {
      const res = await fetch(`/api/course-mappings?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setTemplateMessage({ type: "success", text: data.message });
        fetchMappings();
        setTimeout(() => setTemplateMessage(null), 3000);
      } else {
        setTemplateMessage({ type: "error", text: data.error });
      }
    } catch {
      setTemplateMessage({ type: "error", text: "Failed to delete mapping." });
    }
  }

  function openMappingModal(
    mode: "create" | "edit" | "fromUnknown",
    code?: string,
    programIds?: string[],
    targets?: { maleRow: number; femaleRow: number }[]
  ) {
    setMappingModalMode(mode);
    setMappingCode(mode === "create" ? "" : code ?? null);
    setMappingCodeInput(mode === "create" ? "" : code ?? "");
    setSelectedProgramIds(new Set(programIds ?? []));
    setEditTargets(targets ?? []);
    setProgramSearch("");
    setMappingMessage(null);
    setShowMappingModal(true);
  }

  function closeMappingModal() {
    if (!savingMapping) {
      setShowMappingModal(false);
      setMappingCode(null);
      setMappingCodeInput("");
      setMappingMessage(null);
    }
  }

  async function handleRemoveTemplate() {
    setTemplateMessage(null);
    try {
      const res = await fetch("/api/upload-template", { method: "DELETE" });
      const data = await res.json();
      setTemplateMessage({ type: "success", text: data.message });
      await fetchTemplateStatus();
    } catch {
      setTemplateMessage({ type: "error", text: "Failed to remove template." });
    }
  }

  const updatedColleges = updatedCollegesAccumulated;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1a3a6b 0%, #1a56db 100%)",
          color: "white",
          padding: "0",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>
          <Link
            href="/"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              display: "inline-block",
              marginBottom: 8,
            }}
          >
            ← Quazar-Lib
          </Link>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
              BatStateU Lipa Campus · Office of Library Services
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              Library User Utilization
            </h1>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
              Paste records → Download updated Excel report
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          display: "flex",
          minHeight: "calc(100vh - 140px)",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            background: "white",
            borderRight: "1px solid var(--border)",
            padding: "20px 0",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "main" as const, label: "Main", icon: "📊" },
              { id: "template" as const, label: "Template Settings", icon: "📄" },
              { id: "mappings" as const, label: "Course Mappings", icon: "🔗" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 20px",
                  border: "none",
                  background: activeView === item.id ? "#eff6ff" : "transparent",
                  color: activeView === item.id ? "var(--primary)" : "var(--foreground)",
                  fontSize: 14,
                  fontWeight: activeView === item.id ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  borderRight: activeView === item.id ? "3px solid var(--primary)" : "3px solid transparent",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            padding: "28px 32px",
            overflow: "auto",
            maxWidth: 1000,
          }}
        >
        {activeView === "main" && (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
        {/* Main content */}
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>
          {/* Step cards */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { n: 1, text: "Copy records from source system" },
              { n: 2, text: "Paste below and click Process" },
              { n: 3, text: "Download the filled Excel file" },
            ].map((s) => (
              <div
                key={s.n}
                style={{
                  flex: "1 1 200px",
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {s.n}
                </div>
                <span style={{ fontSize: 14, color: "var(--foreground)", paddingTop: 4 }}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Paste area */}
          <div
            style={{
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 20,
            }}
          >
            <label style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 10 }}>
              Paste Records Here
            </label>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              Copy rows directly from the source system (no header needed). The system reads{" "}
              <strong>column 2</strong> (date), <strong>column 5</strong> (sex), and{" "}
              <strong>column 7</strong> (course/program code). Data accumulates across batches — paste one department, process, then paste the next. When no unknown codes remain, the paste area clears automatically.
            </div>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Paste your data here (Ctrl+V)..."
              disabled={appState === "processing"}
              style={{
                width: "100%",
                height: 220,
                fontFamily: "monospace",
                fontSize: 13,
                padding: "10px 12px",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                outline: "none",
                background: appState === "processing" ? "#f9fafb" : "white",
                color: "var(--foreground)",
                lineHeight: 1.5,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {pasteData.trim()
                  ? `${pasteData.trim().split("\n").filter((l) => l.trim()).length} row(s) pasted`
                  : "No data pasted yet"}
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(appState === "done" || appState === "error") && (
                  <>
                    <button
                      onClick={handleStartNewReport}
                      disabled={resettingReport}
                      style={{
                        padding: "9px 20px",
                        borderRadius: 8,
                        border: "1.5px solid var(--border)",
                        background: "white",
                        color: "var(--foreground)",
                        fontSize: 14,
                        cursor: resettingReport ? "not-allowed" : "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {resettingReport ? "Resetting..." : "Start new report"}
                    </button>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: "9px 20px",
                        borderRadius: 8,
                        border: "1.5px solid var(--border)",
                        background: "white",
                        color: "var(--foreground)",
                        fontSize: 14,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Clear & Reset
                    </button>
                  </>
                )}
                <button
                  onClick={handleProcess}
                  disabled={!pasteData.trim() || appState === "processing"}
                  style={{
                    padding: "9px 28px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      !pasteData.trim() || appState === "processing" ? "#9ca3af" : "var(--primary)",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: !pasteData.trim() || appState === "processing" ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {appState === "processing" ? (
                    <>
                      <Spinner /> Processing...
                    </>
                  ) : (
                    "Process Data"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error panel */}
          {appState === "error" && result?.error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 20,
                color: "var(--danger)",
                fontSize: 14,
              }}
            >
              <strong>Error:</strong> {result.error}
            </div>
          )}

          {/* Result panel */}
          {appState === "done" && result && downloadUrl && (
            <div
              style={{
                background: "white",
                border: "1.5px solid #6ee7b7",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ color: "var(--success)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                    ✓ Processing Complete
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {result.matched} records written to the Excel file
                    {result.unmatched && result.unmatched.length > 0 && (
                      <span style={{ color: "var(--warning)" }}>
                        {" "}· {result.unmatched.length} unknown course code(s)
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={downloadUrl}
                  download="Library_User_Utilization_Filled.xlsx"
                  style={{
                    padding: "10px 26px",
                    borderRadius: 8,
                    background: "var(--success)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: "none",
                    display: "inline-block",
                    boxShadow: "0 2px 6px rgba(5,122,85,0.25)",
                  }}
                >
                  ↓ Download Excel
                </a>
              </div>

              {result.summary && result.summary.length > 0 && (
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      marginBottom: 8,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Record Summary
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={thStyle}>Program</th>
                          <th style={{ ...thStyle, textAlign: "center", width: 80 }}>Male</th>
                          <th style={{ ...thStyle, textAlign: "center", width: 80 }}>Female</th>
                          <th style={{ ...thStyle, textAlign: "center", width: 80 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.summary.map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={tdStyle}>{row.label}</td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>{row.male}</td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>{row.female}</td>
                            <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                              {row.male + row.female}
                            </td>
                          </tr>
                        ))}
                        {result.summary.length > 0 && (
                          <tr style={{ borderTop: "2px solid var(--border)", background: "#f9fafb", fontWeight: 700 }}>
                            <td style={tdStyle}>Total</td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              {result.summary.reduce((a, r) => a + r.male, 0)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              {result.summary.reduce((a, r) => a + r.female, 0)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              {result.summary.reduce((a, r) => a + r.male + r.female, 0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.unmatched && result.unmatched.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    background: "#fffbeb",
                    border: "1px solid #fcd34d",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <strong style={{ color: "var(--warning)" }}>
                    ⚠ Unknown course codes (not written to Excel):
                  </strong>
                  <div style={{ marginTop: 10 }}>
                    {(() => {
                      const codes = result.unmatched.filter((c) => !removedFromUnmatched.has(c));
                      return codes.map((code, i) => (
                        <div
                          key={code}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "6px 0",
                            borderBottom: i < codes.length - 1 ? "1px solid #fde68a" : "none",
                          }}
                        >
                          <span style={{ fontFamily: "monospace", color: "var(--warning)", fontWeight: 500 }}>
                            {code}
                          </span>
                          <button
                            onClick={() => openMappingModal("fromUnknown", code)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: 6,
                              border: "1px solid var(--primary)",
                              background: "white",
                              color: "var(--primary)",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Add to record
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                  {removedFromUnmatched.size > 0 && (
                    <div style={{ marginTop: 8, color: "var(--success)", fontSize: 12 }}>
                      {removedFromUnmatched.size} mapping(s) saved. Click &quot;Process Data&quot; again to include them.
                    </div>
                  )}
                </div>
              )}

              {/* Add to record / Create-Edit mapping modal */}
              {showMappingModal && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: 24,
                  }}
                  onClick={closeMappingModal}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: 12,
                      padding: "28px 32px",
                      maxWidth: 640,
                      width: "100%",
                      maxHeight: "90vh",
                      overflow: "auto",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
                      {mappingModalMode === "create" ? "Create mapping" : mappingModalMode === "edit" ? "Edit mapping" : "Add to record"}
                    </h3>
                    <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>
                      {mappingModalMode === "create" ? (
                        "Enter the course code and select which program(s) it maps to. Select multiple to distribute counts equally."
                      ) : (
                        <>Map &quot;<strong style={{ fontFamily: "monospace" }}>{mappingCode}</strong>&quot; to which program(s)? Select one or more — if multiple, counts are distributed equally.</>
                      )}
                    </p>
                    {mappingModalMode === "create" && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Course code</label>
                        <input
                          type="text"
                          value={mappingCodeInput}
                          onChange={(e) => setMappingCodeInput(e.target.value)}
                          placeholder="e.g. BSITECH / SM"
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            fontSize: 14,
                            border: "1.5px solid var(--border)",
                            borderRadius: 8,
                            outline: "none",
                          }}
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={programSearch}
                      onChange={(e) => setProgramSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        fontSize: 14,
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        marginBottom: 12,
                        outline: "none",
                      }}
                    />
                    <div
                      style={{
                        maxHeight: 340,
                        overflowY: "auto",
                        border: "1.5px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        marginBottom: 16,
                        background: "#fafafa",
                      }}
                    >
                      {(() => {
                        const filtered = programs.filter((p) =>
                          !programSearch.trim()
                            ? true
                            : p.name.toLowerCase().includes(programSearch.trim().toLowerCase())
                        );
                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>
                              No matching programs. Try a different search.
                            </div>
                          );
                        }
                        return filtered.map((p) => (
                        <label
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 0",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProgramIds.has(p.id)}
                            onChange={() => toggleProgram(p.id)}
                          />
                          <span style={{ color: "var(--foreground)" }}>{p.name}</span>
                        </label>
                      ));
                      })()}
                    </div>
                    {mappingMessage && (
                      <div
                        style={{
                          marginBottom: 12,
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          background: mappingMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${mappingMessage.type === "success" ? "#86efac" : "#fca5a5"}`,
                          color: mappingMessage.type === "success" ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {mappingMessage.text}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        onClick={closeMappingModal}
                        style={{
                          padding: "8px 18px",
                          borderRadius: 8,
                          border: "1.5px solid var(--border)",
                          background: "white",
                          fontSize: 13,
                          cursor: savingMapping ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveMapping}
                        disabled={(mappingModalMode === "create" ? !mappingCodeInput.trim() : false) || selectedProgramIds.size === 0 || savingMapping}
                        style={{
                          padding: "8px 20px",
                          borderRadius: 8,
                          border: "none",
                          background: (mappingModalMode === "create" ? !mappingCodeInput.trim() : false) || selectedProgramIds.size === 0 || savingMapping ? "#9ca3af" : "var(--primary)",
                          color: "white",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: (mappingModalMode === "create" ? !mappingCodeInput.trim() : false) || selectedProgramIds.size === 0 || savingMapping ? "not-allowed" : "pointer",
                        }}
                      >
                        {savingMapping ? "Saving..." : `Save mapping${selectedProgramIds.size > 1 ? ` (${selectedProgramIds.size} programs)` : ""}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Department status (main view only) */}
        <div
          style={{
            flex: "0 0 220px",
            position: "sticky",
            top: 24,
          }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 12,
                color: "var(--foreground)",
              }}
            >
              Department Status
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.4 }}>
              {appState === "idle" || appState === "processing" ? (
                "Process data to see which departments have been updated."
              ) : appState === "done" ? (
                "Departments with data in the report:"
              ) : (
                "—"
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COLLEGES.map((college) => {
                const hasData = updatedColleges.has(college.id);
                const showCheck = appState === "done";
                return (
                  <div
                    key={college.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: showCheck ? (hasData ? "#f0fdf4" : "#f9fafb") : "transparent",
                      border: showCheck && hasData ? "1px solid #86efac" : "1px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        background: showCheck
                          ? hasData
                            ? "var(--success)"
                            : "#e5e7eb"
                          : "#e5e7eb",
                        color: showCheck ? (hasData ? "white" : "#9ca3af") : "#9ca3af",
                      }}
                    >
                      {showCheck ? (hasData ? "✓" : "✗") : "—"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: showCheck ? (hasData ? "var(--success)" : "var(--muted)") : "var(--muted)",
                        fontWeight: hasData ? 600 : 400,
                        lineHeight: 1.3,
                      }}
                    >
                      {college.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
        )}

        {activeView === "template" && (
          <div
            style={{
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 28px",
              maxWidth: 560,
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Template Settings</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--muted)" }}>
              Upload a new .xlsx template when the program names change or for a different month.
            </p>
            {templateStatus && (
              <div
                style={{
                  padding: "14px 18px",
                  background: templateStatus.usingCustomTemplate ? "#f0fdf4" : "#f9fafb",
                  border: `1px solid ${templateStatus.usingCustomTemplate ? "#86efac" : "var(--border)"}`,
                  borderRadius: 8,
                  fontSize: 14,
                  marginBottom: 20,
                }}
              >
                <strong>Active template:</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>{templateStatus.templateName}</span>
                {templateStatus.usingCustomTemplate && (
                  <button
                    onClick={handleRemoveTemplate}
                    style={{
                      marginLeft: 12,
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "var(--danger)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delete template
                  </button>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                ref={templateFileRef}
                type="file"
                accept=".xlsx"
                style={{ fontSize: 13, flex: "1 1 220px" }}
              />
              <button
                onClick={handleTemplateUpload}
                disabled={uploadingTemplate}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: uploadingTemplate ? "#9ca3af" : "var(--primary)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: uploadingTemplate ? "not-allowed" : "pointer",
                }}
              >
                {uploadingTemplate ? "Uploading..." : "Upload template"}
              </button>
            </div>
            {templateMessage && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: templateMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${templateMessage.type === "success" ? "#86efac" : "#fca5a5"}`,
                  color: templateMessage.type === "success" ? "var(--success)" : "var(--danger)",
                  fontSize: 13,
                }}
              >
                {templateMessage.text}
              </div>
            )}
          </div>
        )}

        {activeView === "mappings" && (
          <div
            style={{
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 28px",
              maxWidth: 640,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Course Mappings</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Map course codes from pasted data to Excel programs.
                </p>
              </div>
              <button
                onClick={() => openMappingModal("create")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--primary)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Create mapping
              </button>
            </div>
            {templateMessage && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: templateMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${templateMessage.type === "success" ? "#86efac" : "#fca5a5"}`,
                  color: templateMessage.type === "success" ? "var(--success)" : "var(--danger)",
                  fontSize: 13,
                }}
              >
                {templateMessage.text}
              </div>
            )}
            {customMappings.length === 0 ? (
              <div style={{ padding: "32px 0", color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
                No custom mappings yet. Create one or add mappings when unknown codes appear during processing.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {customMappings.map((m) => (
                  <div
                    key={m.code}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#f9fafb",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14 }}>{m.code}</span>
                      <span style={{ color: "var(--muted)", marginLeft: 8 }}>→</span>
                      <span style={{ marginLeft: 8, fontSize: 13 }}>
                        {m.targets.length === 1
                          ? m.targets[0].label
                          : `${m.targets.length} programs (distributed)`}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() =>
                          openMappingModal(
                            "edit",
                            m.code,
                            undefined,
                            m.targets.map((t) => ({ maleRow: t.maleRow, femaleRow: t.femaleRow }))
                          )
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "white",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(m.code)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid #fca5a5",
                          background: "#fef2f2",
                          color: "var(--danger)",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "20px",
          fontSize: 12,
          color: "var(--muted)",
          borderTop: "1px solid var(--border)",
          marginTop: 20,
        }}
      >
        Quazar-Lib · Library User Utilization
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--muted)",
  borderBottom: "2px solid var(--border)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  color: "var(--foreground)",
};
