import { TimeFrameEnum } from "../../types/ohlcv.js";
import PluginManager from "./plugins/index.js";

declare global {
	interface Window {
		pm: Partial<PluginManager>;
	}
}

async function main() {
	const manager = new PluginManager(
		new URLSearchParams(window.location.search),
	);

	window.pm = {
		loadCandlesFromParams: manager.loadCandlesFromParams.bind(manager),
		loadFVGs: manager.loadFVGs.bind(manager),
		showMNOs: manager.showMNOs.bind(manager),
		seeMss: manager.seeMss.bind(manager),
		isMSSinDiscount: manager.isMSSinDiscount.bind(manager),
	};

	await window.pm.loadCandlesFromParams!();
}
main();