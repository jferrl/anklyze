import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  totalCount: number;
  page: number;
  pageSize: number;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({ columns, data, totalCount, page, pageSize, onRowClick }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: totalCount,
    state: { pagination: { pageIndex: page - 1, pageSize } },
  });

  return (
    <div className="hidden md:block chart-card p-0">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, index) => (
            <TableRow
              key={row.id}
              className={cn(
                'border-border/30 hover:bg-muted/30 transition-colors duration-200',
                'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]',
                onRowClick && 'cursor-pointer'
              )}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
