npm i
originalDir=$PWD
cd public/modules

rm -r lightweight-charts
mkdir lightweight-charts

cp -r \
    $originalDir/node_modules/lightweight-charts/dist/* \
    lightweight-charts

cd $originalDir
rm -f public/chart/modules/lightweight-charts
mkdir -p public/chart/modules/lightweight-charts

cp -r \
    lightweight-charts/* \
    public/chart/modules/lightweight-charts
