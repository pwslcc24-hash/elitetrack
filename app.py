#!/usr/bin/env python3
"""Local web UI to browse and filter TFRRS elite runners."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from openpyxl import Workbook
from openpyxl.styles import Font

from data_loader import DEFAULT_XLSX, load_data

app = FastAPI(title="TFRRS Elite Runners")
STATIC_DIR = Path(__file__).parent / "static"

_cache: dict[str, Any] | None = None


def get_data() -> dict[str, Any]:
    global _cache
    if _cache is None:
        _cache = load_data()
    return _cache


def split_multi(value: str) -> list[str]:
    if not value:
        return []
    return [p.strip() for p in value.replace("|", ";").split(";") if p.strip()]


def matches_multi(field: str, selected: list[str]) -> bool:
    if not selected:
        return True
    parts = split_multi(field)
    return any(s in parts for s in selected)


def filter_athletes(
    athletes: list[dict],
    *,
    gender: str,
    q: str,
    divisions: list[str],
    seasons: list[str],
    events: list[str],
    schools: list[str],
) -> list[dict]:
    out = []
    q_lower = q.lower().strip()
    for a in athletes:
        if gender and a.get("_gender") != gender:
            continue
        if q_lower and q_lower not in a.get("Athlete", "").lower():
            continue
        if divisions and not matches_multi(a.get("Division(s)", ""), divisions):
            continue
        if seasons and not matches_multi(a.get("Season(s)", ""), seasons):
            continue
        if schools and not matches_multi(a.get("School(s)", ""), schools):
            continue
        if events:
            events_met = [e.strip() for e in a.get("Events Met", "").split(",")]
            if not any(e in events_met for e in events):
                continue
        out.append(a)
    return out


def filter_marks(
    marks: list[dict],
    *,
    gender: str,
    q: str,
    divisions: list[str],
    seasons: list[str],
    events: list[str],
    schools: list[str],
) -> list[dict]:
    out = []
    q_lower = q.lower().strip()
    for m in marks:
        if gender and m.get("_gender") != gender:
            continue
        if q_lower and q_lower not in m.get("Athlete", "").lower():
            continue
        if divisions and m.get("Division", "") not in divisions:
            continue
        if seasons and m.get("Season", "") not in seasons:
            continue
        if events and m.get("Event", "") not in events:
            continue
        if schools:
            school = m.get("School", "")
            if not any(s.lower() in school.lower() for s in schools):
                continue
        out.append(m)
    return out


def build_meta(data: dict[str, Any]) -> dict[str, Any]:
    athletes = data["athletes"]
    marks = data["marks"]

    def unique_marks(g: str, field: str) -> list[str]:
        return sorted(
            {
                str(m.get(field, "")).strip()
                for m in marks
                if m.get("_gender") == g and str(m.get(field, "")).strip()
            }
        )

    def unique_athletes_multi(g: str, field: str) -> list[str]:
        vals: set[str] = set()
        for a in athletes:
            if a.get("_gender") != g:
                continue
            vals.update(split_multi(str(a.get(field, ""))))
        return sorted(vals)

    def unique_athlete_events(g: str) -> list[str]:
        return sorted(
            {
                e.strip()
                for a in athletes
                if a.get("_gender") == g
                for e in str(a.get("Events Met", "")).split(",")
                if e.strip()
            }
        )

    meta: dict[str, Any] = {"genders": {"m": "Men", "f": "Women"}, "counts": {}}
    for g, label in meta["genders"].items():
        meta["counts"][g] = {
            "label": label,
            "athletes": sum(1 for a in athletes if a.get("_gender") == g),
            "marks": sum(1 for m in marks if m.get("_gender") == g),
        }
        meta[g] = {
            "divisions_marks": unique_marks(g, "Division"),
            "seasons_marks": unique_marks(g, "Season"),
            "events_marks": unique_marks(g, "Event"),
            "schools_marks": unique_marks(g, "School"),
            "divisions_athletes": unique_athletes_multi(g, "Division(s)"),
            "seasons_athletes": unique_athletes_multi(g, "Season(s)"),
            "events_athletes": unique_athlete_events(g),
            "schools_athletes": unique_athletes_multi(g, "School(s)"),
        }

    meta["source"] = data.get("source", "")
    return meta


def parse_list_params(
    division: Optional[str],
    season: Optional[str],
    event: Optional[str],
    school: Optional[str],
) -> tuple[list[str], list[str], list[str], list[str]]:
    def parse(s: Optional[str]) -> list[str]:
        if not s:
            return []
        return [p.strip() for p in s.split(",") if p.strip()]

    return parse(division), parse(season), parse(event), parse(school)


def rows_to_xlsx(headers: list[str], rows: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Export"
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for row in rows:
        ws.append([row.get(h, "") for h in headers])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


@app.get("/api/meta")
def api_meta() -> dict[str, Any]:
    data = get_data()
    return build_meta(data)


@app.get("/api/athletes")
def api_athletes(
    gender: str = Query(..., pattern="^[mf]$"),
    q: str = "",
    division: Optional[str] = None,
    season: Optional[str] = None,
    event: Optional[str] = None,
    school: Optional[str] = None,
) -> dict[str, Any]:
    data = get_data()
    divs, seasons, events, schools = parse_list_params(division, season, event, school)
    rows = filter_athletes(
        data["athletes"],
        gender=gender,
        q=q,
        divisions=divs,
        seasons=seasons,
        events=events,
        schools=schools,
    )
    public = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    return {"total": len(public), "rows": public}


@app.get("/api/marks")
def api_marks(
    gender: str = Query(..., pattern="^[mf]$"),
    q: str = "",
    division: Optional[str] = None,
    season: Optional[str] = None,
    event: Optional[str] = None,
    school: Optional[str] = None,
) -> dict[str, Any]:
    data = get_data()
    divs, seasons, events, schools = parse_list_params(division, season, event, school)
    rows = filter_marks(
        data["marks"],
        gender=gender,
        q=q,
        divisions=divs,
        seasons=seasons,
        events=events,
        schools=schools,
    )
    public = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    return {"total": len(public), "rows": public}


@app.get("/api/export")
def api_export(
    view: str = Query("athletes", pattern="^(athletes|marks)$"),
    gender: str = Query(..., pattern="^[mf]$"),
    q: str = "",
    division: Optional[str] = None,
    season: Optional[str] = None,
    event: Optional[str] = None,
    school: Optional[str] = None,
) -> StreamingResponse:
    data = get_data()
    divs, seasons, events, schools = parse_list_params(division, season, event, school)
    gender_label = "men" if gender == "m" else "women"

    if view == "marks":
        rows = filter_marks(
            data["marks"],
            gender=gender,
            q=q,
            divisions=divs,
            seasons=seasons,
            events=events,
            schools=schools,
        )
        headers = [
            "Gender",
            "Athlete",
            "TFRRS Profile",
            "Athlete ID",
            "School",
            "Division",
            "Season",
            "Event",
            "Time",
            "Class Year",
            "Meet",
            "Meet Date",
            "List ID",
        ]
        filename = f"elite_runners_{gender_label}_marks.xlsx"
    else:
        rows = filter_athletes(
            data["athletes"],
            gender=gender,
            q=q,
            divisions=divs,
            seasons=seasons,
            events=events,
            schools=schools,
        )
        headers = [
            "Gender",
            "Athlete",
            "TFRRS Profile",
            "Athlete ID",
            "School(s)",
            "Division(s)",
            "Season(s)",
            "# Qualifying Marks",
            "Events Met",
            "All Qualifying Times",
        ]
        filename = f"elite_runners_{gender_label}_athletes.xlsx"

    public = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    if not public:
        raise HTTPException(404, "No rows match the current filters.")

    content = rows_to_xlsx(headers, public)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def main() -> None:
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    main()
