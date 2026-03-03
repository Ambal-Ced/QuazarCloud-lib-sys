"use client";

import Link from "next/link";

export default function ReservationPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        style={{
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
          color: "white",
          padding: "20px 24px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Seat Arrangement & Reservation
          </h1>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            Manage library seat layouts and user reservations
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "white",
            border: "2px dashed var(--border)",
            borderRadius: 16,
            padding: "48px 32px",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
            }}
          >
            🪑
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--foreground)" }}>
            Coming Soon
          </h2>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 15,
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            The seat arrangement and reservation system is under development.
            It will be available in a future update.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: 24,
              padding: "10px 24px",
              borderRadius: 8,
              background: "var(--primary)",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to Quazar-Lib
          </Link>
        </div>
      </main>
    </div>
  );
}
