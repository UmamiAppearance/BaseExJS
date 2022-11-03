/**
 * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";
import Big from "../../node_modules/big.js/big.mjs";
Big.DP = 40

//import { CharsetError } from "../utils.js";

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

    #Phi = Big("1.61803398874989484820458683436563811772030917980576286213545");
    
    /**
     * BaseEx basE91 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // converter (properties only)
        this.converter = {
            radix: 2, // radix is Phi, but the normalized representation allow two chars
            bsEnc: 0,
            bsDec: 0
        }

        this.b10 = new BaseConverter(10, 0, 0);

        // charsets
        this.charsets.default = ["0", "1"];

        this.version = "default";

        // apply user settings
        this.utils.validateArgs(args, true);

        // mutable extra args
        this.isMutable.integrity = false;
    }

    #approxNull(n) { 
        return !(n.round(39)
            .abs()
            .toNumber()
        );
    }
    
    #nextPhiExp(last, cur) {
        return [ cur, last.plus(cur) ];
    }

    #prevPhiExp(cur, prev) {
        return [ prev.minus(cur), cur ];
    }

    /**
     * BaseEx LEB128 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {{ buffer: ArrayBufferLike; }} - LEB128 encoded Unit8Array (or hex string of it).
     */
    encode(input, ...args) {
        
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        const signed = settings.signed;
        settings.signed = true;
        const [ inputBytes, negative, ] = this.utils.inputHandler.toBytes(input, settings);

        // Convert to BaseRadix string
        const base10 = this.b10.encode(inputBytes, null, settings.littleEndian)[0];
        let n = Big(base10);

        const exponents = [];
        const decExponents = [];
        
        const reduceN = (cur, prev, exp) => {

            if (this.#approxNull(n)) {
                console.warn(0);
                return;
            }

            while (cur.gt(n)) {
                if (exp === 1) {
                    // TODO: Test this!
                    cur = this.#Phi;
                    prev = this.#Phi.plus(1);
                }
                [ cur, prev ] = this.#prevPhiExp(cur, prev);
                if (cur.lte(0)) {
                    console.warn("below 0");
                    return;
                }
                exp--;
                //console.log("a", cur.toFixed(), prev.toFixed(), exp);
                if (exp < -200) throw new Error("Infinity loop");
            }

            if (exp > -1) {
                exponents.push(exp);
            } else {
                decExponents.push(exp);
            }
            n = n.minus(cur);
            //console.log("end", n.toFixed(), exp, cur.toFixed());

            reduceN(cur, prev, exp);
        }

        let output;

        if (n === 0 || n == 1) {
            output = Number(n).toString(10);
            console.log(output);
        } else {
            let [ last, cur ] = this.#nextPhiExp(this.#Phi.minus(1), Big(1));
            let exp = 0;
            while (cur.lt(n)) {
                [ last, cur ] = this.#nextPhiExp(last, cur);
                exp++;
            }

            reduceN(last, cur, exp);
        }

        console.log(exponents, decExponents);

        let fN = 0;
        exponents.forEach(exp => fN += 2**exp);
        let fN2 = 0;
        decExponents.forEach(exp => fN2 += 2**exp);

        console.log(fN, fN2);
        
        
        return fN.toString(2) + fN2.toString(2).slice(1);
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

        const [ posExpStr, decExpStr ] = input.split(".");

        const exponents = [];
        const decExponents = [];

        [...posExpStr].reverse().forEach((bit, i) => {
            if (bit|0) {
                exponents.push(i);
            }
        });

        [...decExpStr].forEach((bit, i) => {
            if (bit|0) {
                decExponents.push(-i-1);
            }
        });

        console.log(exponents, decExponents);

        let n = Big(0);

        let exp = 0;
        let cur = Big(1); 
        let last = this.#Phi.minus(cur);
        
        for (const nExp of exponents) {
            while (nExp > exp) {
                [ last, cur ] = this.#nextPhiExp(last, cur);
                exp++;
            }
            console.log(cur.toFixed(), exp);
            n = n.plus(cur);
        }


        exp = -1;
        let prev = Big(1); 
        cur = this.#Phi.minus(prev);

        for (const nExp of decExponents) {
            while (exp > nExp) {
                [ cur, prev ] = this.#prevPhiExp(cur, prev);
                exp--;
            }
            console.log(cur.toFixed(), exp);
            n = n.plus(cur);
        }

        console.log(n.toFixed());

    }
}
