import { App, Modal, Setting, ButtonComponent } from "obsidian";
import { FoodEntry } from "../model";
import { DataStorage } from "../services/DataStorage";
import {
	NutritionCalculator,
	NutritionAnalysis,
} from "../services/nutritonCaluculator";

export class DailyViewModal extends Modal {
	private dataStorage: DataStorage;
	private nutritionCalculator: NutritionCalculator;
	private selectedDate: string;
	private entries: FoodEntry[] = [];
	private analysis: NutritionAnalysis | null = null;

	constructor(
		app: App,
		dataStorage: DataStorage,
		nutritionCalculator: NutritionCalculator,
		date?: string,
	) {
		super(app);
		this.dataStorage = dataStorage;
		this.nutritionCalculator = nutritionCalculator;
		this.selectedDate =
			date ||
			new Date()
				.toLocaleDateString("sv-SE", {
					timeZone: "Asia/Kolkata",
				})
				.split("T")[0];
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle("Daily Nutrition Summary");

		await this.loadDayData();
		this.createDateSelector(contentEl);
		this.createSummarySection(contentEl);
		this.createMealBreakdownSection(contentEl);
		this.createEntriesListSection(contentEl);
		this.createActionButtons(contentEl);
	}

	private async loadDayData() {
		try {
			this.entries = await this.dataStorage.getFoodEntriesForDate(
				this.selectedDate,
			);
			const summary = await this.dataStorage.getDailyNutritionSummary(
				this.selectedDate,
			);
			const goals = this.nutritionCalculator.getNutritionGoals();
			this.analysis = this.nutritionCalculator.calculateNutritionGoals(
				summary,
				goals,
			);
		} catch (error) {
			console.error("Error loading day data:", error);
		}
	}

	private createDateSelector(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Date")
			.setDesc("Select date to view")
			.addText((text) =>
				text.setValue(this.selectedDate).onChange(async (value) => {
					this.selectedDate = value;
					await this.loadDayData();
					this.refreshContent();
				}),
			);
	}

	private createSummarySection(containerEl: HTMLElement) {
		const summarySection = containerEl.createDiv("daily-summary-section");
		summarySection.createEl("h3", { text: "Nutrition Summary" });

		if (!this.analysis) {
			summarySection.createEl("p", {
				text: "No data available for this date",
			});
			return;
		}

		const progress = this.analysis.progress;

		// Create nutrition overview grid
		const nutritionGrid = summarySection.createDiv(
			"nutrition-overview-grid",
		);

		// Calories
		this.createProgressItem(
			nutritionGrid,
			"Calories",
			progress.calories.current,
			progress.calories.target,
			progress.calories.percentage,
		);

		// Protein
		this.createProgressItem(
			nutritionGrid,
			"Protein",
			progress.protein.current,
			progress.protein.target,
			progress.protein.percentage,
			"g",
		);

		// Carbs
		this.createProgressItem(
			nutritionGrid,
			"Carbs",
			progress.carbs.current,
			progress.carbs.target,
			progress.carbs.percentage,
			"g",
		);

		// Fat
		this.createProgressItem(
			nutritionGrid,
			"Fat",
			progress.fat.current,
			progress.fat.target,
			progress.fat.percentage,
			"g",
		);

		// Macro breakdown pie chart representation
		this.createMacroBreakdown(summarySection);
	}

	private createProgressItem(
		container: HTMLElement,
		label: string,
		current: number,
		target: number,
		percentage: number,
		unit = "cal",
	) {
		const item = container.createDiv("progress-item");

		item.createEl("h4", { text: label });
		item.createEl("div", {
			text: `${current}${unit} / ${target}${unit}`,
			cls: "progress-values",
		});

		const progressBar = item.createDiv("progress-bar");
		const progressFill = progressBar.createDiv("progress-fill");
		progressFill.style.width = `${Math.min(percentage, 100)}%`;

		if (percentage >= 100) {
			progressFill.addClass("complete");
		} else if (percentage >= 80) {
			progressFill.addClass("almost-complete");
		}

		item.createEl("span", {
			text: `${percentage}%`,
			cls: "progress-percentage",
		});
	}

	private createMacroBreakdown(container: HTMLElement) {
		if (!this.analysis) return;

		const macroSection = container.createDiv("macro-breakdown-section");
		macroSection.createEl("h4", { text: "Macronutrient Breakdown" });

		const macroBreakdown = this.analysis.macroBreakdown;

		const macroGrid = macroSection.createDiv("macro-grid");

		// Protein
		const proteinDiv = macroGrid.createDiv("macro-item");
		proteinDiv.createEl("span", {
			text: "Protein",
			cls: "macro-label protein",
		});
		proteinDiv.createEl("span", {
			text: `${macroBreakdown.protein.percentage}%`,
		});
		proteinDiv.createEl("small", {
			text: `${macroBreakdown.protein.grams}g`,
		});

		// Carbs
		const carbsDiv = macroGrid.createDiv("macro-item");
		carbsDiv.createEl("span", { text: "Carbs", cls: "macro-label carbs" });
		carbsDiv.createEl("span", {
			text: `${macroBreakdown.carbs.percentage}%`,
		});
		carbsDiv.createEl("small", { text: `${macroBreakdown.carbs.grams}g` });

		// Fat
		const fatDiv = macroGrid.createDiv("macro-item");
		fatDiv.createEl("span", { text: "Fat", cls: "macro-label fat" });
		fatDiv.createEl("span", { text: `${macroBreakdown.fat.percentage}%` });
		fatDiv.createEl("small", { text: `${macroBreakdown.fat.grams}g` });
	}

	private createMealBreakdownSection(containerEl: HTMLElement) {
		if (!this.analysis) return;

		const mealSection = containerEl.createDiv("meal-breakdown-section");
		mealSection.createEl("h3", { text: "Meals" });

		const mealBreakdown = this.analysis.summary.mealBreakdown;
		const totalCalories = this.analysis.summary.totalCalories;

		const meals = [
			{
				name: "Breakfast",
				calories: mealBreakdown.breakfast,
				key: "breakfast",
			},
			{ name: "Lunch", calories: mealBreakdown.lunch, key: "lunch" },
			{ name: "Dinner", calories: mealBreakdown.dinner, key: "dinner" },
			{ name: "Snacks", calories: mealBreakdown.snack, key: "snack" },
		];

		meals.forEach((meal) => {
			const mealDiv = mealSection.createDiv("meal-item");
			mealDiv.createEl("span", { text: meal.name, cls: "meal-name" });
			mealDiv.createEl("span", {
				text: `${meal.calories} cal`,
				cls: "meal-calories",
			});

			if (totalCalories > 0) {
				const percentage = Math.round(
					(meal.calories / totalCalories) * 100,
				);
				mealDiv.createEl("span", {
					text: `${percentage}%`,
					cls: "meal-percentage",
				});
			}
		});
	}

	private createEntriesListSection(containerEl: HTMLElement) {
		const entriesSection = containerEl.createDiv("entries-list-section");
		entriesSection.createEl("h3", { text: "Food Entries" });

		if (this.entries.length === 0) {
			entriesSection.createEl("p", {
				text: "No food entries for this date",
			});
			return;
		}

		// Group entries by meal
		const mealGroups = {
			breakfast: this.entries.filter((e) => e.meal === "breakfast"),
			lunch: this.entries.filter((e) => e.meal === "lunch"),
			dinner: this.entries.filter((e) => e.meal === "dinner"),
			snack: this.entries.filter((e) => e.meal === "snack"),
		};

		Object.entries(mealGroups).forEach(([mealType, mealEntries]) => {
			if (mealEntries.length === 0) return;

			const mealGroup = entriesSection.createDiv("meal-group");
			mealGroup.createEl("h4", {
				text: mealType.charAt(0).toUpperCase() + mealType.slice(1),
			});

			mealEntries.forEach((entry) => {
				const entryDiv = mealGroup.createDiv("entry-item");

				const entryInfo = entryDiv.createDiv("entry-info");
				entryInfo.createEl("strong", { text: entry.foodItem.name });

				const entryDetails = entryDiv.createDiv("entry-details");
				entryDetails.createEl("span", {
					text: `${entry.quantity} ${entry.foodItem.servingUnit}`,
				});

				const multiplier =
					(entry.quantity * entry.foodItem.servingSize) / 100;
				const calories = Math.round(
					entry.foodItem.nutrition.calories * multiplier,
				);
				entryDetails.createEl("span", { text: `${calories} cal` });

				// if (entry.notes) {
				// 	entryDiv.createEl("small", {
				// 		text: entry.notes,
				// 		cls: "entry-notes",
				// 	});
				// }

				// Delete button
				const deleteBtn = entryDiv.createEl("button", {
					text: "×",
					cls: "entry-delete-btn",
				});
				deleteBtn.addEventListener("click", () =>
					this.deleteEntry(entry.id),
				);
			});
		});
	}

	private async deleteEntry(entryId: string) {
		try {
			await this.dataStorage.deleteFoodEntry(entryId, this.selectedDate);
			await this.loadDayData();
			this.refreshContent();
		} catch (error) {
			console.error("Error deleting entry:", error);
		}
	}

	private createActionButtons(containerEl: HTMLElement) {
		const buttonContainer = containerEl.createDiv("modal-button-container");

		// Export day button
		new ButtonComponent(buttonContainer)
			.setButtonText("Export Day")
			.onClick(() => this.exportDayData());

		// Close button
		new ButtonComponent(buttonContainer)
			.setButtonText("Close")
			.setCta()
			.onClick(() => this.close());
	}

	private async exportDayData() {
		try {
			const data = await this.dataStorage.exportData(
				this.selectedDate,
				this.selectedDate,
			);

			// Create downloadable JSON
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `food-tracker-${this.selectedDate}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error exporting data:", error);
		}
	}

	private async refreshContent() {
		const { contentEl } = this;
		contentEl.empty();

		await this.loadDayData();
		this.createDateSelector(contentEl);
		this.createSummarySection(contentEl);
		this.createMealBreakdownSection(contentEl);
		this.createEntriesListSection(contentEl);
		this.createActionButtons(contentEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
