import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SHEETS = [
  { name: "Men XC", gender: "M", defaultEvent: "Men's Cross Country" },
  { name: "Men Outdoor", gender: "M", defaultEvent: "Men's Track, Outdoor" },
  { name: "Women XC", gender: "F", defaultEvent: "Women's Cross Country" },
  { name: "Women Track", gender: "F", defaultEvent: "Women's Track, Outdoor" },
];

const FILE_URL = "https://media.base44.com/files/public/6a1893dc4924557a687e6543/df8b6104c_PortalInfo1.xlsx";

const SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "First Name column" },
          last_name: { type: "string", description: "Last Name column" },
          institution: { type: "string", description: "Institution column" },
          division: { type: "string", description: "D column - Division I, II, or III" },
          sport: { type: "string", description: "Sport column - first sport listed" },
          conference: { type: "string", description: "Sport Conference column - first conference listed" },
          academic_year: { type: "string", description: "Year column e.g. 2025-26" },
        }
      }
    }
  }
};

const cleanStr = (s) => String(s || "").replace(/\u00a0/g, "").replace(/\s+/g, " ").trim();

export default function ImportData() {
  const [status, setStatus] = useState([]); // [{sheet, state, count, error}]
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const runImport = async () => {
    setRunning(true);
    setDone(false);
    setStatus(SHEETS.map(s => ({ sheet: s.name, state: "pending", count: 0 })));

    for (let i = 0; i < SHEETS.length; i++) {
      const cfg = SHEETS[i];
      setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "running" } : s));

      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: FILE_URL,
          json_schema: SCHEMA,
        });

        if (extracted?.status !== "success") {
          throw new Error(extracted?.details || "Extraction failed");
        }

        const raw = extracted.output?.rows || (Array.isArray(extracted.output) ? extracted.output : []);

        const records = raw
          .filter(r => cleanStr(r.first_name) && cleanStr(r.last_name))
          .map(r => ({
            first_name: cleanStr(r.first_name),
            last_name: cleanStr(r.last_name),
            gender: cfg.gender,
            team: cleanStr(r.institution),
            year: cleanStr(r.division),
            event_name: cleanStr(r.sport).split("\n")[0] || cfg.defaultEvent,
            event_code: cleanStr(r.conference).split("\n")[0],
            mark: cleanStr(r.academic_year),
            mark_seconds: 0,
            meet_name: cfg.name,
            is_field_event: false,
          }));

        // Batch create
        const batchSize = 50;
        for (let b = 0; b < records.length; b += batchSize) {
          await base44.entities.Runner.bulkCreate(records.slice(b, b + batchSize));
        }

        setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "done", count: records.length } : s));
      } catch (err) {
        setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "error", error: err.message } : s));
      }
    }

    setRunning(false);
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-lg space-y-6">
        <div className="text-center">
          <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Import Portal Data</h1>
          <p className="text-sm text-gray-500 mt-1">
            Imports all 4 sheets from PortalInfo1.xlsx into the Runner entity.
          </p>
        </div>

        <div className="space-y-2">
          {SHEETS.map((cfg, i) => {
            const s = status[i];
            return (
              <div key={cfg.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-gray-800 text-sm">{cfg.name}</span>
                  <span className="ml-2">
                    <Badge variant="outline" className="text-xs">{cfg.gender === "M" ? "Men" : "Women"}</Badge>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {!s && <span className="text-gray-400">—</span>}
                  {s?.state === "pending" && <span className="text-gray-400">Waiting...</span>}
                  {s?.state === "running" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  {s?.state === "done" && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" /> {s.count} rows
                    </span>
                  )}
                  {s?.state === "error" && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-4 h-4" /> {s.error}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {done && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm text-green-700">
            Import complete! <a href="/" className="underline font-medium">Go to dashboard →</a>
          </div>
        )}

        <Button
          onClick={runImport}
          disabled={running}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {running ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing...</> : "Start Import"}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Column mapping: First Name → first_name, Last Name → last_name, Institution → team,
          D → year (Division), Sport → event_name, Sport Conference → event_code, Year → mark (academic year).
          <br />Not mapped: TWL, NCAA ID, Initiated Date, Last Updated, Designated Student-Athlete, Student Status.
        </p>
      </div>
    </div>
  );
}