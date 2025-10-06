// File: 04-core-code/ui/views/k3-options-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the K3 (Options) tab.
 */
export class K3OptionsView {
    constructor({ quoteService, uiService, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.publish = publishStateChangeCallback;
        console.log("K3OptionsView Initialized.");
    }

    /**
     * Toggles the K3 editing mode on or off.
     */
    handleToggleK3EditMode() {
        const currentMode = this.uiService.getState().activeEditMode;
        const newMode = currentMode === 'K3' ? null : 'K3';
        this.uiService.setActiveEditMode(newMode);
        this.publish();
    }

    /**
     * Handles batch cycling for a given property (over, oi, lr).
     * @param {object} data - The event data containing the column to cycle.
     */
    handleBatchCycle({ column }) {
        const items = this.quoteService.getItems();
        if (items.length === 0 || !items[0]) return;

        const BATCH_CYCLE_SEQUENCES = {
            over: ['O', ''],
            oi: ['IN', 'OUT'],
            lr: ['L', 'R']
        };
        const sequence = BATCH_CYCLE_SEQUENCES[column];
        if (!sequence) return;
        
        const firstItemValue = items[0][column] || '';
        const currentIndex = sequence.indexOf(firstItemValue);
        const nextIndex = (currentIndex === -1) ? 0 : (currentIndex + 1) % sequence.length;
        const nextValue = sequence[nextIndex];
        
        this.quoteService.batchUpdateProperty(column, nextValue);
        this.publish();
    }
    
    /**
     * Handles clicks on individual table cells in the K3 columns.
     * @param {object} data - The event data { rowIndex, column }.
     */
    handleTableCellClick({ rowIndex, column }) {
        this.uiService.setActiveCell(rowIndex, column);
        this.quoteService.cycleK3Property(rowIndex, column);
        this.publish();
        
        // Briefly highlight the cell by setting and then clearing the active cell state
        setTimeout(() => {
            this.uiService.setActiveCell(null, null);
            this.publish();
        }, 150);
    }

    /**
     * This method is called by the main DetailConfigView when the K3 tab becomes active.
     */
    activate() {
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location', 'over', 'oi', 'lr']);
        this.publish();
    }
}