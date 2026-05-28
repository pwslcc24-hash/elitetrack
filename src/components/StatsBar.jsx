import { Users, School, Activity, Filter } from "lucide-react";

export default function StatsBar({ runners, gender, filtered }) {
  const gr = runners.filter(r => r.gender === gender);
  const uniqueAthletes = new Set(gr.map(r => r.tfrrs_id || `${r.first_name}|${r.last_name}|${r.team}`)).size;
  const uniqueTeams    = new Set(gr.map(r => r.team).filter(Boolean)).size;
  const totalMarks     = gr.length;

  const stats = [
    { label: "Athletes",       value: uniqueAthletes.toLocaleString(), icon: Users,     color: "text-blue-600" },
    { label: "Total Marks",    value: totalMarks.toLocaleString(),     icon: Activity,  color: "text-green-600" },
    { label: "Schools",        value: uniqueTeams.toLocaleString(),    icon: School,    color: "text-purple-600" },
    { label: "Filtered Marks", value: filtered.length.toLocaleString(),icon: Filter,    color: "text-orange-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <s.icon className={`w-8 h-8 ${s.color}`} />
          <div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}