import * as express from 'express';
import * as morgan from 'morgan';
import { resolve } from 'path';
import "dotenv/config.js";

import OHLCVRouter from './routes/ohlcv';

const port = process.env.SERVER_PORT;

if(require.main === module) {
	const app = express();

	app.use(morgan('dev'));
	app.use(express.static(resolve('public')));

	app.use('/ohlcv/assets/', OHLCVRouter);

	app.listen(port, () => {
		console.log(
			'Server is running on port:',
			port
		);
	});
}