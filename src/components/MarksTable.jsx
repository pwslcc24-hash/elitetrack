import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DIV_COLORS = {
  "NCAA D1": "bg-blue-100 text-blue-800",
  "NCAA D2": "bg-green-100 text-green-800",
  "NCAA D3": "bg-purple-100 text-purple-800",
};

export default function MarksTable({ marks, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Athlete</TableHead>
              <TableHead className="font-semibold">School</TableHead>
              <TableHead className="font-semibold">Div</TableHead>
              <TableHead className="font-semibold">Year</TableHead>
              <TableHead className="font-semibold">Event</TableHead>
              <TableHead className="font-semibold">Mark</TableHead>
              <TableHead className="font-semibold">Season</TableHead>
              <TableHead className="font-semibold">Meet</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">TFRRS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.map((m, i) => (
              <TableRow key={i} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                  {m.tfrrs_profile ? (
                    <a href={m.tfrrs_profile} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">
                      {m.first_name} {m.last_name}
                    </a>
                  ) : `${m.first_name} ${m.last_name}`}
                </TableCell>
                <TableCell className="text-gray-600 text-sm max-w-[160px] truncate">{m.team || "—"}</TableCell>
                <TableCell>
                  {m.division ? (
                    <Badge className={`text-xs ${DIV_COLORS[m.division] || "bg-gray-100 text-gray-700"}`}>
                      {m.division.replace("NCAA ", "")}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {m.class_year ? <Badge variant="outline" className="text-xs">{m.class_year}</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">{m.event_name}</Badge>
                </TableCell>
                <TableCell className="font-mono font-bold text-gray-900">{m.mark}</TableCell>
                <TableCell className="text-gray-500 text-xs whitespace-nowrap">{m.season || "—"}</TableCell>
                <TableCell className="text-gray-600 text-sm max-w-[200px] truncate">{m.meet_name || "—"}</TableCell>
                <TableCell className="text-gray-500 text-sm whitespace-nowrap">{m.meet_date || "—"}</TableCell>
                <TableCell>
                  {m.tfrrs_profile ? (
                    <a href={m.tfrrs_profile} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">↗</a>
                  ) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 bg-gray-50">
        {marks.length} mark{marks.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}