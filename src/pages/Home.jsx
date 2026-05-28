import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Trophy, Users, Activity, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import AthletesTable from "@/components/AthletesTable";
import MarksTable from "@/components/MarksTable";
import StatsBar from "@/components/StatsBar";

export default function Home() {
  const [gender, setGender] = useState("F");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("athletes");

  const { data: runners = [], isLoading } = useQuery({
    queryKey: ["runners"],
    queryFn: () => base44.entities.Runner.list("mark_seconds", 5000),
  });

  const genderRunners = useMemo(() => runners.filter(r => r.gender === gender), [runners, gender]);

  const filteredRunners = useMemo(() => {
    return genderRunners.filter(r => {
      const matchSearch =
        !search ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (r.team || "").toLowerCase().includes(search.toLowerCase());
      const matchEvent   = eventFilter    === "all" || r.event_name === eventFilter;
      const matchTeam    = teamFilter     === "all" || r.team === teamFilter;
      const matchDiv     = divisionFilter === "all" || r.division === divisionFilter;
      const matchSeason  = seasonFilter   === "all" || r.season === seasonFilter;
      return matchSearch && matchEvent && matchTeam && matchDiv && matchSeason;
    });
  }, [genderRunners, search, eventFilter, teamFilter, divisionFilter, seasonFilter]);

  const events = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.event_name).filter(Boolean));
    return Array.from(set).sort();
  }, [genderRunners]);

  const teams = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.team).filter(Boolean));
    return Array.from(set).sort();
  }, [genderRunners]);

  const divisions = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.division).filter(Boolean));
    return Array.from(set).sort();
  }, [genderRunners]);

  const seasons = useMemo(() => {
    const set = new Set(genderRunners.map(r => r.season).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [genderRunners]);

  // Unique athletes for Athletes tab — best mark per athlete per event
  const athletes = useMemo(() => {
    const map = new Map();
    // runners are sorted by mark_seconds asc — first occurrence = best mark for that athlete+event
    filteredRunners.forEach(r => {
      const key = `${r.tfrrs_id || r.first_name}|${r.last_name}|${r.team}`;
      if (!map.has(key)) {
        map.set(key, { ...r, events: [r.event_name], marks: [{ event: r.event_name, mark: r.mark }] });
      } else {
        const ex = map.get(key);
        if (!ex.events.includes(r.event_name)) {
          ex.events.push(r.event_name);
          ex.marks.push({ event: r.event_name, mark: r.mark });
        }
      }
    });
    return Array.from(map.values());
  }, [filteredRunners]);

  const handleExport = () => {
    const rows = activeTab === "athletes" ? athletes : filteredRunners;
    const headers = activeTab === "athletes"
      ? ["First Name", "Last Name", "TFRRS ID", "School", "Division", "Class Year", "Events", "Best Marks"]
      : ["First Name", "Last Name", "TFRRS ID", "School", "Division", "Season", "Event", "Mark", "Class Year", "Meet", "Meet Date", "List ID"];

    const csvRows = [headers.join(",")];
    rows.forEach(r => {
      if (activeTab === "athletes") {
        csvRows.push([
          r.first_name, r.last_name, r.tfrrs_id || "", r.team || "",
          r.division || "", r.class_year || "",
          (r.events || [r.event_name]).join("; "),
          (r.marks || [{ event: r.event_name, mark: r.mark }]).map(m => `${m.event}: ${m.mark}`).join("; ")
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      } else {
        csvRows.push([
          r.first_name, r.last_name, r.tfrrs_id || "", r.team || "",
          r.division || "", r.season || "", r.event_name, r.mark,
          r.class_year || "", r.meet_name || "", r.meet_date || "", r.list_id || ""
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      }
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elitetrack_${gender === "M" ? "men" : "women"}_${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">EliteTrack</h1>
              <p className="text-gray-400 text-xs">TFRRS Performance Database</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant={gender === "M" ? "default" : "outline"}
                size="sm"
                onClick={() => { setGender("M"); setEventFilter("all"); setTeamFilter("all"); setSeasonFilter("all"); }}
                className={gender === "M" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-600 text-gray-300 hover:text-white"}
              >
                Men
              </Button>
              <Button
                variant={gender === "F" ? "default" : "outline"}
                size="sm"
                onClick={() => { setGender("F"); setEventFilter("all"); setTeamFilter("all"); setSeasonFilter("all"); }}
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
              placeholder="Search athlete or school..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Events" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Seasons" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Divisions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All Schools" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="athletes" className="gap-2">
              <Users className="w-4 h-4" /> Athletes
              <Badge variant="secondary" className="ml-1">{athletes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="marks" className="gap-2">
              <Activity className="w-4 h-4" /> Marks
              <Badge variant="secondary" className="ml-1">{filteredRunners.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="athletes" className="mt-4">
            <AthletesTable athletes={athletes} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="marks" className="mt-4">
            <MarksTable marks={filteredRunners} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}