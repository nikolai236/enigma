export function weekDayToString(idx: number): string {
	return [
		"Mon", "Tue", "Wed", "Thurs", "Fr", "Sat", "Sun"
	][idx];
}

export function monthToString(idx: number): string {
	return [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
	][idx];
}

export function formatTime(unixEpoch: number) {
	// return new Date(unixEpoch * SECOND)
	// 	.toLocaleString('en-US', {
	// 		timeZone: "America/New_York",
	// 		day: "numeric",
	// 		month: "short",
	// 		year: "2-digit",
	// 		hour: "numeric",
	// 		minute: "2-digit"
	// 	});

	return unixEpoch;
}

export function nominationToInterval(nomination: string) {
	const obj = nomination
		.split(',')
		.reduce((obj, e) => ({
			...obj,
			[e.slice(-1)]: Number(e.slice(0, -1))
		}), { D: 0, H: 0, m: 0, s: 0 });

	return obj.D * DAY + obj.H * HOUR + obj.m * MINUTE + obj.s * SECOND;
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;