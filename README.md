# Enigma - Display Darwinex Ask / Bid Data as Candles

## Run the backend
To run the backend run go in the git base directory

`cat .env.example >> .env`

`yarn build`

`yarn start`

## Disaplay candlestick data
`http://localhost:5600/chart.html?assetName=EX&contarctName=EX_AMPL23&tf=15m`

## Compile Darwinex ASK/BID data
To compile an asset ASK/BID data from darwinex
1. Install the whole asset folder locally
2. run `yarn merge_ask_bid_folder /path/to/assetFolder/ /path/to/temp/dir/ /path/to/output/ interval` where the `interval` parameter is the minum interval you want to split the data into e.g `15s` will take 3 times more time and space than `5s`
3. run `cp -r /path/to/output/ /enigma/public/ohclv/`

### Project currently has support only for futures data

## Requirements
bash >= 4.0
