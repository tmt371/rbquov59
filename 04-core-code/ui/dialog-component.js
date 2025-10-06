// /04-core-code/ui/dialog-component.js

/**
 * @fileoverview A generic, configurable component to manage confirmation dialogs.
 */
export class DialogComponent {
    constructor({ overlayElement, eventAggregator }) {
        if (!overlayElement || !eventAggregator) {
            throw new Error("Overlay element and event aggregator are required for DialogComponent.");
        }
        this.overlay = overlayElement;
        this.dialogBox = this.overlay.querySelector('.dialog-box');
        this.eventAggregator = eventAggregator;
        
        this.messageElement = this.overlay.querySelector('.dialog-message');
        this.buttonsContainer = this.overlay.querySelector('.dialog-buttons');

        this.initialize();
        console.log("DialogComponent (Refactored for Grid Layout) Initialized.");
    }

    initialize() {
        this.eventAggregator.subscribe('showLoadConfirmationDialog', () => {
            this.show({
                message: 'The current quote contains unsaved data. What would you like to do?',
                layout: [
                    [
                        { type: 'button', text: 'Save then Load', callback: () => this.eventAggregator.publish('userChoseSaveThenLoad'), colspan: 1 },
                        { type: 'button', text: 'Load Directly', callback: () => this.eventAggregator.publish('userChoseLoadDirectly'), colspan: 1 },
                        { type: 'button', text: 'Cancel', className: 'secondary', callback: () => {}, colspan: 1 }
                    ]
                ]
            });
        });

        this.eventAggregator.subscribe('showConfirmationDialog', (config) => this.show(config));

        this.overlay.addEventListener('click', (event) => {
            // [MODIFIED] Only hide if the overlay is clicked AND the dialog is configured to allow it.
            if (event.target === this.overlay && this.closeOnOverlayClick) {
                this.hide();
            }
        });
    }

    /**
     * Shows a dialog with a configurable message and a grid-based layout.
     * @param {object} config - The configuration object.
     * @param {string} config.message - The message to display.
     * @param {Array<Array<object>>} config.layout - An array of rows, where each row is an array of cell objects.
     * @param {boolean} [config.closeOnOverlayClick=true] - Whether clicking the overlay closes the dialog.
     */
    show({ message, layout = [], position = 'center', closeOnOverlayClick = true }) {
        this.closeOnOverlayClick = closeOnOverlayClick;
        this.buttonsContainer.innerHTML = '';

        if (this.messageElement) {
            this.messageElement.textContent = message;
        }

        layout.forEach(row => {
            row.forEach(cellConfig => {
                const cell = document.createElement('div');
                cell.className = 'dialog-grid-cell';

                if (cellConfig.type === 'button') {
                    cell.classList.add('button-cell');
                    const button = document.createElement('button');
                    button.className = 'dialog-button';
                    if (cellConfig.className) {
                        button.classList.add(...cellConfig.className.split(' '));
                    }
                    button.textContent = cellConfig.text;
                    
                    button.addEventListener('click', () => {
                        let shouldHide = true;
                        if (cellConfig.callback && typeof cellConfig.callback === 'function') {
                            const callbackResult = cellConfig.callback();
                            if (callbackResult === false) {
                                shouldHide = false;
                            }
                        }
                        
                        if (cellConfig.closeOnClick !== false && shouldHide) {
                            this.hide();
                        }
                    });
                    cell.appendChild(button);

                } else if (cellConfig.type === 'input') {
                    cell.classList.add('input-cell');
                    const input = document.createElement('input');
                    input.className = 'dialog-input';
                    input.id = cellConfig.id;
                    input.type = 'number';
                    input.placeholder = cellConfig.placeholder || '';
                    if (cellConfig.value !== undefined) {
                        input.value = cellConfig.value;
                    }
                    input.min = 0;
                    
                    // [NEW] Add event listener for Enter key confirmation
                    input.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault(); // Prevent default form submission
                            // Find the primary confirm button in the dialog and click it
                            const confirmButton = this.buttonsContainer.querySelector('.primary-confirm-button');
                            if (confirmButton) {
                                confirmButton.click();
                            }
                        }
                    });
                    cell.appendChild(input);

                    // [NEW] Set autofocus on the input field
                    setTimeout(() => input.focus(), 0);

                } else if (cellConfig.type === 'text') {
                    cell.classList.add('text-cell');
                    cell.textContent = cellConfig.text;
                }
                
                if (cellConfig.className && cellConfig.type !== 'button') {
                     cell.classList.add(...cellConfig.className.split(' '));
                }

                if (cellConfig.colspan) {
                    cell.style.gridColumn = `span ${cellConfig.colspan}`;
                }

                this.buttonsContainer.appendChild(cell);
            });
        });

        if (position === 'bottomThird') {
            this.dialogBox.style.marginTop = `calc( (100vh - 20vh) / 3 * 2 - 50% )`;
        } else {
            this.dialogBox.style.marginTop = '';
        }

        this.overlay.classList.remove('is-hidden');
    }

    hide() {
        this.overlay.classList.add('is-hidden');
    }
}