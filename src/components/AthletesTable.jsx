import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DIV_COLORS = {
  "NCAA D1": "bg-blue-100 text-blue-800",
  "NCAA D2": "bg-green-100 text-green-800",
  "NCAA D3": "bg-purple-100 text-purple-800",
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
        No athletes match your filters. <a href="/import" className="underline text-blue-500">Import data →</a>
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
              <TableHead className="font-semibold">Events</TableHead>
              <TableHead className="font-semibold"># Marks</TableHead>
              <TableHead className="font-semibold">TFRRS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes.map((a, i) => (
              <TableRow key={i} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                  {a.first_name} {a.last_name}
                </TableCell>
                <TableCell className="text-gray-700 text-sm max-w-[180px] truncate">{a.team || "—"}</TableCell>
                <TableCell>
                  {a.division ? (
                    <Badge className={`text-xs ${DIV_COLORS[a.division] || "bg-gray-100 text-gray-700"}`}>
                      {a.division.replace("NCAA ", "")}
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  {a.class_year ? <Badge variant="outline" className="text-xs">{a.class_year}</Badge> : "—"}
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
                <TableCell className="text-gray-700 font-medium text-center">{(a.marks || []).length}</TableCell>
                <TableCell>
                  {a.tfrrs_profile ? (
                    <a href={a.tfrrs_profile} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">
                      Profile
                    </a>
                  ) : "—"}
                </TableCell>
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