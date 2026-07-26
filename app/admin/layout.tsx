import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";
import "./content.css";

export const metadata: Metadata = {
  title: "REAL2FREE Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
