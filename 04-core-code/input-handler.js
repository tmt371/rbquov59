// File: 04-core-code/input-handler.js

import { LeftPanelInputHandler } from './left-panel-input-handler.js';

export class InputHandler {
    constructor(eventAggregator) {
        this.eventAggregator = eventAggregator;
        this.leftPanelHandler = new LeftPanelInputHandler(eventAggregator);
        this.longPressTimer = null;
        this.pressThreshold = 500; // 500ms for a long press
        this.isLongPress = false;
    }

    initialize() {
        this._setupNumericKeyboard();
        this._setupTableInteraction();
        this._setupFunctionKeys();
        this._setupPanelToggles();
        this._setupFileLoader();
        this._setupPhysicalKeyboard();
        
        this.leftPanelHandler.initialize();
    }

    _setupPhysicalKeyboard() {
        window.addEventListener('keydown', (event) => {
            // BUG FIX: Broaden the guard clause to ignore all non-readonly inputs
            if (event.target.matches('input:not([readonly])')) {
                return;
            }
            
            let keyToPublish = null;
            let eventToPublish = 'numericKeyPressed';
            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                event.preventDefault();
                const direction = event.key.replace('Arrow', '').toLowerCase();
                this.eventAggregator.publish('userMovedActiveCell', { direction });
                return;
            }
            if (event.key >= '0' && event.key <= '9') {
                keyToPublish = event.key;
            } 
            else {
                switch (event.key.toLowerCase()) {
                    case 'w': keyToPublish = 'W'; break;
                    case 'h': keyToPublish = 'H'; break;
                    case 't': this.eventAggregator.publish('userRequestedCycleType'); return;
                    case '$': this.eventAggregator.publish('userRequestedCalculateAndSum'); return;
                    case 'enter': keyToPublish = 'ENT'; event.preventDefault(); break;
                    case 'backspace': keyToPublish = 'DEL'; event.preventDefault(); break;
                    case 'delete': eventToPublish = 'userRequestedClearRow'; break;
                }
            }
            if (keyToPublish !== null) {
                this.eventAggregator.publish(eventToPublish, { key: keyToPublish });
            } else if (eventToPublish === 'userRequestedClearRow') {
                this.eventAggregator.publish(eventToPublish);
            }
        });
    }

    _setupFileLoader() {
        const fileLoader = document.getElementById('file-loader');
        if (fileLoader) {
            fileLoader.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) { return; }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.eventAggregator.publish('fileLoaded', { fileName: file.name, content: content });
                };
                reader.onerror = () => {
                    this.eventAggregator.publish('showNotification', { message: `Error reading file: ${reader.error}`, type: 'error' });
                };
                reader.readAsText(file);
                event.target.value = '';
            });
        }
        this.eventAggregator.subscribe('triggerFileLoad', () => {
            if (fileLoader) {
                fileLoader.click();
            }
        });
    }
    
    _setupPanelToggles() {
        const numericToggle = document.getElementById('panel-toggle');
        if (numericToggle) {
            numericToggle.addEventListener('click', () => {
                this.eventAggregator.publish('userToggledNumericKeyboard');
            });
        }
    }

    _setupFunctionKeys() {
        const setupButton = (id, eventName) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    this.eventAggregator.publish(eventName);
                });
            }
        };

        setupButton('key-insert', 'userRequestedInsertRow');
        setupButton('key-delete', 'userRequestedDeleteRow');
        setupButton('key-save', 'userRequestedSave');
        setupButton('key-export', 'userRequestedExportCSV');
        setupButton('key-reset', 'userRequestedReset');
        setupButton('key-m-sel', 'userToggledMultiSelectMode');

        // [NEW] Added event listener for the new T-Set button
        setupButton('key-t-set', 'userRequestedMultiTypeSet');

        const loadButton = document.getElementById('key-load');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedLoad');
            });
        }
    }
    
    _setupNumericKeyboard() {
        const keyboard = document.getElementById('numeric-keyboard');
        if (!keyboard) return;

        const addLongPressSupport = (button, longPressEventName, clickEventName, data = {}) => {
            const startPress = (e) => {
                e.preventDefault();
                this.isLongPress = false;
                this.longPressTimer = setTimeout(() => {
                    this.isLongPress = true;
                    this.eventAggregator.publish(longPressEventName, data);
                }, this.pressThreshold);
            };

            const endPress = (e) => {
                clearTimeout(this.longPressTimer);
                if (!this.isLongPress && clickEventName) {
                    this.eventAggregator.publish(clickEventName, data);
                }
            };

            button.addEventListener('mousedown', startPress);
            button.addEventListener('touchstart', startPress, { passive: false });
            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', () => clearTimeout(this.longPressTimer));
            button.addEventListener('touchend', endPress);
        };
        
        const addButtonListener = (id, eventName, data = {}) => {
            const button = document.getElementById(id);
            if(button) {
                if (id === 'key-type') {
                    addLongPressSupport(button, 'typeButtonLongPressed', 'userRequestedCycleType', data);
                } else {
                    button.addEventListener('click', () => {
                        this.eventAggregator.publish(eventName, data);
                    });
                }
            }
        };

        addButtonListener('key-7', 'numericKeyPressed', { key: '7' });
        addButtonListener('key-8', 'numericKeyPressed', { key: '8' });
        addButtonListener('key-9', 'numericKeyPressed', { key: '9' });
        addButtonListener('key-4', 'numericKeyPressed', { key: '4' });
        addButtonListener('key-5', 'numericKeyPressed', { key: '5' });
        addButtonListener('key-6', 'numericKeyPressed', { key: '6' });
        addButtonListener('key-1', 'numericKeyPressed', { key: '1' });
        addButtonListener('key-2', 'numericKeyPressed', { key: '2' });
        addButtonListener('key-3', 'numericKeyPressed', { key: '3' });
        addButtonListener('key-0', 'numericKeyPressed', { key: '0' });
        addButtonListener('key-del', 'numericKeyPressed', { key: 'DEL' });
        addButtonListener('key-enter', 'numericKeyPressed', { key: 'ENT' });
        addButtonListener('key-w', 'numericKeyPressed', { key: 'W' });
        addButtonListener('key-h', 'numericKeyPressed', { key: 'H' });
        addButtonListener('key-type', 'userRequestedCycleType');
        addButtonListener('key-clear', 'userRequestedClearRow');
        addButtonListener('key-price', 'userRequestedCalculateAndSum');
    }

    _setupTableInteraction() {
        const table = document.getElementById('results-table');
        if (table) {
            const startPress = (e) => {
                const target = e.target;
                if (target.tagName === 'TD' && target.dataset.column === 'TYPE') {
                    this.isLongPress = false;
                    this.longPressTimer = setTimeout(() => {
                        this.isLongPress = true;
                        const rowIndex = target.parentElement.dataset.rowIndex;
                        this.eventAggregator.publish('typeCellLongPressed', { rowIndex: parseInt(rowIndex, 10) });
                    }, this.pressThreshold);
                }
            };
            
            const endPress = () => {
                clearTimeout(this.longPressTimer);
            };

            table.addEventListener('mousedown', startPress);
            table.addEventListener('touchstart', startPress, { passive: true });
            table.addEventListener('mouseup', endPress);
            table.addEventListener('mouseleave', endPress, true);
            table.addEventListener('touchend', endPress);

            table.addEventListener('click', (event) => {
                if(this.isLongPress) return;

                const target = event.target;
                if (target.tagName === 'TD') {
                    const column = target.dataset.column;
                    const rowIndex = target.parentElement.dataset.rowIndex;
                    if (column && rowIndex) {
                         const eventData = { rowIndex: parseInt(rowIndex, 10), column };
                        if (column === 'sequence') {
                            this.eventAggregator.publish('sequenceCellClicked', eventData);
                        } else {
                            this.eventAggregator.publish('tableCellClicked', eventData);
                        }
                    }
                }
            });
        }
    }
}