// File: 04-core-code/services/ui-service.js

/**
 * @fileoverview A dedicated service for managing all UI-related state.
 * Acts as the single source of truth for the UI state.
 */
export class UIService {
    constructor(initialUIState) {
        this.state = JSON.parse(JSON.stringify(initialUIState));
        
        this.state.isMultiSelectMode = false;
        this.state.multiSelectSelectedIndexes = new Set();
        this.state.locationInputValue = '';
        this.state.targetCell = null;
        this.state.activeEditMode = null;
        
        this.state.lfSelectedRowIndexes = new Set();
        this.state.lfModifiedRowIndexes = new Set();

        this.state.dualChainMode = null;
        this.state.dualChainInputValue = '';
        this.state.dualPrice = null;

        this.state.welcomeDialogShown = false;

        this._initializeDriveAccessoryState();
        this._initializeF2SummaryState();
        
        console.log("UIService Initialized.");
    }

    _initializeDriveAccessoryState() {
        this.state.driveAccessoryMode = null;
        this.state.driveRemoteCount = 0;
        this.state.driveChargerCount = 0;
        this.state.driveCordCount = 0;
        
        this.state.driveWinderTotalPrice = null;
        this.state.driveMotorTotalPrice = null;
        this.state.driveRemoteTotalPrice = null;
        this.state.driveChargerTotalPrice = null;
        this.state.driveCordTotalPrice = null;
        this.state.driveGrandTotal = null;
        
        this.state.summaryWinderPrice = null;
        this.state.summaryMotorPrice = null;
        this.state.summaryRemotePrice = null;
        this.state.summaryChargerPrice = null;
        this.state.summaryCordPrice = null;
        this.state.summaryAccessoriesTotal = null;
        
        // [REMOVED] This state is no longer needed after simplifying the remote selection flow.
        // this.state.driveSelectedRemoteCostKey = null;
    }

    _initializeF2SummaryState() {
        this.state.f2 = {
            // Inputs (QTY & values)
            wifiQty: null,
            deliveryQty: null,
            installQty: null,
            removalQty: null,
            mulTimes: null,
            discount: null,
            
            // Calculated Values from Inputs
            wifiSum: null,
            deliveryFee: null,
            installFee: null,
            removalFee: null,

            // Strikethrough feature state
            deliveryFeeExcluded: false,
            installFeeExcluded: false,
            removalFeeExcluded: false,

            // Calculated Sums
            acceSum: null,
            eAcceSum: null,
            surchargeFee: null,

            // Bottom Section Values
            totalSumForRbTime: null,
            firstRbPrice: null,
            disRbPrice: null,
            singleprofit: null,
            rbProfit: null,
            sumPrice: null,
            sumProfit: null,
            gst: null,
            netProfit: null
        };
    }

    getState() {
        return this.state;
    }

    reset(initialUIState) {
        this.state = JSON.parse(JSON.stringify(initialUIState));
        this.state.isMultiSelectMode = false;
        this.state.multiSelectSelectedIndexes = new Set();
        this.state.locationInputValue = '';
        this.state.targetCell = null;
        this.state.activeEditMode = null;
        
        this.state.lfSelectedRowIndexes = new Set();
        this.state.lfModifiedRowIndexes = new Set();

        this.state.dualChainMode = null;
        this.state.dualChainInputValue = '';
        this.state.dualPrice = null;

        this.state.welcomeDialogShown = false;

        this._initializeDriveAccessoryState();
        this._initializeF2SummaryState();
    }

    setWelcomeDialogShown(wasShown) {
        this.state.welcomeDialogShown = wasShown;
    }

    setActiveCell(rowIndex, column) {
        this.state.activeCell = { rowIndex, column };
        this.state.inputMode = column;
    }

    setInputValue(value) {
        this.state.inputValue = String(value || '');
    }

    appendInputValue(key) {
        this.state.inputValue += key;
    }

    deleteLastInputChar() {
        this.state.inputValue = this.state.inputValue.slice(0, -1);
    }

    clearInputValue() {
        this.state.inputValue = '';
    }

    toggleRowSelection(rowIndex) {
        this.state.selectedRowIndex = (this.state.selectedRowIndex === rowIndex) ? null : rowIndex;
    }

    clearRowSelection() {
        this.state.selectedRowIndex = null;
    }

    toggleMultiSelectMode() {
        const isEnteringMode = !this.state.isMultiSelectMode;
        this.state.isMultiSelectMode = isEnteringMode;
        this.state.multiSelectSelectedIndexes.clear();

        if (isEnteringMode && this.state.selectedRowIndex !== null) {
            this.state.multiSelectSelectedIndexes.add(this.state.selectedRowIndex);
        }
        
        this.clearRowSelection();

        return isEnteringMode;
    }
    
    toggleMultiSelectSelection(rowIndex) {
        if (this.state.multiSelectSelectedIndexes.has(rowIndex)) {
            this.state.multiSelectSelectedIndexes.delete(rowIndex);
        } else {
            this.state.multiSelectSelectedIndexes.add(rowIndex);
        }
    }

    clearMultiSelectSelection() {
        this.state.multiSelectSelectedIndexes.clear();
    }

    setSumOutdated(isOutdated) {
        this.state.isSumOutdated = isOutdated;
    }

    setCurrentView(viewName) {
        this.state.currentView = viewName;
    }

    setVisibleColumns(columns) {
        this.state.visibleColumns = columns;
    }
    
    setActiveTab(tabId) {
        this.state.activeTabId = tabId;
    }

    setLocationInputValue(value) {
        this.state.locationInputValue = value;
    }

    setTargetCell(cell) {
        this.state.targetCell = cell;
    }

    setActiveEditMode(mode) {
        this.state.activeEditMode = mode;
    }

    toggleLFSelection(rowIndex) {
        if (this.state.lfSelectedRowIndexes.has(rowIndex)) {
            this.state.lfSelectedRowIndexes.delete(rowIndex);
        } else {
            this.state.lfSelectedRowIndexes.add(rowIndex);
        }
    }

    clearLFSelection() {
        this.state.lfSelectedRowIndexes.clear();
    }

    addLFModifiedRows(rowIndexes) {
        for (const index of rowIndexes) {
            this.state.lfModifiedRowIndexes.add(index);
        }
    }

    removeLFModifiedRows(rowIndexes) {
        for (const index of rowIndexes) {
            this.state.lfModifiedRowIndexes.delete(index);
        }
    }
    
    hasLFModifiedRows() {
        return this.state.lfModifiedRowIndexes.size > 0;
    }

    setDualChainMode(mode) {
        this.state.dualChainMode = mode;
    }

    setDualChainInputValue(value) {
        this.state.dualChainInputValue = String(value || '');
    }
    
    clearDualChainInputValue() {
        this.state.dualChainInputValue = '';
    }
    
    setDualPrice(price) {
        this.state.dualPrice = price;
    }

    setDriveAccessoryMode(mode) {
        this.state.driveAccessoryMode = mode;
    }
    
    setDriveAccessoryCount(accessory, count) {
        if (count < 0) return;
        switch(accessory) {
            case 'remote': this.state.driveRemoteCount = count; break;
            case 'charger': this.state.driveChargerCount = count; break;
            case 'cord': this.state.driveCordCount = count; break;
        }
    }
    
    // [REMOVED] This setter is no longer needed.
    // setDriveSelectedRemoteCostKey(key) {
    //     this.state.driveSelectedRemoteCostKey = key;
    // }

    setDriveAccessoryTotalPrice(accessory, price) {
        switch(accessory) {
            case 'winder': this.state.driveWinderTotalPrice = price; break;
            case 'motor': this.state.driveMotorTotalPrice = price; break;
            case 'remote': this.state.driveRemoteTotalPrice = price; break;
            case 'charger': this.state.driveChargerTotalPrice = price; break;
            case 'cord': this.state.driveCordTotalPrice = price; break;
        }
    }

    setDriveGrandTotal(price) {
        this.state.driveGrandTotal = price;
    }

    setSummaryWinderPrice(value) {
        this.state.summaryWinderPrice = value;
    }

    setSummaryMotorPrice(value) {
        this.state.summaryMotorPrice = value;
    }

    setSummaryRemotePrice(value) {
        this.state.summaryRemotePrice = value;
    }

    setSummaryChargerPrice(value) {
        this.state.summaryChargerPrice = value;
    }

    setSummaryCordPrice(value) {
        this.state.summaryCordPrice = value;
    }

    setSummaryAccessoriesTotal(value) {
        this.state.summaryAccessoriesTotal = value;
    }

    setF1RemoteDistribution(qty1, qty16) {
        this.state.f1_remote_1ch_qty = qty1;
        this.state.f1_remote_16ch_qty = qty16;
    }

    setF2Value(key, value) {
        if (this.state.f2.hasOwnProperty(key)) {
            this.state.f2[key] = value;
        }
    }

    toggleF2FeeExclusion(feeType) {
        const key = `${feeType}FeeExcluded`;
        if (this.state.f2.hasOwnProperty(key)) {
            this.state.f2[key] = !this.state.f2[key];
        }
    }
}