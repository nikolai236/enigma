import PluginManager from "./plugins/index.js";

declare global {
	interface Window {
		pm: PluginManager;
	}
}

async function main() {
	window.pm = new PluginManager(
		new URLSearchParams(window.location.search)
	);

	await window.pm.loadCandlesFromParams();
}
main();