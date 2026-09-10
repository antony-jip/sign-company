#!/bin/zsh
# Rendert controleframes: ./stills.sh S1Aanvraag 100 200 ...  (frames op 30 fps)
comp=$1; shift
for fr in "$@"; do
  npx remotion still "$comp" "out/$comp-$fr.png" --frame="$fr" --log=error 2>&1 | grep -E "rror" -A6 | head -20
done
