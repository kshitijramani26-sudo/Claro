/** Single source of truth for the industry list — used by onboarding profile AND
 *  settings. Grouped for a sectioned, searchable picker; INDUSTRIES is the flat
 *  list (for validation / any code that just needs the names). Keep 'Optical'
 *  spelled exactly — it gates the optical-only features. */

export interface IndustryGroup {
  group: string;
  items: string[];
}

export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    group: 'Food & Grocery',
    items: [
      'Kirana / General Store', 'Supermarket', 'Dairy & Milk', 'Bakery', 'Sweet Shop (Mithai)',
      'Namkeen & Snacks', 'Fruits & Vegetables', 'Meat & Poultry', 'Fish & Seafood', 'Dry Fruits',
      'Tea & Coffee', 'Ice Cream & Dessert', 'Spices & Masala', 'Pan / Tobacco', 'Organic Store', 'Confectionery',
    ],
  },
  {
    group: 'Food Service',
    items: ['Restaurant', 'Café', 'Fast Food', 'Dhaba', 'Tiffin & Catering', 'Juice & Beverages', 'Cloud Kitchen', 'Food Truck'],
  },
  {
    group: 'Apparel & Fashion',
    items: [
      'Readymade Garments', 'Tailor / Boutique', 'Saree Shop', 'Ethnic Wear', 'Kids Wear', 'Hosiery & Innerwear',
      'Footwear', 'Bags & Luggage', 'Fashion Accessories', 'Cosmetics & Beauty Products',
    ],
  },
  {
    group: 'Jewellery & Watches',
    items: ['Gold & Silver Jewellery', 'Imitation Jewellery', 'Watches'],
  },
  {
    group: 'Electronics & Mobile',
    items: [
      'Mobile & Accessories', 'Mobile Repair', 'Electronics & Appliances', 'Computer & Laptop',
      'Computer Repair', 'CCTV & Security', 'Electrical Goods', 'Lighting',
    ],
  },
  {
    group: 'Health & Wellness',
    items: [
      'Pharmacy / Medical', 'Optical', 'Clinic / Doctor', 'Dental Clinic', 'Diagnostic / Pathology Lab',
      'Ayurvedic / Herbal', 'Veterinary', 'Gym & Fitness', 'Spa & Massage', 'Salon & Beauty Parlour', 'Skin / Cosmetic Clinic',
    ],
  },
  {
    group: 'Home & Hardware',
    items: [
      'Hardware & Sanitary', 'Paint Shop', 'Furniture', 'Home Décor', 'Utensils & Crockery (Bartan)',
      'Steel & Metal', 'Kitchenware', 'Glass & Plywood', 'Tiles & Marble', 'Building Material / Cement', 'Electrical Hardware',
    ],
  },
  {
    group: 'Stationery & Lifestyle',
    items: ['Stationery', 'Books & Stationery', 'Printing & Xerox', 'Gift Shop', 'Toys', 'Sports Goods', 'Musical Instruments', 'Florist'],
  },
  {
    group: 'Automobile',
    items: ['Auto Parts & Spares', 'Two-Wheeler Showroom', 'Car Accessories', 'Tyre Shop', 'Garage / Auto Repair', 'Battery Shop', 'Bicycle Shop'],
  },
  {
    group: 'Agri & Pets',
    items: ['Seeds & Fertilizer', 'Pesticides', 'Nursery & Plants', 'Pet Shop & Supplies', 'Dairy Farm'],
  },
  {
    group: 'Services',
    items: [
      'Mobile Recharge & DTH', 'Courier & Logistics', 'Travel Agency', 'Photography & Studio', 'Event Management',
      'Coaching / Tuition', 'Laundry & Dry Cleaning', 'AC & Refrigeration Repair', 'Interior Designer', 'Contractor / Builder', 'Real Estate',
    ],
  },
  {
    group: 'Trade & Manufacturing',
    items: ['Wholesale / Distributor', 'Manufacturing / Workshop', 'Textile Trader', 'Packaging', 'Scrap & Recycling'],
  },
];

/** Flat list of every industry name, with 'Other' last. */
export const INDUSTRIES: string[] = [...INDUSTRY_GROUPS.flatMap((g) => g.items), 'Other'];
