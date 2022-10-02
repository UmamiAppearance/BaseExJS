/**
 * [BaseEx|Base64 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-64.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx UUencode Converter.
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
export default class UUencode extends BaseTemplate {

    /**
     * BaseEx UUencode Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();
        this.converter = new BaseConverter(64, 3, 4);

        // charsets
        this.charsets.default = [..." !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_"];
        //this.padChars.default = "=";

        // predefined settings
        this.padCharAmount = 0;
        this.padding = false;
        
        // mutable extra args
        this.isMutable.padding = false;

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx UUencoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Base64 encoded string.
     */
    encode(input, ...args) {
        const settings = this.utils.validateArgs(args);
        let inputBytes = this.utils.inputHandler.toBytes(input, settings).at(0);

        console.log(inputBytes);

        const bs = this.converter.bsEnc;
        const charset = this.charsets[settings.version];

        const byteCount = inputBytes.byteLength;
        const zeroPadding = (bs - byteCount % bs) % bs;
        
        inputBytes = Uint8Array.from([
            ...inputBytes,
            ...new Array(zeroPadding).fill(1)
        ]);
        
        console.log(inputBytes);

        let [output,, ] = this.converter.encode(inputBytes, charset, settings.littleEndian);
        //output = `${charset.at()}`

        return output;
    }


    /**
     * BaseEx UUdecoder.
     * @param {string} input - Base64 String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {
        // apply settings
        const settings = this.utils.validateArgs(args);

        // ensure a string input
        input = String(input);
        const inArray = [...input];

        const charset = this.charsets[settings.version];
        
    }

    /**
     * Divmod Function.
     * @param {*} x - number 1
     * @param {*} y - number 2
     * @returns {number} Modulo y of x
     */
    #divmod (x, y) {
        return [Math.floor(x/y), x%y];
    }
}
