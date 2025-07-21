import { moment } from "obsidian";

export class DateUtils {
	/**
	 * Format date consistently across the application
	 */
	static formatDate(
		date: Date | string | number,
		format = "YYYY-MM-DD",
	): string {
		return moment(date).format(format);
	}

	/**
	 * Get current date in ISO format
	 */
	static getCurrentDate(): string {
		return moment().format("YYYY-MM-DD");
	}

	/**
	 * Get current timestamp
	 */
	static getCurrentTimestamp(): number {
		return Date.now();
	}

	/**
	 * Parse date string to Date object
	 */
	static parseDate(dateString: string): Date {
		const parsed = moment(dateString);
		if (!parsed.isValid()) {
			throw new Error(`Invalid date string: ${dateString}`);
		}
		return parsed.toDate();
	}

	/**
	 * Check if a date string is valid
	 */
	static isValidDate(dateString: string): boolean {
		return moment(dateString).isValid();
	}

	/**
	 * Get date range for current week
	 */
	static getCurrentWeek(): { start: string; end: string } {
		const start = moment().startOf("week");
		const end = moment().endOf("week");
		return {
			start: start.format("YYYY-MM-DD"),
			end: end.format("YYYY-MM-DD"),
		};
	}

	/**
	 * Get date range for current month
	 */
	static getCurrentMonth(): { start: string; end: string } {
		const start = moment().startOf("month");
		const end = moment().endOf("month");
		return {
			start: start.format("YYYY-MM-DD"),
			end: end.format("YYYY-MM-DD"),
		};
	}

	/**
	 * Get date range for a specific number of days
	 */
	static getDateRange(days: number, fromDate?: string): string[] {
		const dates: string[] = [];
		const startDate = fromDate ? moment(fromDate) : moment();

		for (let i = 0; i < days; i++) {
			dates.push(
				startDate.clone().subtract(i, "days").format("YYYY-MM-DD"),
			);
		}

		return dates.reverse();
	}

	/**
	 * Add days to a date
	 */
	static addDays(date: string, days: number): string {
		return moment(date).add(days, "days").format("YYYY-MM-DD");
	}

	/**
	 * Subtract days from a date
	 */
	static subtractDays(date: string, days: number): string {
		return moment(date).subtract(days, "days").format("YYYY-MM-DD");
	}

	/**
	 * Get the difference in days between two dates
	 */
	static getDaysDifference(date1: string, date2: string): number {
		const d1 = moment(date1);
		const d2 = moment(date2);
		return d1.diff(d2, "days");
	}

	/**
	 * Check if date is today
	 */
	static isToday(date: string): boolean {
		return moment(date).isSame(moment(), "day");
	}

	/**
	 * Check if date is in current week
	 */
	static isThisWeek(date: string): boolean {
		return moment(date).isSame(moment(), "week");
	}

	/**
	 * Get human-readable relative time
	 */
	static getRelativeTime(date: string): string {
		return moment(date).fromNow();
	}

	/**
	 * Format time from timestamp
	 */
	static formatTime(timestamp: number, format = "HH:mm"): string {
		return moment(timestamp).format(format);
	}

	/**
	 * Get start and end of week for a given date
	 */
	static getWeekBounds(date: string): { start: string; end: string } {
		const momentDate = moment(date);
		return {
			start: momentDate.clone().startOf("week").format("YYYY-MM-DD"),
			end: momentDate.clone().endOf("week").format("YYYY-MM-DD"),
		};
	}

	/**
	 * Get start and end of month for a given date
	 */
	static getMonthBounds(date: string): { start: string; end: string } {
		const momentDate = moment(date);
		return {
			start: momentDate.clone().startOf("month").format("YYYY-MM-DD"),
			end: momentDate.clone().endOf("month").format("YYYY-MM-DD"),
		};
	}

	/**
	 * Generate date array between two dates
	 */
	static generateDateArray(startDate: string, endDate: string): string[] {
		const dates: string[] = [];
		const start = moment(startDate);
		const end = moment(endDate);

		while (start.isSameOrBefore(end)) {
			dates.push(start.format("YYYY-MM-DD"));
			start.add(1, "day");
		}

		return dates;
	}

	/**
	 * Get day of week
	 */
	static getDayOfWeek(
		date: string,
		format: "short" | "long" = "short",
	): string {
		const momentDate = moment(date);
		return format === "short"
			? momentDate.format("ddd")
			: momentDate.format("dddd");
	}

	/**
	 * Get month name
	 */
	static getMonthName(
		date: string,
		format: "short" | "long" = "long",
	): string {
		const momentDate = moment(date);
		return format === "short"
			? momentDate.format("MMM")
			: momentDate.format("MMMM");
	}
}
