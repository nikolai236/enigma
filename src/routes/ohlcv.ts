import { NextFunction, Request, Response, Router } from "express";
import { readdir } from 'fs/promises';
import { resolve, join } from "path";
import { getContractExpiration, sortContracts } from "../macros/contracts";
import { Candle, TimeFrame } from "../../types/ohlcv";
import { getData, isTimeFrameValid, DAY } from "../controllers/ohlcv";
import pluginRouter from './plugins';

const router = Router();
export default router;

declare global {
	namespace Express {
		interface Request {
			context: {
				candles?: Candle[]; 
				timeframe?: TimeFrame;
				contractDir?: string;
				dataFolders?: string[];
				assetDir?: string;
			};
		}
	}
}

router.use('/:assetName/:contractName/:timeframe/plugins/', pluginRouter);

router.use('/:assetName/', validateFolderMiddlware);
router.use('/:assetName/:contractName/:timeframe/', validateTFandContractDir);

router.get('/:assetName/', async (req, res) => {
	return res.json({
		contracts: sortContracts(req.context.dataFolders!)
	});
});

router.get('/:assetName/:contractName/:timeframe/', async (req, res) => {
	return res.json({ candleData: req.context.candles });
});


async function validateFolderMiddlware(req: Request, res: Response, next: NextFunction) {
	try {
		const root = resolve('public/ohlcv/');
		const assetDir = join(root, req.params.assetName);

		if(!assetDir.startsWith(root)) return res.sendStatus(403);
		const dataFolders = await readdir(assetDir);

		req.context ??= {};
		Object.assign(req.context, { dataFolders, assetDir });

		return next();
	} catch(err) {

		console.error(err);
		return res.sendStatus(404);

	}
}

async function validateTFandContractDir(req: Request, res: Response, next: NextFunction) {
	const assetDir = req.context.assetDir!;
	const { contractName, timeframe } = req.params;

	if(!isTimeFrameValid(timeframe)) {
		return res.sendStatus(400);
	}

	const contractDir = join(assetDir, contractName);
	if(!contractDir.startsWith(assetDir!)) {
		return res.sendStatus(403);
	}

	
	let candles: Candle[];
	try {
		candles = await getData(contractDir!, timeframe!);
		if (candles == null) {
			throw new Error('Something went wrong');
		}
		
	} catch(err) {
		console.error(err);
		return res.sendStatus(404);
	}

	const [_, contractMonth] = contractName.split('_');
	candles = candles.filter(candle =>
		candle.time * 1000 < getContractExpiration(contractMonth) + DAY
	),
	
	Object.assign(req.context, { contractDir, timeframe, candles });
	return next();
}