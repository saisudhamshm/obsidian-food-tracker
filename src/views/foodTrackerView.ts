import { ItemView, WorkspaceLeaf } from "obsidian";
import { FoodDatabase } from "../services/FoodDatabase";
import { DataStorage } from "../services/DataStorage";
import { NutritionCalculator } from "../services/nutritonCaluculator";
import { FoodEntryModal } from "../components/FoodEntryModal";
import { DailyViewModal } from "../components/DailyViewModal";
import { QuickEntryModal } from "../components/QuickEntryModal";
export const FOOD_TRACKER_VIEW_TYPE = "food-tracker-view";

export class FoodTrackerView extends ItemView {
	private foodDatabase: FoodDatabase;
	private dataStorage: DataStorage;
	private nutritionCalculator: NutritionCalculator;
	private currentDate: string;

	constructor(
		leaf: WorkspaceLeaf,
		foodDatabase: FoodDatabase,
		dataStorage: DataStorage,
		nutritionCalculator: NutritionCalculator,
	) {
		super(leaf);
		this.foodDatabase = foodDatabase;
		this.dataStorage = dataStorage;
		this.nutritionCalculator = nutritionCalculator;
		this.currentDate = new Date()
			.toLocaleDateString("sv-SE", {
				timeZone: "Asia/Kolkata",
			})
			.split("T")[0];
	}

	getViewType() {
		return FOOD_TRACKER_VIEW_TYPE;
	}

	getDisplayText() {
		return "Food Tracker";
	}

	getIcon() {
		return "utensils-crossed";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("food-tracker-view");

		await this.renderView();

		// Auto-refresh every 5 minutes
		this.registerInterval(
			window.setInterval(
				() => {
					this.renderView();
				},
				5 * 60 * 1000,
			),
		);
	}

	async renderView() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// Header section
		this.createHeaderSection(container);

		// await this.ensureDummyEntry();

		// Quick stats section
		await this.createQuickStatsSection(container);

		// Today's entries section
		await this.createTodaysEntriesSection(container);

		// Quick actions section
		this.createQuickActionsSection(container);

		// Nutrition goals section
		await this.createNutritionGoalsSection(container);
	}

	private createHeaderSection(container: HTMLElement) {
		const header = container.createDiv("food-tracker-header");

		const titleSection = header.createDiv("title-section");
		titleSection.createEl("h2", { text: "Food Intake Tracker" });

		const dateSection = header.createDiv("date-section");
		const dateInput = dateSection.createEl("input", {
			type: "date",
			value: this.currentDate,
		});
		dateInput.addEventListener("change", (e) => {
			this.currentDate = (e.target as HTMLInputElement).value;
			this.renderView();
		});

		const todayBtn = dateSection.createEl("button", {
			text: "Today",
			cls: "mod-cta",
		});
		todayBtn.addEventListener("click", () => {
			this.currentDate = new Date()
				.toLocaleDateString("sv-SE", {
					timeZone: "Asia/Kolkata",
				})
				.split("T")[0];
			this.renderView();
		});
	}

	private async createQuickStatsSection(container: HTMLElement) {
		const statsSection = container.createDiv("quick-stats-section");
		statsSection.createEl("h3", { text: "Today's Summary" });

		try {
			const entries = await this.dataStorage.getFoodEntriesForDate(
				this.currentDate,
			);
			const summary = await this.dataStorage.getDailyNutritionSummary(
				this.currentDate,
			);

			const statsGrid = statsSection.createDiv("stats-grid");

			// Calories
			const caloriesStat = statsGrid.createDiv("stat-item");
			caloriesStat.createEl("div", {
				text: summary.totalCalories.toString(),
				cls: "stat-value",
			});
			caloriesStat.createEl("div", {
				text: "Calories",
				cls: "stat-label",
			});

			// Entries count
			const entriesStat = statsGrid.createDiv("stat-item");
			entriesStat.createEl("div", {
				text: entries.length.toString(),
				cls: "stat-value",
			});
			entriesStat.createEl("div", { text: "Entries", cls: "stat-label" });

			// Protein
			const proteinStat = statsGrid.createDiv("stat-item");
			proteinStat.createEl("div", {
				text: `${summary.totalProtein.toFixed(1)}g`,
				cls: "stat-value",
			});
			proteinStat.createEl("div", { text: "Protein", cls: "stat-label" });

			// Water
			const waterStat = statsGrid.createDiv("stat-item");
			waterStat.createEl("div", {
				text: `${summary.totalWater.toFixed(1)}ml`,
				cls: "stat-value",
			});
			waterStat.createEl("div", { text: "Water", cls: "stat-label" });
			// Fiber
			const fiberStat = statsGrid.createDiv("stat-item");
			fiberStat.createEl("div", {
				text: `${summary.totalFiber.toFixed(1)}g`,
				cls: "stat-value",
			});
			fiberStat.createEl("div", { text: "Fiber", cls: "stat-label" });
		} catch (error) {
			statsSection.createEl("p", {
				text: "Error loading stats: " + error.message,
				cls: "error-text",
			});
		}
	}

	private async createTodaysEntriesSection(container: HTMLElement) {
		const entriesSection = container.createDiv("todays-entries-section");

		const headerDiv = entriesSection.createDiv("section-header");
		headerDiv.createEl("h3", { text: `Entries for ${this.currentDate}` });

		const viewAllBtn = headerDiv.createEl("button", {
			text: "View All",
			cls: "clickable-icon",
		});
		viewAllBtn.addEventListener("click", () => {
			new DailyViewModal(
				this.app,
				this.dataStorage,
				this.nutritionCalculator,
				this.currentDate,
			).open();
		});

		try {
			const entries = await this.dataStorage.getFoodEntriesForDate(
				this.currentDate,
			);

			if (entries.length === 0) {
				entriesSection.createEl("p", {
					text: "No entries for this date. Add your first meal!",
					cls: "empty-state",
				});
				return;
			}

			// Show recent entries (limit to 5)
			const recentEntries = entries.slice(-5);
			const entriesList = entriesSection.createDiv("entries-list");

			recentEntries.forEach((entry) => {
				const entryItem = entriesList.createDiv("entry-item");

				const entryContent = entryItem.createDiv("entry-content");
				const entryMain = entryContent.createDiv("entry-main");

				// Food icon
				const entryIcon = entryMain.createDiv("entry-icon");
				entryIcon.textContent = this.getFoodIcon(
					entry.foodItem.category,
				);

				// Entry info
				const entryInfo = entryMain.createDiv("entry-info");

				// Food name
				entryInfo.createEl("h4", {
					text: entry.foodItem.name,
					cls: "food-name",
				});

				// Entry details container
				const entryDetails = entryInfo.createDiv("entry-details");

				// Meal tag with icon
				const mealTag = entryDetails.createDiv(
					`meal-tag meal-${entry.meal}`,
				);
				mealTag.textContent = entry.meal.toUpperCase();

				// Quantity
				entryDetails.createEl("span", {
					text: `${entry.quantity} ${entry.foodItem.servingUnit}`,
					cls: "entry-quantity",
				});

				// Entry stats (right side)
				const entryStats = entryContent.createDiv("entry-stats");

				// Calculate nutrition
				const multiplier =
					(entry.quantity * entry.foodItem.servingSize) / 100;
				const calories = Math.round(
					entry.foodItem.nutrition.calories * multiplier,
				);

				entryStats.createEl("div", {
					text: `${calories} cal`,
					cls: "calories-main",
				});

				// Time
				const timeStr = new Date(entry.timestamp).toLocaleTimeString(
					[],
					{
						hour: "2-digit",
						minute: "2-digit",
					},
				);
				entryStats.createEl("div", {
					text: timeStr,
					cls: "entry-time",
				});
			});

			if (entries.length > 5) {
				entriesSection.createEl("small", {
					text: `... and ${entries.length - 5} more entries`,
					cls: "more-entries",
				});
			}
		} catch (error) {
			entriesSection.createEl("p", {
				text: "Error loading entries",
				cls: "error-text",
			});
		}
	}

	private getFoodIcon(category: string): string {
		const icons: { [key: string]: string } = {
			Fruits: "🍎",
			Vegetables: "🥕",
			Grains: "🌾",
			Protein: "🥩",
			Dairy: "🥛",
			Fats: "🥑",
			Beverages: "🥤",
			Snacks: "🍿",
			Other: "🍽️",
		};
		return icons[category] || "🍽️";
	}

	private createQuickActionsSection(container: HTMLElement) {
		const actionsSection = container.createDiv("quick-actions-section");
		actionsSection.createEl("h3", { text: "Quick Actions" });

		const actionsGrid = actionsSection.createDiv("actions-grid");

		// Add Food Entry
		const addFoodBtn = actionsGrid.createEl("button", {
			text: "+ Add Food",
			cls: "action-btn primary",
		});
		addFoodBtn.addEventListener("click", () => {
			new FoodEntryModal(
				this.app,
				this.foodDatabase,
				this.dataStorage,
				() => this.renderView(),
				this.currentDate,
			).open();
		});

		// Quick Entry
		const quickEntryBtn = actionsGrid.createEl("button", {
			text: "⚡ Quick Add",
			cls: "action-btn secondary",
		});
		quickEntryBtn.addEventListener("click", () => {
			new QuickEntryModal(
				this.app,
				this.foodDatabase,
				this.dataStorage,
				() => this.renderView(),
			).open();
		});

		// View Daily Summary
		const dailySummaryBtn = actionsGrid.createEl("button", {
			text: "📊 Daily View",
			cls: "action-btn secondary",
		});
		dailySummaryBtn.addEventListener("click", () => {
			new DailyViewModal(
				this.app,
				this.dataStorage,
				this.nutritionCalculator,
				this.currentDate,
			).open();
		});
	}

	private async createNutritionGoalsSection(container: HTMLElement) {
		const goalsSection = container.createDiv("nutrition-goals-section");
		goalsSection.createEl("h3", { text: "Daily Goals Progress" });

		try {
			const summary = await this.dataStorage.getDailyNutritionSummary(
				this.currentDate,
			);
			const goals = this.nutritionCalculator.getNutritionGoals();
			const analysis = this.nutritionCalculator.calculateNutritionGoals(
				summary,
				goals,
			);

			const progressGrid = goalsSection.createDiv("progress-grid");

			// Calories progress
			this.createProgressBar(
				progressGrid,
				"Calories",
				analysis.progress.calories.current,
				analysis.progress.calories.target,
				analysis.progress.calories.percentage,
			);

			// Protein progress
			this.createProgressBar(
				progressGrid,
				"Protein",
				analysis.progress.protein.current,
				analysis.progress.protein.target,
				analysis.progress.protein.percentage,
				"g",
			);

			// Carbs progress
			this.createProgressBar(
				progressGrid,
				"Carbs",
				analysis.progress.carbs.current,
				analysis.progress.carbs.target,
				analysis.progress.carbs.percentage,
				"g",
			);

			// Fat progress
			this.createProgressBar(
				progressGrid,
				"Fat",
				analysis.progress.fat.current,
				analysis.progress.fat.target,
				analysis.progress.fat.percentage,
				"g",
			);
			//Water
			this.createProgressBar(
				progressGrid,
				"Water",
				analysis.progress.water.current,
				analysis.progress.water.target,
				analysis.progress.water.percentage,
				"ml",
			);

			// Show recommendations if any
			if (analysis.recommendations.length > 0) {
				const recommendationsDiv =
					goalsSection.createDiv("recommendations");
				recommendationsDiv.createEl("h4", { text: "Recommendations" });
				analysis.recommendations.slice(0, 2).forEach((rec) => {
					recommendationsDiv.createEl("p", {
						text: rec,
						cls: "recommendation-item",
					});
				});
			}
		} catch (error) {
			goalsSection.createEl("p", {
				text: "Error loading nutrition goals",
				cls: "error-text",
			});
		}
	}

	private createProgressBar(
		container: HTMLElement,
		label: string,
		current: number,
		target: number,
		percentage: number,
		unit = "cal",
	) {
		const progressItem = container.createDiv("progress-item");

		progressItem.createEl("div", { text: label, cls: "progress-label" });

		const progressBar = progressItem.createDiv("progress-bar");
		const progressFill = progressBar.createDiv("progress-fill");
		progressFill.style.width = `${Math.min(percentage, 100)}%`;

		if (percentage >= 100) {
			progressFill.addClass("complete");
		} else if (percentage >= 80) {
			progressFill.addClass("almost-complete");
		}

		const progressText = progressItem.createDiv("progress-text");
		progressText.createEl("span", { text: `${current}${unit}` });
		progressText.createEl("span", { text: ` / ${target}${unit}` });
		progressText.createEl("span", {
			text: ` (${percentage}%)`,
			cls: "progress-percentage",
		});
	}

	async onClose() {
		// Cleanup if needed
	}
}
