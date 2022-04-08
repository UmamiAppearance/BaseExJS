import { BaseConverter, BaseTemplate } from "./core.js";

export class SimpleBase extends BaseTemplate {
    constructor(radix, ...args) {
        super();

        if (!radix || !Number.isInteger(radix) || radix < 2 || radix > 36) {
            throw new RangeError("Radix argument must be provided and has to be an integer between 2 and 36.")
        }

        this.charsets.selection = "0123456789abcdefghijklmnopqrstuvwxyz".substring(0, radix);
    
        // predefined settings
        this.converter = new BaseConverter(radix, 0, 0);
        this.hasSignedMode = true;
        this.littleEndian = !(radix === 2 || radix === 16);
        this.signed = true;
        this.version = "selection";
        
        // list of allowed/disallowed args to change
        this.isMutable.littleEndian = true,
        this.isMutable.upper = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }
    
    encode(input, ...args) {
        return super.encode(input, null, null, ...args);
    }

    decode(rawInput, ...args) {

        // pre decoding function
        const normalizeInput = (scope) => {

            let { input } = scope;

            if (this.converter.radix === 2) {
                const leadingZeros = (8 - (input.length % 8)) % 8;
                input = `${"0".repeat(leadingZeros)}${input}`;
            } else if (this.converter.radix === 16) {
                const leadingZeros = input.length % 2;
                input = `${"0".repeat(leadingZeros)}${input}`;
            }

            return input;
        }
        
        return super.decode(rawInput, normalizeInput, null, ...args);

    }
}
