function getLastFridayOfMonth(year: number, month: number) {     
	const lastDay = new Date(year, month - 1, 0);
	const lastFriday = lastDay.getDate() - (lastDay.getDay() - 5 + 7) % 7;
	return Date.UTC(year, month, lastFriday);
};

export function getContractExpiration(monthYearString: string) {
	const monthChar = monthYearString[0];
	let month: number;
	switch(monthChar) {
		case 'H': // March
			month = 2;
			break;
		case 'M': // June
			month = 5;
			break;
		case 'U': // September
			month = 9;
			break;
		case 'Z': // December
			month = 11;
			break;
		default:throw new Error('Invalid input');
	}

	const expirtaionDate = getLastFridayOfMonth(
		Number(`20${monthYearString.slice(1)}`),
		month,
	);

	return expirtaionDate;
}

export function sortContracts(contracts: string[]) {
	return contracts
		.filter(c => /[UHMZ]\d{2}/g.test(c.split('_')[1] ?? ''))
		.map(c => ({
			contract: c,
			expires: getContractExpiration(c.split('_')[1]),
		}))
		.sort((a, b) => a.expires - b.expires);
}