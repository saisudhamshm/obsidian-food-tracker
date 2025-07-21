import { App, Modal, Setting, Notice, ButtonComponent } from "obsidian";
import { FoodItem } from "../model";
import { FoodDatabase } from "../services/FoodDatabase";

export class CustomFoodModal extends Modal {
	private foodDatabase: FoodDatabase;
	private onSubmit: (food: FoodItem) => void;

	private foodData: Partial<FoodItem> = {
		name: "",
		category: "Other",
		servingSize: 100,
		servingUnit: "g",
		nutrition: {
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0,
			water: 0,
			fiber: 0,
			sugar: 0,
			sodium: 0,
		},
	};

	constructor(
		app: App,
		foodDatabase: FoodDatabase,
		onSubmit: (food: FoodItem) => void,
	) {
		super(app);
		this.foodDatabase = foodDatabase;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle("Add Custom Food");

		this.createBasicInfoSection(contentEl);
		this.createNutritionSection(contentEl);
		this.createActionButtons(contentEl);
	}

	private createBasicInfoSection(containerEl: HTMLElement) {
		const basicSection = containerEl.createDiv("basic-info-section");
		basicSection.createEl("h3", { text: "Basic Information" });

		// Food name
		new Setting(basicSection)
			.setName("Food Name *")
			.setDesc("Name of the food item")
			.addText((text) =>
				text
					.setPlaceholder("e.g., Grilled Chicken Breast")
					.onChange((value) => {
						this.foodData.name = value;
					}),
			);

		// Category
		new Setting(basicSection)
			.setName("Category")
			.setDesc("Food category")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("Fruits", "Fruits")
					.addOption("Vegetables", "Vegetables")
					.addOption("Grains", "Grains")
					.addOption("Protein", "Protein")
					.addOption("Dairy", "Dairy")
					.addOption("Fats", "Fats")
					.addOption("Beverages", "Beverages")
					.addOption("Snacks", "Snacks")
					.addOption("Other", "Other")
					.setValue("Other")
					.onChange((value) => {
						this.foodData.category = value;
					}),
			);

		// Serving size
		new Setting(basicSection)
			.setName("Serving Size")
			.setDesc("Standard serving size")
			.addText((text) =>
				text.setValue("100").onChange((value) => {
					const num = parseFloat(value);
					if (!isNaN(num) && num > 0) {
						this.foodData.servingSize = num;
					}
				}),
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("g", "grams")
					.addOption("ml", "milliliters")
					.addOption("cup", "cup")
					.addOption("piece", "piece")
					.addOption("slice", "slice")
					.addOption("oz", "ounce")
					.setValue("g")
					.onChange((value) => {
						this.foodData.servingUnit = value;
					}),
			);
	}

	private createNutritionSection(containerEl: HTMLElement) {
		const nutritionSection = containerEl.createDiv(
			"nutrition-info-section",
		);
		nutritionSection.createEl("h3", { text: "Nutrition Information" });
		nutritionSection.createEl("p", {
			text: "Enter nutrition values per serving size",
			cls: "setting-item-description",
		});

		// Calories
		new Setting(nutritionSection).setName("Calories *").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				if (!isNaN(num) && num >= 0) {
					this.foodData.nutrition!.calories = num;
				}
			}),
		);

		// Protein
		new Setting(nutritionSection).setName("Protein (g) *").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				if (!isNaN(num) && num >= 0) {
					this.foodData.nutrition!.protein = num;
				}
			}),
		);

		// Carbohydrates
		new Setting(nutritionSection)
			.setName("Carbohydrates (g) *")
			.addText((text) =>
				text.setPlaceholder("0").onChange((value) => {
					const num = parseFloat(value);
					if (!isNaN(num) && num >= 0) {
						this.foodData.nutrition!.carbs = num;
					}
				}),
			);

		// Fat
		new Setting(nutritionSection).setName("Fat (g) *").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				if (!isNaN(num) && num >= 0) {
					this.foodData.nutrition!.fat = num;
				}
			}),
		);

		// Optional nutrients
		const optionalSection =
			nutritionSection.createDiv("optional-nutrients");
		optionalSection.createEl("h4", { text: "Optional Nutrients" });

		// Fiber
		new Setting(optionalSection).setName("Fiber (g)").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				this.foodData.nutrition!.fiber =
					!isNaN(num) && num >= 0 ? num : undefined;
			}),
		);

		// Sugar
		new Setting(optionalSection).setName("Sugar (g)").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				this.foodData.nutrition!.sugar =
					!isNaN(num) && num >= 0 ? num : undefined;
			}),
		);

		// Sodium
		new Setting(optionalSection).setName("Sodium (mg)").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				this.foodData.nutrition!.sodium =
					!isNaN(num) && num >= 0 ? num : undefined;
			}),
		);
		// Water
		new Setting(optionalSection).setName("Water (ml)").addText((text) =>
			text.setPlaceholder("0").onChange((value) => {
				const num = parseFloat(value);
				this.foodData.nutrition!.water =
					!isNaN(num) && num >= 0 ? num : undefined;
			}),
		);
	}

	private createActionButtons(containerEl: HTMLElement) {
		const buttonContainer = containerEl.createDiv("modal-button-container");

		// Cancel button
		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		// Save button
		new ButtonComponent(buttonContainer)
			.setButtonText("Save Food")
			.setCta()
			.onClick(() => this.handleSubmit());
	}

	private async handleSubmit() {
		// Validate required fields
		if (!this.foodData.name?.trim()) {
			new Notice("Please enter a food name");
			return;
		}

		if (
			!this.foodData.nutrition?.calories ||
			this.foodData.nutrition.calories < 0
		) {
			new Notice("Please enter valid calorie information");
			return;
		}

		if (
			!this.foodData.nutrition?.protein ||
			this.foodData.nutrition.protein < 0
		) {
			new Notice("Please enter valid protein information");
			return;
		}

		try {
			const customFood: FoodItem = {
				id: "",
				name: this.foodData.name.trim(),
				category: this.foodData.category || "Other",
				servingSize: this.foodData.servingSize || 100,
				servingUnit: this.foodData.servingUnit || "g",
				nutrition: {
					calories: this.foodData.nutrition.calories,
					protein: this.foodData.nutrition.protein,
					carbs: this.foodData.nutrition.carbs || 0,
					fat: this.foodData.nutrition.fat || 0,
					fiber: this.foodData.nutrition.fiber,
					sugar: this.foodData.nutrition.sugar,
					sodium: this.foodData.nutrition.sodium,
					water: this.foodData.nutrition.water,
				},
			};

			await this.foodDatabase.addCustomFood(customFood);
			this.onSubmit(customFood);
			new Notice(`Added ${customFood.name} to database`);
			this.close();
		} catch (error) {
			new Notice("Error saving custom food: " + error.message);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
