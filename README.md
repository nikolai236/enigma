To run the backend run go in the git base directory
`npm i`
`npm build`
`npm start`

To compile an asset ASK/BID data from darwinex
1. Install the whole asset folder locally
2. run `npm "merge_ask_bid_folder /path/to/assetFolder/ /path/to/temp/dir/ /path/to/output/ interval` where the `interval` parameter is the minum interval you want to split the data into e.g 5s will take 3 times more time and spave than 15s
3. run `cp -r /path/to/output/ /enigma/public/`
