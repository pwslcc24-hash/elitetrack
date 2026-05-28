# TFRRS Elite Runners Export

Builds an Excel spreadsheet of college runners who meet custom time standards, using [TFRRS](https://tf.tfrrs.org) division qualifying lists across **2024, 2025, and 2026** (outdoor + indoor) for all major leagues.

## Standards

### Women (faster than)

| Event | Standard |
|-------|----------|
| 10,000m | 34:00 |
| 5000m | 16:30 |
| 3000m Steeplechase | 10:30 |
| 3000m | 9:30 |
| Mile | 5:00 |
| 1500m | 4:30 |
| 800m | 2:10 |

### Men (faster than)

| Event | Standard |
|-------|----------|
| 10,000m | 29:00 |
| 5000m | 14:00 |
| 3000m Steeplechase | 9:00 |
| 3000m | 8:05 |
| Mile | 4:03 |
| 1500m | 3:41 |
| 800m | 1:50 |

**Note:** The women's “20k” requirement is interpreted as **10,000m**. Edit `STANDARDS` in `scrape_elite_runners.py` if you meant a different distance.

## Leagues & seasons scraped

**Leagues:** NCAA D1, D2, D3, NAIA, NJCAA, NCCAA, NWAC, USCAA

**Seasons:**
- **Outdoor:** 2024, 2025, 2026 calendar years
- **Indoor:** labeled by competition year (2024 indoor = 2023–24 lists, 2025 indoor = 2024–25, 2026 indoor = 2025–26)

Outdoor lists include 10k, 5k, steeple, 1500, 800. Indoor lists add 3000m and mile.

## Setup

```bash
cd ~/Projects/tfrrs-elite-runners
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run scraper

```bash
python scrape_elite_runners.py
# -> elite_runners_tfrrs.xlsx

python scrape_elite_runners.py -o ~/Desktop/elite_runners.xlsx --delay 1.0
```

Scrapes 48 TFRRS lists × 2 genders (96 requests). Default delay is 0.75s between requests.

## Web UI (filter & export)

```bash
python app.py
```

Open **http://127.0.0.1:8765**. Use **Men** / **Women** tabs, filter by division, school, season, and event, then **Export filtered sheet** to download an Excel file for the current view.

## Output sheets

1. **All Qualifying Marks** — every qualifying mark with **School**, **Division**, **Season**, event, time, meet, and TFRRS profile link.
2. **Unique Athletes** — one row per athlete (deduped by TFRRS athlete ID) with **School(s)**, **Division(s)**, **Season(s)**, and all qualifying times summarized.
3. **Standards** — reference thresholds.
4. **Lists Scraped** — all list IDs and URLs used.

## Limitations

- Uses TFRRS “Top 500” per event on each qualifying list; marks below that depth on a list may be missing.
- Mile and 3000m are sourced from **indoor** lists only.
- Indoor “2024” uses TFRRS's 2023–24 academic-year lists; outdoor uses calendar-year lists.
- Athletes who transferred appear with multiple schools in **School(s)** when TFRRS shows different teams across marks.
- Respect TFRRS terms of use; increase `--delay` if needed.
