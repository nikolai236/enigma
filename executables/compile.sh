cp chart/chart.html public
cp chart/style.css  public

mkdir -p dist
mkdir -p dist/executables
mkdir -p dist/src
mkdir -p public/chart

tsc --target esnext \
        --module esnext  \
        --outDir public/ \
        --moduleResolution node \
        chart/src/**.ts &\
    tsc --target esnext \
        --module commonjs \
        --outDir dist \
        --moduleResolution node \
        src/**.ts &\
    tsc --target esnext \
        --module commonjs \
        --outDir dist/executables \
        --moduleResolution node \
        --esModuleInterop true \
        --allowJS true \
        executables/**.ts &\
    wait