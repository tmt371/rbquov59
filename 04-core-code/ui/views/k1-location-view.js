// File: 04-core-code/ui/views/k1-location-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the K1 (Location) tab.
 */
export class K1LocationView {
    constructor({ quoteService, uiService, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.publish = publishStateChangeCallback;
        console.log("K1LocationView Initialized.");
    }

    /**
     * Handles the request to enter or exit the location editing mode.
     * This is typically triggered by the '#Location' button.
     */
    handleFocusModeRequest() {
        const currentMode = this.uiService.getState().activeEditMode;
        const newMode = currentMode === 'K1' ? null : 'K1';
        this._toggleLocationEditMode(newMode);
    }

    /**
     * Toggles the UI state for K1's location editing mode.
     * @param {string|null} newMode - The new mode ('K1' or null).
     * @private
     */
    _toggleLocationEditMode(newMode) {
        this.uiService.setActiveEditMode(newMode);

        if (newMode) {
            const targetRow = 0;
            this.uiService.setTargetCell({ rowIndex: targetRow, column: 'location' });
            
            const currentItem = this.quoteService.getItems()[targetRow];
            this.uiService.setLocationInputValue(currentItem.location || '');
            
            const locationInput = document.getElementById('location-input-box');
            setTimeout(() => {
                locationInput?.focus();
                locationInput?.select();
            }, 50);
        } else {
            this.uiService.setTargetCell(null);
            this.uiService.setLocationInputValue('');
        }
        this.publish();
    }

    /**
     * Handles the Enter key press in the location input box.
     * @param {object} data - The event data containing the value.
     */
    handleLocationInputEnter({ value }) {
        const { targetCell } = this.uiService.getState();
        if (!targetCell) return;

        this.quoteService.updateItemProperty(targetCell.rowIndex, targetCell.column, value);

        const nextRowIndex = targetCell.rowIndex + 1;
        const totalRows = this.quoteService.getItems().length;
        const locationInput = document.getElementById('location-input-box');

        // Move to the next row if it's not the last empty row
        if (nextRowIndex < totalRows - 1) {
            this.uiService.setTargetCell({ rowIndex: nextRowIndex, column: 'location' });
            const nextItem = this.quoteService.getItems()[nextRowIndex];
            this.uiService.setLocationInputValue(nextItem.location || '');
            this.publish();
            // Refocus and select the input for continuous entry
            setTimeout(() => locationInput?.select(), 0);
        } else {
            // If it's the last row, exit the editing mode
            this._toggleLocationEditMode(null);
        }
    }

    /**
     * Handles clicks on table cells when K1 mode is active.
     * @param {object} data - The event data { rowIndex }.
     */
    handleTableCellClick({ rowIndex }) {
        // Update the target cell to the clicked row
        this.uiService.setTargetCell({ rowIndex, column: 'location' });
        const item = this.quoteService.getItems()[rowIndex];
        this.uiService.setLocationInputValue(item.location || '');
        this.publish();
        
        const locationInput = document.getElementById('location-input-box');
        setTimeout(() => {
            locationInput?.focus();
            locationInput?.select();
        }, 50);
    }

    /**
     * This method is called by the main DetailConfigView when the K1 tab becomes active.
     */
    activate() {
        // Set the visible columns for the K1 tab
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location']);
        // [REFACTOR] The publish call is now centralized in DetailConfigView's activateTab method.
    }
}