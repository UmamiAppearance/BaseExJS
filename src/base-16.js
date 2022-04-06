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
            negative,
            output
        } = super.encode(input, ...args);

        // apply settings for results with or without two's complement system
        if (settings.signed) {
            output = this.utils.toSignedStr(output, negative);
        }

        if (settings.upper) {
            output = output.toUpperCase();
        }

        return output;
    }

    decode(rawInput, ...args) {
        
        let { settings, input } = super.preDecode(rawInput, ...args);
        
        // Test for a negative sign
        let negative;
        [input, negative] = this.utils.extractSign(input);   
        
        if (negative && !settings.signed) {
            this.utils.signError();
        }

        // Remove "0x" if present
        input = input.replace(/^0x/, "");

        // Make it lower case
        input = input.toLowerCase();

        // Ensure even number of characters
        if (input.length % 2) {
            input = "0".concat(input);
        }
        
        // Run the decoder
        let output = this.converter.decode(input, this.charsets[settings.version]);

        // If signed mode is set, calculate the bytes per element to
        // allow the conversion of output to an integer.
        
        if (settings.signed) {
            output = this.utils.toSignedArray(output, negative);
        }
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
