import { App, Modal, Setting, Notice, ButtonComponent } from "obsidian";
import { FoodItem, FoodEntry } from "../model";
import { FoodDatabase } from "../services/FoodDatabase";
import { DataStorage } from "../services/DataStorage";
import { CustomFoodModal } from "../components/customFoodModal";

export class FoodEntryModal extends Modal {
	private foodDatabase: FoodDatabase;
	private dataStorage: DataStorage;
	private selectedFood: FoodItem | null = null;
	private quantity = 1;
	private meal: "breakfast" | "lunch" | "dinner" | "snack" = "breakfast";
	// private notes = "";
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

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle("Add Food Entry");

		// Food Search Section
		this.createFoodSearchSection(contentEl);

		// Entry Details Section
		this.createEntryDetailsSection(contentEl);

		// Action Buttons
		this.createActionButtons(contentEl);
	}

	private createFoodSearchSection(containerEl: HTMLElement) {
		const searchSection = containerEl.createDiv("food-search-section");
		searchSection.createEl("h3", { text: "Select Food" });

		// Search input
		new Setting(searchSection)
			.setName("Search Food")
			.setDesc("Type to search for foods in the database")
			.addText((text) => {
				text.setPlaceholder("Enter food name...").onChange(
					async (value) => {
						if (value.length > 2) {
							await this.performSearch(value);
						}
					},
				);
			});

		// Search results container
		this.createSearchResultsContainer(searchSection);

		// Quick add custom food button
		new Setting(searchSection).addButton((btn) =>
			btn.setButtonText("Add Custom Food").onClick(() => {
				this.close();
				new CustomFoodModal(this.app, this.foodDatabase, (food) => {
					new FoodEntryModal(
						this.app,
						this.foodDatabase,
						this.dataStorage,
						this.onSubmit,
					).open();
				}).open();
			}),
		);
	}

	private createSearchResultsContainer(containerEl: HTMLElement) {
		const resultsContainer = containerEl.createDiv("search-results");
		resultsContainer.setAttribute("id", "food-search-results");
	}

	private async performSearch(query: string) {
		try {
			const results = await this.foodDatabase.searchFoods(query, 10);
			this.displaySearchResults(results);
		} catch (error) {
			new Notice("Error searching foods: " + error.message);
		}
	}

	private displaySearchResults(results: FoodItem[]) {
		const resultsContainer = this.contentEl.querySelector(
			"#food-search-results",
		) as HTMLElement;
		resultsContainer.empty();

		if (results.length === 0) {
			resultsContainer.createEl("p", { text: "No foods found" });
			return;
		}

		results.forEach((food) => {
			const resultItem = resultsContainer.createDiv("search-result-item");
			resultItem.addClass("clickable-item");

			const foodInfo = resultItem.createDiv("food-info");
			foodInfo.createEl("strong", { text: food.name });

			foodInfo.createEl("br");
			foodInfo.createEl("small", {
				text: `${food.nutrition.calories} cal per ${food.servingSize}${food.servingUnit} - ${food.category}`,
			});

			resultItem.addEventListener("click", () => {
				this.selectFood(food);
			});
		});
	}

	private selectFood(food: FoodItem) {
		this.selectedFood = food;

		// Highlight selected item
		const items = this.contentEl.querySelectorAll(".search-result-item");
		items.forEach((item) => item.removeClass("selected"));

		const selectedItem = Array.from(items).find(
			(item) => item.querySelector("strong")?.textContent === food.name,
		);
		selectedItem?.addClass("selected");

		// Update nutrition preview
		this.updateNutritionPreview();
	}

	private createEntryDetailsSection(containerEl: HTMLElement) {
		const detailsSection = containerEl.createDiv("entry-details-section");
		detailsSection.createEl("h3", { text: "Entry Details" });

		// Quantity input
		new Setting(detailsSection)
			.setName("Quantity")
			.setDesc("Number of servings")
			.addText((text) =>
				text.setValue(this.quantity.toString()).onChange((value) => {
					const num = parseFloat(value);
					if (!isNaN(num) && num > 0) {
						this.quantity = num;
						this.updateNutritionPreview();
					}
				}),
			);

		// Meal selection
		new Setting(detailsSection)
			.setName("Meal")
			.setDesc("Which meal is this for?")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("breakfast", "Breakfast")
					.addOption("lunch", "Lunch")
					.addOption("dinner", "Dinner")
					.addOption("snack", "Snack")
					.setValue(this.meal)
					.onChange(
						(value: "breakfast" | "lunch" | "dinner" | "snack") => {
							this.meal = value;
						},
					),
			);

		// Notes
		// new Setting(detailsSection)
		// 	.setName("Notes")
		// 	.setDesc("Optional notes about this entry")
		// 	.addTextArea((text) =>
		// 		text.setPlaceholder("Add any notes...").onChange((value) => {
		// 			this.notes = value;
		// 		}),
		// 	);

		// Nutrition preview
		this.createNutritionPreview(detailsSection);
	}

	private createNutritionPreview(containerEl: HTMLElement) {
		const previewContainer = containerEl.createDiv("nutrition-preview");
		previewContainer.setAttribute("id", "nutrition-preview");
		previewContainer.createEl("h4", { text: "Nutrition Preview" });
	}

	private updateNutritionPreview() {
		const previewContainer = this.contentEl.querySelector(
			"#nutrition-preview",
		) as HTMLElement;

		if (!this.selectedFood) {
			previewContainer.innerHTML =
				"<h4>Nutrition Preview</h4><p>Select a food to see nutrition info</p>";
			return;
		}

		const multiplier =
			(this.quantity * this.selectedFood.servingSize) / 100;
		const nutrition = this.selectedFood.nutrition;

		previewContainer.innerHTML = `
            <h4>Nutrition Preview</h4>
            <div class="nutrition-grid">
                <div class="nutrition-item">
                    <strong>Calories:</strong> ${Math.round(nutrition.calories * multiplier)}
                </div>
                <div class="nutrition-item">
                    <strong>Protein:</strong> ${(nutrition.protein * multiplier).toFixed(1)}g
                </div>
                <div class="nutrition-item">
                    <strong>Carbs:</strong> ${(nutrition.carbs * multiplier).toFixed(1)}g
                </div>
                <div class="nutrition-item">
                    <strong>Fat:</strong> ${(nutrition.fat * multiplier).toFixed(1)}g
                </div>
            </div>
        `;
	}

	private createActionButtons(containerEl: HTMLElement) {
		const buttonContainer = containerEl.createDiv("modal-button-container");

		// Cancel button
		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		// Submit button
		new ButtonComponent(buttonContainer)
			.setButtonText("Add Entry")
			.setCta()
			.onClick(() => this.handleSubmit());
	}

	private async handleSubmit() {
		if (!this.selectedFood) {
			new Notice("Please select a food item");
			return;
		}

		if (this.quantity <= 0) {
			new Notice("Please enter a valid quantity");
			return;
		}

		try {
			const entry: FoodEntry = {
				id: "",
				date: new Date().toISOString().split("T")[0],
				timestamp: Date.now(),
				foodItem: this.selectedFood,
				quantity: this.quantity,
				meal: this.meal,
				// 		notes: this.notes || undefined,
			};

			await this.dataStorage.saveFoodEntry(entry);
			this.onSubmit(entry);
			new Notice(`Added ${this.selectedFood.name} to ${this.meal}`);
			this.close();
		} catch (error) {
			new Notice("Error saving food entry: " + error.message);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
