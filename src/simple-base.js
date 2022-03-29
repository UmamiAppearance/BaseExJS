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

        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        
        let inputBytes, negative;
        [inputBytes, negative,] = this.utils.smartInput.toBytes(input, settings.signed, settings.littleEndian);

        // Convert to BaseRadix string
        let output = this.converter.encode(inputBytes, this.charsets[settings.version], settings.littleEndian)[0];

        output = this.utils.toSignedStr(output, negative);

        if (settings.upper) {
            output = output.toUpperCase();
        }
        
        return output;
    }

    decode(input, ...args) {

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        // Make it a string, whatever goes in
        input = String(input);
        
        // Test for a negative sign
        let negative;
        [input, negative] = this.utils.extractSign(input);   
        
        // Ensure correct length of characters
        // for binary and hexadecimal
        if (this.converter.radix === 2) {
            const leadingZeros = (8 - (input.length % 8)) % 8;
            input = `${"0".repeat(leadingZeros)}${input}`;
        } else if (this.converter.radix === 16) {
            const leadingZeros = input.length % 2;
            input = `${"0".repeat(leadingZeros)}${input}`;
        }

        // Make it lower case
        input = input.toLowerCase();

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[settings.version], settings.littleEndian);
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
