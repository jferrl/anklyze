import { FractureForm } from '../features/fracture-classification';
import { FlowDiagramSidebar } from '../components/FlowDiagramSidebar';
import { useAuth } from '../contexts/AuthContext';

export function ClassifyPage() {
  const { isAdmin } = useAuth();

  return (
    <>
      {/* lg:pr-14 clears the flow diagram's edge tab. */}
      <div className={`mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 ${isAdmin ? 'lg:pr-14' : ''}`}>
        <FractureForm />
      </div>

      {isAdmin && <FlowDiagramSidebar />}
    </>
  );
}
