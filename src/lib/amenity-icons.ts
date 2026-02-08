
import { 
  Sparkles, 
  Sofa, 
  Wifi, 
  Car, 
  Dumbbell, 
  Utensils, 
  ShieldCheck, 
  Sun, 
  Zap, 
  PawPrint, 
  WashingMachine, 
  Trees, 
  Flame,
  Tv, 
  Waves
} from 'lucide-react';

export const AMENITY_ICONS: Record<string, any> = {
  // Property.ts values
  "Furnished": Sofa,
  "Wi-Fi": Wifi,
  "In-unit Laundry": WashingMachine, // WashingMachine might not exist in old lucide versions, fallback to Sparkles if error
  "Pet Friendly": PawPrint,
  "Parking Spot": Car,
  "Gym Access": Dumbbell,
  "Rooftop Access": Sun,
  "Dishwasher": Utensils,
  "All Utilities Included": Zap,
  "Secure Entry": ShieldCheck,
  "Private Yard": Trees,

  // Fallbacks for potential old data or AmenitiesStep.tsx mismatches
  "Kitchen": Utensils,
  "Furniture": Sofa,
  "Bathroom": Sparkles, // No specific icon easy to map without import check
  "Bedroom": Sparkles,
  "WiFi": Wifi,
  "Parking": Car,
  "AC": Flame, // Or generic
  "Gym": Dumbbell,
  "Pool": Waves,
  "Balcony": Sun,
};

export const DEFAULT_ICON = Sparkles;
