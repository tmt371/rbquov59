/**
 * @fileoverview A dedicated component for managing and rendering the Right Panel UI.
 */
export class RightPanelComponent {
    constructor(panelElement, eventAggregator, calculationService) {
        if (!panelElement) {
            throw new Error("Panel element is required for RightPanelComponent.");
        }
        this.panelElement = panelElement;
        this.eventAggregator = eventAggregator;
        this.calculationService = calculationService;

        this.tabContainer = this.panelElement.querySelector('.tab-container');
        this.tabButtons = this.panelElement.querySelectorAll('.tab-button');
        this.tabContents = this.panelElement.querySelectorAll('.tab-content');

        this.f1ManualPrices = {};
        this.f1LinkedPrices = {}; // [FIX] Initialize object to store linked prices

        this._cacheF1Elements();
        this._cacheF2Elements();
        this.initialize();
        console.log("RightPanelComponent Initialized for F1 Cost Display.");
    }

    initialize() {
        // --- Global Tab Click Handler ---
        if (this.tabContainer) {
            this.tabContainer.addEventListener('click', (event) => {
                const target = event.target.closest('.tab-button');
                if (target && !target.disabled) {
                    this._setActiveTab(target);
                }
            });
        }

        this._initializeF1ButtonListeners();
        this._initializeF1InputListeners();
        this._initializeF2Listeners();

        this.eventAggregator.subscribe('focusElement', ({ elementId }) => {
            const element = this.panelElement.querySelector(`#${elementId}`);
            if (element) {
                element.focus();
                element.select();
            }
        });
    }

    _initializeF1ButtonListeners() {
        const buttonEventMap = {
            'f1-key-insert': 'userRequestedInsertRow',
            'f1-key-delete': 'userRequestedDeleteRow',
            'f1-key-save': 'userRequestedSave',
            'f1-key-load': 'userRequestedLoad',
            'f1-key-export': 'userRequestedExportCSV',
            'f1-key-m-sel': 'userToggledMultiSelectMode',
            'f1-key-t-set': 'userRequestedMultiTypeSet',
            'f1-key-reset': 'userRequestedReset'
        };

        for (const [id, eventName] of Object.entries(buttonEventMap)) {
            const button = this.f1.buttons[id];
            if (button) {
                button.addEventListener('click', () => this.eventAggregator.publish(eventName));
            }
        }

        // Add listener for the new clickable remote quantity div
        const remote1chQtyDiv = this.f1.inputs['remote-1ch'];
        if (remote1chQtyDiv) {
            remote1chQtyDiv.addEventListener('click', () => this.eventAggregator.publish('userRequestedRemoteDistribution'));
        }
    }

    _initializeF1InputListeners() {
        // Only listen to the inputs that are still manually editable
        const manualInputs = ['dual-combo', 'slim'];
        manualInputs.forEach(key => {
            const inputElement = this.f1.inputs[key];
            if (inputElement) {
                inputElement.addEventListener('input', (event) => {
                    this._handleF1ManualInputChange(key, event.target.value);
                });
            }
        });
    }

    _handleF1ManualInputChange(componentKey, value) {
        const quantity = value === '' ? 0 : parseInt(value, 10);
        if (isNaN(quantity) || quantity < 0) return;

        // Note: For manual inputs, we still use the flexible calculation service
        const price = this.calculationService.calculateF1ComponentPrice(componentKey, quantity);
        this.f1ManualPrices[componentKey] = price;

        // [FIX] Correctly access the nested price display element
        const priceElement = this.f1.displays.price[componentKey];
        if (priceElement) {
            priceElement.textContent = price > 0 ? `$${price.toFixed(2)}` : '';
        }

        this._updateF1Total();
    }

    _updateF1Total() {
        // [FIX] Use class properties to ensure both manual and linked prices are available
        const manualTotal = Object.values(this.f1ManualPrices).reduce((sum, price) => sum + (price || 0), 0);
        const linkedTotal = Object.values(this.f1LinkedPrices).reduce((sum, price) => sum + (price || 0), 0);
        const total = manualTotal + linkedTotal;

        if (this.f1.total) {
            this.f1.total.textContent = total > 0 ? `$${total.toFixed(2)}` : '';
        }
    }

    _cacheF1Elements() {
        const query = (id) => this.panelElement.querySelector(id);
        this.f1 = {
            buttons: {
                'f1-key-insert': query('#f1-key-insert'),
                'f1-key-delete': query('#f1-key-delete'),
                'f1-key-save': query('#f1-key-save'),
                'f1-key-load': query('#f1-key-load'),
                'f1-key-export': query('#f1-key-export'),
                'f1-key-m-sel': query('#f1-key-m-sel'),
                'f1-key-t-set': query('#f1-key-t-set'),
                'f1-key-reset': query('#f1-key-reset'),
            },
            inputs: {
                'remote-1ch': query('#f1-qty-remote-1ch'),
                'dual-combo': query('#f1-qty-dual-combo'),
                'slim': query('#f1-qty-slim'),
            },
            displays: {
                qty: {
                    'winder': query('#f1-qty-winder'),
                    'motor': query('#f1-qty-motor'),
                    'remote-16ch': query('#f1-qty-remote-16ch'),
                    'charger': query('#f1-qty-charger'),
                    '3m-cord': query('#f1-qty-3m-cord'),
                },
                price: {
                    'winder': query('#f1-price-winder'),
                    'motor': query('#f1-price-motor'),
                    'remote-1ch': query('#f1-price-remote-1ch'),
                    'remote-16ch': query('#f1-price-remote-16ch'),
                    'charger': query('#f1-price-charger'),
                    '3m-cord': query('#f1-price-3m-cord'),
                    'dual-combo': query('#f1-price-dual-combo'),
                    'slim': query('#f1-price-slim'),
                }
            },
            total: query('#f1-price-total')
        };
    }

    _initializeF2Listeners() {
        const setupF2InputListener = (inputElement) => {
            if (inputElement) {
                inputElement.addEventListener('change', (event) => {
                    this.eventAggregator.publish('f2ValueChanged', { id: event.target.id, value: event.target.value });
                });
                
                inputElement.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        this.eventAggregator.publish('f2InputEnterPressed', { id: event.target.id });
                    }
                });
            }
        };

        const f2Inputs = [
            this.f2.b10_wifiQty, this.f2.b13_deliveryQty, this.f2.b14_installQty,
            this.f2.b15_removalQty, this.f2.b17_mulTimes, this.f2.b18_discount
        ];
        f2Inputs.forEach(input => setupF2InputListener(input));

        const feeCells = [
            { el: this.f2.c13_deliveryFee, type: 'delivery' },
            { el: this.f2.c14_installFee, type: 'install' },
            { el: this.f2.c15_removalFee, type: 'removal' }
        ];
        feeCells.forEach(({ el, type }) => {
            if (el) {
                el.addEventListener('click', () => {
                    this.eventAggregator.publish('toggleFeeExclusion', { feeType: type });
                });
            }
        });
    }

    _cacheF2Elements() {
        const query = (id) => this.panelElement.querySelector(id);
        this.f2 = {
            b2_winderPrice: query('#f2-b2-winder-price'),
            b3_dualPrice: query('#f2-b3-dual-price'),
            b4_acceSum: query('#f2-b4-acce-sum'),
            b6_motorPrice: query('#f2-b6-motor-price'),
            b7_remotePrice: query('#f2-b7-remote-price'),
            b8_chargerPrice: query('#f2-b8-charger-price'),
            b9_cordPrice: query('#f2-b9-cord-price'),
            b10_wifiQty: query('#f2-b10-wifi-qty'),
            c10_wifiSum: query('#f2-c10-wifi-sum'),
            b11_eAcceSum: query('#f2-b11-e-acce-sum'),
            b13_deliveryQty: query('#f2-b13-delivery-qty'),
            c13_deliveryFee: query('#f2-c13-delivery-fee'),
            b14_installQty: query('#f2-b14-install-qty'),
            c14_installFee: query('#f2-c14-install-fee'),
            b15_removalQty: query('#f2-b15-removal-qty'),
            c15_removalFee: query('#f2-c15-removal-fee'),
            b16_surchargeFee: query('#f2-b16-surcharge-fee'),
            a17_totalSum: query('#f2-a17-total-sum'),
            b17_mulTimes: query('#f2-b17-mul-times'),
            c17_1stRbPrice: query('#f2-c17-1st-rb-price'),
            b18_discount: query('#f2-b18-discount'),
            b19_disRbPrice: query('#f2-b19-dis-rb-price'),
            b20_singleprofit: query('#f2-b20-singleprofit'),
            b21_rbProfit: query('#f2-b21-rb-profit'),
            b22_sumprice: query('#f2-b22-sumprice'),
            b23_sumprofit: query('#f2-b23-sumprofit'),
            b24_gst: query('#f2-b24-gst'),
            b25_netprofit: query('#f2-b25-netprofit'),
        };
    }

    render(state) {
        this._renderF1Tab(state);
        this._renderF2Tab(state);
    }

    _renderF1Tab(state) {
        if (!this.f1 || !state || !state.quoteData || !state.ui) return;

        const items = state.quoteData.products.rollerBlind.items;
        const uiState = state.ui;
        const formatPrice = (price) => (price > 0 ? `$${price.toFixed(2)}` : '');

        // --- Handle Linked Items (Winder, Motor, Charger, Cord) ---
        const linkedQuantities = {
            winder: items.filter(item => item.winder === 'HD').length,
            motor: items.filter(item => !!item.motor).length,
            charger: uiState.driveChargerCount,
            '3m-cord': uiState.driveCordCount
        };

        const multipliers = { winder: 8, motor: 160, charger: 25, '3m-cord': 5 };
        this.f1LinkedPrices = {};

        for (const [key, qty] of Object.entries(linkedQuantities)) {
            if (this.f1.displays.qty[key]) {
                this.f1.displays.qty[key].textContent = qty || '0';
            }
            const price = (qty || 0) * (multipliers[key] || 0);
            this.f1LinkedPrices[key] = price;
            if (this.f1.displays.price[key]) {
                this.f1.displays.price[key].textContent = formatPrice(price);
            }
        }

        // --- Handle Remote Distribution ---
        const totalRemoteQty = uiState.driveRemoteCount || 0;
        let qty1ch = uiState.f1_remote_1ch_qty;
        let qty16ch = uiState.f1_remote_16ch_qty;

        // Initialize distribution if not set
        if (qty16ch === null) {
            qty1ch = 0;
            qty16ch = totalRemoteQty;
            // We don't directly modify state here, just for rendering.
            // The dialog confirmation will set the state permanently.
        }

        // Render quantities
        if (this.f1.inputs['remote-1ch']) {
            this.f1.inputs['remote-1ch'].textContent = qty1ch;
        }
        if (this.f1.displays.qty['remote-16ch']) {
            this.f1.displays.qty['remote-16ch'].textContent = qty16ch;
        }

        // Calculate and render prices using the service for consistency
        const price1ch = this.calculationService.calculateF1ComponentPrice('remote-1ch', qty1ch);
        const price16ch = this.calculationService.calculateF1ComponentPrice('remote-16ch', qty16ch);

        if (this.f1.displays.price['remote-1ch']) {
            this.f1.displays.price['remote-1ch'].textContent = formatPrice(price1ch);
        }
        if (this.f1.displays.price['remote-16ch']) {
            this.f1.displays.price['remote-16ch'].textContent = formatPrice(price16ch);
        }

        // Add remote prices to the linked prices for total calculation
        this.f1LinkedPrices['remote-1ch'] = price1ch;
        this.f1LinkedPrices['remote-16ch'] = price16ch;

        this._updateF1Total();
    }

    _renderF2Tab(state) {
        if (!state || !state.ui.f2 || !this.f2.b2_winderPrice) return;
        
        const f2State = state.ui.f2;
        const productSummary = state.quoteData.products[state.quoteData.currentProduct]?.summary;
        const accessories = productSummary?.accessories || {};

        const formatIntegerCurrency = (value) => (typeof value === 'number') ? `$${value.toFixed(0)}` : '$';
        const formatDecimalCurrency = (value) => (typeof value === 'number') ? `$${value.toFixed(2)}` : '$';
        const formatValue = (value) => (value !== null && value !== undefined) ? value : '';

        // Read accessory prices directly from the quoteData summary object.
        const winderPrice = accessories.winderCostSum || 0;
        const dualPrice = accessories.dualCostSum || 0;
        const motorPrice = accessories.motorCostSum || 0;
        const remotePrice = accessories.remoteCostSum || 0;
        const chargerPrice = accessories.chargerCostSum || 0;
        const cordPrice = accessories.cordCostSum || 0;

        // Render accessory prices.
        this.f2.b2_winderPrice.textContent = formatIntegerCurrency(winderPrice);
        this.f2.b3_dualPrice.textContent = formatIntegerCurrency(dualPrice);
        this.f2.b6_motorPrice.textContent = formatIntegerCurrency(motorPrice);
        this.f2.b7_remotePrice.textContent = formatIntegerCurrency(remotePrice);
        this.f2.b8_chargerPrice.textContent = formatIntegerCurrency(chargerPrice);
        this.f2.b9_cordPrice.textContent = formatIntegerCurrency(cordPrice);

        // Re-calculate summary values locally for rendering purposes.
        const wifiSum = f2State.wifiSum || 0;
        const deliveryFee = f2State.deliveryFee || 0;
        const installFee = f2State.installFee || 0;
        const removalFee = f2State.removalFee || 0;

        const acceSum = winderPrice + dualPrice;
        const eAcceSum = motorPrice + remotePrice + chargerPrice + cordPrice + wifiSum;
        const surchargeFee =
            (f2State.deliveryFeeExcluded ? 0 : deliveryFee) +
            (f2State.installFeeExcluded ? 0 : installFee) +
            (f2State.removalFeeExcluded ? 0 : removalFee);

        // Render calculated summaries and fees.
        this.f2.b4_acceSum.textContent = formatIntegerCurrency(acceSum);
        this.f2.c10_wifiSum.textContent = formatIntegerCurrency(wifiSum);
        this.f2.b11_eAcceSum.textContent = formatIntegerCurrency(eAcceSum);
        this.f2.c13_deliveryFee.textContent = formatIntegerCurrency(deliveryFee);
        this.f2.c14_installFee.textContent = formatIntegerCurrency(installFee);
        this.f2.c15_removalFee.textContent = formatIntegerCurrency(removalFee);
        this.f2.b16_surchargeFee.textContent = formatIntegerCurrency(surchargeFee);
        
        this.f2.a17_totalSum.textContent = formatValue(f2State.totalSumForRbTime);
        this.f2.c17_1stRbPrice.textContent = formatDecimalCurrency(f2State.firstRbPrice);
        this.f2.b19_disRbPrice.textContent = formatDecimalCurrency(f2State.disRbPrice);
        this.f2.b20_singleprofit.textContent = formatDecimalCurrency(f2State.singleprofit);
        this.f2.b21_rbProfit.textContent = formatDecimalCurrency(f2State.rbProfit);
        this.f2.b22_sumprice.textContent = formatDecimalCurrency(f2State.sumPrice);
        this.f2.b23_sumprofit.textContent = formatDecimalCurrency(f2State.sumProfit);
        this.f2.b24_gst.textContent = formatDecimalCurrency(f2State.gst);
        this.f2.b25_netprofit.textContent = formatDecimalCurrency(f2State.netProfit);

        if (document.activeElement !== this.f2.b10_wifiQty) this.f2.b10_wifiQty.value = formatValue(f2State.wifiQty);
        if (document.activeElement !== this.f2.b13_deliveryQty) this.f2.b13_deliveryQty.value = formatValue(f2State.deliveryQty);
        if (document.activeElement !== this.f2.b14_installQty) this.f2.b14_installQty.value = formatValue(f2State.installQty);
        if (document.activeElement !== this.f2.b15_removalQty) this.f2.b15_removalQty.value = formatValue(f2State.removalQty);
        if (document.activeElement !== this.f2.b17_mulTimes) this.f2.b17_mulTimes.value = formatValue(f2State.mulTimes);
        if (document.activeElement !== this.f2.b18_discount) this.f2.b18_discount.value = formatValue(f2State.discount);

        this.f2.c13_deliveryFee.classList.toggle('is-excluded', f2State.deliveryFeeExcluded);
        this.f2.c14_installFee.classList.toggle('is-excluded', f2State.installFeeExcluded);
        this.f2.c15_removalFee.classList.toggle('is-excluded', f2State.removalFeeExcluded);
    }

    _setActiveTab(clickedButton) {
        const targetContentId = clickedButton.dataset.tabTarget;

        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button === clickedButton);
        });

        this.tabContents.forEach(content => {
            content.classList.toggle('active', `#${content.id}` === targetContentId);
        });

        if (targetContentId === '#f2-content') {
            this.eventAggregator.publish('f2TabActivated');
        }
    }
}