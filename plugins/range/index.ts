
class DailyRange {
    public day: Date;

    constructor(date: Date) {
        date.setHours(0, 0, 0, 0);

        const nyHour = date
            .toLocaleString('en-US', {
                timeZone: 'America/New_York',
                hour: '2-digit',
                hour12: false,
            })
            .slice(0, 2);

        const offset = (nyHour == "00" ? -4 : -5) * 60 * 60 * 1000;
        const nyTime = date.getTime() + offset;

        this.day = new Date(nyTime);
    }
}