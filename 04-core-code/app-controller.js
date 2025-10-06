// File: 04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ eventAggregator, uiService, quoteService, fileService, quickQuoteView, detailConfigView, calculationService, productFactory }) {
        this.eventAggregator = eventAggregator;
        this.uiService = uiService;
        this.quoteService = quoteService;
        this.fileService = fileService;
        this.quickQuoteView = quickQuoteView;
        this.detailConfigView = detailConfigView;
        this.calculationService = calculationService;
        this.productFactory = productFactory;

        this.f2InputSequence = [
            'f2-b10-wifi-qty', 'f2-b13-delivery-qty', 'f2-b14-install-qty',
            'f2-b15-removal-qty', 'f2-b17-mul-times', 'f2-b18-discount'
        ];

        this.autoSaveTimerId = null;
        console.log("AppController (Refactored with grouped subscriptions) Initialized.");
        this.initialize();
    }

    initialize() {
        this._subscribeQuickQuoteEvents();
        this._subscribeDetailViewEvents();
        this._subscribeGlobalEvents();
        this._subscribeF2Events();
        
        this._startAutoSave();
    }
    
    _subscribeQuickQuoteEvents() {
        const delegate = (handlerName, ...args) => this.quickQuoteView[handlerName](...args);

        this.eventAggregator.subscribe('numericKeyPressed', (data) => delegate('handleNumericKeyPress', data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => delegate('handleInsertRow'));
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => delegate('handleDeleteRow'));
        this.eventAggregator.subscribe('userRequestedSave', () => delegate('handleSaveToFile'));
        this.eventAggregator.subscribe('userRequestedExportCSV', () => delegate('handleExportCSV'));
        this.eventAggregator.subscribe('userRequestedReset', () => delegate('handleReset', initialState.ui));
        this.eventAggregator.subscribe('userRequestedClearRow', () => delegate('handleClearRow'));
        this.eventAggregator.subscribe('userMovedActiveCell', (data) => delegate('handleMoveActiveCell', data));
        this.eventAggregator.subscribe('userRequestedCycleType', () => delegate('handleCycleType'));
        this.eventAggregator.subscribe('userRequestedCalculateAndSum', () => delegate('handleCalculateAndSum'));
        this.eventAggregator.subscribe('userToggledMultiSelectMode', () => delegate('handleToggleMultiSelectMode'));
        this.eventAggregator.subscribe('userChoseSaveThenLoad', () => delegate('handleSaveThenLoad'));
        this.eventAggregator.subscribe('typeCellLongPressed', (data) => delegate('handleTypeCellLongPress', data));
        this.eventAggregator.subscribe('typeButtonLongPressed', (data) => delegate('handleTypeButtonLongPress', data));
        this.eventAggregator.subscribe('userRequestedMultiTypeSet', () => delegate('handleMultiTypeSet'));
    }

    _subscribeDetailViewEvents() {
        const delegate = (handlerName, data) => {
            if (this.uiService.getState().currentView === 'DETAIL_CONFIG') {
                this.detailConfigView[handlerName](data);
            }
        };
        
        this.eventAggregator.subscribe('tableCellClicked', (data) => {
            const currentView = this.uiService.getState().currentView;
            if (currentView === 'QUICK_QUOTE') {
                this.quickQuoteView.handleTableCellClick(data);
            } else {
                this.detailConfigView.handleTableCellClick(data);
            }
        });
         this.eventAggregator.subscribe('sequenceCellClicked', (data) => {
            const currentView = this.uiService.getState().currentView;
            if (currentView === 'QUICK_QUOTE') {
                this.quickQuoteView.handleSequenceCellClick(data);
            } else {
                this.detailConfigView.handleSequenceCellClick(data);
            }
        });

        // Detail Config View Specific Events
        this.eventAggregator.subscribe('userRequestedFocusMode', (data) => delegate('handleFocusModeRequest', data));
        this.eventAggregator.subscribe('panelInputEnterPressed', (data) => delegate('handlePanelInputEnter', data));
        this.eventAggregator.subscribe('panelInputBlurred', (data) => delegate('handlePanelInputBlur', data));
        this.eventAggregator.subscribe('locationInputEnterPressed', (data) => delegate('handleLocationInputEnter', data));
        this.eventAggregator.subscribe('userRequestedLFEditMode', () => delegate('handleLFEditRequest'));
        this.eventAggregator.subscribe('userRequestedLFDeleteMode', () => delegate('handleLFDeleteRequest'));
        this.eventAggregator.subscribe('userToggledK3EditMode', () => delegate('handleToggleK3EditMode'));
        this.eventAggregator.subscribe('userRequestedBatchCycle', (data) => delegate('handleBatchCycle', data));
        
        this.eventAggregator.subscribe('dualChainModeChanged', (data) => delegate('handleDualChainModeChange', data));
        this.eventAggregator.subscribe('chainEnterPressed', (data) => delegate('handleChainEnterPressed', data));
        this.eventAggregator.subscribe('driveModeChanged', (data) => delegate('handleDriveModeChange', data));
        this.eventAggregator.subscribe('accessoryCounterChanged', (data) => delegate('handleAccessoryCounterChange', data));

        // [REMOVED] The subscription for the complex remote selection flow is no longer needed.
        // this.eventAggregator.subscribe('userInitiatedRemoteSelection', () => this._handleRemoteSelection());
    }

    _subscribeGlobalEvents() {
        this.eventAggregator.subscribe('userNavigatedToDetailView', () => this._handleNavigationToDetailView());
        this.eventAggregator.subscribe('userNavigatedToQuickQuoteView', () => this._handleNavigationToQuickQuoteView());
        this.eventAggregator.subscribe('userSwitchedTab', (data) => this._handleTabSwitch(data));
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleUserRequestedLoad());
        this.eventAggregator.subscribe('userChoseLoadDirectly', () => this._handleLoadDirectly());
        this.eventAggregator.subscribe('fileLoaded', (data) => this._handleFileLoad(data));
        
        this.eventAggregator.subscribe('costDiscountEntered', (data) => this._handleCostDiscountEntered(data));
        this.eventAggregator.subscribe('userRequestedRemoteDistribution', () => this._handleRemoteDistributionRequest());
    }

    _subscribeF2Events() {
        this.eventAggregator.subscribe('f2TabActivated', () => this._handleF2TabActivation());
        this.eventAggregator.subscribe('f2ValueChanged', (data) => this._handleF2ValueChange(data));
        this.eventAggregator.subscribe('f2InputEnterPressed', (data) => this._focusNextF2Input(data.id));
        this.eventAggregator.subscribe('toggleFeeExclusion', (data) => this._handleToggleFeeExclusion(data));
    }
    
    _handleCostDiscountEntered({ percentage }) {
        this.quoteService.setCostDiscount(percentage);
    }
    
    // [REMOVED] All methods related to the multi-step remote selection dialog are now obsolete and have been removed.
    // _cancelRemoteSelection() { ... }
    // _setSelectedRemoteAndActivate(costKey) { ... }
    // _showAlphaRemoteDialog() { ... }
    // _showLinxRemoteDialog() { ... }
    // _handleRemoteSelection() { ... }

    _handleToggleFeeExclusion({ feeType }) {
        this.uiService.toggleF2FeeExclusion(feeType);
        this._calculateF2Summary();
    }

    _handleF2ValueChange({ id, value }) {
        const numericValue = value === '' ? null : parseFloat(value);
        let keyToUpdate = null;

        switch (id) {
            case 'f2-b10-wifi-qty': keyToUpdate = 'wifiQty'; break;
            case 'f2-b13-delivery-qty': keyToUpdate = 'deliveryQty'; break;
            case 'f2-b14-install-qty': keyToUpdate = 'installQty'; break;
            case 'f2-b15-removal-qty': keyToUpdate = 'removalQty'; break;
            case 'f2-b17-mul-times': keyToUpdate = 'mulTimes'; break;
            case 'f2-b18-discount': keyToUpdate = 'discount'; break;
        }

        if (keyToUpdate) {
            this.uiService.setF2Value(keyToUpdate, numericValue);
            this._calculateF2Summary();
        }
    }

    _focusNextF2Input(currentId) {
        const currentIndex = this.f2InputSequence.indexOf(currentId);
        if (currentIndex > -1) {
            const nextIndex = (currentIndex + 1) % this.f2InputSequence.length;
            const nextElementId = this.f2InputSequence[nextIndex];
            this.eventAggregator.publish('focusElement', { elementId: nextElementId });
        }
    }
    
    _handleF2TabActivation() {
        const productStrategy = this.productFactory.getProductStrategy(this.quoteService.getCurrentProductType());
        const { updatedQuoteData } = this.calculationService.calculateAndSum(this.quoteService.getQuoteData(), productStrategy);
        this.quoteService.quoteData = updatedQuoteData;
        
        this.detailConfigView.driveAccessoriesView.recalculateAllDriveAccessoryPrices();
        
        // [FIX] Updated the function call to the new, refactored method in dual-chain-view.js
        this.detailConfigView.dualChainView._calculateAndStoreDualPrice();

        this._calculateF2Summary();
        
        this.eventAggregator.publish('focusElement', { elementId: 'f2-b10-wifi-qty' });
    }

    _calculateF2Summary() {
        const quoteData = this.quoteService.getQuoteData();
        const f2State = this.uiService.getState().f2;

        const summaryValues = this.calculationService.calculateF2Summary(quoteData, f2State);

        // Update the UI with the new values
        for (const key in summaryValues) {
            this.uiService.setF2Value(key, summaryValues[key]);
        }

        this._publishStateChange();
    }
    
    _handleNavigationToDetailView() {
        const currentView = this.uiService.getState().currentView;
        if (currentView === 'QUICK_QUOTE') {
            this.uiService.setCurrentView('DETAIL_CONFIG');
            this.detailConfigView.activateTab('k1-tab'); 
        } else {
            this.uiService.setCurrentView('QUICK_QUOTE');
            this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
            this._publishStateChange();
        }
    }

    _handleNavigationToQuickQuoteView() {
        this.uiService.setCurrentView('QUICK_QUOTE');
        this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
        this._publishStateChange();
    }

    _handleTabSwitch({ tabId }) {
        this.detailConfigView.activateTab(tabId);
    }

    _handleUserRequestedLoad() {
        if (this.quoteService.hasData()) {
            this.eventAggregator.publish('showLoadConfirmationDialog');
        } else {
            this.eventAggregator.publish('triggerFileLoad');
        }
    }

    _handleLoadDirectly() {
        this.eventAggregator.publish('triggerFileLoad');
    }

    _handleFileLoad({ fileName, content }) {
        const result = this.fileService.parseFileContent(fileName, content);
        if (result.success) {
            this.quoteService.quoteData = result.data;
            this.uiService.reset(initialState.ui);
            this.uiService.setSumOutdated(true);
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: result.message });
        } else {
            this.eventAggregator.publish('showNotification', { message: result.message, type: 'error' });
        }
    }
    
    _getFullState() {
        return {
            ui: this.uiService.getState(),
            quoteData: this.quoteService.getQuoteData()
        };
    }
    
    publishInitialState() { this._publishStateChange(); }
    _publishStateChange() {
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    _handleRemoteDistributionRequest() {
        const uiState = this.uiService.getState();
        const totalRemoteCount = uiState.driveRemoteCount || 0;

        // Use current distribution if available, otherwise default to 0 and total
        const initial1ch = uiState.f1_remote_1ch_qty;
        const initial16ch = (uiState.f1_remote_16ch_qty === null) ? totalRemoteCount : uiState.f1_remote_16ch_qty;

        this.eventAggregator.publish('showConfirmationDialog', {
            message: `Total remotes: ${totalRemoteCount}. Please distribute them.`,
            layout: [
                [
                    { type: 'text', text: '1-Ch Qty:', className: 'dialog-label' },
                    { type: 'input', id: 'dialog-input-1ch', value: initial1ch },
                    { type: 'text', text: '16-Ch Qty:', className: 'dialog-label' },
                    { type: 'input', id: 'dialog-input-16ch', value: initial16ch }
                ],
                [
                    {
                        type: 'button',
                        text: 'Confirm',
                        className: 'primary-confirm-button',
                        colspan: 2,
                        callback: () => {
                            const input1ch = document.getElementById('dialog-input-1ch');
                            const input16ch = document.getElementById('dialog-input-16ch');
                            const qty1ch = parseInt(input1ch.value, 10);
                            const qty16ch = parseInt(input16ch.value, 10);

                            if (isNaN(qty1ch) || isNaN(qty16ch) || qty1ch < 0 || qty16ch < 0) {
                                this.eventAggregator.publish('showNotification', { message: 'Quantities must be positive numbers.', type: 'error' });
                                return false; // Prevent closing
                            }

                            if (qty1ch + qty16ch !== totalRemoteCount) {
                                this.eventAggregator.publish('showNotification', {
                                    message: `Total must equal ${totalRemoteCount}. Current total: ${qty1ch + qty16ch}.`,
                                    type: 'error'
                                });
                                return false; // Prevent closing
                            }

                            this.uiService.setF1RemoteDistribution(qty1ch, qty16ch);
                            this._publishStateChange();
                            return true; // Allow closing
                        }
                    },
                    { type: 'button', text: 'Cancel', className: 'secondary', colspan: 2, callback: () => {} }
                ]
            ],
            closeOnOverlayClick: false // Prevent accidental closing
        });
    }

    _startAutoSave() {
        if (this.autoSaveTimerId) { clearInterval(this.autoSaveTimerId); }
        this.autoSaveTimerId = setInterval(() => this._handleAutoSave(), AUTOSAVE_INTERVAL_MS);
    }

    _handleAutoSave() {
        try {
            const items = this.quoteService.getItems();
            if (!items) return;
            const hasContent = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
            if (hasContent) {
                const dataToSave = JSON.stringify(this.quoteService.getQuoteData());
                localStorage.setItem(AUTOSAVE_STORAGE_KEY, dataToSave);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}