import { FoodItem, FoodEntry } from "../model";
import { NutritionGoals } from "../services/nutritonCaluculator";

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export class ValidationUtils {
	/**
	 * Validate food item data
	 */
	static validateFoodItem(foodItem: Partial<FoodItem>): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Required fields
		if (!foodItem.name?.trim()) {
			errors.push("Food name is required");
		}

		if (!foodItem.category) {
			errors.push("Food category is required");
		}

		if (!foodItem.servingSize || foodItem.servingSize <= 0) {
			errors.push("Serving size must be greater than 0");
		}

		if (!foodItem.servingUnit?.trim()) {
			errors.push("Serving unit is required");
		}

		// Nutrition validation
		if (!foodItem.nutrition) {
			errors.push("Nutrition information is required");
		} else {
			if (foodItem.nutrition.calories < 0) {
				errors.push("Calories cannot be negative");
			}
			if (foodItem.nutrition.protein < 0) {
				errors.push("Protein cannot be negative");
			}
			if (foodItem.nutrition.carbs < 0) {
				errors.push("Carbohydrates cannot be negative");
			}
			if (foodItem.nutrition.fat < 0) {
				errors.push("Fat cannot be negative");
			}

			// Warnings for unusual values
			if (foodItem.nutrition.calories > 900) {
				warnings.push(
					"Calories seem unusually high (>900 per serving)",
				);
			}
			if (foodItem.nutrition.protein > 100) {
				warnings.push(
					"Protein content seems unusually high (>100g per serving)",
				);
			}
			if (foodItem.nutrition.sodium && foodItem.nutrition.sodium > 2000) {
				warnings.push(
					"Sodium content is very high (>2000mg per serving)",
				);
			}
		}

		// Name validation
		if (foodItem.name && foodItem.name.length > 100) {
			warnings.push("Food name is very long (>100 characters)");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate food entry data
	 */
	static validateFoodEntry(foodEntry: Partial<FoodEntry>): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Required fields
		if (!foodEntry.foodItem) {
			errors.push("Food item is required");
		}

		if (!foodEntry.quantity || foodEntry.quantity <= 0) {
			errors.push("Quantity must be greater than 0");
		}

		if (!foodEntry.meal) {
			errors.push("Meal type is required");
		} else if (
			!["breakfast", "lunch", "dinner", "snack"].includes(foodEntry.meal)
		) {
			errors.push("Invalid meal type");
		}

		if (!foodEntry.date) {
			errors.push("Date is required");
		} else if (!this.isValidDate(foodEntry.date)) {
			errors.push("Invalid date format");
		}

		// Warnings for unusual values
		if (foodEntry.quantity && foodEntry.quantity > 10) {
			warnings.push("Quantity seems unusually high (>10 servings)");
		}

		if (foodEntry.date && this.isDateInFuture(foodEntry.date)) {
			warnings.push("Date is in the future");
		}

		// if (foodEntry.notes && foodEntry.notes.length > 500) {
		// 	warnings.push("Notes are very long (>500 characters)");
		// }

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate nutrition goals
	 */
	static validateNutritionGoals(
		goals: Partial<NutritionGoals>,
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Required fields
		if (!goals.calories || goals.calories <= 0) {
			errors.push("Daily calories must be greater than 0");
		}

		if (!goals.protein || goals.protein <= 0) {
			errors.push("Protein goal must be greater than 0");
		}

		if (!goals.carbs || goals.carbs <= 0) {
			errors.push("Carbohydrate goal must be greater than 0");
		}

		if (!goals.fat || goals.fat <= 0) {
			errors.push("Fat goal must be greater than 0");
		}

		// Warnings for unusual values
		if (
			goals.calories &&
			(goals.calories < 1200 || goals.calories > 4000)
		) {
			warnings.push(
				"Calorie goal seems unusual (recommended: 1200-4000)",
			);
		}

		if (goals.protein && goals.protein > 300) {
			warnings.push("Protein goal seems very high (>300g)");
		}

		if (goals.sodium && goals.sodium > 3000) {
			warnings.push("Sodium limit is higher than recommended (<2300mg)");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate email format
	 */
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Validate phone number format
	 */
	static isValidPhoneNumber(phone: string): boolean {
		const phoneRegex = /^\+?[\d\s\-()]+$/;
		return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
	}

	/**
	 * Validate URL format
	 */
	static isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Validate date format (YYYY-MM-DD)
	 */
	static isValidDate(dateString: string): boolean {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(dateString)) return false;

		const date = new Date(dateString);
		return date instanceof Date && !isNaN(date.getTime());
	}

	/**
	 * Check if date is in the future
	 */
	static isDateInFuture(dateString: string): boolean {
		const date = new Date(dateString);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date > today;
	}

	/**
	 * Validate numeric input
	 */
	static isValidNumber(value: any, min?: number, max?: number): boolean {
		const num = parseFloat(value);
		if (isNaN(num)) return false;
		if (min !== undefined && num < min) return false;
		if (max !== undefined && num > max) return false;
		return true;
	}

	/**
	 * Validate integer input
	 */
	static isValidInteger(value: any, min?: number, max?: number): boolean {
		const num = parseInt(value);
		if (isNaN(num) || !Number.isInteger(num)) return false;
		if (min !== undefined && num < min) return false;
		if (max !== undefined && num > max) return false;
		return true;
	}

	/**
	 * Sanitize HTML input
	 */
	static sanitizeHtml(input: string): string {
		const temp = document.createElement("div");
		temp.textContent = input;
		return temp.innerHTML;
	}

	/**
	 * Validate and sanitize string input
	 */
	static sanitizeString(input: string, maxLength?: number): string {
		let sanitized = input.trim();
		if (maxLength && sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength);
		}
		return this.sanitizeHtml(sanitized);
	}

	/**
	 * Validate barcode format
	 */
	static isValidBarcode(barcode: string): boolean {
		// Common barcode formats: UPC-A (12 digits), EAN-13 (13 digits), EAN-8 (8 digits)
		const barcodeRegex = /^(\d{8}|\d{12}|\d{13})$/;
		return barcodeRegex.test(barcode);
	}

	/**
	 * Validate serving unit
	 */
	static isValidServingUnit(unit: string): boolean {
		const validUnits = [
			"g",
			"kg",
			"mg",
			"oz",
			"lb",
			"ml",
			"l",
			"fl oz",
			"cup",
			"tbsp",
			"tsp",
			"piece",
			"slice",
			"serving",
			"portion",
			"can",
			"bottle",
			"pack",
			"bag",
		];
		return validUnits.includes(unit.toLowerCase());
	}

	/**
	 * Validate file size
	 */
	static isValidFileSize(fileSize: number, maxSizeMB = 10): boolean {
		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		return fileSize <= maxSizeBytes;
	}

	/**
	 * Validate image file type
	 */
	static isValidImageType(fileName: string): boolean {
		const validExtensions = [
			".jpg",
			".jpeg",
			".png",
			".gif",
			".bmp",
			".webp",
		];
		const extension = fileName
			.toLowerCase()
			.substring(fileName.lastIndexOf("."));
		return validExtensions.includes(extension);
	}

	/**
	 * Check password strength
	 */
	static checkPasswordStrength(password: string): {
		score: number;
		feedback: string[];
	} {
		const feedback: string[] = [];
		let score = 0;

		if (password.length >= 8) score++;
		else feedback.push("Password should be at least 8 characters long");

		if (/[a-z]/.test(password)) score++;
		else feedback.push("Password should contain lowercase letters");

		if (/[A-Z]/.test(password)) score++;
		else feedback.push("Password should contain uppercase letters");

		if (/\d/.test(password)) score++;
		else feedback.push("Password should contain numbers");

		if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
		else feedback.push("Password should contain special characters");

		return { score, feedback };
	}

	/**
	 * Validate JSON string
	 */
	static isValidJson(jsonString: string): boolean {
		try {
			JSON.parse(jsonString);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Batch validation for multiple items
	 */
	static validateBatch<T>(
		items: T[],
		validator: (item: T) => ValidationResult,
	): { validItems: T[]; invalidItems: { item: T; errors: string[] }[] } {
		const validItems: T[] = [];
		const invalidItems: { item: T; errors: string[] }[] = [];

		items.forEach((item) => {
			const result = validator(item);
			if (result.isValid) {
				validItems.push(item);
			} else {
				invalidItems.push({ item, errors: result.errors });
			}
		});

		return { validItems, invalidItems };
	}
}
