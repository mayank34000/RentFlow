'use strict';

/**
 * RentFlow Strict Money Utility
 * All internal money calculations MUST use integer paise.
 * In syllabus: Core JS, String, RegExp, parseInt, Math.floor, Number.isInteger.
 */

/**
 * Strict rupee string to integer paise parser.
 * Only accepts strings matching /^\d+(\.\d{1,2})?$/
 * Rejects numbers, negative numbers, scientific notation, NaN, null, undefined, and floats beyond 2 decimal places.
 * NEVER uses Math.round(x * 100) to avoid floating point precision flaws.
 *
 * @param {string} input - Rupee input (e.g. "500", "500.5", "500.50")
 * @returns {number} Integer paise (e.g. 50000, 50050)
 */
function parseRupeesToPaise(input) {
    if (typeof input !== 'string') {
        throw new Error('Rupee amount must be provided as a string');
    }

    const trimmed = input.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
        throw new Error('Invalid rupee format. Must be a positive number with up to 2 decimal places.');
    }

    const parts = trimmed.split('.');
    const whole = parseInt(parts[0], 10);
    if (!Number.isSafeInteger(whole)) {
        throw new Error('Amount exceeds maximum safe integer');
    }

    let fraction = 0;
    if (parts[1]) {
        if (parts[1].length === 1) {
            fraction = parseInt(parts[1], 10) * 10;
        } else {
            fraction = parseInt(parts[1], 10);
        }
    }

    return (whole * 100) + fraction;
}

/**
 * Formats integer paise into standard 2-decimal rupee string (e.g. 50000 -> "500.00").
 *
 * @param {number} paise - Integer paise
 * @returns {string} Rupee display string
 */
function formatPaiseToRupees(paise) {
    if (typeof paise !== 'number' || !Number.isInteger(paise)) {
        return '0.00';
    }
    const isNegative = paise < 0;
    const abs = Math.abs(paise);
    const whole = Math.floor(abs / 100);
    const fraction = abs % 100;
    const formatted = `${whole}.${fraction.toString().padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
}

module.exports = {
    parseRupeesToPaise,
    formatPaiseToRupees,
};
