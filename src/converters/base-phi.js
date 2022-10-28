/**
 * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";
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
        let n = BigInt(base10);
        const exponents = [];
        
        const approxNull = (n) => Math.abs(parseFloat(n.toFixed(9))) == 0;
        
        const Phi = (1+Math.sqrt(5))/2;
        const PhiSquare = Phi**2;
        const BigPhi = BigInt(Phi * 1e15);

        const lucas = n => {
            let a=2n, b=1n, c, i;
     
            if (n === 0) return a;
        
            for (i=2n; i<=n; i++) {
                c = a + b;
                a = b;
                b = c;
            }
        
            return b;
        };

        const log10 = n => {
            if (n < 0) return NaN;
            const str = String(n);
            return str.length + Math.log10(`0.${str.slice(0, 15)}`);
        };
        const log = n => log10(n) * Math.log(10);

        const highestLucasFraction = n => Math.floor(log(n) / Math.log(Phi));

        const luMod = n => {
            const luIndex = highestLucasFraction(n);
            const r = n-lucas(luIndex);
            return [ luIndex, r ];
        }

        const getExpLTPhi = (n, exp=-1) => {
            console.log("n", n, "exp", exp);
            if (approxNull(n)) {
                console.warn(0);
                return;
            }
            do {
                console.log("exp", exp, "SmallPhi", Phi**exp);

                let smallPhi = Phi**exp;
                if (smallPhi < n) {
                    exponents.push(exp);
                    n -= smallPhi;
                    break;
                }

                if (exp < -16) {
                    console.log(Infinity);
                    return;
                }

            } while (exp--);

            
            if (exp < -16) return;
            getExpLTPhi(n, exp);
        }

        const getExpGTPhi = (n) => {

            let exp, r;
            [ exp, r ] = luMod(n);
            
            exponents.push(exp);

            if (r < 2) {
                console.log("done", n);
                let fr = Number(n) - Phi**exp;
                if (fr >= 1) {
                    exponents.push(1);
                    fr -= 1;
                } 
                return;
            }
            
            getExpGTPhi(r);
            
        }
        
        let output;

        if (n === 0 || n == 1) {
            output = Number(n).toString(10);
            console.log(output);
        } else {
            getExpGTPhi(n);
            console.log(exponents);
        }

        //exponents.forEach(exp => fN += 2n**exp);

    
        //console.log(fN.toString(2));
    }
}
