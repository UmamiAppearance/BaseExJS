/*
 * En-/decoding to and from Base85.
 * -------------------------------
 *
 * Four versions are supported: 
 *   
 *     * adobe
 *     * ascii85
 *     * rfc1924
 *     * z85
 * 
 * Adobe and ascii85 are the basically the same.
 * Adobe will produce the same output, apart from
 * the <~wrapping~>.
 * 
 * Z85 is an important variant, because of the 
 * more interpreter-friendly character set.
 * 
 * The RFC 1924 version is a hybrid. It is not using
 * the mandatory 128 bit calculation. Instead only 
 * the charset is getting used.
 */

import { BaseConverter, BaseTemplate } from "./core.js";
 
export class Base85 extends BaseTemplate {

    constructor(...args) {
        super();

        this.charsets.ascii85 = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
        this.charsets.adobe =   this.charsets.ascii85;
        this.charsets.rfc1924 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
        this.charsets.z85 =     "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";

        // predefined settings
        this.converter = new BaseConverter(85, 4, 5, 84);
        this.version = "ascii85";
        
        // apply user settings
        this.utils.validateArgs(args, true);
    }
    
    encode(input, ...args) {

        // Replace five consecutive "!" with a "z"
        // for adobe and ascii85
        const replacerFN = (settings) => {
            let replacer;
            if (settings.version.match(/adobe|ascii85/)) {
                replacer = (frame, zPad) => (!zPad && frame === "!!!!!") ? "z" : frame;
            }
            return replacer;
        }
                
        
        // Remove padded values and add a frame for the
        // adobe variant
        const framesAndPadding = (scope) => {

            let { output, settings, zeroPadding } = scope;

            // Cut of redundant chars
            if (zeroPadding) {
                const padValue = this.converter.padBytes(zeroPadding);
                output = output.slice(0, output.length-padValue);
            }

            // Adobes variant gets its <~framing~>
            if (settings.version === "adobe") {
                output = `<~${output}~>`;
            }
            
            return output;
        }

        return super.encode(input, replacerFN, framesAndPadding, ...args);

    }

    decode(rawInput, ...args) {


        const prepareInput = (scope) => {

            let { input, settings } = scope;

            // For default ascii85 convert "z" back to "!!!!!"
            // Remove the adobe <~frame~>
            if (settings.version.match(/adobe|ascii85/)) {
                input = input.replace(/z/g, "!!!!!");
                if (settings.version === "adobe") {
                    input = input.replace(/^<~|~>$/g, "");
                }
            }

            return input
        }

        return super.decode(rawInput, prepareInput, null, ...args);
    }
}
