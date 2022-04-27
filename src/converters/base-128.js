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
        let shiftVal = -7n;
        let byte;

        for (byte of input) {
            shiftVal += 7n;
            n += (BigInt(byte & 127) << shiftVal);
        }
        
        if (settings.signed && (byte & 64) != 0) {
            n |= -(1n << shiftVal + 7n);
        }

        // Test for a negative sign
        let decimalNum, negative;
        [decimalNum, negative] = this.utils.extractSign(n.toString());

        const output = this.converter.decode(decimalNum, "0123456789", true);

        // Return the output
        return this.utils.outputHandler.compile(output, settings.outputType, true, negative);
    }
}
