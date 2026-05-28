import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";

const SHEETS = [
  { name: "Men XC",      gender: "M", defaultEvent: "Men's Cross Country" },
  { name: "Men Outdoor", gender: "M", defaultEvent: "Men's Track, Outdoor" },
  { name: "Women XC",    gender: "F", defaultEvent: "Women's Cross Country" },
  { name: "Women Track", gender: "F", defaultEvent: "Women's Track, Outdoor" },
];

const FILE_URL = "https://media.base44.com/files/public/6a1893dc4924557a687e6543/df8b6104c_PortalInfo1.xlsx";

// Spreadsheet columns (row 1 header):
// TWL | Year | NCAA ID | First Name | Last Name | Initiated Date | Last Updated | D | Institution | Sport | Designated Student-Athlete | Sport Conference | Student Status
const SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          twl:                        { type: "string", description: "TWL column" },
          academic_year:              { type: "string", description: "Year column (e.g. 2025-26)" },
          ncaa_id:                    { type: "string", description: "NCAA ID column - numeric athlete ID" },
          first_name:                 { type: "string", description: "First Name column" },
          last_name:                  { type: "string", description: "Last Name column" },
          initiated_date:             { type: "string", description: "Initiated Date column" },
          last_updated:               { type: "string", description: "Last Updated column" },
          division:                   { type: "string", description: "D column - I, II, or III" },
          institution:                { type: "string", description: "Institution column - school/university name" },
          sport:                      { type: "string", description: "Sport column - may have multiple sports newline separated" },
          designated_student_athlete: { type: "string", description: "Designated Student-Athlete column" },
          sport_conference:           { type: "string", description: "Sport Conference column - may be newline separated" },
          student_status:             { type: "string", description: "Student Status column" },
        }
      }
    }
  }
};

const clean = (s) => String(s || "").replace(/\u00a0/g, "").replace(/\s+/g, " ").trim();
const firstLine = (s) => clean(s).split(/[\n\r]/)[0].trim();

export default function ImportData() {
  const [status, setStatus] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [clearFirst, setClearFirst] = useState(true);

  const runImport = async () => {
    setRunning(true);
    setDone(false);
    setStatus(SHEETS.map(s => ({ sheet: s.name, state: "pending", count: 0 })));

    // Optionally clear existing data first
    if (clearFirst) {
      try {
        const existing = await base44.entities.Runner.list(null, 2000);
        if (existing.length > 0) {
          for (const r of existing) {
            await base44.entities.Runner.delete(r.id);
          }
        }
      } catch (e) {
        // continue anyway
      }
    }

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
          .filter(r => clean(r.first_name) && clean(r.last_name))
          .map(r => ({
            first_name:                  clean(r.first_name),
            last_name:                   clean(r.last_name),
            gender:                      cfg.gender,
            team:                        clean(r.institution),
            division:                    firstLine(r.division),
            year:                        firstLine(r.division),   // backward compat
            ncaa_id:                     clean(r.ncaa_id),
            academic_year:               clean(r.academic_year),
            sports:                      clean(r.sport),
            event_name:                  firstLine(r.sport) || cfg.defaultEvent,
            conference:                  firstLine(r.sport_conference),
            event_code:                  firstLine(r.sport_conference),  // backward compat
            designated_student_athlete:  clean(r.designated_student_athlete),
            twl:                         clean(r.twl),
            initiated_date:              clean(r.initiated_date),
            last_updated:                clean(r.last_updated),
            student_status:              clean(r.student_status),
            sheet:                       cfg.name,
            mark:                        "",       // no performance data in source
            mark_seconds:                0,
            is_field_event:              false,
          }));

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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-xl space-y-6">
        <div className="text-center">
          <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Import Portal Data</h1>
          <p className="text-sm text-gray-500 mt-1">
            Imports all 4 sheets from <strong>PortalInfo1.xlsx</strong> into the Runner entity.
          </p>
        </div>

        {/* Column mapping info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800 space-y-1">
          <div className="font-semibold flex items-center gap-1 mb-2"><Info className="w-3 h-3" /> Column Mapping</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-blue-500">First Name</span><span>→ first_name ✓</span>
            <span className="text-blue-500">Last Name</span><span>→ last_name ✓</span>
            <span className="text-blue-500">Institution</span><span>→ team ✓</span>
            <span className="text-blue-500">D (Division)</span><span>→ division ✓</span>
            <span className="text-blue-500">NCAA ID</span><span>→ ncaa_id ✓</span>
            <span className="text-blue-500">Year</span><span>→ academic_year ✓</span>
            <span className="text-blue-500">Sport</span><span>→ event_name / sports ✓</span>
            <span className="text-blue-500">Sport Conference</span><span>→ conference ✓</span>
            <span className="text-blue-500">Designated S-A</span><span>→ designated_student_athlete ✓</span>
            <span className="text-blue-500">TWL</span><span>→ twl ✓</span>
            <span className="text-blue-500">Initiated Date</span><span>→ initiated_date ✓</span>
            <span className="text-blue-500">Last Updated</span><span>→ last_updated ✓</span>
            <span className="text-blue-500">Student Status</span><span>→ student_status ✓</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200 text-orange-700 font-medium">
            ⚠ No performance data (times/distances/marks) exists in this file — it is an eligibility/portal roster list only.
          </div>
        </div>

        {/* Sheet progress */}
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
                      <CheckCircle className="w-4 h-4" /> {s.count} athletes
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

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={clearFirst}
            onChange={e => setClearFirst(e.target.checked)}
            className="rounded"
          />
          Clear existing records before importing
        </label>

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
      </div>
    </div>
  );
}