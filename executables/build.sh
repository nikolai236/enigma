yarn

declare -a frontend_dependecies=("lightweight-charts" "fancy-canvas")
declare -a srcs=("/dist" "/")

i=0
for library in "${frontend_dependecies[@]}"
do
    src="$library${srcs[i]}"

    rm -f public/chart/modules/$library 2> /dev/null || true
    mkdir -p public/chart/modules/$library

    cp -r \
        node_modules/$src/* \
        public/chart/modules/$library

    rm -f chart/modules/$library 2> /dev/null || true
    mkdir -p chart/modules/$library

    cp -r \
        node_modules/$src/* \
        chart/modules/$library

    i=$((i+1))
done
