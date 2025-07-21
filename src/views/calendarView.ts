import { ItemView, WorkspaceLeaf, moment } from "obsidian";
import { DataStorage } from "../services/dataStorage";
import { DailyViewModal } from "../components/dailyViewModal";
import { NutritionCalculator } from "../services/nutritonCaluculator";

export const CALENDAR_VIEW_TYPE = "food-tracker-calendar";

interface CalendarDay {
	date: string;
	hasEntries: boolean;
	entryCount: number;
	totalCalories: number;
	isToday: boolean;
	isCurrentMonth: boolean;
}

export class CalendarView extends ItemView {
	private dataStorage: DataStorage;
	private nutritionCalculator: NutritionCalculator;
	private currentMonth: moment.Moment;
	private calendarData: Map<string, CalendarDay> = new Map();

	constructor(
		leaf: WorkspaceLeaf,
		dataStorage: DataStorage,
		nutritionCalculator: NutritionCalculator,
	) {
		super(leaf);
		this.dataStorage = dataStorage;
		this.nutritionCalculator = nutritionCalculator;
		this.currentMonth = moment().startOf("month");
	}

	getViewType() {
		return CALENDAR_VIEW_TYPE;
	}

	getDisplayText() {
		return "Food Calendar";
	}

	getIcon() {
		return "calendar-days";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("food-calendar-view");

		await this.renderCalendar();
	}

	async renderCalendar() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// Header with navigation
		this.createCalendarHeader(container);

		// Calendar grid
		await this.createCalendarGrid(container);

		// Legend
		this.createCalendarLegend(container);
	}

	private createCalendarHeader(container: HTMLElement) {
		const header = container.createDiv("calendar-header");

		const prevBtn = header.createEl("button", {
			text: "←",
			cls: "calendar-nav-btn",
		});
		prevBtn.addEventListener("click", () => {
			this.currentMonth.subtract(1, "month");
			this.renderCalendar();
		});

		const nextBtn = header.createEl("button", {
			text: "→",
			cls: "calendar-nav-btn",
		});
		nextBtn.addEventListener("click", () => {
			this.currentMonth.add(1, "month");
			this.renderCalendar();
		});

		const todayBtn = header.createEl("button", {
			text: "Today",
			cls: "mod-cta",
		});
		todayBtn.addEventListener("click", () => {
			this.currentMonth = moment().startOf("month");
			this.renderCalendar();
		});
	}

	private async createCalendarGrid(container: HTMLElement) {
		const calendarGrid = container.createDiv("calendar-grid");

		// Load data for the current month
		await this.loadMonthData();

		// Day headers
		const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		dayHeaders.forEach((day) => {
			const dayHeader = calendarGrid.createDiv("calendar-day-header");
			dayHeader.textContent = day;
		});

		// Calendar days
		const startOfMonth = this.currentMonth.clone().startOf("month");
		const endOfMonth = this.currentMonth.clone().endOf("month");
		const startOfWeek = startOfMonth.clone().startOf("week");
		const endOfWeek = endOfMonth.clone().endOf("week");

		const currentDate = startOfWeek.clone();
		while (currentDate.isSameOrBefore(endOfWeek)) {
			const dayData = this.calendarData.get(
				currentDate.format("YYYY-MM-DD"),
			);
			this.createCalendarDay(calendarGrid, currentDate.clone(), dayData);
			currentDate.add(1, "day");
		}
	}

	private createCalendarDay(
		container: HTMLElement,
		date: moment.Moment,
		dayData?: CalendarDay,
	) {
		const dayEl = container.createDiv("calendar-day");

		if (dayData?.isToday) {
			dayEl.addClass("today");
		}
		if (!dayData?.isCurrentMonth) {
			dayEl.addClass("other-month");
		}
		if (dayData?.hasEntries) {
			dayEl.addClass("has-entries");
		}

		const dayNumber = dayEl.createDiv("day-number");
		dayNumber.textContent = date.format("D");

		if (dayData?.hasEntries) {
			const entryIndicator = dayEl.createDiv("entry-indicator");

			// Show dots for entry count (max 4 dots)
			const dotCount = Math.min(dayData.entryCount, 4);
			for (let i = 0; i < dotCount; i++) {
				entryIndicator.createDiv("entry-dot");
			}

			// Show calorie count if available
			if (dayData.totalCalories > 0) {
				const calorieText = dayEl.createDiv("calorie-count");
				calorieText.textContent = `${dayData.totalCalories}`;
			}
		}

		// Click handler to open daily view
		dayEl.addEventListener("click", () => {
			new DailyViewModal(
				this.app,
				this.dataStorage,
				this.nutritionCalculator,
				date.format("YYYY-MM-DD"),
			).open();
		});

		// Hover tooltip
		dayEl.addEventListener("mouseenter", (e) => {
			if (dayData?.hasEntries) {
				this.showDayTooltip(e.target as HTMLElement, dayData);
			}
		});
	}

	private createCalendarLegend(container: HTMLElement) {
		const legend = container.createDiv("calendar-legend");
		legend.createEl("h4", { text: "Legend" });

		const legendItems = legend.createDiv("legend-items");

		// Has entries
		const hasEntriesItem = legendItems.createDiv("legend-item");
		hasEntriesItem.createDiv("legend-color has-entries-color");
		hasEntriesItem.createSpan({ text: "Has food entries" });

		// Today
		const todayItem = legendItems.createDiv("legend-item");
		todayItem.createDiv("legend-color today-color");
		todayItem.createSpan({ text: "Today" });

		// Entry dots
		const dotsItem = legendItems.createDiv("legend-item");
		const dotsContainer = dotsItem.createDiv("legend-dots");
		for (let i = 0; i < 3; i++) {
			dotsContainer.createDiv("entry-dot");
		}
		dotsItem.createSpan({ text: "Number of entries (max 4 dots)" });
	}

	private async loadMonthData() {
		const startDate = this.currentMonth
			.clone()
			.startOf("month")
			.startOf("week");
		const endDate = this.currentMonth.clone().endOf("month").endOf("week");

		try {
			const summaries =
				await this.dataStorage.getNutritionSummariesForRange(
					startDate.format("YYYY-MM-DD"),
					endDate.format("YYYY-MM-DD"),
				);

			this.calendarData.clear();

			const currentDate = startDate.clone();
			const today = moment().format("YYYY-MM-DD");
			const currentMonthStart = this.currentMonth
				.clone()
				.startOf("month");
			const currentMonthEnd = this.currentMonth.clone().endOf("month");

			while (currentDate.isSameOrBefore(endDate)) {
				const dateStr = currentDate.format("YYYY-MM-DD");
				const summary = summaries.find((s) => s.date === dateStr);

				this.calendarData.set(dateStr, {
					date: dateStr,
					hasEntries: summary ? summary.entryCount > 0 : false,
					entryCount: summary?.entryCount || 0,
					totalCalories: summary?.totalCalories || 0,
					isToday: dateStr === today,
					isCurrentMonth: currentDate.isBetween(
						currentMonthStart,
						currentMonthEnd,
						"day",
						"[]",
					),
				});

				currentDate.add(1, "day");
			}
		} catch (error) {
			console.error("Error loading calendar data:", error);
		}
	}

	private showDayTooltip(element: HTMLElement, dayData: CalendarDay) {
		// Create tooltip showing day summary
		const tooltip = document.createElement("div");
		tooltip.className = "calendar-tooltip";
		tooltip.innerHTML = `
            <div class="tooltip-date">${moment(dayData.date).format("MMM D, YYYY")}</div>
            <div class="tooltip-stats">
                <div>Entries: ${dayData.entryCount}</div>
                <div>Calories: ${dayData.totalCalories}</div>
            </div>
        `;

		document.body.appendChild(tooltip);

		const rect = element.getBoundingClientRect();
		tooltip.style.position = "absolute";
		tooltip.style.left = `${rect.left + rect.width / 2}px`;
		tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;

		// Remove tooltip on mouse leave
		element.addEventListener(
			"mouseleave",
			() => {
				tooltip.remove();
			},
			{ once: true },
		);
	}

	async onClose() {
		// Cleanup if needed
	}
}
