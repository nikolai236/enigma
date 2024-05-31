import { TimeFrameEnum } from "../../types/ohlcv.js";
import StartegyManager from "./strategies/index.js";

declare global {
	interface Window {
		sm: Partial<StartegyManager>;
	}
}

async function main() {
	const manager = new StartegyManager(
		new URLSearchParams(window.location.search),
	);

	window.sm = new (function() {
		this.loadCandlesFromParams = manager.loadCandlesFromParams.bind(manager);
		this.loadFVG = manager.loadFVGs.bind(manager);
		this.showMNOs = manager.showMNOs.bind(manager);
		this.seeMss = manager.seeMss.bind(manager);
		this.isMSSinDiscount = manager.isMSSinDiscount.bind(manager);
	})();

	await window.sm.loadCandlesFromParams!();
}
main();