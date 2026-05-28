import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";

const FILES = [
  {
    name: "Women's Marks",
    gender: "F",
    url: "https://media.base44.com/files/public/6a1893dc4924557a687e6543/40e77bbff_elite_runners_women_marks.xlsx",
  },
  {
    name: "Men's Marks",
    gender: "M",
    url: "https://media.base44.com/files/public/6a1893dc4924557a687e6543/df5498183_elite_runners_men_marks.xlsx",
  },
];

// Columns: Gender, Athlete, TFRRS Profile, Athlete ID, School, Division, Season, Event, Time, Class Year, Meet, Meet Date, List ID
const SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          gender:       { type: "string",  description: "Gender column" },
          athlete:      { type: "string",  description: "Athlete column - Last, First format" },
          tfrrs_profile:{ type: "string",  description: "TFRRS Profile URL" },
          athlete_id:   { type: "string",  description: "Athlete ID (TFRRS numeric ID)" },
          school:       { type: "string",  description: "School column" },
          division:     { type: "string",  description: "Division column e.g. NCAA D1" },
          season:       { type: "string",  description: "Season e.g. 2025 outdoor" },
          event:        { type: "string",  description: "Event column e.g. 800m, Mile, 5000m" },
          time:         { type: "string",  description: "Time column - performance mark" },
          class_year:   { type: "string",  description: "Class Year e.g. SR-4" },
          meet:         { type: "string",  description: "Meet name" },
          meet_date:    { type: "string",  description: "Meet Date" },
          list_id:      { type: "number",  description: "List ID" },
        }
      }
    }
  }
};

/** Convert time string like "4:22.46" or "1:49.78" or "13:37.25" or "28:22.62" to seconds */
function timeToSeconds(t) {
  if (!t) return 0;
  const s = String(t).trim();
  const parts = s.split(":");
  if (parts.length === 3) {
    // h:mm:ss.xx
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // m:ss.xx
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(s) || 0;
}

/** Parse "Last, First" or "Last, First Middle" athlete name */
function parseName(athlete) {
  if (!athlete) return { first_name: "", last_name: "" };
  const commaIdx = athlete.indexOf(",");
  if (commaIdx === -1) return { first_name: "", last_name: athlete.trim() };
  const last = athlete.slice(0, commaIdx).trim();
  const first = athlete.slice(commaIdx + 1).trim();
  return { first_name: first, last_name: last };
}

const clean = (s) => String(s || "").trim();

export default function ImportData() {
  const [status, setStatus] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [clearFirst, setClearFirst] = useState(true);
  const [totalImported, setTotalImported] = useState(0);
  const [totalDupes, setTotalDupes] = useState(0);

  const runImport = async () => {
    setRunning(true);
    setDone(false);
    setTotalImported(0);
    setTotalDupes(0);
    setStatus(FILES.map(f => ({ name: f.name, state: "pending", count: 0, dupes: 0 })));

    if (clearFirst) {
      setStatus(prev => prev.map((s, i) => i === 0 ? { ...s, state: "clearing" } : s));
      try {
        let page;
        do {
          page = await base44.entities.Runner.list(null, 500);
          if (page.length > 0) {
            await Promise.all(page.map(r => base44.entities.Runner.delete(r.id)));
          }
        } while (page.length === 500);
      } catch (e) { /* continue */ }
    }

    let grandTotal = 0;
    let grandDupes = 0;

    for (let i = 0; i < FILES.length; i++) {
      const file = FILES[i];
      setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "extracting" } : s));

      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: file.url,
          json_schema: SCHEMA,
        });

        if (extracted?.status !== "success") {
          throw new Error(extracted?.details || "Extraction failed");
        }

        const raw = extracted.output?.rows || (Array.isArray(extracted.output) ? extracted.output : []);

        // Deduplicate by tfrrs_id + event + season + list_id
        const seen = new Set();
        let dupes = 0;
        const records = [];

        for (const r of raw) {
          if (!clean(r.athlete) && !clean(r.athlete_id)) continue;
          const key = `${clean(r.athlete_id)}|${clean(r.event)}|${clean(r.season)}|${clean(r.list_id)}`;
          if (seen.has(key)) { dupes++; continue; }
          seen.add(key);

          const { first_name, last_name } = parseName(clean(r.athlete));
          if (!first_name && !last_name) continue;

          records.push({
            first_name,
            last_name,
            gender:        file.gender,
            team:          clean(r.school),
            division:      clean(r.division),
            tfrrs_id:      clean(r.athlete_id),
            tfrrs_profile: clean(r.tfrrs_profile),
            class_year:    clean(r.class_year),
            event_name:    clean(r.event),
            mark:          clean(r.time),
            mark_seconds:  timeToSeconds(r.time),
            season:        clean(r.season),
            meet_name:     clean(r.meet),
            meet_date:     clean(r.meet_date),
            list_id:       Number(r.list_id) || 0,
            is_field_event: false,
          });
        }

        setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "importing" } : s));

        const batchSize = 100;
        for (let b = 0; b < records.length; b += batchSize) {
          await base44.entities.Runner.bulkCreate(records.slice(b, b + batchSize));
        }

        grandTotal += records.length;
        grandDupes += dupes;
        setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "done", count: records.length, dupes } : s));
      } catch (err) {
        setStatus(prev => prev.map((s, idx) => idx === i ? { ...s, state: "error", error: err.message } : s));
      }
    }

    setTotalImported(grandTotal);
    setTotalDupes(grandDupes);
    setRunning(false);
    setDone(true);
  };

  const stateLabel = (s) => {
    if (!s) return <span className="text-gray-400">—</span>;
    if (s.state === "pending")   return <span className="text-gray-400">Waiting...</span>;
    if (s.state === "clearing")  return <span className="text-yellow-500 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Clearing...</span>;
    if (s.state === "extracting")return <span className="text-blue-500 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</span>;
    if (s.state === "importing") return <span className="text-blue-600 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Importing...</span>;
    if (s.state === "done")      return <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {s.count} rows{s.dupes > 0 ? `, ${s.dupes} dupes skipped` : ""}</span>;
    if (s.state === "error")     return <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {s.error}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-xl space-y-6">
        <div className="text-center">
          <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Import TFRRS Marks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Imports Women's and Men's marks from uploaded TFRRS export files.
          </p>
        </div>

        {/* Column mapping */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800 space-y-1">
          <div className="font-semibold flex items-center gap-1 mb-2"><Info className="w-3 h-3" /> Column Mapping</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-blue-500">Athlete (Last, First)</span><span>→ first_name + last_name ✓</span>
            <span className="text-blue-500">Athlete ID</span><span>→ tfrrs_id ✓</span>
            <span className="text-blue-500">TFRRS Profile</span><span>→ tfrrs_profile ✓</span>
            <span className="text-blue-500">School</span><span>→ team ✓</span>
            <span className="text-blue-500">Division</span><span>→ division ✓</span>
            <span className="text-blue-500">Season</span><span>→ season ✓</span>
            <span className="text-blue-500">Event</span><span>→ event_name ✓</span>
            <span className="text-blue-500">Time</span><span>→ mark + mark_seconds ✓</span>
            <span className="text-blue-500">Class Year</span><span>→ class_year ✓</span>
            <span className="text-blue-500">Meet</span><span>→ meet_name ✓</span>
            <span className="text-blue-500">Meet Date</span><span>→ meet_date ✓</span>
            <span className="text-blue-500">List ID</span><span>→ list_id ✓</span>
            <span className="text-blue-500">Gender</span><span>→ gender ✓ (from file)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200 text-gray-500">
            Duplicates detected by: Athlete ID + Event + Season + List ID
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          {FILES.map((f, i) => {
            const s = status[i];
            return (
              <div key={f.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 text-sm">{f.name}</span>
                  <Badge variant="outline" className="text-xs">{f.gender === "M" ? "Men" : "Women"}</Badge>
                </div>
                <div className="text-sm">{stateLabel(s)}</div>
              </div>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={clearFirst} onChange={e => setClearFirst(e.target.checked)} className="rounded" />
          Clear existing records before importing
        </label>

        {done && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm text-green-700">
            ✓ Imported <strong>{totalImported.toLocaleString()}</strong> marks
            {totalDupes > 0 && <>, skipped <strong>{totalDupes}</strong> duplicates</>}.{" "}
            <a href="/" className="underline font-medium">View dashboard →</a>
          </div>
        )}

        <Button onClick={runImport} disabled={running} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          {running ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing...</> : "Start Import"}
        </Button>
      </div>
    </div>
  );
}