import { Plugin, Notice, TFile, Modal, addIcon } from "obsidian";

// Services
import { FoodDatabase } from "./src/services/foodDatabase";
import { DataStorage, StorageSettings } from "./src/services/dataStorage";
import {
	NutritionCalculator,
	NutritionGoals,
} from "./src/services/nutritonCaluculator";

// Views
import {
	FoodTrackerView,
	FOOD_TRACKER_VIEW_TYPE,
} from "./src/views/foodTrackerView";
import { CalendarView, CALENDAR_VIEW_TYPE } from "./src/views/calendarView";
import {
	WeeklyTrendView,
	WEEKLY_TREND_VIEW_TYPE,
} from "./src/views/weeklyTrendView";

// Components/Modals
import { FoodEntryModal } from "./src/components/foodEntryModal";
import { CustomFoodModal } from "./src/components/customFoodModal";
import { DailyViewModal } from "./src/components/dailyViewModal";
import { QuickEntryModal } from "./src/components/quickEntryModal";
import { SettingsModal } from "./src/components/settingsModal";

// Models
import { FoodEntry } from "./src/model";

// Utils
import { DateUtils } from "./src/utils/dateUtils";
import { FormatUtils } from "./src/utils/formatUtils";

// Settings Interface
interface FoodTrackerSettings {
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

const DEFAULT_SETTINGS: FoodTrackerSettings = {
	nutritionGoals: {
		calories: 2000,
		protein: 150,
		carbs: 250,
		fat: 65,
		water: 3000,
		fiber: 25,
		sugar: 50,
		sodium: 2300,
	},
	storageSettings: {
		// Add this section
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
		theme: "auto",
	},
	quickActions: {
		enableQuickEntry: true,
		recentFoodsCount: 10,
		defaultMeal: "auto",
	},
	dataSync: {
		autoBackup: true,
		backupFrequency: "weekly",
		lastBackup: "",
	},
};

export default class FoodTrackerPlugin extends Plugin {
	settings: FoodTrackerSettings;

	// Core services
	foodDatabase: FoodDatabase;
	dataStorage: DataStorage;
	nutritionCalculator: NutritionCalculator;

	// Status tracking
	private isInitialized = false;
	private statusBarItem: HTMLElement;

	async onload() {
		console.log("Loading Food Tracker Plugin...");

		try {
			// Initialize settings
			await this.loadSettings();

			// Add custom icons
			this.addCustomIcons();

			// Initialize core services
			await this.initializeServices();

			// Register views
			this.registerViews();

			// Register commands
			this.registerCommands();

			// Add ribbon icons
			this.addRibbonIcons();

			// Add status bar
			this.addStatusBar();

			// Register event handlers
			this.registerEventHandlers();

			// Perform initial data setup
			await this.performInitialSetup();

			this.isInitialized = true;
			console.log("Food Tracker Plugin loaded successfully");

			// Show welcome message on first load
			if (!this.settings.dataSync.lastBackup) {
				new Notice(
					"Food Tracker Plugin loaded! Click the 🍽️ icon to get started.",
				);
			}
		} catch (error) {
			console.error("Error loading Food Tracker Plugin:", error);
			new Notice(
				"Error loading Food Tracker Plugin. Check console for details.",
			);
		}
	}

	async onunload() {
		console.log("Unloading Food Tracker Plugin...");

		// Save any pending data
		try {
			await this.saveSettings();
			console.log("Food Tracker Plugin unloaded successfully");
		} catch (error) {
			console.error("Error during plugin unload:", error);
		}
	}

	// Settings Management
	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

		// Migrate old settings if needed
		this.migrateSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private migrateSettings() {
		// Handle settings migration for plugin updates
		let migrated = false;

		// Example migration: add new settings that didn't exist in older versions
		if (!this.settings.quickActions) {
			this.settings.quickActions = DEFAULT_SETTINGS.quickActions;
			migrated = true;
		}

		if (migrated) {
			console.log("Settings migrated to new version");
			this.saveSettings();
		}
	}

	// Service Initialization
	private async initializeServices() {
		// Initialize nutrition calculator first
		this.nutritionCalculator = new NutritionCalculator();
		this.nutritionCalculator.setNutritionGoals(
			this.settings.nutritionGoals,
		);

		// Initialize data storage
		this.dataStorage = new DataStorage(this);
		await this.dataStorage.initialize();

		// Initialize food database
		this.foodDatabase = new FoodDatabase(this);
		await this.foodDatabase.initialize();

		console.log("All services initialized successfully");
	}

	// Custom Icons
	private addCustomIcons() {
		// Add food tracker icon
		addIcon(
			"food-tracker",
			`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12h18m-9-9v18"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M8 8l8 8m0-8l-8 8"/>
            </svg>
        `,
		);

		// Add utensils icon
		addIcon(
			"utensils-crossed",
			`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                <path d="M7 2v20"/>
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>
            </svg>
        `,
		);

		// Add calendar icon
		addIcon(
			"calendar-days",
			`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
        `,
		);
	}

	// View Registration
	private registerViews() {
		// Main tracker view
		this.registerView(
			FOOD_TRACKER_VIEW_TYPE,
			(leaf) =>
				new FoodTrackerView(
					leaf,
					this.foodDatabase,
					this.dataStorage,
					this.nutritionCalculator,
				),
		);

		// Calendar view
		this.registerView(
			CALENDAR_VIEW_TYPE,
			(leaf) =>
				new CalendarView(
					leaf,
					this.dataStorage,
					this.nutritionCalculator,
				),
		);

		// Weekly trends view
		this.registerView(
			WEEKLY_TREND_VIEW_TYPE,
			(leaf) =>
				new WeeklyTrendView(
					leaf,
					this.dataStorage,
					this.nutritionCalculator,
				),
		);
	}

	// Command Registration
	private registerCommands() {
		// Open main food tracker view
		this.addCommand({
			id: "open-food-tracker",
			name: "Open Food Tracker",
			icon: "utensils-crossed",
			callback: () => this.activateView(FOOD_TRACKER_VIEW_TYPE),
		});

		// Quick add food entry
		this.addCommand({
			id: "quick-add-food",
			name: "Quick Add Food",
			icon: "plus",
			callback: () => this.openQuickEntry(),
		});

		// Add food entry
		this.addCommand({
			id: "add-food-entry",
			name: "Add Food Entry",
			icon: "plus-circle",
			callback: () => this.openFoodEntry(),
		});

		// Open daily view
		this.addCommand({
			id: "open-daily-view",
			name: "Open Daily Food Summary",
			icon: "calendar-day",
			callback: () => this.openDailyView(),
		});

		// Open calendar view
		this.addCommand({
			id: "open-food-calendar",
			name: "Open Food Calendar",
			icon: "calendar-days",
			callback: () => this.activateView(CALENDAR_VIEW_TYPE),
		});

		// Open weekly trends
		this.addCommand({
			id: "open-weekly-trends",
			name: "Open Weekly Trends",
			icon: "trending-up",
			callback: () => this.activateView(WEEKLY_TREND_VIEW_TYPE),
		});

		// Add custom food
		this.addCommand({
			id: "add-custom-food",
			name: "Add Custom Food to Database",
			icon: "database",
			callback: () => this.openCustomFood(),
		});

		// Open settings
		this.addCommand({
			id: "open-settings",
			name: "Food Tracker Settings",
			icon: "settings",
			callback: () => this.openSettings(),
		});

		// Export data
		this.addCommand({
			id: "export-data",
			name: "Export Food Tracking Data",
			icon: "download",
			callback: () => this.exportData(),
		});

		// Import data
		this.addCommand({
			id: "import-data",
			name: "Import Food Tracking Data",
			icon: "upload",
			callback: () => this.importData(),
		});
	}

	// Ribbon Icons
	private addRibbonIcons() {
		// Main food tracker icon
		this.addRibbonIcon("utensils-crossed", "Food Tracker", (evt) => {
			this.activateView(FOOD_TRACKER_VIEW_TYPE);
		});

		// Quick add icon (only show if enabled in settings)
		if (this.settings.quickActions.enableQuickEntry) {
			this.addRibbonIcon("plus", "Quick Add Food", (evt) => {
				this.openQuickEntry();
			});
		}
	}

	// Status Bar
	private addStatusBar() {
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();

		// Update status bar every 5 minutes
		this.registerInterval(
			window.setInterval(
				() => {
					this.updateStatusBar();
				},
				5 * 60 * 1000,
			),
		);
	}

	private async updateStatusBar() {
		if (!this.isInitialized) return;

		try {
			const today = DateUtils.getCurrentDate();
			const entries = await this.dataStorage.getFoodEntriesForDate(today);
			const totalCalories =
				this.nutritionCalculator.calculateTotalCalories(entries);

			this.statusBarItem.setText(
				`🍽️ ${FormatUtils.formatCalories(totalCalories, false)}`,
			);
			this.statusBarItem.title = `Today's calories: ${FormatUtils.formatCalories(totalCalories)}`;
		} catch (error) {
			this.statusBarItem.setText("🍽️ --");
			console.error("Error updating status bar:", error);
		}
	}

	// Event Handlers
	private registerEventHandlers() {
		// Handle file changes (if using markdown storage)
		this.registerEvent(
			this.app.vault.on("modify", (file: TFile) => {
				// Check if it's a food tracking file and refresh views if needed
				if (
					file.path.startsWith(
						this.dataStorage?.getFolderPath() || "Food Tracker",
					)
				) {
					this.refreshViews();
				}
			}),
		);

		// Handle workspace layout changes
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				// Update views when layout changes
				this.refreshViews();
			}),
		);
	}

	// Initial Setup
	private async performInitialSetup() {
		// Check if this is the first run
		const stats = await this.dataStorage.getStorageStats();

		if (stats.totalEntries === 0) {
			// First time user - offer to show tutorial or examples
			console.log("First time Food Tracker user detected");
		}

		// Perform auto-backup if needed
		await this.performAutoBackup();
	}

	// Modal Operations
	private openFoodEntry() {
		new FoodEntryModal(
			this.app,
			this.foodDatabase,
			this.dataStorage,
			(entry: FoodEntry) => {
				this.refreshViews();
				this.updateStatusBar();
			},
		).open();
	}

	private openQuickEntry() {
		new QuickEntryModal(
			this.app,
			this.foodDatabase,
			this.dataStorage,
			(entry: FoodEntry) => {
				this.refreshViews();
				this.updateStatusBar();
			},
		).open();
	}

	private openCustomFood() {
		new CustomFoodModal(this.app, this.foodDatabase, () => {
			new Notice("Custom food added to database");
		}).open();
	}

	private openDailyView(date?: string) {
		new DailyViewModal(
			this.app,
			this.dataStorage,
			this.nutritionCalculator,
			date,
		).open();
	}

	private openSettings() {
		new SettingsModal(
			this.app,
			this.nutritionCalculator,
			this.dataStorage,
			this.settings,
			async (newSettings) => {
				this.settings = newSettings;
				await this.saveSettings();

				// Update services with new settings
				this.nutritionCalculator.setNutritionGoals(
					newSettings.nutritionGoals,
				);
				if (newSettings.storageSettings) {
					await this.dataStorage.updateSettings(
						newSettings.storageSettings,
					);
				}

				this.refreshViews();
				new Notice("Settings saved successfully");
			},
		).open();
	}

	// View Management
	async activateView(viewType: string) {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(viewType)[0];

		if (!leaf) {
			// Determine where to open the view based on type
			if (viewType === FOOD_TRACKER_VIEW_TYPE) {
				// Main view - open in main area or right sidebar
				leaf = workspace.getLeaf(false);
			} else {
				// Secondary views - prefer right sidebar
				leaf = workspace.getRightLeaf(false) || workspace.getLeaf();
			}

			await leaf.setViewState({ type: viewType, active: true });
		}

		workspace.revealLeaf(leaf);
	}

	private refreshViews() {
		// Refresh all open food tracker views
		const leaves = this.app.workspace.getLeavesOfType(
			FOOD_TRACKER_VIEW_TYPE,
		);
		leaves.forEach((leaf) => {
			if (leaf.view instanceof FoodTrackerView) {
				leaf.view.renderView();
			}
		});

		// Refresh calendar views
		const calendarLeaves =
			this.app.workspace.getLeavesOfType(CALENDAR_VIEW_TYPE);
		calendarLeaves.forEach((leaf) => {
			if (leaf.view instanceof CalendarView) {
				leaf.view.renderCalendar();
			}
		});

		// Refresh weekly trend views
		const trendLeaves = this.app.workspace.getLeavesOfType(
			WEEKLY_TREND_VIEW_TYPE,
		);
		trendLeaves.forEach((leaf) => {
			if (leaf.view instanceof WeeklyTrendView) {
				leaf.view.renderWeeklyView();
			}
		});
	}

	// Data Operations
	private async exportData() {
		try {
			const data = await this.dataStorage.exportData();

			// Create downloadable file
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `food-tracker-export-${DateUtils.getCurrentDate()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			new Notice("Data exported successfully");
		} catch (error) {
			new Notice("Error exporting data: " + error.message);
			console.error("Export error:", error);
		}
	}

	private async importData() {
		try {
			// Create file input
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json";

			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) return;

				try {
					const text = await file.text();
					const data = JSON.parse(text);

					// Validate import data structure
					if (!data.entries || !Array.isArray(data.entries)) {
						throw new Error("Invalid import file format");
					}

					const result = await this.dataStorage.importData(data);

					new Notice(
						`Import complete: ${result.imported} entries imported, ${result.skipped} skipped, ${result.errors} errors`,
					);
					this.refreshViews();
					this.updateStatusBar();
				} catch (error) {
					new Notice("Error importing data: " + error.message);
					console.error("Import error:", error);
				}
			};

			input.click();
		} catch (error) {
			new Notice("Error setting up import: " + error.message);
		}
	}

	private async performAutoBackup() {
		if (!this.settings.dataSync.autoBackup) return;

		const lastBackup = this.settings.dataSync.lastBackup;
		const now = DateUtils.getCurrentDate();

		let shouldBackup = false;

		if (!lastBackup) {
			shouldBackup = true;
		} else {
			const daysSinceBackup = DateUtils.getDaysDifference(
				now,
				lastBackup,
			);

			switch (this.settings.dataSync.backupFrequency) {
				case "daily":
					shouldBackup = daysSinceBackup >= 1;
					break;
				case "weekly":
					shouldBackup = daysSinceBackup >= 7;
					break;
				case "monthly":
					shouldBackup = daysSinceBackup >= 30;
					break;
			}
		}

		if (shouldBackup) {
			try {
				// Perform backup (simplified - in real implementation you might backup to cloud)
				console.log("Auto-backup completed");

				this.settings.dataSync.lastBackup = now;
				await this.saveSettings();
			} catch (error) {
				console.error("Auto-backup failed:", error);
			}
		}
	}

	private async addWaterEntry() {
		// Simple water tracking - could be expanded to full water tracking system
		try {
			const amount = await this.promptForWaterAmount();
			if (amount > 0) {
				// For now, just show a notice. Could be expanded to track water separately
				new Notice(`Added ${amount}ml of water`);

				// Could add water tracking to daily summary in the future
				this.refreshViews();
			}
		} catch (error) {
			console.error("Error adding water entry:", error);
		}
	}

	private async promptForWaterAmount(): Promise<number> {
		return new Promise((resolve) => {
			const modal = new (class extends Modal {
				amount = 250;

				onOpen() {
					const { contentEl } = this;
					contentEl.createEl("h3", { text: "Add Water Intake" });

					const input = contentEl.createEl("input", {
						type: "number",
						value: this.amount.toString(),
						placeholder: "Amount (ml)",
					});
					input.focus();

					const buttonDiv = contentEl.createDiv(
						"modal-button-container",
					);

					const cancelBtn = buttonDiv.createEl("button", {
						text: "Cancel",
					});
					cancelBtn.onclick = () => {
						this.close();
						resolve(0);
					};

					const addBtn = buttonDiv.createEl("button", {
						text: "Add",
						cls: "mod-cta",
					});
					addBtn.onclick = () => {
						const value = parseInt(input.value);
						this.close();
						resolve(isNaN(value) ? 0 : value);
					};

					input.addEventListener("keypress", (e) => {
						if (e.key === "Enter") {
							addBtn.click();
						}
					});
				}

				onClose() {
					this.contentEl.empty();
				}
			})(this.app);

			modal.open();
		});
	}

	// Public API for other plugins or advanced users
	public getAPI() {
		return {
			// Services
			foodDatabase: this.foodDatabase,
			dataStorage: this.dataStorage,
			nutritionCalculator: this.nutritionCalculator,

			// Operations
			addFoodEntry: this.openFoodEntry.bind(this),
			quickAddFood: this.openQuickEntry.bind(this),
			openDailyView: this.openDailyView.bind(this),

			// Data access
			getTodaysEntries: async () => {
				const today = DateUtils.getCurrentDate();
				return await this.dataStorage.getFoodEntriesForDate(today);
			},

			getDailySummary: async (date?: string) => {
				const targetDate = date || DateUtils.getCurrentDate();
				return await this.dataStorage.getDailyNutritionSummary(
					targetDate,
				);
			},
		};
	}
}
