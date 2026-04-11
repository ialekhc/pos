import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function DataTable({
  headers,
  rows,
  emptyMessage = 'No records available.'
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card/80 shadow-sm">
      <Table>
        <TableHeader className="bg-muted/45">
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="whitespace-nowrap">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, index) => (
            <TableRow key={index} className="hover:bg-muted/40">
              {cells.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="align-top">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
