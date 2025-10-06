// File: 04-core-code/services/quote-service.spec.js

import { QuoteService } from './quote-service.js';

// --- Mock Dependencies ---
const getMockInitialItem = () => ({
    itemId: 'item-1',
    width: null, height: null, fabricType: null, linePrice: null,
    location: '', fabric: '', color: '', over: '',
    oi: '', lr: '', sd: '', chain: null, winder: '', motor: ''
});

const mockProductStrategy = {
    getInitialItemData: () => ({ ...getMockInitialItem(), itemId: `item-${Date.now()}` })
};

const mockProductFactory = {
    getProductStrategy: () => mockProductStrategy
};

const mockConfigManager = {
    getFabricTypeSequence: () => ['B1', 'B2', 'B3', 'B4', 'B5', 'SN']
};

// [REFACTORED] Updated the mock initial state to match the new generic structure.
const getMockInitialState = () => ({
    quoteData: {
        currentProduct: 'rollerBlind',
        products: {
            rollerBlind: {
                items: [{ ...getMockInitialItem() }],
                summary: { totalSum: 0 }
            }
        },
        // Global properties
        costDiscountPercentage: 0,
        customer: {}
    }
});


// --- Test Suite ---
describe('QuoteService', () => {
    let quoteService;

    beforeEach(() => {
        // The service will now be initialized with the new, correctly structured mock state.
        quoteService = new QuoteService({
            initialState: getMockInitialState(),
            productFactory: mockProductFactory,
            configManager: mockConfigManager
        });
    });

    it('should initialize with a single empty row', () => {
        const items = quoteService.getItems();
        expect(items).toHaveLength(1);
        expect(items[0]).toEqual(expect.objectContaining({
            width: null, height: null, fabricType: null, location: ''
        }));
    });

    it('should insert a new row at the correct position', () => {
        quoteService.insertRow(0); 
        const items = quoteService.getItems();
        expect(items).toHaveLength(2);
        expect(items[1].itemId).not.toBe(items[0].itemId); 
    });

    it('should delete a row and maintain a single empty row at the end', () => {
        quoteService.updateItemValue(0, 'width', 1000); 
        quoteService.insertRow(0);
        quoteService.updateItemValue(1, 'width', 2000); 

        let items = quoteService.getItems();
        expect(items).toHaveLength(3); 

        quoteService.deleteRow(0); 
        items = quoteService.getItems();
        expect(items).toHaveLength(2); 
        expect(items[0].width).toBe(2000);
    });

    it('should clear the last row with data instead of deleting it', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        let items = quoteService.getItems();
        expect(items).toHaveLength(2); 
        
        quoteService.deleteRow(0);
        items = quoteService.getItems();
        expect(items).toHaveLength(1); 
        expect(items[0].width).toBeNull();
    });
    
    it('should ensure only one empty row exists at the end after updates', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        const items = quoteService.getItems();
        expect(items).toHaveLength(2); 

        quoteService.updateItemValue(1, 'width', 2000);
        expect(items).toHaveLength(3); 

        quoteService.deleteRow(1); 
        expect(items).toHaveLength(2);
    });

    it('should cycle through all fabric types based on the sequence from configManager', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        quoteService.updateItemValue(0, 'height', 1000);
        const item = quoteService.getItems()[0];
        
        expect(item.fabricType).toBeNull();

        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('B1');

        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('B2');

        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('B3');

        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('B4');

        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('B5');

        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('SN');

        // Seventh cycle should loop back to B1
        quoteService.cycleItemType(0);
        expect(item.fabricType).toBe('B1');
    });
});