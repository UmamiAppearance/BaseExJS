import { BaseConverter, BaseTemplate } from "../core.js";

export class Base1 extends BaseTemplate {
    constructor(...args) {
        super();

        delete this.addCharset;

        this.charsets.all = "*";
        this.charsets.sequence = "Hello World!";
        this.charsets.default = "1";
        this.charsets.tmark = "|";

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
        [inputBytes, negative,] = this.utils.inputHandler.toBytes(input, settings);

        // Convert to BaseRadix string
        let base10 = this.converter.encode(inputBytes, null, settings.littleEndian)[0];
        
        let n = BigInt(base10);
        let output = "";

        // Limit the input before it even starts.
        // The executing engine will most likely
        // give up much earlier.
        // (2**29-24 during tests)

        if (n > Number.MAX_SAFE_INTEGER) {
            throw new RangeError("Invalid string length.");
        }
        n = Number(n);

        const charset = this.charsets[settings.version];
        const charAmount = charset.length;

        if (charAmount === 1) {
            output = charset.repeat(n)
        } else {
            for (let i=0; i<n; i++) {
                output += charset[i%charAmount];
            }
        }
        
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
        if (settings.version !== "all") {
            const cleanedSet = [...new Set(this.charsets[settings.version])].join("")
            const regex = new RegExp(`[^${cleanedSet}]`,"g");
            input = input.replace(regex, "");
        }
        input = String(input.length);

        // Run the decoder
        const output = this.converter.decode(input, "0123456789", settings.littleEndian);
        
        // Return the output
        return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
