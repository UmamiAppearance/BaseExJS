import { BaseConverter, BaseTemplate } from "./core.js";

export class Base16 extends BaseTemplate {

    constructor(...args) {
        super();

        // default settings
        this.charsets.default = "0123456789abcdef";
        
        this.converter = new BaseConverter(16, 1, 2);
        
        this.isMutable.signed = true;
        this.isMutable.upper = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        const { output } = super.encode(input, null, ...args);
        return output;
    }

    decode(rawInput, ...args) {
        
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

        let { settings, negative, output } = super.decode(rawInput, normalizeInput, ...args);
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
