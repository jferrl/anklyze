import { FractureForm } from '../features/fracture-classification';
import { FlowDiagramSidebar } from '../components/FlowDiagramSidebar';
import { useAuth } from '../contexts/AuthContext';

export function ClassifyPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="h-full">
      {/* Content Section */}
      <section className="py-8 md:py-12 w-full overflow-x-hidden">
        <div className="w-full mx-auto px-2 sm:px-4 container">
          <FractureForm />
        </div>
      </section>

      {/* Flow Diagram Sidebar */}
      {isAdmin && <FlowDiagramSidebar />}
    </div>
  );
}
