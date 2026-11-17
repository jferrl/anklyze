import { FractureForm } from '../features/fracture-classification';
import { FlowDiagramSidebar } from '../components/FlowDiagramSidebar';
import { useAuth } from '../contexts/AuthContext';

export function ClassifyPage() {
  const { isAdmin } = useAuth();

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <FractureForm />
      </div>

      {isAdmin && <FlowDiagramSidebar />}
    </>
  );
}
