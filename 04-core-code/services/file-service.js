// /04-core-code/services/file-service.js

import { dataToCsv, csvToData } from '../utils/csv-parser.js';

/**
 * @fileoverview Service for handling all file-related operations
 * like saving, loading, and exporting.
 */
export class FileService {
    constructor() {
        console.log("FileService Initialized.");
    }

    /**
     * Triggers a file download in the browser.
     * @private
     */
    _triggerDownload(content, fileName, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Generates a timestamped filename.
     * @private
     */
    _generateFileName(extension) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `quote-${yyyy}${mm}${dd}${hh}${min}.${extension}`;
    }

    /**
     * Saves the quote data as a JSON file.
     * @param {object} quoteData The data to save.
     */
    saveToJson(quoteData) {
        try {
            const jsonString = JSON.stringify(quoteData, null, 2);
            const fileName = this._generateFileName('json');
            this._triggerDownload(jsonString, fileName, 'application/json');
            return { success: true, message: 'Quote file is being downloaded...' };
        } catch (error) {
            console.error("Failed to save JSON file:", error);
            return { success: false, message: 'Error creating quote file.' };
        }
    }

    /**
     * Exports the quote data as a CSV file.
     * @param {object} quoteData The data to export.
     */
    exportToCsv(quoteData) {
        try {
            const csvString = dataToCsv(quoteData);
            const fileName = this._generateFileName('csv');
            this._triggerDownload(csvString, fileName, 'text/csv;charset=utf-8;');
            return { success: true, message: 'CSV file is being downloaded...' };
        } catch (error) {
            console.error("Failed to export CSV file:", error);
            return { success: false, message: 'Error creating CSV file.' };
        }
    }

    /**
     * Parses loaded file content into a quoteData object.
     * @param {string} fileName The name of the loaded file.
     * @param {string} content The content of the file.
     * @returns {{success: boolean, data?: object, message?: string}}
     */
    parseFileContent(fileName, content) {
        try {
            let loadedData = null;
            if (fileName.toLowerCase().endsWith('.json')) {
                loadedData = JSON.parse(content);
            } else if (fileName.toLowerCase().endsWith('.csv')) {
                loadedData = csvToData(content);
            } else {
                return { success: false, message: `Unsupported file type: ${fileName}` };
            }

            // [REFACTORED] Updated validation to check for the new generic state structure.
            const currentProduct = loadedData?.currentProduct;
            const productData = loadedData?.products?.[currentProduct];

            if (productData && Array.isArray(productData.items)) {
                return { success: true, data: loadedData, message: `Successfully loaded data from ${fileName}` };
            } else {
                // Also check for the old structure for backward compatibility during transition.
                if (loadedData && loadedData.rollerBlindItems && Array.isArray(loadedData.rollerBlindItems)) {
                     return { success: true, data: loadedData, message: `Successfully loaded legacy data from ${fileName}` };
                }
                throw new Error("File content is not in a valid quote format.");
            }
        } catch (error) {
            console.error("Failed to parse file content:", error);
            return { success: false, message: `Error loading file: ${error.message}` };
        }
    }
}