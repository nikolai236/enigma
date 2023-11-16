npm i
originalDir=$PWD
cd public/modules
rm -r lightweight-charts
mkdir lightweight-charts
cp -r $originalDir/node_modules/lightweight-charts/dist/* lightweight-charts