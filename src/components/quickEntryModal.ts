import { App, Modal, Setting, Notice } from "obsidian";
import { FoodItem, FoodEntry } from "../model";
import { FoodDatabase } from "../services/FoodDatabase";
import { DataStorage } from "../services/DataStorage";

export class QuickEntryModal extends Modal {
	private foodDatabase: FoodDatabase;
	private dataStorage: DataStorage;
	private recentFoods: FoodItem[] = [];
	private onSubmit: (entry: FoodEntry) => void;

	constructor(
		app: App,
		foodDatabase: FoodDatabase,
		dataStorage: DataStorage,
		onSubmit: (entry: FoodEntry) => void,
	) {
		super(app);
		this.foodDatabase = foodDatabase;
		this.dataStorage = dataStorage;
		this.onSubmit = onSubmit;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle("Quick Add Food");

		await this.loadRecentFoods();
		this.createQuickSearchSection(contentEl);
		this.createRecentFoodsSection(contentEl);
	}

	private async loadRecentFoods() {
		try {
			this.recentFoods = await this.foodDatabase.getRecentFoods(8);
		} catch (error) {
			console.error("Error loading recent foods:", error);
		}
	}

	private createQuickSearchSection(containerEl: HTMLElement) {
		const searchSection = containerEl.createDiv("quick-search-section");

		new Setting(searchSection)
			.setName("Quick Search")
			.setDesc("Type food name for instant results")
			.addText((text) =>
				text
					.setPlaceholder("Type food name...")
					.onChange(async (value) => {
						if (value.length > 2) {
							const results = await this.foodDatabase.searchFoods(
								value,
								5,
							);
							this.displayQuickResults(results);
						}
					}),
			);

		// Quick results container
		const resultsDiv = searchSection.createDiv("quick-results");
		resultsDiv.setAttribute("id", "quick-search-results");
	}

	private displayQuickResults(results: FoodItem[]) {
		const container = this.contentEl.querySelector(
			"#quick-search-results",
		) as HTMLElement;
		container.empty();

		results.forEach((food) => {
			const foodBtn = container.createEl("button", {
				text: `${food.name} (${food.nutrition.calories} cal)`,
				cls: "quick-food-btn",
			});

			foodBtn.addEventListener("click", () => {
				this.quickAddFood(food);
			});
		});
	}

	private createRecentFoodsSection(containerEl: HTMLElement) {
		if (this.recentFoods.length === 0) return;

		const recentSection = containerEl.createDiv("recent-foods-section");
		recentSection.createEl("h3", { text: "Recent Foods" });

		const foodGrid = recentSection.createDiv("recent-foods-grid");

		this.recentFoods.forEach((food) => {
			const foodCard = foodGrid.createDiv("recent-food-card");

			foodCard.createEl("strong", { text: food.name });
			foodCard.createEl("div", {
				text: `${food.nutrition.calories} cal per ${food.servingSize}${food.servingUnit}`,
				cls: "food-calories",
			});

			const addBtn = foodCard.createEl("button", {
				text: "Add",
				cls: "quick-add-btn",
			});

			addBtn.addEventListener("click", () => {
				this.quickAddFood(food);
			});
		});
	}

	private async quickAddFood(food: FoodItem) {
		// Default to 1 serving for quick entry
		const entry: FoodEntry = {
			id: "",
			date: new Date()
				.toLocaleDateString("sv-SE", {
					timeZone: "Asia/Kolkata",
				})
				.split("T")[0],
			timestamp: Date.now(),
			foodItem: food,
			quantity: 1,
			meal: this.getCurrentMeal(),
			// notes: undefined,
		};

		try {
			await this.dataStorage.saveFoodEntry(entry);
			this.onSubmit(entry);
			new Notice(`Added ${food.name} to ${entry.meal}`);
			this.close();
		} catch (error) {
			new Notice("Error adding food: " + error.message);
		}
	}

	private getCurrentMeal(): "breakfast" | "lunch" | "dinner" | "snack" {
		const hour = new Date().getHours();

		if (hour >= 6 && hour < 11) return "breakfast";
		if (hour >= 11 && hour < 16) return "lunch";
		if (hour >= 16 && hour < 21) return "dinner";
		return "snack";
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
