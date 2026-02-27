import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showingText?: string;
}

export function Pagination({ page, totalPages, onPageChange, showingText }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6">
      {showingText && (
        <p className="text-sm text-muted-foreground">{showingText}</p>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="icon"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="bg-card/50 border-border/50 hover:bg-muted/50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground px-3 py-2 bg-muted/30 rounded-lg">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="bg-card/50 border-border/50 hover:bg-muted/50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
