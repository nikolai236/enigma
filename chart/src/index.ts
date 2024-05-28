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

	window.pm = new (function() {
		this.loadCandlesFromParams = manager.loadCandlesFromParams.bind(manager);
		this.loadFVG = manager.loadFVGs.bind(manager);
		this.showMNOs = manager.showMNOs.bind(manager);
		this.seeMss = manager.seeMss.bind(manager);
		this.isMSSinDiscount = manager.isMSSinDiscount.bind(manager);
	})();

	await window.pm.loadCandlesFromParams!();
}
main();