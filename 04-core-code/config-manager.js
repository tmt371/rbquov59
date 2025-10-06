// /04-core-code/config-manager.js
import { f2Config } from './config/f2-config.js';

export class ConfigManager {
    constructor(eventAggregator) {
        this.eventAggregator = eventAggregator;
        this.priceMatrices = null;
        this.accessories = null;
        this.f2Config = f2Config || {}; // Load the F2 config
        this.fabricTypeSequence = null; 
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const response = await fetch('./03-data-models/price-matrix-v1.0.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.priceMatrices = data.matrices;
            this.accessories = data.accessories;
            this.fabricTypeSequence = data.fabricTypeSequence || [];
            this.isInitialized = true;
            console.log("ConfigManager initialized and price matrices loaded successfully.");

        } catch (error) {
            console.error("Failed to load price matrices:", error);
            this.eventAggregator.publish('showNotification', { message: 'Error: Could not load the price list file!', type: 'error'});
        }
    }

    /**
     * [REFACTORED] Retrieves the price matrix for a given fabric type, handling aliases.
     * @param {string} fabricType - e.g., 'B1', 'B5', 'SN'
     * @returns {object|null}
     */
    getPriceMatrix(fabricType) {
        if (!this.isInitialized || !this.priceMatrices) {
            console.error("ConfigManager not initialized or matrices not loaded.");
            return null;
        }
        
        const matrix = this.priceMatrices[fabricType];

        // [NEW] Handle the alias logic
        if (matrix && matrix.aliasFor) {
            const aliasTargetMatrix = this.priceMatrices[matrix.aliasFor];
            if (aliasTargetMatrix) {
                // Return the target matrix but keep the original name for reference
                return { ...aliasTargetMatrix, name: matrix.name };
            } else {
                console.error(`Alias target '${matrix.aliasFor}' not found for fabric type '${fabricType}'.`);
                return null;
            }
        }
        
        return matrix || null;
    }

    /**
     * Retrieves the price for a specific accessory.
     * @param {string} accessoryKey - The key of the accessory (e.g., 'winderHD', 'motorStandard').
     * @returns {number|null} The price of the accessory, or null if not found.
     */
    getAccessoryPrice(accessoryKey) {
        if (!this.isInitialized || !this.accessories) {
            console.error("ConfigManager not initialized or accessories not loaded.");
            return null;
        }
        const accessory = this.accessories[accessoryKey];
        if (accessory && typeof accessory.price === 'number') {
            return accessory.price;
        }
        console.error(`Accessory price for '${accessoryKey}' not found.`);
        return null;
    }

    /**
     * Retrieves the fabric type sequence array.
     * @returns {Array<string>} The sequence of fabric types.
     */
    getFabricTypeSequence() {
        if (!this.isInitialized || !this.fabricTypeSequence) {
            console.error("ConfigManager not initialized or fabricTypeSequence not loaded.");
            return []; // Return an empty array to prevent downstream errors
        }
        return this.fabricTypeSequence;
    }

    /**
     * [NEW] Retrieves the F2 panel configuration.
     * @returns {object} The F2 configuration object.
     */
    getF2Config() {
        return this.f2Config;
    }
}