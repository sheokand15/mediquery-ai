import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "MediQuery AI — Understand your reports", description: "Private, evidence-grounded medical document understanding." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

