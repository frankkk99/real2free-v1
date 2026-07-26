import AdminGuard from "@/components/admin/AdminGuard";
import Movie2FreeHDExtractor from "@/components/admin/Movie2FreeHDExtractor";

export default function Movie2FreeHDExtractorPage() {
  return (
    <AdminGuard>
      <Movie2FreeHDExtractor />
    </AdminGuard>
  );
}
