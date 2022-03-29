import {  BaseConverter, BaseTemplate } from "./core.js";

export class Base1 extends BaseTemplate {
    constructor(...args) {
        super();

        this.charsets.all = "*";
        this.charsets.list = "*";
        this.charsets.default = "1";
        this.charsets.tmark = "|";

        this.base10Chars = "0123456789";
        this.converter = new BaseConverter(10, 0, 0);
        this.littleEndian = true;
        
        this.isMutable.signed = true;
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
        let base10 = this.converter.encode(inputBytes, this.base10Chars, settings.littleEndian)[0];
        
        let n = BigInt(base10);
        let output = "";

        // Limit the input before it even starts.
        // the executing engine will most likely
        // give up much earlier.
        // (2^29-24 during tests

        if (n > Number.MAX_SAFE_INTEGER) {
            throw new RangeError("Invalid string length.");
        }

        console.log(this.charsets[settings.version]);
        output = this.charsets[settings.version].repeat(Number(n))

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
        
        // remove all but the relevant character
        const regex = new RegExp(`[^${this.charsets[settings.version]}]`,"g");
        input = input.replace(regex, "");

        input = String(input.length);

        console.log(input);

        // Run the decoder
        const output = this.converter.decode(input, this.base10Chars, settings.littleEndian);
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
