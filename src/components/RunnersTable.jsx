import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function RunnersTable({ athletes, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (!athletes.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        No athletes match your filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Athlete</TableHead>
              <TableHead className="font-semibold">Team</TableHead>
              <TableHead className="font-semibold">Year</TableHead>
              <TableHead className="font-semibold">Events Met</TableHead>
              <TableHead className="font-semibold"># Marks</TableHead>
              <TableHead className="font-semibold">Top Mark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes.map((a, i) => (
              <TableRow key={i} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium text-gray-900">
                  {a.first_name} {a.last_name}
                </TableCell>
                <TableCell className="text-gray-600">{a.team || "—"}</TableCell>
                <TableCell>
                  {a.year ? (
                    <Badge variant="outline" className="text-xs">{a.year}</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(a.events || [a.event_name]).slice(0, 4).map((e, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{e}</Badge>
                    ))}
                    {(a.events || []).length > 4 && (
                      <Badge variant="outline" className="text-xs">+{a.events.length - 4}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-700 font-medium">{(a.marks || []).length}</TableCell>
                <TableCell className="font-mono text-sm text-gray-800">{a.mark}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 bg-gray-50">
        Showing {athletes.length} athlete{athletes.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}