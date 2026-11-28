/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';

type Item = { id: string; name: string; count: number };

const columns: DataTableColumn<Item>[] = [
  { id: 'name', header: () => 'Name', cell: ({ row }) => row.original.name },
  {
    id: 'count',
    header: () => 'Count',
    cell: ({ row }) => row.original.count,
    size: 120,
    meta: { className: 'text-right' },
  },
];

const data: Item[] = [
  { id: 'a', name: 'Alpha', count: 1 },
  { id: 'b', name: 'Beta', count: 2 },
];

describe('DataTable', () => {
  it('renders rows, column widths and meta classes', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    // Default-sized columns get no explicit width; sized ones do.
    expect(screen.getByText('Name').closest('th')).not.toHaveStyle({ width: '150px' });
    expect(screen.getByText('Count').closest('th')).toHaveStyle({ width: '120px' });
    expect(screen.getByText('2').closest('td')).toHaveClass('text-right');
  });

  it('passes the clicked row to onRowClick', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);

    fireEvent.click(screen.getByText('Beta'));
    expect(onRowClick).toHaveBeenCalledWith(data[1]);
  });
});
