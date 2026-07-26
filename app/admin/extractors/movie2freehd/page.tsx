import AdminGuard from "@/components/admin/AdminGuard";
import Movie2FreeHDWorkbench from "@/components/admin/Movie2FreeHDWorkbench";

export default function Movie2FreeHDExtractorPage() {
  return (
    <AdminGuard>
      <Movie2FreeHDWorkbench />
    </AdminGuard>
  );
}
