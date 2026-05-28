import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Trophy, Users, Activity } from "lucide-react";
import RunnersTable from "@/components/RunnersTable";
import MarksTable from "@/components/MarksTable";
import StatsBar from "@/components/StatsBar";

export default function Home() {
  const [gender, setGender] = useState("M");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("athletes");

  const { data: runners = [], isLoading } = useQuery({
    queryKey: ["runners"],
    queryFn: () => base44.entities.Runner.list("-mark_seconds", 2000),
  });

  const filteredRunners = useMemo(() => {
    return runners.filter((r) => {
      const matchGender = r.gender === gender;
      const matchSearch =
        !search ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (r.team || "").toLowerCase().includes(search.toLowerCase());
      const matchEvent = eventFilter === "all" || r.event_name === eventFilter;
      const matchTeam = teamFilter === "all" || r.team === teamFilter;
      return matchGender && matchSearch && matchEvent && matchTeam;
    });
  }, [runners, gender, search, eventFilter, teamFilter]);

  const events = useMemo(() => {
    const set = new Set(runners.filter((r) => r.gender === gender).map((r) => r.event_name).filter(Boolean));
    return Array.from(set).sort();
  }, [runners, gender]);

  const teams = useMemo(() => {
    const set = new Set(runners.filter((r) => r.gender === gender).map((r) => r.team).filter(Boolean));
    return Array.from(set).sort();
  }, [runners, gender]);

  // Unique athletes for the Athletes tab
  const athletes = useMemo(() => {
    const map = new Map();
    filteredRunners.forEach((r) => {
      const key = `${r.first_name}|${r.last_name}|${r.team}`;
      if (!map.has(key)) {
        map.set(key, { ...r, events: [r.event_name], marks: [r.mark] });
      } else {
        const existing = map.get(key);
        if (!existing.events.includes(r.event_name)) existing.events.push(r.event_name);
        existing.marks.push(r.mark);
      }
    });
    return Array.from(map.values());
  }, [filteredRunners]);

  const handleExport = () => {
    const rows = activeTab === "athletes" ? athletes : filteredRunners;
    const headers = activeTab === "athletes"
      ? ["First Name", "Last Name", "Team", "Year", "Events", "Qualifying Marks"]
      : ["First Name", "Last Name", "Team", "Year", "Event", "Mark", "Place", "Meet", "Date"];

    const csvRows = [headers.join(",")];
    rows.forEach((r) => {
      if (activeTab === "athletes") {
        csvRows.push([r.first_name, r.last_name, r.team || "", r.year || "", (r.events || [r.event_name]).join("; "), (r.marks || [r.mark]).join("; ")].map(v => `"${v}"`).join(","));
      } else {
        csvRows.push([r.first_name, r.last_name, r.team || "", r.year || "", r.event_name, r.mark, r.place || "", r.meet_name || "", r.meet_date || ""].map(v => `"${v}"`).join(","));
      }
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elite_runners_${gender === "M" ? "men" : "women"}_${activeTab}.csv`;
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
              <p className="text-gray-400 text-xs">TFRRS Elite Runners Database</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={gender === "M" ? "default" : "outline"}
              size="sm"
              onClick={() => { setGender("M"); setEventFilter("all"); setTeamFilter("all"); }}
              className={gender === "M" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-600 text-gray-300 hover:text-white"}
            >
              Men
            </Button>
            <Button
              variant={gender === "F" ? "default" : "outline"}
              size="sm"
              onClick={() => { setGender("F"); setEventFilter("all"); setTeamFilter("all"); }}
              className={gender === "F" ? "bg-pink-600 hover:bg-pink-700 text-white" : "border-gray-600 text-gray-300 hover:text-white"}
            >
              Women
            </Button>
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
              placeholder="Search athlete or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 ml-auto">
            <Download className="w-4 h-4" />
            Export CSV
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
            <RunnersTable athletes={athletes} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="marks" className="mt-4">
            <MarksTable marks={filteredRunners} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}