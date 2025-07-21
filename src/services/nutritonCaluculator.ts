import { FoodEntry } from "../model";
import { DailyNutritionSummary } from "./DataStorage";

export interface NutritionGoals {
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber?: number;
	sugar?: number;
	sodium?: number;
	water?: number; // in ml
}

export interface MacroBreakdown {
	protein: {
		grams: number;
		calories: number;
		percentage: number;
	};
	carbs: {
		grams: number;
		calories: number;
		percentage: number;
	};
	fat: {
		grams: number;
		calories: number;
		percentage: number;
	};
}

export interface NutritionAnalysis {
	summary: DailyNutritionSummary;
	goals: NutritionGoals;
	progress: {
		calories: {
			current: number;
			target: number;
			percentage: number;
			remaining: number;
		};
		protein: {
			current: number;
			target: number;
			percentage: number;
			remaining: number;
		};
		carbs: {
			current: number;
			target: number;
			percentage: number;
			remaining: number;
		};
		fat: {
			current: number;
			target: number;
			percentage: number;
			remaining: number;
		};
		fiber: {
			current: number;
			target: number;
			percentage: number;
			remaining: number;
		};
		sugar: {
			current: number;
			target: number;
			percentage: number;
			status: "under" | "over" | "met";
		};
		sodium: {
			current: number;
			target: number;
			percentage: number;
			status: "under" | "over" | "met";
		};
		water: {
			current: number;
			target: number;
			percentage: number;
			remaining: number;
		};
	};
	macroBreakdown: MacroBreakdown;
	recommendations: string[];
	warnings: string[];
}

export interface WeeklyNutritionTrend {
	date: string;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber: number;
	goalsMet: {
		calories: boolean;
		protein: boolean;
		carbs: boolean;
		fat: boolean;
	};
}

export interface NutrientDeficiency {
	nutrient: string;
	current: number;
	recommended: number;
	deficit: number;
	severity: "mild" | "moderate" | "severe";
	suggestions: string[];
}

export class NutritionCalculator {
	private defaultGoals: NutritionGoals = {
		calories: 2000,
		protein: 150,
		carbs: 250,
		fat: 65,
		fiber: 25,
		sugar: 50,
		sodium: 2300,
		water: 2000,
	};

	/**
	 * Calculate total calories for food entries
	 */
	calculateTotalCalories(entries: FoodEntry[]): number {
		if (!entries || entries.length === 0) {
			return 0;
		}
		return entries.reduce((total, entry) => {
			const multiplier = this.getServingMultiplier(entry);
			return total + entry.foodItem.nutrition.calories * multiplier;
		}, 0);
	}

	/**
	 * Calculate macronutrient breakdown
	 */
	calculateMacroBreakdown(entries: FoodEntry[]): MacroBreakdown {
		if (!entries || entries.length === 0) {
			return {
				protein: { grams: 0, calories: 0, percentage: 0 },
				carbs: { grams: 0, calories: 0, percentage: 0 },
				fat: { grams: 0, calories: 0, percentage: 0 },
			};
		}
		let totalProtein = 0;
		let totalCarbs = 0;
		let totalFat = 0;

		entries.forEach((entry) => {
			const multiplier = this.getServingMultiplier(entry);
			totalProtein += entry.foodItem.nutrition.protein * multiplier;
			totalCarbs += entry.foodItem.nutrition.carbs * multiplier;
			totalFat += entry.foodItem.nutrition.fat * multiplier;
		});

		const proteinCalories = totalProtein * 4; // 4 calories per gram of protein
		const carbCalories = totalCarbs * 4; // 4 calories per gram of carbs
		const fatCalories = totalFat * 9; // 9 calories per gram of fat
		const totalCalories = proteinCalories + carbCalories + fatCalories;

		return {
			protein: {
				grams: Math.round(totalProtein * 10) / 10,
				calories: Math.round(proteinCalories),
				percentage:
					totalCalories > 0
						? Math.round((proteinCalories / totalCalories) * 100)
						: 0,
			},
			carbs: {
				grams: Math.round(totalCarbs * 10) / 10,
				calories: Math.round(carbCalories),
				percentage:
					totalCalories > 0
						? Math.round((carbCalories / totalCalories) * 100)
						: 0,
			},
			fat: {
				grams: Math.round(totalFat * 10) / 10,
				calories: Math.round(fatCalories),
				percentage:
					totalCalories > 0
						? Math.round((fatCalories / totalCalories) * 100)
						: 0,
			},
		};
	}

	/**
	 * Calculate comprehensive daily nutrition summary
	 */
	calculateDailyNutritionSummary(
		date: string,
		entries: FoodEntry[],
	): DailyNutritionSummary {
		if (!entries || entries.length === 0) {
			return {
				date,
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
		const mealBreakdown = {
			breakfast: 0,
			lunch: 0,
			dinner: 0,
			snack: 0,
		};

		let totalCalories = 0;
		let totalProtein = 0;
		let totalCarbs = 0;
		let totalFat = 0;
		let totalFiber = 0;
		let totalSugar = 0;
		let totalSodium = 0;
		let totalWater = 0;

		entries.forEach((entry) => {
			const multiplier = this.getServingMultiplier(entry);
			const nutrition = entry.foodItem.nutrition;

			const entryCalories = nutrition.calories * multiplier;

			totalCalories += entryCalories;
			totalProtein += nutrition.protein * multiplier;
			totalCarbs += nutrition.carbs * multiplier;
			totalFat += nutrition.fat * multiplier;
			totalFiber += (nutrition.fiber || 0) * multiplier;
			totalSugar += (nutrition.sugar || 0) * multiplier;
			totalSodium += (nutrition.sodium || 0) * multiplier;
			totalWater += (nutrition.water || 0) * multiplier;

			mealBreakdown[entry.meal] += entryCalories;
		});

		return {
			date,
			totalCalories: Math.round(totalCalories),
			totalProtein: Math.round(totalProtein * 10) / 10,
			totalCarbs: Math.round(totalCarbs * 10) / 10,
			totalFat: Math.round(totalFat * 10) / 10,
			totalFiber: Math.round(totalFiber * 10) / 10,
			totalSugar: Math.round(totalSugar * 10) / 10,
			totalSodium: Math.round(totalSodium * 10) / 10,
			totalWater: Math.round(totalWater * 10) / 10,
			entryCount: entries.length,
			mealBreakdown: {
				breakfast: Math.round(mealBreakdown.breakfast),
				lunch: Math.round(mealBreakdown.lunch),
				dinner: Math.round(mealBreakdown.dinner),
				snack: Math.round(mealBreakdown.snack),
			},
		};
	}

	/**
	 * Calculate nutrition goals progress
	 */
	calculateNutritionGoals(
		summary: DailyNutritionSummary,
		goals: NutritionGoals,
	): NutritionAnalysis {
		const macroBreakdown = this.calculateMacroBreakdownFromSummary(summary);

		const progress = {
			calories: this.calculateProgress(
				summary.totalCalories,
				goals.calories,
			),
			protein: this.calculateProgress(
				summary.totalProtein,
				goals.protein,
			),
			carbs: this.calculateProgress(summary.totalCarbs, goals.carbs),
			fat: this.calculateProgress(summary.totalFat, goals.fat),
			fiber: this.calculateProgress(
				summary.totalFiber,
				goals.fiber || 25,
			),
			sugar: this.calculateLimitProgress(
				summary.totalSugar,
				goals.sugar || 50,
			),
			sodium: this.calculateLimitProgress(
				summary.totalSodium,
				goals.sodium || 2300,
			),
			water: this.calculateProgress(
				summary.totalWater,
				goals.water || 2000,
			),
		};

		const recommendations = this.generateRecommendations(
			progress,
			macroBreakdown,
		);
		const warnings = this.generateWarnings(progress);

		return {
			summary,
			goals,
			progress,
			macroBreakdown,
			recommendations,
			warnings,
		};
	}

	/**
	 * Analyze nutrition trends over multiple days
	 */
	analyzeNutritionTrends(
		summaries: DailyNutritionSummary[],
		goals: NutritionGoals,
	): {
		trends: WeeklyNutritionTrend[];
		averages: {
			calories: number;
			protein: number;
			carbs: number;
			fat: number;
			fiber: number;
		};
		consistency: {
			calorieVariance: number;
			proteinConsistency: number;
			overallScore: number;
		};
		improvements: string[];
	} {
		const trends: WeeklyNutritionTrend[] = summaries.map((summary) => ({
			date: summary.date,
			calories: summary.totalCalories,
			protein: summary.totalProtein,
			carbs: summary.totalCarbs,
			fat: summary.totalFat,
			fiber: summary.totalFiber,
			goalsMet: {
				calories: this.isGoalMet(
					summary.totalCalories,
					goals.calories,
					0.1,
				), // 10% tolerance
				protein: this.isGoalMet(
					summary.totalProtein,
					goals.protein,
					0.1,
				),
				carbs: this.isGoalMet(summary.totalCarbs, goals.carbs, 0.15), // 15% tolerance for carbs
				fat: this.isGoalMet(summary.totalFat, goals.fat, 0.15),
			},
		}));

		const averages = this.calculateAverages(summaries);
		const consistency = this.calculateConsistency(summaries, goals);
		const improvements = this.generateImprovementSuggestions(
			trends,
			averages,
			goals,
		);

		return {
			trends,
			averages,
			consistency,
			improvements,
		};
	}

	/**
	 * Identify potential nutrient deficiencies
	 */
	identifyNutrientDeficiencies(
		summaries: DailyNutritionSummary[],
		goals: NutritionGoals,
	): NutrientDeficiency[] {
		const deficiencies: NutrientDeficiency[] = [];
		const averages = this.calculateAverages(summaries);

		// Check protein deficiency
		if (averages.protein < goals.protein * 0.8) {
			const deficit = goals.protein - averages.protein;
			deficiencies.push({
				nutrient: "Protein",
				current: averages.protein,
				recommended: goals.protein,
				deficit,
				severity: this.calculateDeficiencySeverity(
					averages.protein,
					goals.protein,
				),
				suggestions: [
					"Include lean meats, fish, eggs, or legumes in each meal",
					"Consider protein-rich snacks like Greek yogurt or nuts",
					"Add protein powder to smoothies if needed",
				],
			});
		}

		// Check fiber deficiency
		const fiberGoal = goals.fiber || 25;
		if (averages.fiber < fiberGoal * 0.6) {
			const deficit = fiberGoal - averages.fiber;
			deficiencies.push({
				nutrient: "Fiber",
				current: averages.fiber,
				recommended: fiberGoal,
				deficit,
				severity: this.calculateDeficiencySeverity(
					averages.fiber,
					fiberGoal,
				),
				suggestions: [
					"Eat more fruits and vegetables",
					"Choose whole grains over refined grains",
					"Include beans and legumes in your meals",
					"Add chia seeds or flaxseeds to yogurt or smoothies",
				],
			});
		}

		// Check calorie deficiency (too low)
		if (averages.calories < goals.calories * 0.7) {
			const deficit = goals.calories - averages.calories;
			deficiencies.push({
				nutrient: "Calories",
				current: averages.calories,
				recommended: goals.calories,
				deficit,
				severity: "moderate",
				suggestions: [
					"Consider adding healthy calorie-dense foods like nuts and avocados",
					"Eat more frequent, smaller meals",
					"Include healthy fats like olive oil in cooking",
				],
			});
		}

		return deficiencies;
	}

	/**
	 * Calculate calories burned estimate (basic)
	 */
	calculateCaloriesBurned(
		activities: Array<{
			activity: string;
			duration: number; // minutes
			intensity: "low" | "moderate" | "high";
		}>,
		weight = 70,
	): number {
		const metValues: Record<string, Record<string, number>> = {
			walking: { low: 3.0, moderate: 4.0, high: 5.0 },
			running: { low: 6.0, moderate: 8.0, high: 11.0 },
			cycling: { low: 4.0, moderate: 6.0, high: 10.0 },
			swimming: { low: 4.0, moderate: 6.0, high: 10.0 },
			strength_training: { low: 3.0, moderate: 5.0, high: 6.0 },
			yoga: { low: 2.5, moderate: 3.0, high: 4.0 },
		};

		return activities.reduce((total, activity) => {
			const met =
				metValues[activity.activity]?.[activity.intensity] || 3.0;
			// METs × weight (kg) × duration (hours)
			const calories = met * weight * (activity.duration / 60);
			return total + calories;
		}, 0);
	}

	/**
	 * Generate meal timing recommendations
	 */
	generateMealTimingRecommendations(entries: FoodEntry[]): {
		recommendations: string[];
		mealDistribution: {
			ideal: {
				breakfast: number;
				lunch: number;
				dinner: number;
				snack: number;
			};
			actual: {
				breakfast: number;
				lunch: number;
				dinner: number;
				snack: number;
			};
		};
	} {
		const totalCalories = this.calculateTotalCalories(entries);

		const actualDistribution = {
			breakfast: 0,
			lunch: 0,
			dinner: 0,
			snack: 0,
		};

		entries.forEach((entry) => {
			const multiplier = this.getServingMultiplier(entry);
			const calories = entry.foodItem.nutrition.calories * multiplier;
			actualDistribution[entry.meal] += calories;
		});

		// Convert to percentages
		const actualPercentages = {
			breakfast:
				totalCalories > 0
					? Math.round(
							(actualDistribution.breakfast / totalCalories) *
								100,
						)
					: 0,
			lunch:
				totalCalories > 0
					? Math.round(
							(actualDistribution.lunch / totalCalories) * 100,
						)
					: 0,
			dinner:
				totalCalories > 0
					? Math.round(
							(actualDistribution.dinner / totalCalories) * 100,
						)
					: 0,
			snack:
				totalCalories > 0
					? Math.round(
							(actualDistribution.snack / totalCalories) * 100,
						)
					: 0,
		};

		const idealDistribution = {
			breakfast: 25,
			lunch: 35,
			dinner: 30,
			snack: 10,
		};
		const recommendations: string[] = [];

		if (actualPercentages.breakfast < 20) {
			recommendations.push(
				"Consider eating a larger breakfast to boost morning energy",
			);
		}
		if (actualPercentages.dinner > 40) {
			recommendations.push(
				"Try to eat lighter dinners and redistribute calories to earlier meals",
			);
		}
		if (actualPercentages.snack > 20) {
			recommendations.push(
				"Consider reducing snack calories and adding them to main meals",
			);
		}
		if (actualPercentages.lunch < 25) {
			recommendations.push(
				"A more substantial lunch can help maintain energy throughout the day",
			);
		}

		return {
			recommendations,
			mealDistribution: {
				ideal: idealDistribution,
				actual: actualPercentages,
			},
		};
	}

	/**
	 * Calculate hydration needs
	 */
	calculateHydrationNeeds(
		weight: number,
		activityLevel: "low" | "moderate" | "high",
		temperature: "normal" | "hot" = "normal",
	): {
		baseWater: number; // ml
		activityBonus: number; // ml
		temperatureBonus: number; // ml
		totalNeeded: number; // ml
		recommendations: string[];
	} {
		// Base water needs: 35ml per kg of body weight
		const baseWater = weight * 35;

		// Activity adjustment
		const activityMultipliers = { low: 0, moderate: 500, high: 1000 };
		const activityBonus = activityMultipliers[activityLevel];

		// Temperature adjustment
		const temperatureBonus = temperature === "hot" ? 500 : 0;

		const totalNeeded = baseWater + activityBonus + temperatureBonus;

		const recommendations = [
			"Start your day with a glass of water",
			"Drink water before, during, and after exercise",
			"Keep a water bottle nearby as a reminder",
		];

		if (activityLevel === "high") {
			recommendations.push(
				"Consider electrolyte replacement during intense exercise",
			);
		}

		if (temperature === "hot") {
			recommendations.push("Increase water intake in hot weather");
		}

		return {
			baseWater: Math.round(baseWater),
			activityBonus,
			temperatureBonus,
			totalNeeded: Math.round(totalNeeded),
			recommendations,
		};
	}

	// Private Helper Methods

	private getServingMultiplier(entry: FoodEntry): number {
		return (entry.quantity * entry.foodItem.servingSize) / 100;
	}

	private calculateMacroBreakdownFromSummary(
		summary: DailyNutritionSummary,
	): MacroBreakdown {
		const proteinCalories = summary.totalProtein * 4;
		const carbCalories = summary.totalCarbs * 4;
		const fatCalories = summary.totalFat * 9;
		const totalMacroCalories = proteinCalories + carbCalories + fatCalories;

		return {
			protein: {
				grams: summary.totalProtein,
				calories: Math.round(proteinCalories),
				percentage:
					totalMacroCalories > 0
						? Math.round(
								(proteinCalories / totalMacroCalories) * 100,
							)
						: 0,
			},
			carbs: {
				grams: summary.totalCarbs,
				calories: Math.round(carbCalories),
				percentage:
					totalMacroCalories > 0
						? Math.round((carbCalories / totalMacroCalories) * 100)
						: 0,
			},
			fat: {
				grams: summary.totalFat,
				calories: Math.round(fatCalories),
				percentage:
					totalMacroCalories > 0
						? Math.round((fatCalories / totalMacroCalories) * 100)
						: 0,
			},
		};
	}

	private calculateProgress(current: number, target: number) {
		const percentage =
			target > 0 ? Math.round((current / target) * 100) : 0;
		const remaining = Math.max(0, target - current);

		return {
			current: Math.round(current * 10) / 10,
			target,
			percentage,
			remaining: Math.round(remaining * 10) / 10,
		};
	}

	private calculateLimitProgress(current: number, limit: number) {
		const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
		let status: "under" | "over" | "met";

		if (current < limit * 0.8) status = "under";
		else if (current > limit * 1.1) status = "over";
		else status = "met";

		return {
			current: Math.round(current * 10) / 10,
			target: limit,
			percentage,
			status,
		};
	}

	private generateRecommendations(
		progress: any,
		macroBreakdown: MacroBreakdown,
	): string[] {
		const recommendations: string[] = [];

		// Calorie recommendations
		if (progress.calories.percentage < 80) {
			recommendations.push(
				"Consider adding nutrient-dense, higher-calorie foods to meet your energy needs",
			);
		} else if (progress.calories.percentage > 110) {
			recommendations.push(
				"Consider reducing portion sizes or choosing lower-calorie alternatives",
			);
		}

		// Protein recommendations
		if (progress.protein.percentage < 80) {
			recommendations.push(
				"Include more protein-rich foods like lean meats, fish, eggs, or legumes",
			);
		}

		// Fiber recommendations
		if (progress.fiber.percentage < 60) {
			recommendations.push(
				"Increase fiber intake with more fruits, vegetables, and whole grains",
			);
		}

		// Macro balance recommendations
		if (macroBreakdown.fat.percentage > 35) {
			recommendations.push(
				"Consider reducing high-fat foods and balancing with more carbs and protein",
			);
		}
		if (macroBreakdown.carbs.percentage < 45) {
			recommendations.push(
				"Include more complex carbohydrates for sustained energy",
			);
		}

		return recommendations;
	}

	private generateWarnings(progress: any): string[] {
		const warnings: string[] = [];

		if (progress.calories.percentage < 50) {
			warnings.push(
				"Very low calorie intake - consider consulting a healthcare provider",
			);
		}
		if (progress.sodium.status === "over") {
			warnings.push(
				"High sodium intake - limit processed foods and added salt",
			);
		}
		if (progress.sugar.status === "over") {
			warnings.push(
				"High sugar intake - reduce sugary drinks and processed foods",
			);
		}

		return warnings;
	}

	private calculateAverages(summaries: DailyNutritionSummary[]) {
		if (summaries.length === 0) {
			return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
		}

		const totals = summaries.reduce(
			(acc, summary) => ({
				calories: acc.calories + summary.totalCalories,
				protein: acc.protein + summary.totalProtein,
				carbs: acc.carbs + summary.totalCarbs,
				fat: acc.fat + summary.totalFat,
				fiber: acc.fiber + summary.totalFiber,
			}),
			{ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
		);

		const count = summaries.length;
		return {
			calories: Math.round(totals.calories / count),
			protein: Math.round((totals.protein / count) * 10) / 10,
			carbs: Math.round((totals.carbs / count) * 10) / 10,
			fat: Math.round((totals.fat / count) * 10) / 10,
			fiber: Math.round((totals.fiber / count) * 10) / 10,
		};
	}

	private calculateConsistency(
		summaries: DailyNutritionSummary[],
		goals: NutritionGoals,
	) {
		if (summaries.length < 2) {
			return {
				calorieVariance: 0,
				proteinConsistency: 0,
				overallScore: 0,
			};
		}

		const averages = this.calculateAverages(summaries);

		// Calculate variance for calories
		const calorieVariances = summaries.map((s) =>
			Math.pow(s.totalCalories - averages.calories, 2),
		);
		const calorieVariance = Math.sqrt(
			calorieVariances.reduce((a, b) => a + b) / calorieVariances.length,
		);

		// Calculate protein consistency (how often protein goals are met)
		const proteinGoalsMet = summaries.filter(
			(s) =>
				s.totalProtein >= goals.protein * 0.8 &&
				s.totalProtein <= goals.protein * 1.2,
		).length;
		const proteinConsistency = (proteinGoalsMet / summaries.length) * 100;

		// Overall consistency score
		const calorieScore = Math.max(
			0,
			100 - (calorieVariance / goals.calories) * 100,
		);
		const overallScore = (calorieScore + proteinConsistency) / 2;

		return {
			calorieVariance: Math.round(calorieVariance),
			proteinConsistency: Math.round(proteinConsistency),
			overallScore: Math.round(overallScore),
		};
	}

	private generateImprovementSuggestions(
		trends: WeeklyNutritionTrend[],
		averages: any,
		goals: NutritionGoals,
	): string[] {
		const suggestions: string[] = [];

		const goalsMet = trends.reduce(
			(acc, day) => ({
				calories: acc.calories + (day.goalsMet.calories ? 1 : 0),
				protein: acc.protein + (day.goalsMet.protein ? 1 : 0),
				carbs: acc.carbs + (day.goalsMet.carbs ? 1 : 0),
				fat: acc.fat + (day.goalsMet.fat ? 1 : 0),
			}),
			{ calories: 0, protein: 0, carbs: 0, fat: 0 },
		);

		const daysCount = trends.length;

		if (goalsMet.calories / daysCount < 0.7) {
			suggestions.push(
				"Work on more consistent calorie intake throughout the week",
			);
		}
		if (goalsMet.protein / daysCount < 0.7) {
			suggestions.push(
				"Focus on meeting protein goals more consistently",
			);
		}

		return suggestions;
	}

	private isGoalMet(
		actual: number,
		target: number,
		tolerance: number,
	): boolean {
		const lowerBound = target * (1 - tolerance);
		const upperBound = target * (1 + tolerance);
		return actual >= lowerBound && actual <= upperBound;
	}

	private calculateDeficiencySeverity(
		current: number,
		recommended: number,
	): "mild" | "moderate" | "severe" {
		const percentage = (current / recommended) * 100;

		if (percentage >= 80) return "mild";
		if (percentage >= 60) return "moderate";
		return "severe";
	}

	/**
	 * Set custom nutrition goals
	 */
	setNutritionGoals(goals: Partial<NutritionGoals>): NutritionGoals {
		this.defaultGoals = { ...this.defaultGoals, ...goals };
		return this.defaultGoals;
	}

	/**
	 * Get current nutrition goals
	 */
	getNutritionGoals(): NutritionGoals {
		return { ...this.defaultGoals };
	}

	/**
	 * Calculate BMR (Basal Metabolic Rate) using Harris-Benedict equation
	 */
	calculateBMR(
		weight: number,
		height: number,
		age: number,
		gender: "male" | "female",
	): number {
		if (gender === "male") {
			return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
		} else {
			return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
		}
	}

	/**
	 * Calculate TDEE (Total Daily Energy Expenditure)
	 */
	calculateTDEE(
		bmr: number,
		activityLevel:
			| "sedentary"
			| "light"
			| "moderate"
			| "active"
			| "very_active",
	): number {
		const activityMultipliers = {
			sedentary: 1.2,
			light: 1.375,
			moderate: 1.55,
			active: 1.725,
			very_active: 1.9,
		};

		return Math.round(bmr * activityMultipliers[activityLevel]);
	}
}
