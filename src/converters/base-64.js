/**
 * [BaseEx|Base64 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-64.js}
 *
 * @version 0.4.1
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx Base 64 Converter.
 * ------------------------
 * 
 * This is a base64 converter. Various input can be 
 * converted to a base64 string or a base64 string
 * can be decoded into various formats.
 * 
 * Available charsets are:
 *  - default
 *  - urlsafe
 */
export default class Base64 extends BaseTemplate {

    /**
     * BaseEx Base64 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // charsets
        const b62Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets.default = b62Chars.concat("+/");
        this.charsets.urlsafe = b62Chars.concat("-_");
     
        // converter
        this.converter = new BaseConverter(64, 3, 4);

        // predefined settings
        this.padding = true;
        
        // mutable extra args
        this.isMutable.padding = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx Base64 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Base64 encoded string.
     */
    encode(input, ...args) {
        
        const applyPadding = (scope) => {

            let { output, settings, zeroPadding } = scope;

            // Cut of redundant chars and append padding if set
            if (zeroPadding) {
                const padValue = this.converter.padBytes(zeroPadding);
                output = output.slice(0, output.length-padValue);
                if (settings.padding) { 
                    output = output.concat("=".repeat(padValue));
                }
            }

            return output;
        }
            
        return super.encode(input, null, applyPadding, ...args);
    }


    /**
     * BaseEx Base64 Decoder.
     * @param {string} input - Base64 String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {
        return super.decode(input, null, null, ...args);
    }
}
