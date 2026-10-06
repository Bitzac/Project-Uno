#!/usr/bin/env bash
# Download the raw sources into popflow/.cache (gitignored). ~110 MB, mostly UN WPP.
set -euo pipefail
cd "$(dirname "$0")/.." && mkdir -p .cache && cd .cache
WPP="https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES"
get(){ [ -s "$1" ] || curl -sSfL -m 600 -o "$1" "$2"; }
get WPP2024_TotalPopulationBySex.csv.gz        "$WPP/WPP2024_TotalPopulationBySex.csv.gz"
get WPP2024_Demographic_Indicators_Medium.csv.gz "$WPP/WPP2024_Demographic_Indicators_Medium.csv.gz"
get owid_pop.csv  "https://ourworldindata.org/grapher/population.csv?v=1&csvType=full&useColumnShortNames=true"
get us_hist.html  "https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_historical_population"
get cn_hist.html  "https://en.wikipedia.org/wiki/List_of_Chinese_administrative_divisions_by_population"
get world50.json  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
get us10.json     "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
get cn.json       "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
ls -la
