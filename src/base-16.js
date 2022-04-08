import { BaseConverter, BaseTemplate } from "./core.js";

export class Base16 extends BaseTemplate {

    constructor(...args) {
        super();

        // default settings
        this.charsets.default = "0123456789abcdef";
        this.hasSignedMode = true;
        
        this.converter = new BaseConverter(16, 1, 2);
        
        this.isMutable.signed = true;
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
            // Remove "0x" if present
            input = input.replace(/^0x/, "");

            // Ensure even number of characters
            if (input.length % 2) {
                input = "0".concat(input);
            }

            return input;
        }
        
        return super.decode(rawInput, normalizeInput, null, ...args);
    }
}
