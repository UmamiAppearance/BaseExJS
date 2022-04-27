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
        let base10 = this.converter.encode(inputBytes, "0123456789", settings.littleEndian)[0];

        let n = BigInt(base10);
        let output = new Array();
        
        if (negative) {
            if (!signed) {
                throw new TypeError("Negative values are not allowed for this converter in unsigned mode");
            } else {
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
        //
    }
}
