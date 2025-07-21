import { Plugin, TFile, moment } from "obsidian";
import { FoodEntry } from "../model";

export interface DailyNutritionSummary {
	date: string;
	totalCalories: number;
	totalProtein: number;
	totalCarbs: number;
	totalFat: number;
	totalFiber: number;
	totalSugar: number;
	totalSodium: number;
	totalWater: number;
	entryCount: number;
	mealBreakdown: {
		breakfast: number;
		lunch: number;
		dinner: number;
		snack: number;
	};
}

export interface StorageSettings {
	storageMethod: "json" | "markdown" | "both";
	folderPath: string;
	fileNamePattern: string;
	includeNutritionSummary: boolean;
	backupEnabled: boolean;
	maxBackups: number;
}

export class DataStorage {
	private plugin: Plugin;
	private settings: StorageSettings;
	private cache: Map<string, FoodEntry[]> = new Map(); // Date -> Entries cache
	private summaryCache: Map<string, DailyNutritionSummary> = new Map();

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.settings = {
			storageMethod: "both",
			folderPath: "Food Tracker",
			fileNamePattern: "YYYY-MM-DD",
			includeNutritionSummary: true,
			backupEnabled: true,
			maxBackups: 30,
		};
	}

	async initialize(): Promise<void> {
		await this.loadSettings();
		await this.ensureFolderExists();
		await this.loadCacheFromFiles();
	}
	public getFolderPath(): string {
		return this.settings.folderPath;
	}

	/**
	 * Save a food entry
	 */
	async saveFoodEntry(entry: FoodEntry): Promise<void> {
		if (!entry.id) {
			entry.id = this.generateEntryId();
		}

		const dateKey = this.formatDate(entry.date);

		// Update cache
		if (!this.cache.has(dateKey)) {
			this.cache.set(dateKey, []);
		}

		const entries = this.cache.get(dateKey)!;
		const existingIndex = entries.findIndex((e) => e.id === entry.id);

		if (existingIndex >= 0) {
			entries[existingIndex] = entry;
		} else {
			entries.push(entry);
			entries.sort((a, b) => a.timestamp - b.timestamp);
		}

		// Invalidate summary cache
		this.summaryCache.delete(dateKey);

		// Persist to storage
		await this.persistDayData(dateKey);

		// Create backup if enabled
		if (this.settings.backupEnabled) {
			await this.createBackup(dateKey);
		}
	}

	/**
	 * Get food entries for a specific date
	 */
	async getFoodEntriesForDate(date: string): Promise<FoodEntry[]> {
		const dateKey = this.formatDate(date);

		try {
			if (this.cache.has(dateKey)) {
				const entries = this.cache.get(dateKey);
				return Array.isArray(entries) ? [...entries] : [];
			}

			await this.loadDayData(dateKey);
			const loadedEntries = this.cache.get(dateKey);
			return Array.isArray(loadedEntries) ? loadedEntries : [];
		} catch (error) {
			console.error(`Error loading entries for ${dateKey}:`, error);
			return []; // Always return empty array on error
		}
	}

	/**
	 * Get food entries for a date range
	 */
	async getFoodEntriesForRange(
		startDate: string,
		endDate: string,
	): Promise<FoodEntry[]> {
		const entries: FoodEntry[] = [];
		const start = moment(startDate);
		const end = moment(endDate);

		while (start.isSameOrBefore(end)) {
			const dateKey = start.format("YYYY-MM-DD");
			const dayEntries = await this.getFoodEntriesForDate(dateKey);
			entries.push(...dayEntries);
			start.add(1, "day");
		}

		return entries.sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Delete a food entry
	 */
	private parseDate(date?: string): string | null {
		if (!date) return null;
		return date;
	}
	async deleteFoodEntry(id: string, date?: string): Promise<boolean> {
		let targetDate = this.parseDate(date);

		// If no date provided, search through recent dates
		if (!targetDate) {
			targetDate = await this.findEntryDate(id);
			if (!targetDate) return false;
		}

		const dateKey = this.formatDate(targetDate);
		const entries = this.cache.get(dateKey);

		if (!entries) return false;

		const initialLength = entries.length;
		const updatedEntries = entries.filter((entry) => entry.id !== id);

		if (updatedEntries.length === initialLength) return false;

		this.cache.set(dateKey, updatedEntries);
		this.summaryCache.delete(dateKey);

		await this.persistDayData(dateKey);
		return true;
	}

	/**
	 * Update existing food entry
	 */
	async updateFoodEntry(updatedEntry: FoodEntry): Promise<boolean> {
		const dateKey = this.formatDate(updatedEntry.date);
		const entries = this.cache.get(dateKey);

		if (!entries) return false;

		const index = entries.findIndex((e) => e.id === updatedEntry.id);
		if (index === -1) return false;

		entries[index] = updatedEntry;
		this.summaryCache.delete(dateKey);

		await this.persistDayData(dateKey);
		return true;
	}

	/**
	 * Get daily nutrition summary
	 */
	async getDailyNutritionSummary(
		date: string,
	): Promise<DailyNutritionSummary> {
		const dateKey = this.formatDate(date);

		try {
			if (this.summaryCache.has(dateKey)) {
				return this.summaryCache.get(dateKey)!;
			}

			const entries = await this.getFoodEntriesForDate(dateKey);
			const summary = this.calculateDailySummary(dateKey, entries);

			this.summaryCache.set(dateKey, summary);
			return summary;
		} catch (error) {
			console.error(`Error loading summary for ${dateKey}:`, error);

			// Return safe empty summary on error
			return {
				date: dateKey,
				totalCalories: 0,
				totalProtein: 0,
				totalCarbs: 0,
				totalFat: 0,
				totalFiber: 0,
				totalSugar: 0,
				totalSodium: 0,
				totalWater: 0,
				entryCount: 0,
				mealBreakdown: {
					breakfast: 0,
					lunch: 0,
					dinner: 0,
					snack: 0,
				},
			};
		}
	}

	/**
	 * Get nutrition summaries for date range
	 */
	async getNutritionSummariesForRange(
		startDate: string,
		endDate: string,
	): Promise<DailyNutritionSummary[]> {
		const summaries: DailyNutritionSummary[] = [];
		const start = moment(startDate);
		const end = moment(endDate);

		while (start.isSameOrBefore(end)) {
			const dateKey = start.format("YYYY-MM-DD");
			const summary = await this.getDailyNutritionSummary(dateKey);
			summaries.push(summary);
			start.add(1, "day");
		}

		return summaries;
	}

	/**
	 * Export data for backup or transfer
	 */
	async exportData(
		startDate?: string,
		endDate?: string,
	): Promise<{
		entries: FoodEntry[];
		summaries: DailyNutritionSummary[];
		exportDate: string;
		version: string;
	}> {
		const start =
			startDate || moment().subtract(1, "year").format("YYYY-MM-DD");
		const end = endDate || moment().format("YYYY-MM-DD");

		const entries = await this.getFoodEntriesForRange(start, end);
		const summaries = await this.getNutritionSummariesForRange(start, end);

		return {
			entries,
			summaries,
			exportDate: moment().toLocaleString(),
			version: this.plugin.manifest.version,
		};
	}

	/**
	 * Import data from backup or transfer
	 */
	async importData(data: {
		entries: FoodEntry[];
		summaries?: DailyNutritionSummary[];
	}): Promise<{ imported: number; skipped: number; errors: number }> {
		let imported = 0;
		let skipped = 0;
		let errors = 0;

		for (const entry of data.entries) {
			try {
				const dateKey = this.formatDate(entry.date);
				const existingEntries =
					await this.getFoodEntriesForDate(dateKey);

				// Check if entry already exists
				if (existingEntries.some((e) => e.id === entry.id)) {
					skipped++;
					continue;
				}

				await this.saveFoodEntry(entry);
				imported++;
			} catch (error) {
				console.error("Error importing entry:", entry, error);
				errors++;
			}
		}

		return { imported, skipped, errors };
	}

	/**
	 * Clear all data (with confirmation)
	 */
	async clearAllData(): Promise<void> {
		this.cache.clear();
		this.summaryCache.clear();

		// Remove all data files
		const folder = this.plugin.app.vault.getAbstractFileByPath(
			this.settings.folderPath,
		);
		if (folder && folder instanceof TFile) {
			const files = this.plugin.app.vault
				.getMarkdownFiles()
				.filter((file) =>
					file.path.startsWith(this.settings.folderPath),
				);

			for (const file of files) {
				await this.plugin.app.vault.delete(file);
			}
		}

		// Clear plugin data
		const pluginData = (await this.plugin.loadData()) || {};
		delete pluginData.foodEntries;
		delete pluginData.nutritionSummaries;
		await this.plugin.saveData(pluginData);
	}

	/**
	 * Get storage statistics
	 */
	async getStorageStats(): Promise<{
		totalEntries: number;
		totalDays: number;
		oldestEntry: string | null;
		newestEntry: string | null;
		storageSize: number;
	}> {
		let totalEntries = 0;
		let oldestDate: string | null = null;
		let newestDate: string | null = null;

		for (const [date, entries] of this.cache) {
			totalEntries += entries.length;

			if (!oldestDate || date < oldestDate) {
				oldestDate = date;
			}
			if (!newestDate || date > newestDate) {
				newestDate = date;
			}
		}

		// Estimate storage size (rough calculation)
		const pluginData = (await this.plugin.loadData()) || {};
		const storageSize = JSON.stringify(pluginData).length;

		return {
			totalEntries,
			totalDays: this.cache.size,
			oldestEntry: oldestDate,
			newestEntry: newestDate,
			storageSize,
		};
	}

	/**
	 * Update storage settings
	 */
	async updateSettings(newSettings: Partial<StorageSettings>): Promise<void> {
		this.settings = { ...this.settings, ...newSettings };
		await this.saveSettings();
	}

	// Private Methods

	private async loadSettings(): Promise<void> {
		const data = await this.plugin.loadData();
		if (data?.storageSettings) {
			this.settings = { ...this.settings, ...data.storageSettings };
		}
	}

	private async saveSettings(): Promise<void> {
		const data = (await this.plugin.loadData()) || {};
		data.storageSettings = this.settings;
		await this.plugin.saveData(data);
	}

	private async ensureFolderExists(): Promise<void> {
		const folderExists = await this.plugin.app.vault.adapter.exists(
			this.settings.folderPath,
		);
		if (!folderExists) {
			await this.plugin.app.vault.createFolder(this.settings.folderPath);
		}
	}

	private async loadCacheFromFiles(): Promise<void> {
		try {
			const data = await this.plugin.loadData();
			if (data?.foodEntries) {
				// Load from JSON storage
				for (const [date, entries] of Object.entries(
					data.foodEntries,
				)) {
					this.cache.set(date, entries as FoodEntry[]);
				}
			}

			if (data?.nutritionSummaries) {
				for (const [date, summary] of Object.entries(
					data.nutritionSummaries,
				)) {
					this.summaryCache.set(
						date,
						summary as DailyNutritionSummary,
					);
				}
			}
		} catch (error) {
			console.error("Error loading cache from files:", error);
		}
	}

	private async loadDayData(dateKey: string): Promise<void> {
		try {
			// Try loading from markdown file first
			if (
				this.settings.storageMethod === "markdown" ||
				this.settings.storageMethod === "both"
			) {
				await this.loadFromMarkdownFile(dateKey);
			}

			// Load from JSON if not found or if using JSON method
			if (!this.cache.has(dateKey)) {
				await this.loadFromJsonData(dateKey);
			}
		} catch (error) {
			console.error(`Error loading day data for ${dateKey}:`, error);
			this.cache.set(dateKey, []);
		}
	}

	private async loadFromMarkdownFile(dateKey: string): Promise<void> {
		const fileName = `${dateKey}.md`;
		const filePath = `${this.settings.folderPath}/${fileName}`;

		try {
			const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				const content = await this.plugin.app.vault.read(file);
				const entries = this.parseMarkdownContent(content);
				this.cache.set(dateKey, entries);
			}
		} catch (error) {
			// File doesn't exist or couldn't be read
		}
	}

	private async loadFromJsonData(dateKey: string): Promise<void> {
		try {
			const data = await this.plugin.loadData();
			if (data?.foodEntries?.[dateKey]) {
				this.cache.set(dateKey, data.foodEntries[dateKey]);
			}
		} catch (error) {
			console.error("Error loading from JSON data:", error);
		}
	}

	private async persistDayData(dateKey: string): Promise<void> {
		const entries = this.cache.get(dateKey) || [];

		try {
			if (
				this.settings.storageMethod === "json" ||
				this.settings.storageMethod === "both"
			) {
				await this.saveToJsonData(dateKey, entries);
			}

			if (
				this.settings.storageMethod === "markdown" ||
				this.settings.storageMethod === "both"
			) {
				await this.saveToMarkdownFile(dateKey, entries);
			}
		} catch (error) {
			console.error(`Error persisting day data for ${dateKey}:`, error);
		}
	}

	private async saveToJsonData(
		dateKey: string,
		entries: FoodEntry[],
	): Promise<void> {
		const data = (await this.plugin.loadData()) || {};
		if (!data.foodEntries) data.foodEntries = {};

		data.foodEntries[dateKey] = entries;
		await this.plugin.saveData(data);
	}

	private async saveToMarkdownFile(
		dateKey: string,
		entries: FoodEntry[],
	): Promise<void> {
		const fileName = `${dateKey}.md`;
		const filePath = `${this.settings.folderPath}/${fileName}`;

		const content = this.generateMarkdownContent(dateKey, entries);

		try {
			const existingFile =
				this.plugin.app.vault.getAbstractFileByPath(filePath);
			if (existingFile instanceof TFile) {
				await this.plugin.app.vault.modify(existingFile, content);
			} else {
				await this.plugin.app.vault.create(filePath, content);
			}
		} catch (error) {
			console.error(`Error saving markdown file ${filePath}:`, error);
		}
	}

	private parseMarkdownContent(content: string): FoodEntry[] {
		const entries: FoodEntry[] = [];
		const lines = content.split("\n");

		let inDataSection = true;

		for (const line of lines) {
			const trimmed = line.trim();

			if (trimmed === "```") {
				inDataSection = false;
				continue;
			}

			if (inDataSection) {
				try {
					const data = JSON.parse(trimmed);
					if (Array.isArray(data)) {
						entries.push(...data);
					} else {
						entries.push(data);
					}
				} catch (error) {
					// Skip invalid JSON lines
				}
			}
		}

		return entries;
	}

	private generateMarkdownContent(
		dateKey: string,
		entries: FoodEntry[],
	): string {
		const summary = this.calculateDailySummary(dateKey, entries);

		let content = `# Food Intake - ${dateKey}\n\n`;

		if (this.settings.includeNutritionSummary) {
			content += `## Daily Summary\n\n`;
			content += `- **Total Calories:** ${summary.totalCalories.toFixed(0)}\n`;
			content += `- **Protein:** ${summary.totalProtein.toFixed(1)}g\n`;
			content += `- **Carbohydrates:** ${summary.totalCarbs.toFixed(1)}g\n`;
			content += `- **Fat:** ${summary.totalFat.toFixed(1)}g\n`;
			if (summary.totalFiber > 0)
				content += `- **Fiber:** ${summary.totalFiber.toFixed(1)}g\n`;
			content += `\n`;

			content += `### Meal Breakdown\n\n`;
			content += `- **Breakfast:** ${summary.mealBreakdown.breakfast} calories\n`;
			content += `- **Lunch:** ${summary.mealBreakdown.lunch} calories\n`;
			content += `- **Dinner:** ${summary.mealBreakdown.dinner} calories\n`;
			content += `- **Snacks:** ${summary.mealBreakdown.snack} calories\n\n`;
		}

		content += `## Food Entries\n\n`;

		// Group entries by meal
		const mealGroups = {
			breakfast: entries.filter((e) => e.meal === "breakfast"),
			lunch: entries.filter((e) => e.meal === "lunch"),
			dinner: entries.filter((e) => e.meal === "dinner"),
			snack: entries.filter((e) => e.meal === "snack"),
		};

		for (const [meal, mealEntries] of Object.entries(mealGroups)) {
			if (mealEntries.length === 0) continue;

			content += `### ${meal.charAt(0).toUpperCase() + meal.slice(1)}\n\n`;

			for (const entry of mealEntries) {
				const calories = (
					(entry.foodItem.nutrition.calories *
						entry.quantity *
						entry.foodItem.servingSize) /
					100
				).toFixed(0);
				content += `- **${entry.foodItem.name}** }\n`;
				content += `  - Quantity: ${entry.quantity} ${entry.foodItem.servingUnit}\n`;
				content += `  - Calories: ${calories}\n`;
				// if (entry.notes) content += `  - Notes: ${entry.notes}\n`;
				content += `\n`;
			}
		}

		// Add raw data as JSON for parsing
		content += `## Raw Data\n\n`;
		content += "```";
		content += JSON.stringify(entries, null, 2);
		content += "\n```\n";

		return content;
	}

	private calculateDailySummary(
		date: string,
		entries: FoodEntry[],
	): DailyNutritionSummary {
		const summary: DailyNutritionSummary = {
			date,
			totalCalories: 0,
			totalProtein: 0,
			totalCarbs: 0,
			totalFat: 0,
			totalFiber: 0,
			totalSugar: 0,
			totalSodium: 0,
			totalWater: 0,
			entryCount: entries.length,
			mealBreakdown: {
				breakfast: 0,
				lunch: 0,
				dinner: 0,
				snack: 0,
			},
		};

		for (const entry of entries) {
			const multiplier =
				(entry.quantity * entry.foodItem.servingSize) / 100;
			const nutrition = entry.foodItem.nutrition;

			const calories = nutrition.calories * multiplier;

			summary.totalCalories += calories;
			summary.totalProtein += nutrition.protein * multiplier;
			summary.totalCarbs += nutrition.carbs * multiplier;
			summary.totalFat += nutrition.fat * multiplier;
			summary.totalFiber += (nutrition.fiber || 0) * multiplier;
			summary.totalSugar += (nutrition.sugar || 0) * multiplier;
			summary.totalSodium += (nutrition.sodium || 0) * multiplier;
			summary.totalWater += (nutrition.water || 0) * multiplier;

			summary.mealBreakdown[entry.meal] += calories;
		}

		return summary;
	}

	private async findEntryDate(entryId: string): Promise<string | null> {
		// Search through recent dates to find the entry
		const recentDates = this.getRecentDates(30); // Search last 30 days

		for (const date of recentDates) {
			const entries = await this.getFoodEntriesForDate(date);
			if (entries.some((entry) => entry.id === entryId)) {
				return date;
			}
		}

		return null;
	}

	private getRecentDates(days: number): string[] {
		const dates: string[] = [];
		const today = moment();

		for (let i = 0; i < days; i++) {
			dates.push(today.clone().subtract(i, "days").format("YYYY-MM-DD"));
		}

		return dates;
	}

	private async createBackup(dateKey: string): Promise<void> {
		if (!this.settings.backupEnabled) return;

		try {
			const backupFolder = `${this.settings.folderPath}/backups`;
			const folderExists =
				await this.plugin.app.vault.adapter.exists(backupFolder);

			if (!folderExists) {
				await this.plugin.app.vault.createFolder(backupFolder);
			}

			const timestamp = moment().format("YYYY-MM-DD_HH-mm-ss");
			const backupFile = `${backupFolder}/${dateKey}_backup_${timestamp}.json`;

			const entries = this.cache.get(dateKey) || [];
			const summary =
				this.summaryCache.get(dateKey) ||
				(await this.getDailyNutritionSummary(dateKey));

			const backupData = {
				date: dateKey,
				entries,
				summary,
				backupTimestamp: timestamp,
				version: this.plugin.manifest.version,
			};

			await this.plugin.app.vault.create(
				backupFile,
				JSON.stringify(backupData, null, 2),
			);

			// Clean old backups
			await this.cleanOldBackups();
		} catch (error) {
			console.error(`Error creating backup for ${dateKey}:`, error);
		}
	}

	private async cleanOldBackups(): Promise<void> {
		try {
			const backupFolder = `${this.settings.folderPath}/backups`;
			const files = this.plugin.app.vault
				.getFiles()
				.filter(
					(file) =>
						file.path.startsWith(backupFolder) &&
						file.path.endsWith(".json"),
				)
				.sort((a, b) => b.stat.ctime - a.stat.ctime);

			// Keep only the specified number of backups
			const filesToDelete = files.slice(this.settings.maxBackups);

			for (const file of filesToDelete) {
				await this.plugin.app.vault.delete(file);
			}
		} catch (error) {
			console.error("Error cleaning old backups:", error);
		}
	}

	private formatDate(date: string): string {
		return moment(date).format("YYYY-MM-DD");
	}

	private generateEntryId(): string {
		return (
			"entry_" +
			Date.now() +
			"_" +
			Math.random().toString(36).substr(2, 9)
		);
	}
}
