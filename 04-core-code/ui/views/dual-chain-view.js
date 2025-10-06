// File: 04-core-code/ui/views/dual-chain-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the Dual/Chain tab.
 */
export class DualChainView {
    constructor({ quoteService, uiService, calculationService, eventAggregator, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.calculationService = calculationService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;
        console.log("DualChainView Initialized.");
    }

    /**
     * Handles the toggling of modes (dual, chain).
     * Validation now ONLY runs when EXITING dual mode.
     */
    handleModeChange({ mode }) {
        const currentMode = this.uiService.getState().dualChainMode;
        const newMode = currentMode === mode ? null : mode;

        // When attempting to EXIT dual mode, perform the final validation.
        if (currentMode === 'dual') {
            const isValid = this._validateDualSelection();
            if (!isValid) {
                return; // If validation fails, block the user from exiting the mode.
            }
        }
        
        this.uiService.setDualChainMode(newMode);

        if (newMode === 'dual') {
            // When entering the mode, ensure the price is calculated and displayed based on the current state.
            this._calculateAndStoreDualPrice();
        }
        
        if (!newMode) {
            this.uiService.setTargetCell(null);
            this.uiService.clearDualChainInputValue();
        }

        this.publish();
    }

    /**
     * [NEW] This method PURELY calculates the price and updates state. It contains NO validation logic.
     * This is the key to achieving real-time updates without premature warnings.
     */
    _calculateAndStoreDualPrice() {
        const items = this.quoteService.getItems();
        const productType = this.quoteService.getCurrentProductType();
        
        // Calculate the price based on the current items.
        const price = this.calculationService.calculateAccessoryPrice(productType, 'dual', { items });
        
        // Store the price in the core data service and the UI service.
        this.quoteService.updateAccessorySummary({ dualCostSum: price });
        this.uiService.setDualPrice(price);
        
        // Immediately trigger a recalculation of the grand total on the K5 summary.
        this._updateSummaryAccessoriesTotal();
    }

    /**
     * [NEW] This method PURELY validates the selection. It does NOT calculate any price.
     * It is only called when the user tries to exit the dual mode.
     */
    _validateDualSelection() {
        const items = this.quoteService.getItems();
        const selectedIndexes = items.reduce((acc, item, index) => {
            if (item.dual === 'D') {
                acc.push(index);
            }
            return acc;
        }, []);

        const dualCount = selectedIndexes.length;

        // Rule 1: The total count must be an even number.
        if (dualCount > 0 && dualCount % 2 !== 0) {
            this.eventAggregator.publish('showNotification', {
                message: 'The total count of Dual Brackets (D) must be an even number. Please correct the selection.',
                type: 'error'
            });
            return false; // Indicate failure
        }

        // Rule 2: The selected items must be in adjacent pairs.
        for (let i = 0; i < dualCount; i += 2) {
            if (selectedIndexes[i+1] !== selectedIndexes[i] + 1) {
                this.eventAggregator.publish('showNotification', {
                    message: 'Dual Brackets (D) must be set on adjacent items. Please check your selection.',
                    type: 'error'
                });
                return false; // Indicate failure
            }
        }
        
        return true; // Indicate success
    }

    /**
     * Handles the Enter key press in the chain input box.
     */
    handleChainEnterPressed({ value }) {
        const { targetCell: currentTarget } = this.uiService.getState();
        if (!currentTarget) return;

        const valueAsNumber = Number(value);
        if (value !== '' && (!Number.isInteger(valueAsNumber) || valueAsNumber <= 0)) {
            this.eventAggregator.publish('showNotification', {
                message: 'Only positive integers are allowed.',
                type: 'error'
            });
            return;
        }

        const valueToSave = value === '' ? null : valueAsNumber;
        this.quoteService.updateItemProperty(currentTarget.rowIndex, currentTarget.column, valueToSave);
        
        this.uiService.setTargetCell(null);
        this.uiService.clearDualChainInputValue();
        this.publish();
    }

    /**
     * Handles clicks on table cells when a mode is active.
     */
    handleTableCellClick({ rowIndex, column }) {
        const { dualChainMode } = this.uiService.getState();
        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;

        if (dualChainMode === 'dual' && column === 'dual') {
            const newValue = item.dual === 'D' ? '' : 'D';
            this.quoteService.updateItemProperty(rowIndex, 'dual', newValue);

            // [FIX] Call the new, validation-free calculation method for instant feedback.
            this._calculateAndStoreDualPrice();

            this.publish();
        }

        if (dualChainMode === 'chain' && column === 'chain') {
            this.uiService.setTargetCell({ rowIndex, column: 'chain' });
            this.uiService.setDualChainInputValue(item.chain || '');
            this.publish();

            setTimeout(() => {
                const inputBox = document.getElementById('k4-input-display');
                inputBox?.focus();
                inputBox?.select();
            }, 50); 
        }
    }
    
    /**
     * [REVISED] This method is called by the main DetailConfigView when the K5 tab becomes active.
     * It now correctly synchronizes all accessory prices from the K4 state.
     */
    activate() {
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location', 'dual', 'chain']);
        
        const currentState = this.uiService.getState();
        const currentProductData = this.quoteService.getCurrentProductData();

        // [FIX] These crucial lines synchronize the prices from the K4 view state into the K5 summary state.
        this.uiService.setSummaryWinderPrice(currentState.driveWinderTotalPrice);
        this.uiService.setSummaryMotorPrice(currentState.driveMotorTotalPrice);
        this.uiService.setSummaryRemotePrice(currentState.driveRemoteTotalPrice);
        this.uiService.setSummaryChargerPrice(currentState.driveChargerTotalPrice);
        this.uiService.setSummaryCordPrice(currentState.driveCordTotalPrice);
        this.uiService.setDualPrice(currentProductData.summary.accessories.dualCostSum);

        // After synchronizing, calculate the grand total.
        this._updateSummaryAccessoriesTotal();

        this.publish();
    }

    /**
     * Calculates the total of all accessories displayed on the K5 summary tab.
     */
    _updateSummaryAccessoriesTotal() {
        const state = this.uiService.getState();
        
        // The values are now correctly populated in the UI state before this method is called.
        const dualPrice = state.dualPrice || 0;
        const winderPrice = state.summaryWinderPrice || 0;
        const motorPrice = state.summaryMotorPrice || 0;
        const remotePrice = state.summaryRemotePrice || 0;
        const chargerPrice = state.summaryChargerPrice || 0;
        const cordPrice = state.summaryCordPrice || 0;

        const total = dualPrice + winderPrice + motorPrice + remotePrice + chargerPrice + cordPrice;
        
        this.uiService.setSummaryAccessoriesTotal(total);
    }
}