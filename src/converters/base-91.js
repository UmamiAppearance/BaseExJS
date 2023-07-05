/**
 * [BaseEx|Base91 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-91.js}
 *
 * @version 0.8.1
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT AND BSD-3-Clause (Base91, Copyright (c) 2000-2006 Joachim Henke)
 */

import { BaseTemplate } from "../core.js";
import { DecodingError } from "../utils.js";

/**
 * BaseEx Base 91 Converter.
 * ------------------------
 * 
 * This is a base91 converter. Various input can be 
 * converted to a base91 string or a base91 string
 * can be decoded into various formats.
 * 
 * It is an  implementation of Joachim Henkes method
 * to encode binary data as ASCII characters -> basE91
 * http://base91.sourceforge.net/
 * 
 * As this method requires to split the bytes, the
 * default conversion class "BaseConverter" is not
 * getting used in this case.
 */
export default class Base91 extends BaseTemplate {
    
    /**
     * BaseEx basE91 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // converter (properties only)
        this.converter = {
            radix: 91,
            bsEnc: 0,
            bsDec: 0
        }

        // charsets
        this.charsets.default = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\""];
        this.version = "default";

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx basE91 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - basE91 encoded string.
     */
    encode(input, ...args) {
       
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        const inputBytes = this.utils.inputHandler.toBytes(input, settings)[0];
  
        // As this base representation splits the bytes
        // the read bits need to be stores somewhere. 
        // This is done in "bitCount". "n", similar to 
        // other solutions here, holds the integer which
        // is converted to the desired base.

        let bitCount = 0;
        let n = 0;
        let output = "";

        const charset = this.charsets[settings.version];

        inputBytes.forEach(byte => {
            //n = n + byte * 2^bitcount;
            n += (byte << bitCount);

            // Add 8 bits forEach byte
            bitCount += 8;
            
            // If the count exceeds 13 bits, base convert the
            // current frame.

            if (bitCount > 13) {

                // Set bit amount "count" to 13, check the
                // remainder of n % 2^13. If it is 88 or 
                // lower. Take one more bit from the stream
                // and calculate the remainder for n % 2^14.

                let count = 13;
                let rN = n % 8192;

                if (rN < 89) {
                    count = 14;
                    rN = n % 16384;
                }

                // Remove 13 or 14 bits from the integer,
                // decrease the bitCount by the same amount.
                n >>= count;
                bitCount -= count;
                
                // Calculate quotient and remainder from
                // the before calculated remainder of n 
                // -> "rN"
                let q, r;
                [q, r] = this.#divmod(rN, 91);

                // Lookup the corresponding characters for
                // "r" and "q" in the set, append it to the 
                // output string.
                output = `${output}${charset[r]}${charset[q]}`;
            }
        });
        
        // If the bitCount is not zero at the end,
        // calculate quotient and remainder of 91
        // once more.
        if (bitCount) {
            let q, r;
            [q, r] = this.#divmod(n, 91);

            // The remainder is concatenated in any case
            output = output.concat(charset[r]);

            // The quotient is also appended, but only
            // if the bitCount still has the size of a byte
            // or n can still represent 91 conditions.
            if (bitCount > 7 || n > 90) {
                output = output.concat(charset[q]);
            }
        }
        
        return this.utils.wrapOutput(output, settings.options.lineWrap);
    }


    /**
     * BaseEx basE91 Decoder.
     * @param {string} input - basE91 String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);
        const charset = this.charsets[settings.version];

        // Make it a string, whatever goes in
        input = this.utils.normalizeInput(input);
        let inArray = [...input];

        // remove unwanted characters if integrity is false 
        if (!settings.integrity) {
            inArray = inArray.filter(c => charset.includes(c));
        }


        let l = inArray.length;

        // For starters leave the last char behind
        // if the length of the input string is odd.

        let odd = false;
        if (l % 2) {
            odd = true;
            l--;
        }

        // Set again integer n for base conversion.
        // Also initialize a bitCount(er)

        let n = 0;
        let bitCount = 0;
        
        // Initialize an ordinary array
        const b256Array = new Array();
        
        // Walk through the string in steps of two
        // (aka collect remainder- and quotient-pairs)
        for (let i=0; i<l; i+=2) {

            const c0 = charset.indexOf(inArray[i]);
            const c1 =  charset.indexOf(inArray[i+1]);
            
            if (c0 < 0) {
                throw new DecodingError(inArray[i]);
            }
            if (c1 < 0) {
                throw new DecodingError(inArray[i+1]);
            }

            // Calculate back the remainder of the integer "n"
            const rN = c0 + c1 * 91;
            n = (rN << bitCount) + n;
            bitCount += (rN % 8192 > 88) ? 13 : 14;

            // calculate back the individual bytes (base256)
            do {
                b256Array.push(n % 256);
                n >>= 8;
                bitCount -= 8;
            } while (bitCount > 7);
        }

        // Calculate the last byte if the input is odd
        // and add it
        if (odd) {
            const lastChar = inArray.at(l);
            const rN = charset.indexOf(lastChar);
            b256Array.push(((rN << bitCount) + n) % 256);
        }

        const output = Uint8Array.from(b256Array);

        // Return the output
        return this.utils.outputHandler.compile(output, settings.outputType);
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
