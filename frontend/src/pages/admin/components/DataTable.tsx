import { type ColumnDef, type RowData, columnSizingFeature, metaHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const features = tableFeatures({
  columnSizingFeature,
  columnMeta: metaHelper<{ className?: string }>(),
});

/** DataTableColumn is a column definition accepted by DataTable. */
export type DataTableColumn<TData extends RowData> = ColumnDef<typeof features, TData, unknown>;

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData extends RowData>({ columns, data, onRowClick }: DataTableProps<TData>) {
  'use no memo'; // keep the compiler from memoizing over table builder reads
  const table = useTable({ features, columns, data });

  return (
    <div className="hidden md:block overflow-hidden rounded-lg border bg-card">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className={cn('text-muted-foreground', header.column.columnDef.meta?.className)}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn('transition-colors duration-150 hover:bg-muted', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getAllCells().map(cell => (
                <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
