import { FoodItem } from "../model";
import { Plugin } from "obsidian";

export class FoodDatabase {
	private plugin: Plugin;
	private foods: Map<string, FoodItem> = new Map();
	private categories: Set<string> = new Set();
	private initialized = false;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		await this.loadLocalDatabase();
		await this.loadCustomFoods();
		this.initialized = true;
	}

	/**
	 * Search foods by name, brand, or category
	 */
	async searchFoods(query: string, limit = 20): Promise<FoodItem[]> {
		if (!this.initialized) await this.initialize();

		const searchTerms = query.toLowerCase().split(" ");
		const results: { item: FoodItem; score: number }[] = [];

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [id, food] of this.foods) {
			const score = this.calculateRelevanceScore(food, searchTerms);
			if (score > 0) {
				results.push({ item: food, score });
			}
		}

		return results
			.sort((a, b) => b.score - a.score)
			.slice(0, limit)
			.map((result) => result.item);
	}

	/**
	 * Calculate relevance score for search results
	 */
	private calculateRelevanceScore(
		food: FoodItem,
		searchTerms: string[],
	): number {
		let score = 0;
		const foodName = food.name.toLowerCase();
		const foodCategory = food.category.toLowerCase();

		searchTerms.forEach((term) => {
			// Exact name match gets highest score
			if (foodName === term) score += 100;
			// Name starts with term
			else if (foodName.startsWith(term)) score += 50;
			// Name contains term
			else if (foodName.includes(term)) score += 25;

			// Category matches
			if (foodCategory.includes(term)) score += 10;
		});

		return score;
	}

	/**
	 * Get food item by ID
	 */
	async getFoodById(id: string): Promise<FoodItem | null> {
		if (!this.initialized) await this.initialize();
		return this.foods.get(id) || null;
	}

	/**
	 * Add custom food item
	 */
	async addCustomFood(foodItem: FoodItem): Promise<void> {
		if (!foodItem.id) {
			foodItem.id = this.generateFoodId();
		}

		this.foods.set(foodItem.id, foodItem);
		this.categories.add(foodItem.category);

		await this.saveCustomFoods();
	}

	/**
	 * Update existing food item
	 */
	async updateFood(foodItem: FoodItem): Promise<void> {
		this.foods.set(foodItem.id, foodItem);
		await this.saveCustomFoods();
	}

	/**
	 * Delete custom food item
	 */
	async deleteFood(id: string): Promise<boolean> {
		const food = this.foods.get(id);
		if (!food) {
			return false;
		}

		this.foods.delete(id);
		await this.saveCustomFoods();
		return true;
	}

	/**
	 * Get foods by category
	 */
	async getFoodsByCategory(category: string): Promise<FoodItem[]> {
		if (!this.initialized) await this.initialize();

		return Array.from(this.foods.values()).filter(
			(food) => food.category.toLowerCase() === category.toLowerCase(),
		);
	}

	/**
	 * Get all available categories
	 */
	getCategories(): string[] {
		return Array.from(this.categories).sort();
	}

	/**
	 * Get recent foods (most commonly used)
	 */
	async getRecentFoods(limit = 10): Promise<FoodItem[]> {
		// This would integrate with DataStorage to get usage frequency
		// For now, return a subset of foods
		return Array.from(this.foods.values()).slice(0, limit);
	}

	/**
	 * Import external food database
	 */
	async importFoodDatabase(data: any[]): Promise<number> {
		let importedCount = 0;

		for (const item of data) {
			try {
				const foodItem = this.parseImportedFood(item);
				if (foodItem && !this.foods.has(foodItem.id)) {
					this.foods.set(foodItem.id, foodItem);
					this.categories.add(foodItem.category);
					importedCount++;
				}
			} catch (error) {
				console.warn("Failed to import food item:", item, error);
			}
		}

		await this.saveCustomFoods();
		return importedCount;
	}

	/**
	 * Export custom foods
	 */
	async exportCustomFoods(): Promise<FoodItem[]> {
		return Array.from(this.foods.values());
	}

	/**
	 * Load local food database
	 */
	private async loadLocalDatabase(): Promise<void> {
		try {
			const adapter = this.plugin.app.vault.adapter;
			const dbPath = `${this.plugin.manifest.dir}/data/food-database.json`;

			if (await adapter.exists(dbPath)) {
				const data = await adapter.read(dbPath);
				const foods: FoodItem[] = JSON.parse(data);

				foods.forEach((food) => {
					this.foods.set(food.id, food);
					this.categories.add(food.category);
				});
			}
		} catch (error) {
			console.error("Failed to load local food database:", error);
		}
	}

	/**
	 * Load custom foods from plugin data
	 */
	private async loadCustomFoods(): Promise<void> {
		try {
			const data = await this.plugin.loadData();
			if (data?.customFoods) {
				data.customFoods.forEach((food: FoodItem) => {
					this.foods.set(food.id, food);
					this.categories.add(food.category);
				});
			}
		} catch (error) {
			console.error("Failed to load custom foods:", error);
		}
	}

	/**
	 * Save custom foods to plugin data
	 */
	private async saveCustomFoods(): Promise<void> {
		try {
			const data = (await this.plugin.loadData()) || {};
			data.customFoods = Array.from(this.foods.values());

			await this.plugin.saveData(data);
		} catch (error) {
			console.error("Failed to save custom foods:", error);
		}
	}

	/**
	 * Generate unique food ID
	 */
	private generateFoodId(): string {
		return (
			"custom_" +
			Date.now() +
			"_" +
			Math.random().toString(36).substr(2, 9)
		);
	}

	/**
	 * Parse imported food data
	 */
	private parseImportedFood(item: any): FoodItem | null {
		try {
			return {
				id: item.id || this.generateFoodId(),
				name: item.name || item.description,
				category: item.category || "Other",
				servingSize: parseFloat(item.servingSize) || 100,
				servingUnit: item.servingUnit || "g",
				nutrition: {
					calories: parseFloat(item.calories) || 0,
					protein: parseFloat(item.protein) || 0,
					carbs: parseFloat(item.carbs || item.carbohydrates) || 0,
					fat: parseFloat(item.fat || item.totalFat) || 0,
					fiber: parseFloat(item.fiber) || undefined,
					sugar: parseFloat(item.sugar || item.sugars) || undefined,
					sodium: parseFloat(item.sodium) || undefined,
					water: parseFloat(item.water) || undefined,
				},
			};
		} catch (error) {
			console.error("Error parsing food item:", error);
			return null;
		}
	}

	/**
	 * Search external barcode API (placeholder)
	 */
	private async searchBarcodeAPI(barcode: string): Promise<FoodItem | null> {
		// Integrate with external APIs like OpenFoodFacts, Edamam, etc.
		// This is a placeholder for external API integration
		try {
			// Example API call structure:
			// const response = await fetch(`https://api.openfoodfacts.org/api/v0/product/${barcode}.json`);
			// const data = await response.json();
			// return this.parseApiResponse(data);

			console.log("Barcode API search not implemented:", barcode);
			return null;
		} catch (error) {
			console.error("Barcode API search failed:", error);
			return null;
		}
	}
}
