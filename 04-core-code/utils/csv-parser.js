// /04-core-code/utils/csv-parser.js

/**
 * @fileoverview Utility functions for parsing and stringifying CSV data.
 */

/**
 * [REVISED] Converts the application's quote data object into a comprehensive CSV formatted string,
 * including all detailed item properties.
 * @param {object} quoteData The application's quote data.
 * @returns {string} A string in CSV format.
 */
export function dataToCsv(quoteData) {
    const currentProductKey = quoteData?.currentProduct;
    const productData = quoteData?.products?.[currentProductKey];

    if (!productData || !productData.items) return "";

    // [NEW] Expanded headers to include all item details.
    const headers = [
        '#', 'Width', 'Height', 'Type', 'Price', 
        'Location', 'F-Name', 'F-Color', 'Over', 'O/I', 'L/R', 
        'Dual', 'Chain', 'Winder', 'Motor'
    ];
    
    const rows = productData.items.map((item, index) => {
        // Only include rows that have some data (width or height).
        if (item.width || item.height) {
            // [NEW] Expanded row data to match the new headers.
            const rowData = [
                index + 1,
                item.width || '',
                item.height || '',
                item.fabricType || '',
                item.linePrice !== null ? item.linePrice.toFixed(2) : '',
                item.location || '',
                item.fabric || '',
                item.color || '',
                item.over || '',
                item.oi || '',
                item.lr || '',
                item.dual || '',
                item.chain || '',
                item.winder || '',
                item.motor || ''
            ];
            // Basic CSV escaping: if a value contains a comma, wrap it in double quotes.
            return rowData.map(value => {
                const strValue = String(value);
                if (strValue.includes(',')) {
                    return `"${strValue}"`;
                }
                return strValue;
            }).join(',');
        }
        return null;
    }).filter(row => row !== null); // Filter out empty/unprocessed rows

    const totalSum = productData.summary ? productData.summary.totalSum : null;
    let summaryRow = '';
    if (typeof totalSum === 'number') {
        // Create a summary row with enough commas to align the total under the 'Price' column.
        summaryRow = `\n\nTotal,,,,${totalSum.toFixed(2)}`;
    }

    return [headers.join(','), ...rows].join('\n') + summaryRow;
}


/**
 * Converts a CSV formatted string back into the application's quote data structure.
 * @param {string} csvString The string containing CSV data.
 * @returns {object|null} A quoteData object, or null if parsing fails.
 */
export function csvToData(csvString) {
    try {
        const lines = csvString.trim().split('\n');
        const headerIndex = lines.findIndex(line => line.trim() !== '');
        if (headerIndex === -1) return null;

        const dataLines = lines.slice(headerIndex + 1);

        const items = [];
        for (const line of dataLines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.toLowerCase().startsWith('total')) {
                break;
            }

            // This CSV parser is simple and doesn't handle commas within quoted strings.
            // For this application's import needs, a simple split is sufficient.
            const values = trimmedLine.split(',');

            const item = {
                itemId: `item-${Date.now()}-${items.length}`,
                width: parseInt(values[1], 10) || null,
                height: parseInt(values[2], 10) || null,
                fabricType: values[3] || null,
                linePrice: parseFloat(values[4]) || null,
                // [NEW] Attempt to parse the additional fields, defaulting to empty strings.
                location: values[5] || '',
                fabric: values[6] || '',
                color: values[7] || '',
                over: values[8] || '',
                oi: values[9] || '',
                lr: values[10] || '',
                dual: values[11] || '',
                chain: parseInt(values[12], 10) || null,
                winder: values[13] || '',
                motor: values[14] || ''
            };
            items.push(item);
        }

        // Add a final empty row for new entries.
        const productStrategy = this.productFactory.getProductStrategy('rollerBlind');
        const newItem = productStrategy ? productStrategy.getInitialItemData() : {};
        newItem.itemId = `item-${Date.now()}-new`;
        items.push(newItem);

        // Construct the full, new generic state structure.
        return {
            currentProduct: 'rollerBlind',
            products: {
                rollerBlind: {
                    items: items,
                    summary: {} // Summary will be recalculated later.
                }
            },
            quoteId: null,
            issueDate: null,
            dueDate: null,
            status: "Configuring",
            costDiscountPercentage: 0,
            customer: { name: "", address: "", phone: "", email: "" }
        };

    } catch (error) {
        console.error("Failed to parse CSV string:", error);
        return null;
    }
}