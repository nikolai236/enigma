import * as express from 'express';
import * as morgan from 'morgan';
import { resolve } from 'path';
import OHLCVRouter from './routes/ohlcv';
import "dotenv/config.js";

if(require.main === module) {
    const app = express();

    app.use(morgan('dev'));
    app.use(express.static(resolve('public')));

    app.use('/ohlcv/assets/', OHLCVRouter);

    app.listen(process.env.SERVER_PORT, () => {
        console.log(
            'Server is running on port:',
            process.env.SERVER_PORT
        );
    });
}