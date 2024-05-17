yarn

rm -f public/chart/modules/lightweight-charts 2> /dev/null || true
mkdir -p public/chart/modules/lightweight-charts

cp -r \
    node_modules/lightweight-charts/dist/* \
    public/chart/modules/lightweight-charts

rm -f chart/modules/lightweight-charts 2> /dev/null || true
mkdir -p chart/modules/lightweight-charts

cp -r \
    node_modules/lightweight-charts/dist/* \
    chart/modules/lightweight-charts