import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Trophy, Users, School, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import AthletesTable from "@/components/AthletesTable";
import StatsBar from "@/components/StatsBar";

export default function Home() {
  const [gender, setGender] = useState("M");
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sheetFilter, setSheetFilter] = useState("all");

  const { data: runners = [], isLoading } = useQuery({
    queryKey: ["runners"],
    queryFn: () => base44.entities.Runner.list("-created_date", 5000),
  });

  const genderRunners = useMemo(() => runners.filter(r => r.gender === gender), [runners, gender]);

  const filteredRunners = useMemo(() => {
    return genderRunners.filter(r => {
      const matchSearch =
        !search ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (r.team || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.ncaa_id || "").includes(search);
      const matchDiv = divisionFilter === "all" || r.division === divisionFilter;
      const matchEvent = eventFilter === "all" || r.event_name === eventFilter;
      const matchTeam = teamFilter === "all" || r.team === teamFilter;
      const matchSheet = sheetFilter === "all" || r.sheet === sheetFilter;
      return matchSearch && matchDiv && matchEvent && matchTeam && matchSheet;
    });
  }, [genderRunners, search, divisionFilter, eventFilter, teamFilter, sheetFilter]);

  const events = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.event_name).filter(Boolean));
    return Array.from(set).sort();
  }, [genderRunners]);

  const teams = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.team).filter(Boolean));
    return Array.from(set).sort();
  }, [genderRunners]);

  const sheets = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.sheet).filter(Boolean));
    return Array.from(set).sort();
  }, [genderRunners]);

  const handleExport = () => {
    const headers = ["First Name", "Last Name", "NCAA ID", "Team", "Division", "Event/Sport", "Conference", "Academic Year", "Designated S-A", "Sheet"];
    const csvRows = [headers.join(",")];
    filteredRunners.forEach(r => {
      csvRows.push([
        r.first_name, r.last_name, r.ncaa_id || "", r.team || "",
        r.division || "", r.event_name || "", r.conference || "",
        r.academic_year || "", r.designated_student_athlete || "", r.sheet || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portal_${gender === "M" ? "men" : "women"}_${divisionFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">EliteTrack</h1>
              <p className="text-gray-400 text-xs">NCAA Portal Eligibility Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant={gender === "M" ? "default" : "outline"}
                size="sm"
                onClick={() => { setGender("M"); setEventFilter("all"); setTeamFilter("all"); setSheetFilter("all"); }}
                className={gender === "M" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-600 text-gray-300 hover:text-white"}
              >
                Men
              </Button>
              <Button
                variant={gender === "F" ? "default" : "outline"}
                size="sm"
                onClick={() => { setGender("F"); setEventFilter("all"); setTeamFilter("all"); setSheetFilter("all"); }}
                className={gender === "F" ? "bg-pink-600 hover:bg-pink-700 text-white" : "border-gray-600 text-gray-300 hover:text-white"}
              >
                Women
              </Button>
            </div>
            <Link to="/import">
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:text-white gap-1">
                <Upload className="w-3 h-3" /> Import
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <StatsBar runners={runners} gender={gender} filtered={filteredRunners} />

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search athlete, team, or NCAA ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="I">Division I</SelectItem>
              <SelectItem value="II">Division II</SelectItem>
              <SelectItem value="III">Division III</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {events.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sheetFilter} onValueChange={setSheetFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Sheets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sheets</SelectItem>
              {sheets.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Athletes Table */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">
            Showing <strong>{filteredRunners.length}</strong> athletes
            {filteredRunners.length !== genderRunners.length && ` of ${genderRunners.length} total`}
          </span>
        </div>
        <AthletesTable athletes={filteredRunners} isLoading={isLoading} />
      </div>
    </div>
  );
}