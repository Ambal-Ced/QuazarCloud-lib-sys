import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quazar-Lib — Library Management",
  description: "BatStateU Lipa Campus — Office of Library Services. Utilization reports and seat reservations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
