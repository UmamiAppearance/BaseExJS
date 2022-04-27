import {  BaseConverter, BaseTemplate } from "../core.js";
import { Utils } from "../utils.js";

export class LEB128 extends BaseTemplate {
    
    constructor(...args) {
        super(false);

        delete this.charsets;
        delete this.version;

        this.converter = new BaseConverter(10, 0, 0);
        this.utils = new Utils(this);
        
        this.littleEndian = true;
        this.hasSignedMode = true;
        this.isMutable.signed = true;

        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        
        let inputBytes, negative;
        
        const signed = settings.signed;
        settings.signed = true;
        [inputBytes, negative,] = this.utils.inputHandler.toBytes(input, settings);

        // Convert to BaseRadix string
        let base10 = this.converter.encode(inputBytes, null, true)[0];

        let n = BigInt(base10);
        let output = new Array();
        
        if (negative) {

            if (!signed) {
                Utils.warning("Unsigned mode was switched to signed, due to a negative input.");
            }
             
            n = -n;

            for (;;) {
                const byte = Number(n & 127n);
                n >>= 7n;
                if ((n == 0 && (byte & 64) == 0) || (n == -1 && (byte & 64) != 0)) {
                    output.push(byte);
                    break;
                }
                output.push(byte | 128);
            }
        }

        else {
            for (;;) {
                const byte = Number(n & 127n);
                n >>= 7n;
                if (n == 0) {
                    output.push(byte)
                    break;
                }
                output.push(byte | 128);
            }
        }

        return Uint8Array.from(output);
    }

    decode(input, ...args) {
        
        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        } 

        input = Array.from(input);

        let n = 0n;
        let shift = 0;
        let negative = false;

        /*
        for (;;) {
            const byte = input.shift();
            n |= BigInt((byte & 127) << shift);
            console.log(n);
            shift += 7;
            if ((128 & byte) === 0) {
                if (shift < 32 && (byte & 64) !== 0) {
                    n |= BigInt(~0 << shift);
                    negative = true;
                    n = -n;
                    console.log("negative");
                }
                break;
            }
        }
        */

        let r = 0n;
        let a, b;
        input.forEach((e, i) => {
            console.log("index:", i);
            console.log("byte:", e);
            r += BigInt((BigInt(e & 127) << BigInt(i * 7)))
            console.log("num:", r);
            [a,b] = [e,i];
        });
        const x = a & 64;
        console.log("e&64", x);
        console.log("settings.signed: ", settings.signed);
        if (settings.signed && (a & 64) != 0) {
            console.log(b);
            console.log("right:", -(1n << BigInt(b * 7) + 7n));
            r |= -(1n << BigInt(b * 7) + 7n);
        }
        console.log(r);

        const output = this.converter.decode(r.toString(), "0123456789", true);

        // Return the output
        return this.utils.outputHandler.compile(output, settings.outputType, false, negative);
    }
}
