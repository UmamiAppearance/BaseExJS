/**
 * [BaseEx|Base16 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/src/converters/base-16.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx Base 16 Converter.
 * ------------------------
 * This is a base16/converter. Various input can be 
 * converted to a hex string or a hex string can be
 * decoded into various formats. It is possible to 
 * convert in both signed and unsigned mode.
 */
export default class Base16 extends BaseTemplate {

    /**
     * BaseEx Base16 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // converter
        this.converter = new BaseConverter(16, 1, 2);

        // default settings
        this.charsets.default = [..."0123456789abcdef"];
        this.padChars.default = [];

        this.hasSignedMode = true;
        
        // mutable extra args
        this.isMutable.signed = true;
        this.isMutable.upper = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx Base16 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Base16 encoded string.
     */
    encode(input, ...args) {
        return super.encode(input, null, null, ...args);
    }

    
    /**
     * BaseEx Base16 Decoder.
     * @param {string} input - Base16/Hex String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {
        
        // pre decoding function
        const normalizeInput = ({ input: normInput }) => {
            
            // Remove "0x" if present
            normInput = normInput.replace(/^0x/, "");

            // Ensure even number of characters
            if (normInput.length % 2) {
                normInput = "0".concat(normInput);
            }

            return normInput;
        }
        
        return super.decode(input, normalizeInput, null, false, ...args);
    }
}
