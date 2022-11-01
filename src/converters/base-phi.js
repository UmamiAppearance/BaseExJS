/**
 * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";
import Big from "../../node_modules/big.js/big.mjs";
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
        let n = Big(base10);
        const exponents = [];
        const decExponents = [];
        
        const approxNull = n => !(
            n.round(14)
                .abs()
                .toNumber()
        );
        
        const Phi = (1+Math.sqrt(5))/2;
        const PrecisePhi = Big("1.61803398874989484820458683436563811772030917980576286213545");
        //const PhiSquare = Phi**2;
        //const BigPhi = BigInt(Phi * 1e15);

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

        const bigIntLog10 = n => {
            if (n < 0) return NaN;
            const str = String(n);
            return str.length + Math.log10(`0.${str.slice(0, 15)}`);
        };
        const bigIntLog = n => bigIntLog10(n) * Math.log(10);

        const highestLucasFraction = (n, isBig) => {
            //console.log("luInput", n);
            const lg = isBig ? bigIntLog : Math.log;
            return Math.floor(lg(n) / Math.log(Phi));
        }

        const luMod = n => {
            let m, isBig;
            if (n.gt(Number.MAX_SAFE_INTEGER)) {
                m = BigInt(n.round().toFixed());
                isBig = true;
            } else {
                m = n.toNumber();
                isBig = false;
            }
            //console.log("m", m, "isInt=", isBig);
            const luIndex = highestLucasFraction(m, isBig);
            //console.log("luIndex", luIndex);
            const r = n.minus(PrecisePhi.pow(luIndex));
            return [ luIndex, r ];
        }

        const getExpLTPhi = (n, exp=-1, lastPhi=Big(1), curPhi=PrecisePhi.minus(1)) => {
            //console.log("n", n.toFixed(), "exp", exp);
            if (approxNull(n)) {
                console.warn(0);
                return;
            }

            let nextPhi;

            do {
                //console.log("loop: exp", exp, "SmallPhi", PrecisePhi.pow(exp).toFixed());
                const round = 15;

                //console.log("compN", n.round(round).toFixed(), "phi", smallPhi.toFixed());
                if (curPhi.round(round).lte(n.round(round))) {
                    decExponents.push(exp);
                    n = n.minus(curPhi);
                    break;
                }

                if (exp < -500) {
                    console.error(Infinity);
                    return;
                }

                nextPhi = lastPhi.minus(curPhi);
                lastPhi = curPhi;
                curPhi = nextPhi;

            } while (exp--);

            
            if (exp < -500) return;
            getExpLTPhi(n, exp, lastPhi, curPhi);
        }

        const getExpGTPhi = (n) => {

            let exp, r;
            [ exp, r ] = luMod(n);
            //console.log(exp, r);
            
            exponents.push(exp);

            if (r <= 2) {
                //console.log("end", n);
                let fr = n.minus(PrecisePhi.pow(exp));
                //console.log(fr);
                if (fr.gte(PrecisePhi)) {
                    exponents.push(1);
                    fr = fr.minus(PrecisePhi);
                } else if (fr.gt(1)) {
                    exponents.push(0);
                    fr = fr.minus(1);
                } 
                //console.log(fr.toFixed());
                getExpLTPhi(fr);
            }
            
            else {
                getExpGTPhi(r);
            }
            
        }
        
        let output;

        if (n === 0 || n == 1) {
            output = Number(n).toString(10);
            console.log(output);
        } else {
            getExpGTPhi(n);
            //console.log(exponents);
        }

        let fN = 0;
        exponents.forEach(exp => fN += 2**exp);
        let fN2 = 0;
        decExponents.forEach(exp => fN2 += 2**exp);
        
        //console.log(decExponents);
        console.log(fN.toString(2) + fN2.toString(2).slice(1));
    }
}
