import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function MarksTable({ marks, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (!marks.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        No marks match your filters.
      </div>
    );
  }

  const roundLabel = (r) => {
    const map = { P: "Prelim", Q: "Quarter", S: "Semi", F: "Final" };
    return r ? (map[r] || r) : null;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Athlete</TableHead>
              <TableHead className="font-semibold">Team</TableHead>
              <TableHead className="font-semibold">Year</TableHead>
              <TableHead className="font-semibold">Event</TableHead>
              <TableHead className="font-semibold">Mark</TableHead>
              <TableHead className="font-semibold">Place</TableHead>
              <TableHead className="font-semibold">Wind</TableHead>
              <TableHead className="font-semibold">Round</TableHead>
              <TableHead className="font-semibold">Meet</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.map((m, i) => (
              <TableRow key={i} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                  {m.first_name} {m.last_name}
                </TableCell>
                <TableCell className="text-gray-600 max-w-[160px] truncate">{m.team || "—"}</TableCell>
                <TableCell>
                  {m.year ? <Badge variant="outline" className="text-xs">{m.year}</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">{m.event_name}</Badge>
                </TableCell>
                <TableCell className="font-mono font-semibold text-gray-900">{m.mark}</TableCell>
                <TableCell className="text-gray-600">{m.place || "—"}</TableCell>
                <TableCell className="text-gray-500 text-sm">{m.wind || "—"}</TableCell>
                <TableCell>
                  {roundLabel(m.round) ? (
                    <Badge variant="outline" className="text-xs">{roundLabel(m.round)}</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-gray-600 text-sm max-w-[180px] truncate">{m.meet_name || "—"}</TableCell>
                <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                  {m.meet_date ? (() => { try { return format(new Date(m.meet_date), "MMM d, yyyy"); } catch { return m.meet_date; } })() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 bg-gray-50">
        Showing {marks.length} mark{marks.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}