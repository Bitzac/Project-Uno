#!/usr/bin/env bash
# Download the raw sources into opportunity-os/.cache (gitignored), about 12 MB.
set -euo pipefail
cd "$(dirname "$0")/.." && mkdir -p .cache && cd .cache
get(){ [ -s "$1" ] || curl -sSfL --retry 3 -m 300 -o "$1" "$2"; }

# IMF World Economic Outlook (April 2026) through the DataMapper API: 1980-2031, projections from 2026
IMF="https://www.imf.org/external/datamapper/api/v1"
get imf_countries.json "$IMF/countries"
for i in NGDP_RPCH NGDPD NGDPDPC PPPPC PPPSH PCPIPCH LP BCA BCA_NGDPD LUR GGXWDG_NGDP; do get "imf_$i.json" "$IMF/$i"; done

# World Bank: income groups and regions, sector structure, openness, governance, FDI and portfolio flows (most recent non-empty value)
WB="https://api.worldbank.org/v2"
get wb_countries.json "$WB/country?format=json&per_page=400"
for i in NV.AGR.TOTL.ZS NV.IND.TOTL.ZS NV.IND.MANF.ZS NV.SRV.TOTL.ZS TX.VAL.TECH.MF.ZS BX.KLT.DINV.WD.GD.ZS \
         NE.EXP.GNFS.ZS SP.POP.1564.TO.ZS SP.URB.TOTL.IN.ZS IT.NET.USER.ZS GOV_WGI_RL.EST \
         BX.KLT.DINV.CD.WD BM.KLT.DINV.CD.WD BX.PEF.TOTL.CD.WD; do
  get "wb_$i.json" "$WB/country/all/indicator/$i?format=json&mrnev=1&per_page=400"
done

# WITS trade stats: exports by HS section, every reporter, three most recent years (2024 not yet published)
W="https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade"
for y in 2021 2022 2023; do get "wits_$y.xml" "$W/reporter/all/year/$y/partner/wld/product/all/indicator/XPRT-TRD-VL"; done

# Boundaries: Natural Earth 1:50m (world-atlas) and the DataV outline of China
get world50.json "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
get cn.json      "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
ls -la
