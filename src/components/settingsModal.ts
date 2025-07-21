import { App, Modal, Setting, ButtonComponent, Notice } from "obsidian";
import {
	NutritionCalculator,
	NutritionGoals,
} from "../services/nutritonCaluculator";
import { DataStorage, StorageSettings } from "../services/DataStorage";

interface PluginSettings {
	nutritionGoals: NutritionGoals;
	storageSettings: StorageSettings;
	userProfile: {
		weight: number;
		height: number;
		age: number;
		gender: "male" | "female";
		activityLevel:
			| "sedentary"
			| "light"
			| "moderate"
			| "active"
			| "very_active";
	};
	displaySettings: {
		defaultView: "daily" | "weekly" | "monthly";
		showNutritionGoals: boolean;
		showMacroPercentages: boolean;
		theme: "auto" | "light" | "dark";
	};
	quickActions: {
		enableQuickEntry: boolean;
		recentFoodsCount: number;
		defaultMeal: "breakfast" | "lunch" | "dinner" | "snack" | "auto";
	};
	dataSync: {
		autoBackup: boolean;
		backupFrequency: "daily" | "weekly" | "monthly";
		lastBackup: string;
	};
}

export class SettingsModal extends Modal {
	private nutritionCalculator: NutritionCalculator;
	private dataStorage: DataStorage;
	private settings: PluginSettings;
	private onSave: (settings: PluginSettings) => void;

	constructor(
		app: App,
		nutritionCalculator: NutritionCalculator,
		dataStorage: DataStorage,
		currentSettings: PluginSettings,
		onSave: (settings: PluginSettings) => void,
	) {
		super(app);
		this.nutritionCalculator = nutritionCalculator;
		this.dataStorage = dataStorage;
		this.settings = {
			...currentSettings,
			storageSettings: currentSettings.storageSettings || {
				storageMethod: "both",
				folderPath: "Food Tracker",
				fileNamePattern: "YYYY-MM-DD",
				includeNutritionSummary: true,
				backupEnabled: true,
				maxBackups: 30,
			},
			quickActions: currentSettings.quickActions || {
				enableQuickEntry: true,
				recentFoodsCount: 10,
				defaultMeal: "auto",
			},
			dataSync: currentSettings.dataSync || {
				autoBackup: true,
				backupFrequency: "weekly",
				lastBackup: "",
			},
		};
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle("Food Tracker Settings");

		this.createUserProfileSection(contentEl);
		this.createNutritionGoalsSection(contentEl);
		this.createStorageSettingsSection(contentEl);
		this.createDisplaySettingsSection(contentEl);
		this.createActionButtons(contentEl);
	}

	private createUserProfileSection(containerEl: HTMLElement) {
		const profileSection = containerEl.createDiv("user-profile-section");
		profileSection.createEl("h3", { text: "User Profile" });

		// Weight
		new Setting(profileSection)
			.setName("Weight (kg)")
			.setDesc("Your current weight")
			.addText((text) =>
				text
					.setValue(this.settings.userProfile.weight.toString())
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num > 0) {
							this.settings.userProfile.weight = num;
							this.updateCalorieGoals();
						}
					}),
			);

		// Height
		new Setting(profileSection)
			.setName("Height (cm)")
			.setDesc("Your height")
			.addText((text) =>
				text
					.setValue(this.settings.userProfile.height.toString())
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num > 0) {
							this.settings.userProfile.height = num;
							this.updateCalorieGoals();
						}
					}),
			);

		// Age
		new Setting(profileSection)
			.setName("Age")
			.setDesc("Your age in years")
			.addText((text) =>
				text
					.setValue(this.settings.userProfile.age.toString())
					.onChange((value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.settings.userProfile.age = num;
							this.updateCalorieGoals();
						}
					}),
			);

		// Gender
		new Setting(profileSection)
			.setName("Gender")
			.setDesc("Biological sex for calorie calculations")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("male", "Male")
					.addOption("female", "Female")
					.setValue(this.settings.userProfile.gender)
					.onChange((value: "male" | "female") => {
						this.settings.userProfile.gender = value;
						this.updateCalorieGoals();
					}),
			);

		// Activity Level
		new Setting(profileSection)
			.setName("Activity Level")
			.setDesc("Your general activity level")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("sedentary", "Sedentary (little/no exercise)")
					.addOption("light", "Light (light exercise 1-3 days/week)")
					.addOption(
						"moderate",
						"Moderate (moderate exercise 3-5 days/week)",
					)
					.addOption("active", "Active (hard exercise 6-7 days/week)")
					.addOption(
						"very_active",
						"Very Active (very hard exercise, physical job)",
					)
					.setValue(this.settings.userProfile.activityLevel)
					.onChange((value: any) => {
						this.settings.userProfile.activityLevel = value;
						this.updateCalorieGoals();
					}),
			);

		// Auto-calculate button
		new Setting(profileSection).addButton((btn) =>
			btn
				.setButtonText("Auto-Calculate Goals")
				.setTooltip("Calculate nutrition goals based on your profile")
				.onClick(() => this.updateCalorieGoals()),
		);
	}

	private createNutritionGoalsSection(containerEl: HTMLElement) {
		const goalsSection = containerEl.createDiv("nutrition-goals-section");
		goalsSection.createEl("h3", { text: "Nutrition Goals" });

		// Calories
		new Setting(goalsSection)
			.setName("Daily Calories")
			.setDesc("Target daily caloric intake")
			.addText((text) =>
				text
					.setValue(this.settings.nutritionGoals.calories.toString())
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num > 0) {
							this.settings.nutritionGoals.calories = num;
						}
					}),
			);

		// Protein
		new Setting(goalsSection)
			.setName("Protein (g)")
			.setDesc("Target daily protein intake")
			.addText((text) =>
				text
					.setValue(this.settings.nutritionGoals.protein.toString())
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0) {
							this.settings.nutritionGoals.protein = num;
						}
					}),
			);

		// Carbohydrates
		new Setting(goalsSection)
			.setName("Carbohydrates (g)")
			.setDesc("Target daily carbohydrate intake")
			.addText((text) =>
				text
					.setValue(this.settings.nutritionGoals.carbs.toString())
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0) {
							this.settings.nutritionGoals.carbs = num;
						}
					}),
			);

		// Fat
		new Setting(goalsSection)
			.setName("Fat (g)")
			.setDesc("Target daily fat intake")
			.addText((text) =>
				text
					.setValue(this.settings.nutritionGoals.fat.toString())
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0) {
							this.settings.nutritionGoals.fat = num;
						}
					}),
			);

		// Fiber
		new Setting(goalsSection)
			.setName("Fiber (g)")
			.setDesc("Target daily fiber intake")
			.addText((text) =>
				text
					.setValue(
						(this.settings.nutritionGoals.fiber || 25).toString(),
					)
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0) {
							this.settings.nutritionGoals.fiber = num;
						}
					}),
			);

		// Sodium (limit)
		new Setting(goalsSection)
			.setName("Sodium Limit (mg)")
			.setDesc("Maximum daily sodium intake")
			.addText((text) =>
				text
					.setValue(
						(
							this.settings.nutritionGoals.sodium || 2300
						).toString(),
					)
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0) {
							this.settings.nutritionGoals.sodium = num;
						}
					}),
			);
		new Setting(goalsSection)
			.setName("Water (ml)")
			.setDesc("Target daily water intake")
			.addText((text) =>
				text
					.setValue(
						(this.settings.nutritionGoals.water || 2000).toString(),
					)
					.onChange((value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0) {
							this.settings.nutritionGoals.water = num;
						}
					}),
			);
	}

	private createStorageSettingsSection(containerEl: HTMLElement) {
		const storageSection = containerEl.createDiv(
			"storage-settings-section",
		);
		storageSection.createEl("h3", { text: "Storage Settings" });

		// Storage method
		new Setting(storageSection)
			.setName("Storage Method")
			.setDesc("How to store food tracking data")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("json", "JSON only (plugin data)")
					.addOption("markdown", "Markdown files only")
					.addOption("both", "Both JSON and Markdown")
					.setValue(this.settings.storageSettings.storageMethod)
					.onChange((value: "json" | "markdown" | "both") => {
						this.settings.storageSettings.storageMethod = value;
					}),
			);

		// Folder path
		new Setting(storageSection)
			.setName("Folder Path")
			.setDesc("Folder for storing food tracking files")
			.addText((text) =>
				text
					.setValue(this.settings.storageSettings.folderPath)
					.onChange((value) => {
						this.settings.storageSettings.folderPath = value;
					}),
			);

		// Backup settings
		new Setting(storageSection)
			.setName("Enable Backups")
			.setDesc("Automatically create backups of your data")
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.storageSettings.backupEnabled)
					.onChange((value) => {
						this.settings.storageSettings.backupEnabled = value;
					}),
			);

		// Max backups
		new Setting(storageSection)
			.setName("Max Backups")
			.setDesc("Maximum number of backup files to keep")
			.addText((text) =>
				text
					.setValue(
						this.settings.storageSettings.maxBackups.toString(),
					)
					.onChange((value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.settings.storageSettings.maxBackups = num;
						}
					}),
			);
	}

	private createDisplaySettingsSection(containerEl: HTMLElement) {
		const displaySection = containerEl.createDiv(
			"display-settings-section",
		);
		displaySection.createEl("h3", { text: "Display Settings" });

		// Default view
		new Setting(displaySection)
			.setName("Default View")
			.setDesc("Default time period to display")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("daily", "Daily")
					.addOption("weekly", "Weekly")
					.addOption("monthly", "Monthly")
					.setValue(this.settings.displaySettings.defaultView)
					.onChange((value: "daily" | "weekly" | "monthly") => {
						this.settings.displaySettings.defaultView = value;
					}),
			);

		// Show nutrition goals
		new Setting(displaySection)
			.setName("Show Nutrition Goals")
			.setDesc("Display goal progress bars")
			.addToggle((toggle) =>
				toggle
					.setValue(this.settings.displaySettings.showNutritionGoals)
					.onChange((value) => {
						this.settings.displaySettings.showNutritionGoals =
							value;
					}),
			);

		// Show macro percentages
		new Setting(displaySection)
			.setName("Show Macro Percentages")
			.setDesc("Display macronutrient breakdown percentages")
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.settings.displaySettings.showMacroPercentages,
					)
					.onChange((value) => {
						this.settings.displaySettings.showMacroPercentages =
							value;
					}),
			);
	}

	private createActionButtons(containerEl: HTMLElement) {
		const buttonContainer = containerEl.createDiv("modal-button-container");

		// Reset to defaults
		new ButtonComponent(buttonContainer)
			.setButtonText("Reset to Defaults")
			.onClick(() => this.resetToDefaults());

		// Cancel
		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => this.close());

		// Save
		new ButtonComponent(buttonContainer)
			.setButtonText("Save Settings")
			.setCta()
			.onClick(() => this.handleSave());
	}

	private updateCalorieGoals() {
		const profile = this.settings.userProfile;

		try {
			const bmr = this.nutritionCalculator.calculateBMR(
				profile.weight,
				profile.height,
				profile.age,
				profile.gender,
			);

			const tdee = this.nutritionCalculator.calculateTDEE(
				bmr,
				profile.activityLevel,
			);

			// Update calorie goal
			this.settings.nutritionGoals.calories = tdee;

			// Update protein goal (1.2-2.2g per kg body weight)
			this.settings.nutritionGoals.protein = Math.round(
				profile.weight * 1.6,
			);

			// Update carbs (45-65% of calories, using 50%)
			this.settings.nutritionGoals.carbs = Math.round((tdee * 0.5) / 4);

			// Update fat (20-35% of calories, using 25%)
			this.settings.nutritionGoals.fat = Math.round((tdee * 0.25) / 9);

			new Notice("Goals updated based on your profile");
		} catch (error) {
			new Notice("Error calculating goals: " + error.message);
		}
	}

	private resetToDefaults() {
		// Reset to default values
		this.settings = {
			nutritionGoals: {
				calories: 2000,
				protein: 150,
				carbs: 250,
				fat: 65,
				fiber: 25,
				sugar: 50,
				sodium: 2300,
				water: 2000,
			},
			storageSettings: {
				storageMethod: "both",
				folderPath: "Food Tracker",
				fileNamePattern: "YYYY-MM-DD",
				includeNutritionSummary: true,
				backupEnabled: true,
				maxBackups: 30,
			},
			userProfile: {
				weight: 70,
				height: 170,
				age: 30,
				gender: "male",
				activityLevel: "moderate",
			},
			displaySettings: {
				defaultView: "daily",
				showNutritionGoals: true,
				showMacroPercentages: true,
				theme: "dark",
			},
			quickActions: {
				enableQuickEntry: true,
				recentFoodsCount: 15,
				defaultMeal: "breakfast",
			},
			dataSync: {
				autoBackup: true,
				backupFrequency: "weekly",
				lastBackup: new Date().toISOString(),
			},
		};

		// Refresh the modal
		this.onClose();
		this.onOpen();
		new Notice("Settings reset to defaults");
	}

	private handleSave() {
		try {
			// Validate settings
			if (this.settings.nutritionGoals.calories <= 0) {
				new Notice("Please enter a valid calorie goal");
				return;
			}

			if (
				this.settings.userProfile.weight <= 0 ||
				this.settings.userProfile.height <= 0
			) {
				new Notice("Please enter valid weight and height");
				return;
			}

			// Save settings
			this.onSave(this.settings);
			new Notice("Settings saved successfully");
			this.close();
		} catch (error) {
			new Notice("Error saving settings: " + error.message);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
