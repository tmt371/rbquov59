// File: 04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';
import { DialogComponent } from './dialog-component.js';
import { LeftPanelComponent } from './left-panel-component.js';
import { RightPanelComponent } from './right-panel-component.js';

export class UIManager {
    constructor(appElement, eventAggregator, calculationService) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;
        this.calculationService = calculationService;

        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.mSelButton = document.getElementById('key-m-sel');
        this.clearButton = document.getElementById('key-clear');
        this.leftPanelElement = document.getElementById('left-panel');

        const tableElement = document.getElementById('results-table');
        this.tableComponent = new TableComponent(tableElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        this.leftPanelComponent = new LeftPanelComponent(this.leftPanelElement);

        this.functionPanel = new PanelComponent({
            panelElement: document.getElementById('function-panel'),
            toggleElement: document.getElementById('function-panel-toggle'),
            eventAggregator: this.eventAggregator,
            expandedClass: 'is-expanded',
            retractEventName: 'operationSuccessfulAutoHidePanel'
        });
        
        this.rightPanelComponent = new RightPanelComponent(
            document.getElementById('function-panel'),
            this.eventAggregator,
            this.calculationService
        );

        this.notificationComponent = new NotificationComponent({
            containerElement: document.getElementById('toast-container'),
            eventAggregator: this.eventAggregator
        });

        this.dialogComponent = new DialogComponent({
            overlayElement: document.getElementById('confirmation-dialog-overlay'),
            eventAggregator: this.eventAggregator
        });

        this.initialize();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this._initializeResizeObserver();
    }

    _initializeResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            if (this.leftPanelElement.classList.contains('is-expanded')) {
                this._updateExpandedPanelPosition();
            }
        });
        // Observe the main app container for size changes, which will affect our panel's relative position.
        resizeObserver.observe(this.appElement);
    }

_updateExpandedPanelPosition() {
        if (!this.leftPanelElement || !this.numericKeyboardPanel) return;

        const key7 = this.numericKeyboardPanel.querySelector('#key-7');
        const key0 = this.numericKeyboardPanel.querySelector('#key-0');
        const typeKey = this.numericKeyboardPanel.querySelector('#key-type');

        if (!key7 || !key0 || !typeKey) {
            console.error("One or more reference elements for panel positioning are missing.");
            return;
        }

        const key7Rect = key7.getBoundingClientRect();
        const key0Rect = key0.getBoundingClientRect();
        const typeKeyRect = typeKey.getBoundingClientRect();

        const newTop = key7Rect.top;
        const newWidth = typeKeyRect.left + (typeKeyRect.width / 2);
        const newHeight = key0Rect.bottom - key7Rect.top;

        this.leftPanelElement.style.top = `${newTop}px`;
        this.leftPanelElement.style.width = `${newWidth}px`;
        this.leftPanelElement.style.height = `${newHeight}px`;

        // [FIX ADDED] Set the calculated width as a CSS variable for the toggle to use.
        this.leftPanelElement.style.setProperty('--left-panel-width', `${newWidth}px`);
    }

    render(state) {
        const isDetailView = state.ui.currentView === 'DETAIL_CONFIG';
        this.appElement.classList.toggle('detail-view-active', isDetailView);

        const currentProductKey = state.quoteData.currentProduct;
        const currentProductData = state.quoteData.products[currentProductKey];

        this.tableComponent.render(state);
        this.summaryComponent.render(currentProductData.summary, state.ui.isSumOutdated);
        this.leftPanelComponent.render(state.ui, state.quoteData);
        this.rightPanelComponent.render(state);
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._scrollToActiveCell(state);
    }

    _updateLeftPanelState(currentView) {
        if (this.leftPanelElement) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanelElement.classList.toggle('is-expanded', isExpanded);

            if (isExpanded) {
                // Use setTimeout to ensure the panel is visible and transition has started before calculating.
                setTimeout(() => this._updateExpandedPanelPosition(), 0);
            }
        }
    }

    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiSelectMode, multiSelectSelectedIndexes } = state.ui;
        const currentProductKey = state.quoteData.currentProduct;
        const items = state.quoteData.products[currentProductKey].items;

        const isSingleRowSelected = selectedRowIndex !== null;
        
        let insertDisabled = true;
        if (isSingleRowSelected) {
            const isLastRow = selectedRowIndex === items.length - 1;
            if (!isLastRow) {
                const nextItem = items[selectedRowIndex + 1];
                const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                if (!isNextRowEmpty) { insertDisabled = false; }
            }
        }
        if (this.insertButton) this.insertButton.disabled = insertDisabled;

        let deleteDisabled = true;
        if (isMultiSelectMode) {
            if (multiSelectSelectedIndexes.size > 0) { deleteDisabled = false; }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { deleteDisabled = false; }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        const mSelDisabled = !isSingleRowSelected && !isMultiSelectMode;
        if (this.mSelButton) {
            this.mSelButton.disabled = mSelDisabled;
            this.mSelButton.style.backgroundColor = isMultiSelectMode ? '#f5c6cb' : '';
        }

        if (this.clearButton) this.clearButton.disabled = !isSingleRowSelected;
    }
    
    _scrollToActiveCell(state) {
        if (!state.ui.activeCell) return;
        const { rowIndex, column } = state.ui.activeCell;
        const activeCellElement = document.querySelector(`tr[data-row-index="${rowIndex}"] td[data-column="${column}"]`);
        if (activeCellElement) {
            activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }
}