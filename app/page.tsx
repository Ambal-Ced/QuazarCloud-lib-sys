"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a56db 100%)",
          color: "white",
          padding: "36px 24px 40px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            BatStateU Lipa Campus · Office of Library Services
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: -0.5,
              lineHeight: 1.2,
            }}
          >
            Quazar-Lib
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 16,
              opacity: 0.9,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Library management tools for utilization reporting and seat reservations
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Choose an application to get started
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {/* Library User Utilization */}
          <Link
            href="/utilization"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              background: "white",
              border: "2px solid var(--border)",
              borderRadius: 16,
              padding: "24px 28px",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(26, 86, 219, 0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1a56db 0%, #1e429f 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              📊
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
              Library User Utilization
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              Paste records from the source system, process, and download the filled Excel report.
            </p>
          </Link>

          {/* Seat Arrangement & Reservation */}
          <Link
            href="/reservation"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              background: "white",
              border: "2px solid var(--border)",
              borderRadius: 16,
              padding: "24px 28px",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(26, 86, 219, 0.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              🪑
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
              Seat Arrangement & Reservation
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              Manage library seat layouts and user reservations.
            </p>
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              Coming soon
            </div>
          </Link>
        </div>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "24px",
          fontSize: 12,
          color: "var(--muted)",
          borderTop: "1px solid var(--border)",
          marginTop: 40,
        }}
      >
        Quazar-Lib · BatStateU Lipa Campus
      </footer>
    </div>
  );
}
