/**
 * [BaseEx|Base64 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-64.js}
 *
 * @version 0.5.0
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

    /**this.padChars.
     * BaseEx Base64 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();
        this.converter = new BaseConverter(64, 3, 4);

        // charsets
        this.charsets.default = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"];
        this.padChars.default = "=";
        
        this.charsets.urlsafe = this.charsets.default.slice(0, -2).concat(["-", "_"]);
        this.padChars.urlsafe = "=";


        // predefined settings
        this.padCharAmount = 1;
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
        
        const applyPadding = ({ output, settings, zeroPadding }) => {

            // Cut of redundant chars and append padding if set
            if (zeroPadding) {
                const padValue = this.converter.padBytes(zeroPadding);
                const padChar = this.padChars[settings.version].at(0);
                output = output.slice(0, -padValue);
                if (settings.padding) { 
                    output = output.concat(padChar.repeat(padValue));
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
