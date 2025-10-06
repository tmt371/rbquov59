// /04-core-code/services/calculation-service.spec.js

import { CalculationService } from './calculation-service.js';

// --- Mock Dependencies ---
const mockProductStrategy = {
    calculatePrice: jest.fn((item, priceMatrix) => {
        if (!item.width || !item.height) {
            return { price: null, error: 'Incomplete data.' };
        }
        if (item.width > 3000) {
            return { price: null, error: 'Width exceeds maximum.' };
        }
        return { price: item.width * 0.1 + item.height * 0.2 };
    })
};

const mockConfigManager = {
    getPriceMatrix: jest.fn((fabricType) => {
        if (fabricType === 'B5') {
            return { name: 'SHAW - VIBE', aliasFor: 'SN' };
        }
        return {}; // Return a dummy matrix for other types
    }),
    getAccessoryPrice: jest.fn((key) => {
        const prices = { comboBracket: 10, winderHD: 30 };
        return prices[key] || 0;
    })
};

// --- Test Suite ---
describe('CalculationService (Refactored)', () => {
    let calculationService;

    beforeEach(() => {
        calculationService = new CalculationService({
            productFactory: { getProductStrategy: () => mockProductStrategy },
            configManager: mockConfigManager
        });
        
        mockProductStrategy.calculatePrice.mockClear();
        mockConfigManager.getPriceMatrix.mockClear();
    });

    it('should correctly calculate and sum prices for valid items using the product strategy', () => {
        // [REFACTORED] Updated mock data to use the new generic state structure.
        const quoteData = {
            currentProduct: 'rollerBlind',
            products: {
                rollerBlind: {
                    items: [
                        { width: 1000, height: 1000, fabricType: 'B1', linePrice: null },
                        { width: 2000, height: 1500, fabricType: 'B1', linePrice: null },
                        { width: null, height: null, fabricType: null, linePrice: null }
                    ],
                    summary: { 
                        totalSum: 0,
                        accessories: {
                            winder: { price: 30 },
                            motor: { price: 250 }
                        }
                    }
                }
            }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        // [REFACTORED] Assertions now point to the correct nested structure.
        const productSummary = updatedQuoteData.products.rollerBlind.summary;
        const productItems = updatedQuoteData.products.rollerBlind.items;

        expect(productSummary.totalSum).toBe(1080);
        expect(productItems[0].linePrice).toBe(300);
        expect(productItems[1].linePrice).toBe(500);
        expect(firstError).toBeNull();
        expect(mockConfigManager.getPriceMatrix).toHaveBeenCalledTimes(2);
        expect(mockProductStrategy.calculatePrice).toHaveBeenCalledTimes(2);
    });

    it('should return the first error encountered and still sum valid items', () => {
        // [REFACTORED] Updated mock data to use the new generic state structure.
        const quoteData = {
            currentProduct: 'rollerBlind',
            products: {
                rollerBlind: {
                    items: [
                        { width: 1000, height: 1000, fabricType: 'B3', linePrice: null },
                        { width: 4000, height: 1500, fabricType: 'B3', linePrice: null }, 
                        { width: 2000, height: 2000, fabricType: 'B3', linePrice: null }
                    ],
                    summary: { totalSum: 0, accessories: {} }
                }
            }
        };

        const { updatedQuoteData, firstError } = calculationService.calculateAndSum(quoteData, mockProductStrategy);

        // [REFACTORED] Assertions now point to the correct nested structure.
        const productSummary = updatedQuoteData.products.rollerBlind.summary;
        const productItems = updatedQuoteData.products.rollerBlind.items;

        expect(productSummary.totalSum).toBe(900);
        expect(productItems[0].linePrice).toBe(300);
        expect(productItems[1].linePrice).toBeNull();
        expect(productItems[2].linePrice).toBe(600);
        expect(firstError).not.toBeNull();
        expect(firstError.rowIndex).toBe(1);
        expect(firstError.message).toContain('Width exceeds maximum.');
    });

    it('should correctly call the strategy for accessory pricing', () => {
        const productType = 'rollerBlind';
        const items = [{ dual: 'D' }, { dual: 'D' }];
        
        // Mock the strategy's method for this specific test
        mockProductStrategy.calculateDualPrice = jest.fn(() => 10);

        const price = calculationService.calculateAccessoryPrice(productType, 'dual', { items });

        expect(price).toBe(10);
        // Verify that the service correctly looked up the price and called the strategy's method
        expect(mockConfigManager.getAccessoryPrice).toHaveBeenCalledWith('comboBracket');
        expect(mockProductStrategy.calculateDualPrice).toHaveBeenCalledWith(items, 10);
    });
});