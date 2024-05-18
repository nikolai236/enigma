#!/bin/bash

yarn

declare -a frontend_dependecies=("lightweight-charts" "fancy-canvas")
declare -a srcs=("/dist" "/")

i=0
for library in "${frontend_dependecies[@]}"
do
    src="$library${srcs[i]}"

    rm -f chart/modules/$library 2> /dev/null || true
    mkdir -p chart/modules/$library

    cp -r \
        node_modules/$src/* \
        chart/modules/$library

    # .d.ts files don't get converted into .js file, but we still import
    # from them causing error in chart.html

    shopt -s globstar
    for file in chart/modules/$library/**/*.d.ts; do
        # echo "${file%.d.ts}.ts"
        # touch "${file%.d.ts}.ts"
        # cat "$file" >> "${file%.d.ts}.ts"
        mv "$file" "${file%.d.ts}.ts"
    done

    i=$((i+1))
done
