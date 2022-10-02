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
        this.charsets.default = [..."`!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_"];
        this.charsets.original = [" ", ...this.charsets.default.slice(1)];
        this.charsets.xxencode = [..."+-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"];

        // predefined settings
        this.padCharAmount = 0;
        this.padding = true;
        
        // mutable extra args
        this.isMutable.padding = false;

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx UUencoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - UUencode string.
     */
    encode(input, ...args) {

        const format = (scope) => {

            let { output, settings, zeroPadding } = scope;

            console.log(output, zeroPadding);

            const charset = this.charsets[settings.version];
            let [full, last] = this.#divmod(output.length, 60);
            last = this.converter.padChars(last) - zeroPadding;
            
            output = output.
            match(/.{1,60}/g).
            map((line, i) => (i < full)
                ? line = `M${line}`
                : line = `${charset.at(last)}${line}` 
            ).
            join("\n");
        
            output += `\n${charset.at(0)}\n`

            return output;
        }
            
        return super.encode(input, null, format, ...args);
    }


    /**
     * BaseEx UUdecoder.
     * @param {string} input - UUencode String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
     decode(input, ...args) {

        const format = null; 
        // TODO

        return super.decode(input, format, null, ...args);
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
