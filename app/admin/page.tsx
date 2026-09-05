import Link from "next/link";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
      <Link
        href="/admin/apiplayer-reference-test"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 80,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          padding: "0 16px",
          borderRadius: 14,
          border: "1px solid rgba(84,221,255,.45)",
          background: "rgba(7,21,29,.94)",
          color: "#dff9ff",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 800,
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
        }}
      >
        APIPlayer Test
      </Link>
    </AdminGuard>
  );
}
