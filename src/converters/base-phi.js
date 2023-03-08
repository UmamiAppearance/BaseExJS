/**
 * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
 *
 * @version 0.7.4
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT
 */

import { BaseConverter, BaseTemplate } from "../core.js";
import Big from "../../lib/big.js/big.min.js";
import { DecodingError } from "../utils.js";

/**
 * BaseEx Base Phi Converter.
 * ------------------------
 * 
 * This is a base phi converter. Various input can be 
 * converted to a base phi string or a base phi string
 * can be decoded into various formats.
 * 
 */
export default class BasePhi extends BaseTemplate {

    #Phi = Big("1.618033988749894848204586834365638117720309179805762862135448622705260462818902449707207204189391137484754088075386891752");
    
    /**
     * BaseEx basE91 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // converter (properties only)
        this.converter = {
            radix: 2, // radix is Phi, but the normalized representation allows two chars
            bsEnc: 0,
            bsDec: 0
        }

        // base10 converter to have always have a numerical input 
        this.b10 = new BaseConverter(10, 0, 0);

        // charsets
        this.charsets.default = ["0", "1"];

        this.version = "default";
        this.signed = true;
        this.hasDecimalMode = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx BasePhi Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...string} [args] - Converter settings.
     * @returns {string} - BasePhi encoded string.
     */
    encode(input, ...args) {
        
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        const charset = this.charsets[settings.version];
        
        let inputBytes;
        let negative;
        let n;
        let output = "";

        // Base Phi allows direct encoding of rational 
        // and irrational numbers, which can be enabled
        // by using the special type "decimal". Input 
        // type must be "Number" for this mode. 
        if (settings.decimalMode) {
            if (Number.isFinite(input)) {
                if (input < 0) {
                    negative = true;
                    n = Big(-input);
                } else {
                    negative = false;
                    n = Big(input);
                }       
            }

            else {
                throw new TypeError("When running the converter in decimal-mode, only input of type 'Number' is allowed.")
            }
        }

        // Every other type first converts the byte representation
        // of the input to base 10.
        else {
            [ inputBytes, negative, ] = this.utils.inputHandler.toBytes(input, settings);
            n = Big(
                this.b10.encode(inputBytes, null, settings.littleEndian)[0]
            );
        }

        // if "n" if 0 or 1 stop here and return 0 or 1 (according to the charset)
        if (n.eq(0) || n.eq(1)) {
            output = charset[n.toNumber()]; 
            if (negative) {
                output = `-${output}`;
            }           
            return output;
        }
        
        // create two arrays to store all exponents
        const exponents = [];
        const decExponents = [];


        // The very first step is to find the highest exponent
        // of Phi which fits into "n" (the rounded highest exponent
        // is also the highest Lucas number which fits into "n")
        // To find the highest fitting exponent start with 
        // Phi^0 (1) and Phi^1 (Phi).

        let last = Big(1);
        let cur = this.#Phi;
        let exp = 0;
        
        // Now add the result with the last higher value "cur",
        // util "cur" is bigger than "n"
        while (cur.lt(n)) {
            [ last, cur ] = this.#nextPhiExp(last, cur);
            exp++;
        }
        
        /**
         * Recursive reduction function for "n". Finds the largest
         * fitting exponent of Phi (Lucas index), stores that index
         * in the exponent arrays and reduces "n" by the current exponents
         * power.
         * Once started, it calls itself until "n" is zero.  
         * @param {Object} cur - Current result of Phi^exp as a Big.js object. 
         * @param {Object} prev - Previous result of Phi^exp as a Big.js object. 
         * @param {number} exp - Exponent of Phi/Lucas index. 
         */
        const reduceN = (cur, prev, exp) => {

            // Due to the high floating point precision "n" should
            // be exactly zero, but if not, an approximation is 
            // sufficient.
            if (this.#approxNull(n)) return;

            // Reduce the exponents of Phi until it power fits into "n" 
            while (cur.gt(n)) {
                [ cur, prev ] = this.#prevPhiExp(cur, prev);
                
                // if "cur" gets negative return immediately
                // prevent an infinite loop
                if (cur.lte(0)) {
                    console.warn("Could not find an exact base-phi representation. Value is approximated.");
                    return;
                }
                exp--;
            }

            // Store the exponents
            if (exp > -1) {
                exponents.unshift(exp);
            } else {
                decExponents.push(exp);
            }

            // Reduce "n"
            n = n.minus(cur);

            reduceN(cur, prev, exp);
        }

        // Initial call of the reduction function
        reduceN(last, cur, exp);


        // Create a BasePhi string by setting a "1" at every
        // index stored in the "exponent" array. for every
        // number between two indices a zero is added. 
        exp = 0; 
        exponents.forEach(nExp => {
            while (exp < nExp) {
                output = `${charset[0]}${output}`;
                exp++;
            }
            output = `${charset[1]}${output}`;
            exp++;
        });

        // Add a decimal point
        if (!output) {
            output = "0.";
        } else {
            output += ".";
        }
        
        // Proceed with the decimal exponents
        exp = -1;
        decExponents.forEach(nExp => {
            while (exp > nExp) {
                output += charset[0];
                exp--;
            }
            output += charset[1];
            exp--;
        });

        // Add a "-" if the input is negative.
        if (negative) {
            output = `-${output}`;
        }
 
        return output;
    }


    /**
     * BaseEx Base Phi Decoder.
     * @param {string} input - Base Phi String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
     decode(input, ...args) {
        
        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);
        const charset = this.charsets[settings.version];

        let negative;
        [ input, negative ] = this.utils.extractSign(
            this.utils.normalizeInput(input)
        );

        // remove unwanted characters if integrity is false
        if (!settings.integrity) {
            const testChars = [...charset, "."];
            input = [...input].filter(c => testChars.includes(c)).join("");
        }
        
        // Split the input String at the decimal sign
        // and initialize a big.js-object with value 0
        const inputSplit = input.split(".");
        if (settings.integrity && inputSplit.length > 2) {
            throw new DecodingError(null, "There are multiple decimal points in the input.");
        } 

        const [ posExpStr, decExpStr ] = inputSplit;
        let n = Big(0);

        // Initialize two variables "last" and "cur"
        // for Phi^exp-1 and Phi^exp
        let last = this.#Phi.minus(1);
        let cur = Big(1); 
        
        // Convert the left side of the input string
        // to an array of chars and reverse it. Raise
        // the exponent of Phi and its values until a
        // one is found in the array, if a "1" was found
        // add the value "cur" to number "n" (one can
        // also be another corresponding char of the set
        // which represents 1).
        [...posExpStr].reverse().forEach((char) => {
            const charIndex = charset.indexOf(char);
            if (charIndex === 1) {
                n = n.plus(cur);
            } else if (charIndex !== 0) {
                throw new DecodingError(char);
            }
            [ last, cur ] = this.#nextPhiExp(last, cur);
        });

        // Now also add the values for the decimal places.
        if (decExpStr) {      
            let prev = Big(1); 
            cur = this.#Phi.minus(prev);
            
            [...decExpStr].forEach((char) => {
                const charIndex = charset.indexOf(char);
                if (charIndex === 1) {
                    n = n.plus(cur);
                } else if (charIndex !== 0) {
                    throw new DecodingError(char);
                }
                [ cur, prev ] = this.#prevPhiExp(cur, prev);
            });
        }

        // If running in decimal mode return n as a Number
        if (settings.decimalMode) {
            return n.toNumber();
        }

        // For every other case round "n" and turn it
        // into a string of an integer. 
        n = n.round().toFixed();

        // Use the base 10 decoder to get the byte
        // representation of "n".
        const output = this.b10.decode(n, [..."0123456789"], [], settings.integrity, settings.littleEndian);
 
        // Return the output according to the settings.
        return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
    }

    /**
     * Test if n is approximately zero.
     * @param {Object} n - Big.js Object. 
     * @returns {Boolean}
     */
    #approxNull(n) { 
        return !(n.round(50)
            .abs()
            .toNumber()
        );
    }
    
    /**
     * Get the results of of the following exponents of Phi
     * from the predecessors.
     * @param {Object} last - Phi^exp-1 as a big.js-object 
     * @param {Object} cur - Phi^exp as a big.js-object
     * @returns {Object[]} - Array with Phi^exp and Phi^exp+1
     */
    #nextPhiExp(last, cur) {
        return [ cur, last.plus(cur) ];
    }

    /**
     * Get the results of of the previous exponents of Phi
     * from the predecessors.
     * @param {Object} cur - Phi^exp as a big.js-object 
     * @param {Object} prev - Phi^exp-1 as a big.js-object
     * @returns {Object[]} - Array with Phi^exp-1 and Phi^exp
     */
    #prevPhiExp(cur, prev) {
        return [ prev.minus(cur), cur ];
    }
}
