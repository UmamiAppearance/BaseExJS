/**
 * [BaseEx|Base1 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-1.js}
 *
 * @version 0.4.2
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx Base 1 Converter.
 * -----------------------
 * This is a unary/base1 converter. It is converting input 
 * to a decimal number, which is converted into an unary
 * string. Due to the limitations on string (or array) length
 * it is only suitable for the  conversions of numbers up to
 * roughly 2^28.
 */
export default class Base1 extends BaseTemplate {
    
    /**
     * BaseEx Base1 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // Remove global charset adding method as
        // it is not suitable for this converter.
        delete this.addCharset;

        // All chars in the string are used and picked randomly (prob. suitable for obfuscation)
        this.charsets.all = " !\"#$%&'()*+,./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
        
        // The sequence is used from left to right again and again
        this.charsets.sequence = "Hello World!";
        
        // Standard unary string with one character
        this.charsets.default = "1";

        // Telly Mark string, using hash for 5 and vertical bar for 1 
        this.charsets.tmark = "|#";

        // Base 10 converter
        this.converter = new BaseConverter(10, 0, 0);
        
        // converter settings
        this.hasSignedMode = true;
        this.littleEndian = true;
        this.signed = true;
        
        // mutable extra args
        this.isMutable.signed = true;
        this.isMutable.upper = true;
        
        // apply user settings
        this.utils.validateArgs(args, true);
    }
    

    /**
     * BaseEx Base1 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Base1 encoded string.
     */
    encode(input, ...args) {

        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        
        let inputBytes, negative;
        [inputBytes, negative,] = this.utils.inputHandler.toBytes(input, settings);

        // Convert to BaseRadix string
        let base10 = this.converter.encode(inputBytes, null, settings.littleEndian)[0];
        
        let n = BigInt(base10);

        // Limit the input before it even starts.
        // The executing engine will most likely
        // give up much earlier.
        // (2**29-24 during tests)

        if (n > Number.MAX_SAFE_INTEGER) {
            throw new RangeError("Invalid string length.");
        } else if (n > 16777216) {
            this.utils.constructor.warning("The string length is really long. The JavaScript engine may have memory issues generating the output string.");
        }
        
        n = Number(n);
        
        const charset = this.charsets[settings.version];
        const charAmount = charset.length;
        let output = "";

        // Convert to unary in respect to the version differences
        if (charAmount === 1) {
            output = charset.repeat(n)
        } else if (settings.version === "all") {
            for (let i=0; i<n; i++) {
                const charIndex = Math.floor(Math.random() * charAmount); 
                output += charset[charIndex];
            }
        } else if (settings.version === "tmark") {
            const singulars = n % 5;
            if (n > 4) {
                output = charset[1].repeat((n - singulars) / 5);
            }
            output += charset[0].repeat(singulars);
        } else {
            for (let i=0; i<n; i++) {
                output += charset[i%charAmount];
            }
        }
        
        output = this.utils.toSignedStr(output, negative);

        if (settings.upper) {
            output = output.toUpperCase();
        }
        
        return output;
    }
    

    /**
     * BaseEx Base1 Decoder.
     * @param {string} input - Base1/Unary String.
     * @param  {...any} [args] - Converter settings. 
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        // Make it a string, whatever goes in
        input = String(input);
        
        // Test for a negative sign
        let negative;
        [input, negative] = this.utils.extractSign(input);
        
        // remove all but the relevant character
        if (settings.version !== "all") {
            const cleanedSet = [...new Set(this.charsets[settings.version])].join("");
            const regex = new RegExp(`[^${cleanedSet}]`,"g");
            input = input.replace(regex, "");
        }
        input = String(input.length);

        // Run the decoder
        const output = this.converter.decode(input, "0123456789", settings.littleEndian);
        
        // Return the output
        return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
