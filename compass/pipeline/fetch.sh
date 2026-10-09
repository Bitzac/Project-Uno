#!/bin/sh
# Download the official reference tables into compass/.cache (not committed).
set -e
cd "$(dirname "$0")/.."
mkdir -p .cache
W="https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years"
for s in boys girls; do
  curl -fsSL -o ".cache/bmi-$s-z-who-2007-exp.xlsx" "$W/bmi-for-age-(5-19-years)/bmi-$s-z-who-2007-exp.xlsx"
  curl -fsSL -o ".cache/hfa-$s-z-who-2007-exp.xlsx" "$W/height-for-age-(5-19-years)/hfa-$s-z-who-2007-exp.xlsx"
done
# 《国家学生体质健康标准（2014年修订）》 (Ministry of Education, July 2014): full text with scoring tables, copy hosted by ECNU
curl -fsSL -o .cache/gb2014.pdf "https://tyxx.ecnu.edu.cn/_upload/article/files/27/b0/f8259c65421b9d5da5ec5bdafaac/052c10da-4404-4b6e-8849-cc06b5496416.pdf"
pdftotext -layout .cache/gb2014.pdf .cache/gb2014.txt
echo ok
