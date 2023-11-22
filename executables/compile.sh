cp chart/chart.html public
cp chart/style.css  public

mkdir -p dist
mkdir -p dist/chart
mkdir -p dist/executables
mkdir -p dist/src

tsc --target esnext \
        --module esnext  \
        --outDir dist/chart \
        --moduleResolution node \
        chart/src/* &\
    tsc --target esnext \
        --module commonjs \
        --outDir dist/src \
        --moduleResolution node \
        src/* &\
    tsc --target esnext \
        --module commonjs \
        --outDir dist/executables \
        --moduleResolution node \
        --esModuleInterop true \
        --allowJS true \
        executables/**.ts &\
    wait

orignalDir=$PWD
cd public
rm -r chart
mkdir chart
cp -r $orignalDir/dist/chart/* chart