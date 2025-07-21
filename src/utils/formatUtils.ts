export class FormatUtils {
	/**
	 * Format calories for display
	 */
	static formatCalories(calories: number, showUnit = true): string {
		const rounded = Math.round(calories);
		return showUnit ? `${rounded} cal` : rounded.toString();
	}

	/**
	 * Format macronutrient value
	 */
	static formatMacro(value: number, unit = "g"): string {
		return `${value.toFixed(1)}${unit}`;
	}

	/**
	 * Format percentage
	 */
	static formatPercentage(value: number, decimals = 0): string {
		return `${value.toFixed(decimals)}%`;
	}

	/**
	 * Format weight/serving size
	 */
	static formatServingSize(size: number, unit: string): string {
		return `${size} ${unit}`;
	}

	/**
	 * Format number with commas
	 */
	static formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
	}

	/**
	 * Format decimal places
	 */
	static formatDecimal(num: number, places = 1): number {
		return Math.round(num * Math.pow(10, places)) / Math.pow(10, places);
	}

	/**
	 * Format file size
	 */
	static formatFileSize(bytes: number): string {
		const sizes = ["Bytes", "KB", "MB", "GB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return (
			Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
		);
	}

	/**
	 * Capitalize first letter
	 */
	static capitalize(text: string): string {
		return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
	}

	/**
	 * Format meal name
	 */
	static formatMealName(meal: string): string {
		return this.capitalize(meal);
	}

	/**
	 * Format food name for display
	 */
	static formatFoodName(name: string, brand?: string): string {
		if (brand) {
			return `${name} (${brand})`;
		}
		return name;
	}

	/**
	 * Format duration (minutes to hours and minutes)
	 */
	static formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;

		if (hours === 0) {
			return `${mins}m`;
		} else if (mins === 0) {
			return `${hours}h`;
		} else {
			return `${hours}h ${mins}m`;
		}
	}

	/**
	 * Format currency
	 */
	static formatCurrency(amount: number, currency = "USD"): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
		}).format(amount);
	}

	/**
	 * Format array as comma-separated list
	 */
	static formatList(items: string[], maxItems?: number): string {
		if (maxItems && items.length > maxItems) {
			const shown = items.slice(0, maxItems);
			const remaining = items.length - maxItems;
			return `${shown.join(", ")} +${remaining} more`;
		}
		return items.join(", ");
	}

	/**
	 * Truncate text with ellipsis
	 */
	static truncate(text: string, length: number): string {
		if (text.length <= length) return text;
		return text.substring(0, length) + "...";
	}

	/**
	 * Format nutrition summary
	 */
	static formatNutritionSummary(
		calories: number,
		protein: number,
		carbs: number,
		fat: number,
	): string {
		return `${this.formatCalories(calories)} | ${this.formatMacro(protein)} protein | ${this.formatMacro(carbs)} carbs | ${this.formatMacro(fat)} fat`;
	}

	/**
	 * Format range
	 */
	static formatRange(min: number, max: number, unit?: string): string {
		const unitStr = unit ? ` ${unit}` : "";
		return `${min}${unitStr} - ${max}${unitStr}`;
	}

	/**
	 * Format BMI
	 */
	static formatBMI(bmi: number): string {
		return bmi.toFixed(1);
	}

	/**
	 * Format progress ratio
	 */
	static formatProgress(current: number, target: number): string {
		return `${current}/${target}`;
	}
}
