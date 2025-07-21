import { ItemView, WorkspaceLeaf, moment } from "obsidian";
import { DataStorage } from "../services/DataStorage";
import { NutritionCalculator } from "../services/nutritonCaluculator";

export const WEEKLY_TREND_VIEW_TYPE = "food-tracker-weekly";

export class WeeklyTrendView extends ItemView {
	private dataStorage: DataStorage;
	private nutritionCalculator: NutritionCalculator;
	private currentWeek: moment.Moment;

	constructor(
		leaf: WorkspaceLeaf,
		dataStorage: DataStorage,
		nutritionCalculator: NutritionCalculator,
	) {
		super(leaf);
		this.dataStorage = dataStorage;
		this.nutritionCalculator = nutritionCalculator;
		this.currentWeek = moment().startOf("week");
	}

	getViewType() {
		return WEEKLY_TREND_VIEW_TYPE;
	}

	getDisplayText() {
		return "Weekly Trends";
	}

	getIcon() {
		return "trending-up";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("weekly-trend-view");

		await this.renderWeeklyView();
	}

	async renderWeeklyView() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// Header
		this.createWeeklyHeader(container);

		// Weekly overview
		await this.createWeeklyOverview(container);

		// Daily breakdown
		await this.createDailyBreakdown(container);

		// Trends and insights
		await this.createTrendsSection(container);
	}

	private createWeeklyHeader(container: HTMLElement) {
		const header = container.createDiv("weekly-header");

		const prevBtn = header.createEl("button", {
			text: "← Previous Week",
			cls: "nav-btn",
		});
		prevBtn.addEventListener("click", () => {
			this.currentWeek.subtract(1, "week");
			this.renderWeeklyView();
		});

		const weekRange = header.createDiv("week-range");
		const startDate = this.currentWeek.clone().startOf("week");
		const endDate = this.currentWeek.clone().endOf("week");
		weekRange.createEl("h3", {
			text: `${startDate.format("MMM D")} - ${endDate.format("MMM D, YYYY")}`,
		});

		const nextBtn = header.createEl("button", {
			text: "Next Week →",
			cls: "nav-btn",
		});
		nextBtn.addEventListener("click", () => {
			this.currentWeek.add(1, "week");
			this.renderWeeklyView();
		});

		const thisWeekBtn = header.createEl("button", {
			text: "This Week",
			cls: "mod-cta",
		});
		thisWeekBtn.addEventListener("click", () => {
			this.currentWeek = moment().startOf("week");
			this.renderWeeklyView();
		});
	}

	private async createWeeklyOverview(container: HTMLElement) {
		const overviewSection = container.createDiv("weekly-overview");
		overviewSection.createEl("h3", { text: "Week Overview" });

		try {
			const startDate = this.currentWeek
				.clone()
				.startOf("week")
				.format("YYYY-MM-DD");
			const endDate = this.currentWeek
				.clone()
				.endOf("week")
				.format("YYYY-MM-DD");

			const summaries =
				await this.dataStorage.getNutritionSummariesForRange(
					startDate,
					endDate,
				);
			const goals = this.nutritionCalculator.getNutritionGoals();
			const trends = this.nutritionCalculator.analyzeNutritionTrends(
				summaries,
				goals,
			);

			const overviewGrid = overviewSection.createDiv("overview-grid");

			// Average calories
			const avgCaloriesCard = overviewGrid.createDiv("overview-card");
			avgCaloriesCard.createEl("h4", { text: "Avg Daily Calories" });
			avgCaloriesCard.createEl("div", {
				text: trends.averages.calories.toString(),
				cls: "overview-value",
			});
			avgCaloriesCard.createEl("small", {
				text: `Goal: ${goals.calories}`,
				cls: "overview-target",
			});

			// Consistency score
			const consistencyCard = overviewGrid.createDiv("overview-card");
			consistencyCard.createEl("h4", { text: "Consistency Score" });
			consistencyCard.createEl("div", {
				text: `${trends.consistency.overallScore}%`,
				cls: "overview-value",
			});
			this.addScoreIndicator(
				consistencyCard,
				trends.consistency.overallScore,
			);

			// Days tracked
			const trackedDaysCard = overviewGrid.createDiv("overview-card");
			trackedDaysCard.createEl("h4", { text: "Days Tracked" });
			trackedDaysCard.createEl("div", {
				text: `${summaries.length}/7`,
				cls: "overview-value",
			});
			const trackedPercentage = Math.round((summaries.length / 7) * 100);
			trackedDaysCard.createEl("small", {
				text: `${trackedPercentage}% complete`,
				cls: "overview-subtitle",
			});

			// Goal achievement
			const goalsMet = trends.trends.reduce((acc, day) => {
				return (
					acc +
					Object.values(day.goalsMet).filter((met) => met).length
				);
			}, 0);
			const totalGoals = trends.trends.length * 4; // 4 main goals per day
			const goalsCard = overviewGrid.createDiv("overview-card");
			goalsCard.createEl("h4", { text: "Goals Met" });
			goalsCard.createEl("div", {
				text: `${goalsMet}/${totalGoals}`,
				cls: "overview-value",
			});
			if (totalGoals > 0) {
				const goalsPercentage = Math.round(
					(goalsMet / totalGoals) * 100,
				);
				goalsCard.createEl("small", {
					text: `${goalsPercentage}%`,
					cls: "overview-subtitle",
				});
			}
		} catch (error) {
			overviewSection.createEl("p", {
				text: "Error loading weekly overview",
				cls: "error-text",
			});
		}
	}

	private async createDailyBreakdown(container: HTMLElement) {
		const breakdownSection = container.createDiv("daily-breakdown");
		breakdownSection.createEl("h3", { text: "Daily Breakdown" });

		try {
			const startDate = this.currentWeek
				.clone()
				.startOf("week")
				.format("YYYY-MM-DD");
			const endDate = this.currentWeek
				.clone()
				.endOf("week")
				.format("YYYY-MM-DD");

			const summaries =
				await this.dataStorage.getNutritionSummariesForRange(
					startDate,
					endDate,
				);
			const goals = this.nutritionCalculator.getNutritionGoals();

			const dailyGrid = breakdownSection.createDiv("daily-grid");

			// Create a day for each day of the week
			const currentDay = this.currentWeek.clone().startOf("week");
			for (let i = 0; i < 7; i++) {
				const dayStr = currentDay.format("YYYY-MM-DD");
				const summary = summaries.find((s) => s.date === dayStr);

				this.createDayCard(
					dailyGrid,
					currentDay.clone(),
					summary,
					goals,
				);
				currentDay.add(1, "day");
			}
		} catch (error) {
			breakdownSection.createEl("p", {
				text: "Error loading daily breakdown",
				cls: "error-text",
			});
		}
	}

	private createDayCard(
		container: HTMLElement,
		date: moment.Moment,
		summary: any,
		goals: any,
	) {
		const dayCard = container.createDiv("day-card");

		if (!summary || summary.entryCount === 0) {
			dayCard.addClass("no-data");
		}

		if (date.isSame(moment(), "day")) {
			dayCard.addClass("today");
		}

		// Day header
		const dayHeader = dayCard.createDiv("day-header");
		dayHeader.createEl("h4", { text: date.format("ddd") });
		dayHeader.createEl("span", {
			text: date.format("M/D"),
			cls: "day-date",
		});

		if (summary && summary.entryCount > 0) {
			// Calories
			const caloriesDiv = dayCard.createDiv("day-metric");
			caloriesDiv.createEl("span", {
				text: "Calories",
				cls: "metric-label",
			});
			caloriesDiv.createEl("span", {
				text: summary.totalCalories.toString(),
				cls: "metric-value",
			});
			this.addGoalIndicator(
				caloriesDiv,
				summary.totalCalories,
				goals.calories,
			);

			// Protein
			const proteinDiv = dayCard.createDiv("day-metric");
			proteinDiv.createEl("span", {
				text: "Protein",
				cls: "metric-label",
			});
			proteinDiv.createEl("span", {
				text: `${summary.totalProtein.toFixed(1)}g`,
				cls: "metric-value",
			});
			this.addGoalIndicator(
				proteinDiv,
				summary.totalProtein,
				goals.protein,
			);

			// Entry count
			dayCard.createEl("small", {
				text: `${summary.entryCount} entries`,
				cls: "entry-count",
			});
		} else {
			dayCard.createEl("p", { text: "No data", cls: "no-data-text" });
		}
	}

	private async createTrendsSection(container: HTMLElement) {
		const trendsSection = container.createDiv("trends-section");
		trendsSection.createEl("h3", { text: "Insights & Trends" });

		try {
			const startDate = this.currentWeek
				.clone()
				.startOf("week")
				.format("YYYY-MM-DD");
			const endDate = this.currentWeek
				.clone()
				.endOf("week")
				.format("YYYY-MM-DD");

			const summaries =
				await this.dataStorage.getNutritionSummariesForRange(
					startDate,
					endDate,
				);
			const goals = this.nutritionCalculator.getNutritionGoals();
			const trends = this.nutritionCalculator.analyzeNutritionTrends(
				summaries,
				goals,
			);

			// Improvements section
			if (trends.improvements.length > 0) {
				const improvementsDiv = trendsSection.createDiv("improvements");
				improvementsDiv.createEl("h4", {
					text: "Suggested Improvements",
				});
			}

			// Consistency insights
			const consistencyDiv = trendsSection.createDiv(
				"consistency-insights",
			);
			consistencyDiv.createEl("h4", { text: "Consistency Analysis" });

			const proteinConsistency = trends.consistency.proteinConsistency;
			let consistencyText = "";
			if (proteinConsistency >= 80) {
				consistencyText = "✅ Excellent protein consistency this week!";
			} else if (proteinConsistency >= 60) {
				consistencyText =
					"⚠️ Good protein consistency, room for improvement";
			} else {
				consistencyText = "❌ Focus on more consistent protein intake";
			}

			consistencyDiv.createEl("p", { text: consistencyText });

			// Calorie variance insight
			const calorieVariance = trends.consistency.calorieVariance;
			if (calorieVariance > goals.calories * 0.2) {
				consistencyDiv.createEl("p", {
					text: `💡 Your daily calories vary by ${calorieVariance} on average. Try to maintain more consistent intake.`,
				});
			}
		} catch (error) {
			trendsSection.createEl("p", {
				text: "Error loading trends",
				cls: "error-text",
			});
		}
	}

	private addGoalIndicator(
		container: HTMLElement,
		current: number,
		target: number,
	) {
		const percentage = (current / target) * 100;
		const indicator = container.createDiv("goal-indicator");

		if (percentage >= 90 && percentage <= 110) {
			indicator.addClass("goal-met");
			indicator.textContent = "✓";
		} else if (percentage < 80) {
			indicator.addClass("goal-under");
			indicator.textContent = "↓";
		} else if (percentage > 120) {
			indicator.addClass("goal-over");
			indicator.textContent = "↑";
		} else {
			indicator.addClass("goal-close");
			indicator.textContent = "~";
		}
	}

	private addScoreIndicator(container: HTMLElement, score: number) {
		const indicator = container.createDiv("score-indicator");
		if (score >= 80) {
			indicator.addClass("score-excellent");
			indicator.textContent = "Excellent";
		} else if (score >= 60) {
			indicator.addClass("score-good");
			indicator.textContent = "Good";
		} else {
			indicator.addClass("score-needs-improvement");
			indicator.textContent = "Needs Work";
		}
	}

	async onClose() {
		// Cleanup if needed
	}
}
