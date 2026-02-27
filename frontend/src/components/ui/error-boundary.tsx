import { ErrorBoundary } from 'react-error-boundary';
import { Button } from './button';

interface SectionErrorFallbackProps {
  resetErrorBoundary: () => void;
}

function SectionErrorFallback({ resetErrorBoundary }: SectionErrorFallbackProps) {
  return (
    <div className="chart-card p-6 text-center">
      <p className="text-muted-foreground mb-4">Something went wrong in this section.</p>
      <Button variant="outline" onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

export function SectionErrorBoundary({ children, onReset }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary FallbackComponent={SectionErrorFallback} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}
