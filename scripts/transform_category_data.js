import fs from 'fs/promises';

// Transform your apiData to match current schema
const transformData = (apiData) => {
  return apiData.categories.map(category => ({
    name: category.name,
    description: `${category.name} category`,
    subcategories: category.subCategories.map(sub => ({
      name: sub.name,
      grouping: sub.grouping,
      imageUrl: sub.icon // transform icon -> imageUrl
    })),
    offers: category.offers.map(offer => ({
      title: offer.name,
      description: `${offer.name} for ${category.name}`,
      discountPercent: offer.offerType[0]?.min_discount || 10, // use min_discount
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      iconUrl: offer.icon
    }))
  }));
};

// Your original apiData here...
const apiData = {
  "categories": [
    // ... your data
  ]
};

const transformedData = transformData(apiData);
await fs.writeFile('./transformed_categories.json', JSON.stringify(transformedData, null, 2));
console.log('Transformed data saved to transformed_categories.json');
