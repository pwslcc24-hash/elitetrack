import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DIVISION_COLORS = {
  "I":   "bg-blue-100 text-blue-800",
  "II":  "bg-green-100 text-green-800",
  "III": "bg-purple-100 text-purple-800",
};

export default function AthletesTable({ athletes, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!athletes.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        No athletes match your filters. Try importing data at <a href="/import" className="underline text-blue-500">/import</a>.
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
              <TableHead className="font-semibold">NCAA ID</TableHead>
              <TableHead className="font-semibold">Institution</TableHead>
              <TableHead className="font-semibold">Div</TableHead>
              <TableHead className="font-semibold">Sport / Event</TableHead>
              <TableHead className="font-semibold">Conference</TableHead>
              <TableHead className="font-semibold">Yr</TableHead>
              <TableHead className="font-semibold">Sheet</TableHead>
              <TableHead className="font-semibold">Desig. S-A</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes.map((a, i) => (
              <TableRow key={i} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                  {a.first_name} {a.last_name}
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-500">{a.ncaa_id || "—"}</TableCell>
                <TableCell className="text-gray-700 max-w-[220px] truncate text-sm">{a.team || "—"}</TableCell>
                <TableCell>
                  {a.division ? (
                    <Badge className={`text-xs ${DIVISION_COLORS[a.division] || "bg-gray-100 text-gray-700"}`}>
                      D-{a.division}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-sm text-gray-700">{a.event_name || "—"}</TableCell>
                <TableCell className="max-w-[180px] truncate text-sm text-gray-500">{a.conference || "—"}</TableCell>
                <TableCell className="text-gray-500 text-sm whitespace-nowrap">{a.academic_year || "—"}</TableCell>
                <TableCell>
                  {a.sheet ? <Badge variant="outline" className="text-xs">{a.sheet}</Badge> : "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-xs text-gray-400">{a.designated_student_athlete || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500 bg-gray-50">
        {athletes.length} athlete{athletes.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}