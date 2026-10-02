#!/bin/sh
# Crée le seau `drapes` s'il n'existe pas (idempotent). Attend que le maître SeaweedFS réponde.
set -eu
for i in $(seq 1 60); do
  if echo "s3.bucket.list" | weed shell -master=s3:9333 >/tmp/list.txt 2>/dev/null; then break; fi
  sleep 2
done
if grep -qx "drapes" /tmp/list.txt 2>/dev/null || grep -qw "drapes" /tmp/list.txt; then
  echo "seau drapes déjà présent"
  exit 0
fi
echo "s3.bucket.create -name drapes" | weed shell -master=s3:9333
echo "seau drapes créé"
