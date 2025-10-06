// File: 04-core-code/main.js

import { EventAggregator } from './event-aggregator.js';
import { ConfigManager } from './config-manager.js';
import { InputHandler } from './input-handler.js';
import { UIManager } from './ui/ui-manager.js';
import { AppController } from './app-controller.js';

import { initialState } from './config/initial-state.js';
import { ProductFactory } from './strategies/product-factory.js';

import { QuoteService } from './services/quote-service.js';
import { CalculationService } from './services/calculation-service.js';
import { FocusService } from './services/focus-service.js';
import { FileService } from './services/file-service.js';
import { UIService } from './services/ui-service.js';

import { QuickQuoteView } from './ui/views/quick-quote-view.js';
import { DetailConfigView } from './ui/views/detail-config-view.js';
import { K1LocationView } from './ui/views/k1-location-view.js';
import { K2FabricView } from './ui/views/k2-fabric-view.js';
import { K3OptionsView } from './ui/views/k3-options-view.js';
import { DualChainView } from './ui/views/dual-chain-view.js';
import { DriveAccessoriesView } from './ui/views/drive-accessories-view.js';


const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';

const migrateAutoSaveData = (oldData) => {
    if (oldData && oldData.products && oldData.currentProduct) {
        console.log("Auto-saved data is already in the new format.");
        return oldData;
    }

    if (oldData && oldData.rollerBlindItems) {
        console.warn("Migrating legacy auto-saved data to the new format...");
        const newData = {
            currentProduct: 'rollerBlind',
            products: {
                rollerBlind: {
                    items: oldData.rollerBlindItems,
                    summary: oldData.summary || initialState.quoteData.products.rollerBlind.summary
                }
            },
            quoteId: oldData.quoteId || null,
            issueDate: oldData.issueDate || null,
            dueDate: oldData.dueDate || null,
            status: oldData.status || "Configuring",
            costDiscountPercentage: oldData.costDiscountPercentage || 0,
            customer: oldData.customer || { name: "", address: "", phone: "", email: "" }
        };
        return newData;
    }

    return null;
};


class App {
    constructor() {
        let startingState = JSON.parse(JSON.stringify(initialState));
        try {
            const autoSavedDataJSON = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
            if (autoSavedDataJSON) {
                const message = "It looks like you have unsaved work from a previous session.\n\n- 'OK' to restore the unsaved work.\n- 'Cancel' to start a new, blank quote.";
                if (window.confirm(message)) {
                    let autoSavedData = JSON.parse(autoSavedDataJSON);
                    const migratedData = migrateAutoSaveData(autoSavedData);

                    if (migratedData) {
                        startingState.quoteData = migratedData;
                        console.log("Restored data from auto-save.");
                    } else {
                        console.error("Could not restore auto-saved data: format is unrecognized.");
                        localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
                    }
                } else {
                    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
                    console.log("Auto-saved data discarded by user.");
                }
            }
        } catch (error) {
            console.error("Failed to process auto-saved data:", error);
            localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
        }
        
        this.eventAggregator = new EventAggregator();
        this.configManager = new ConfigManager(this.eventAggregator);
        
        const productFactory = new ProductFactory();

        // Services are instantiated here...
        const quoteService = new QuoteService({
            initialState: startingState,
            productFactory: productFactory,
            configManager: this.configManager
        });

        this.calculationService = new CalculationService({
            productFactory: productFactory,
            configManager: this.configManager
        });
        const fileService = new FileService();
        const uiService = new UIService(startingState.ui);
        const focusService = new FocusService({
            uiService: uiService,
            quoteService: quoteService
        });

        const publishStateChangeCallback = () => this.eventAggregator.publish('stateChanged', this.appController._getFullState());

        const quickQuoteView = new QuickQuoteView({
            quoteService,
            calculationService: this.calculationService,
            focusService,
            fileService,
            uiService,
            eventAggregator: this.eventAggregator,
            productFactory,
            configManager: this.configManager,
            publishStateChangeCallback
        });

        const k1LocationView = new K1LocationView({
            quoteService,
            uiService,
            publishStateChangeCallback
        });

        const k2FabricView = new K2FabricView({
            quoteService,
            uiService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback
        });

        const k3OptionsView = new K3OptionsView({
            quoteService,
            uiService,
            publishStateChangeCallback
        });
        
        const dualChainView = new DualChainView({
            quoteService,
            uiService,
            calculationService: this.calculationService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback
        });

        const driveAccessoriesView = new DriveAccessoriesView({
            quoteService,
            uiService,
            calculationService: this.calculationService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback
        });

        const detailConfigView = new DetailConfigView({
            quoteService,
            uiService,
            calculationService: this.calculationService,
            eventAggregator: this.eventAggregator,
            publishStateChangeCallback,
            k1LocationView: k1LocationView,
            k2FabricView: k2FabricView,
            k3OptionsView: k3OptionsView,
            dualChainView: dualChainView,
            driveAccessoriesView: driveAccessoriesView
        });
        
        this.appController = new AppController({
            eventAggregator: this.eventAggregator,
            uiService,
            quoteService,
            fileService,
            quickQuoteView,
            detailConfigView,
            calculationService: this.calculationService,
            productFactory
        });
    }

    async _loadPartials() {
        const loadPartial = async (url, targetElement, injectionMethod = 'append') => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${url}`);
                }
                const html = await response.text();
                if (injectionMethod === 'innerHTML') {
                    targetElement.innerHTML = html;
                } else {
                    targetElement.insertAdjacentHTML('beforeend', html);
                }
            } catch (error) {
                console.error(`Failed to load HTML partial from ${url}:`, error);
                this.eventAggregator.publish('showNotification', { message: `Error: Could not load UI component from ${url}!`, type: 'error'});
            }
        };
    
        await loadPartial('./04-core-code/ui/partials/left-panel.html', document.body);
        
        const functionPanel = document.getElementById('function-panel');
        if (functionPanel) {
            await loadPartial('./04-core-code/ui/partials/right-panel.html', functionPanel, 'innerHTML');
        }
    }

    async run() {
        console.log("Application starting...");
        
        await this._loadPartials();

        this.uiManager = new UIManager(
            document.getElementById('app'),
            this.eventAggregator,
            this.calculationService
        );

        await this.configManager.initialize();

        this.eventAggregator.subscribe('stateChanged', (state) => {
            this.uiManager.render(state);
        });

        this.appController.publishInitialState(); 
        
        this.inputHandler = new InputHandler(this.eventAggregator);
        this.inputHandler.initialize(); 

        // Set initial focus after a short delay to ensure the UI is ready.
        setTimeout(() => {
            this.eventAggregator.publish('focusCell', { rowIndex: 0, column: 'width' });
        }, 100);
        
        console.log("Application running and interactive.");

        // Add a ready signal for automation scripts.
        document.body.classList.add('app-is-ready');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.run();
});