// File: 04-core-code/ui/views/detail-config-view.js

/**
 * @fileoverview A "Manager" view that delegates logic to specific sub-views for each tab.
 */

// [HOTFIX] Added the missing 'export' keyword to the class declaration.
export class DetailConfigView {
    constructor({ 
        quoteService, 
        uiService, 
        calculationService, 
        eventAggregator, 
        publishStateChangeCallback,
        // Sub-views are injected here
        k1LocationView,
        k2FabricView,
        k3OptionsView,
        driveAccessoriesView,
        dualChainView
    }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.calculationService = calculationService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;

        // Store instances of sub-views
        this.k1View = k1LocationView;
        this.k2View = k2FabricView;
        this.k3View = k3OptionsView;
        this.driveAccessoriesView = driveAccessoriesView;
        this.dualChainView = dualChainView;

        console.log("DetailConfigView Refactored as a Manager View.");
    }

    activateTab(tabId) {
        this.uiService.setActiveTab(tabId);

        switch (tabId) {
            case 'k1-tab':
                this.k1View.activate();
                break;
            case 'k2-tab':
                this.k2View.activate();
                this.k2View._updatePanelInputsState();
                break;
            case 'k3-tab':
                this.k3View.activate();
                break;
            case 'k4-tab': 
                this.driveAccessoriesView.activate();
                break;
            case 'k5-tab': 
                this.dualChainView.activate();
                break;
            default:
                break;
        }
        this.publish();
    }
    
    // --- Event Handlers that delegate to sub-views ---

    handleFocusModeRequest({ column }) {
        if (column === 'location') {
            this.k1View.handleFocusModeRequest();
            return;
        }
        if (column === 'fabric') {
            this.k2View.handleFocusModeRequest();
            return;
        }
    }
    
    handleLocationInputEnter({ value }) {
        this.k1View.handleLocationInputEnter({ value });
    }

    handlePanelInputBlur({ type, field, value }) {
        this.k2View.handlePanelInputBlur({ type, field, value });
    }

    handlePanelInputEnter() {
        this.k2View.handlePanelInputEnter();
    }

    handleSequenceCellClick({ rowIndex }) {
        const { activeEditMode } = this.uiService.getState();
        if (activeEditMode === 'K2_LF_SELECT' || activeEditMode === 'K2_LF_DELETE_SELECT') {
            this.k2View.handleSequenceCellClick({ rowIndex });
        }
    }

    handleLFEditRequest() {
        this.k2View.handleLFEditRequest();
    }

    handleLFDeleteRequest() {
        this.k2View.handleLFDeleteRequest();
    }
    
    handleToggleK3EditMode() {
        this.k3View.handleToggleK3EditMode();
    }

    handleBatchCycle({ column }) {
        this.k3View.handleBatchCycle({ column });
    }

    handleDualChainModeChange({ mode }) {
        this.dualChainView.handleModeChange({ mode });
    }

    handleChainEnterPressed({ value }) {
        this.dualChainView.handleChainEnterPressed({ value });
    }



    handleDriveModeChange({ mode }) {
        this.driveAccessoriesView.handleModeChange({ mode });
    }

    handleAccessoryCounterChange({ accessory, direction }) {
        this.driveAccessoriesView.handleCounterChange({ accessory, direction });
    }

    handleTableCellClick({ rowIndex, column }) {
        const { activeEditMode, dualChainMode, driveAccessoryMode } = this.uiService.getState();
        
        if (driveAccessoryMode) {
            this.driveAccessoriesView.handleTableCellClick({ rowIndex, column });
            return;
        }

        if (activeEditMode === 'K1') {
            this.k1View.handleTableCellClick({ rowIndex });
            return;
        }
        
        if (activeEditMode === 'K3') {
            this.k3View.handleTableCellClick({ rowIndex, column });
            return;
        }

        if (dualChainMode) {
            this.dualChainView.handleTableCellClick({ rowIndex, column });
            return;
        }
    }
    
    initializePanelState() {
        this.k2View._updatePanelInputsState();
    }
}