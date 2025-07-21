export interface FoodItem {
	id: string;
	name: string;
	category: string;
	servingSize: number;
	servingUnit: string;
	nutrition: {
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		fiber?: number;
		sugar?: number;
		sodium?: number;
	};
}

export interface FoodEntry {
	id: string;
	date: string;
	timestamp: number;
	foodItem: FoodItem;
	quantity: number;
	meal: "breakfast" | "lunch" | "dinner" | "snack";
	notes?: string;
}
