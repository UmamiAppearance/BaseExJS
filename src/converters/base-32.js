/**
 * [BaseEx|Base32 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-32.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import {  BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx Base 32 Converter.
 * ------------------------
 * 
 * This is a base32 converter. Various input can be 
 * converted to a base32 string or a base32 string
 * can be decoded into various formats. It is possible
 * to convert in both signed and unsigned mode in little
 * and big endian byte order.
 * 
 * Available charsets are:
 *  - RFC 3548
 *  - RFC 4648
 *  - crockford
 *  - zbase32
 */
export default class Base32 extends BaseTemplate {
    
    /**
     * BaseEx Base32 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // charsets
        this.charsets.crockford = [..."0123456789abcdefghjkmnpqrstvwxyz"];
        this.charsets.rfc3548 =   [..."abcdefghijklmnopqrstuvwxyz234567"];
        this.charsets.rfc4648 =   [..."0123456789abcdefghijklmnopqrstuv"];
        this.charsets.zbase32 =   [..."ybndrfg8ejkmcpqxot1uwisza345h769"];
        
        // converter
        this.converter = new BaseConverter(32, 5, 8);

        // predefined settings
        this.hasSignedMode = true;
        this.padding = true;
        this.version = "rfc4648";
        
        // mutable extra args
        this.isMutable.littleEndian = true;
        this.isMutable.padding = true;
        this.isMutable.signed = true;
        this.isMutable.upper = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }
    

    /**
     * BaseEx Base32 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Base32 encoded string.
     */
    encode(input, ...args) {

        const applyPadding = (scope) => {

            let { output, settings, zeroPadding } = scope;

            if (!settings.littleEndian) {
                // Cut of redundant chars and append padding if set
                if (zeroPadding) {
                    const padValue = this.converter.padBytes(zeroPadding);
                    output = output.slice(0, output.length-padValue);
                    if (settings.padding) { 
                        output = output.concat("=".repeat(padValue));
                    }
                }
            }

            return output;
        }
        
        return super.encode(input, null, applyPadding, ...args);
    }


    /**
     * BaseEx Base32 Decoder.
     * @param {string} input - Base32 String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {
        return super.decode(input, null, null, ...args);
    }
}
