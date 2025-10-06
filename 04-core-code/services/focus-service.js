// /04-core-code/services/focus-service.js

/**
 * @fileoverview Service for managing input focus and active cell logic.
 */
export class FocusService {
    /**
     * @param {object} dependencies - The service dependencies.
     * @param {UIService} dependencies.uiService - The UI state management service.
     * @param {QuoteService} dependencies.quoteService - The quote data management service.
     */
    constructor({ uiService, quoteService }) {
        this.uiService = uiService;
        this.quoteService = quoteService;
        console.log("FocusService (Context-Aware) Initialized.");
    }

    /**
     * Finds the first empty cell for a given column ('width' or 'height') and sets focus.
     * @param {string} column - 'width' or 'height'.
     */
    focusFirstEmptyCell(column) {
        const items = this.quoteService.getItems();
        const firstEmptyIndex = items.findIndex(item => !item[column]);
        const targetIndex = (firstEmptyIndex !== -1) ? firstEmptyIndex : items.length - 1;

        this.uiService.setActiveCell(targetIndex, column);
        this.uiService.setInputValue('');
    }

    /**
     * Moves focus to the next logical cell after a value is committed.
     */
    focusAfterCommit() {
        this.moveActiveCell('down');
    }

    /**
     * Moves focus to the width cell of the new last row after a deletion.
     */
    focusAfterDelete() {
        const lastIndex = this.quoteService.getItems().length - 1;
        this.uiService.setActiveCell(lastIndex, 'width');
    }

    /**
     * Moves focus to the width cell of the cleared row.
     */
    focusAfterClear() {
        const { selectedRowIndex } = this.uiService.getState();
        if (selectedRowIndex !== null) {
            this.uiService.setActiveCell(selectedRowIndex, 'width');
        }
    }

    /**
     * Moves the active cell when an arrow key is pressed.
     * @param {string} direction - 'up', 'down', 'left', or 'right'.
     */
    moveActiveCell(direction) {
        const { activeCell } = this.uiService.getState();
        const items = this.quoteService.getItems();
        let { rowIndex } = activeCell;
        let { column } = activeCell;
        
        const navigableColumns = ['width', 'height', 'TYPE'];
        let columnIndex = navigableColumns.indexOf(column);

        switch (direction) {
            case 'up': rowIndex = Math.max(0, rowIndex - 1); break;
            case 'down': rowIndex = Math.min(items.length - 1, rowIndex + 1); break;
            case 'left': columnIndex = Math.max(0, columnIndex - 1); break;
            case 'right': columnIndex = Math.min(navigableColumns.length - 1, columnIndex + 1); break;
        }
        
        column = navigableColumns[columnIndex];
        this.uiService.setActiveCell(rowIndex, column);
        this.uiService.clearRowSelection();
        
        const currentItem = items[rowIndex];
        if (currentItem && (column === 'width' || column === 'height')) {
            this.uiService.setInputValue(currentItem[column]);
        } else {
            this.uiService.setInputValue('');
        }
    }
}