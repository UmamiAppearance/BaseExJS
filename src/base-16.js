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
        
        let {
            settings,
            output
        } = super.encode(input, ...args);

        if (settings.upper) {
            output = output.toUpperCase();
        }

        return output;
    }

    decode(rawInput, ...args) {
        
        let { settings, input, negative } = super.decode(rawInput, ...args);
        
        // Remove "0x" if present
        input = input.replace(/^0x/, "");

        // Ensure even number of characters
        if (input.length % 2) {
            input = "0".concat(input);
        }
        
        // Run the decoder
        let output = this.converter.decode(input, this.charsets[settings.version]);

        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
