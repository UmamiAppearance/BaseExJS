import { BaseConverter, BaseTemplate } from "./core.js";

export class Base58 extends BaseTemplate{

    constructor(...args) {
        super(); 

        this.charsets.default = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
        this.charsets.bitcoin = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        this.charsets.flickr =  "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

        // predefined settings
        this.converter = new BaseConverter(58, 0, 0);
        this.padding = true;
        this.version = "bitcoin";
        
        // list of allowed/disallowed args to change
        this.isMutable.padding = true;
        this.isMutable.signed = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {

        let { 
            settings,
            inputBytes,
            type,
            output,
         } = super.encode(input, ...args);

        if (settings.padding && type !== "int") { 
        
            let i = 0;
            const end = inputBytes.length;
            while (!inputBytes[i]) {
                i++;
                if (i === end) {
                    i = 0;
                    break;
                }
            }

            const zeroPadding = i;

            // Convert to Base58 string
            output = this.converter.encode(inputBytes, this.charsets[settings.version])[0];

            if (zeroPadding) {
                output = ("1".repeat(zeroPadding)).concat(output);
            }

        } else {
            // Convert to Base58 string directly
            output = this.converter.encode(inputBytes, this.charsets[settings.version])[0];
        }

        
        return output;
    }

    decode(input, ...args) {
        
        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        // Make it a string, whatever goes in
        input = String(input);

        let output;
        if (settings.padding) {
            
            let i = 0;
            while (input[i] === "1") {
                i++;
            }

            const zeroPadding = i;

            // Run the decoder
            output = this.converter.decode(input, this.charsets[settings.version]);

            if (zeroPadding) {
                output = Uint8Array.from([...new Array(zeroPadding).fill(0), ...output]);
            }

        } else {
            // Run the decoder
            output = this.converter.decode(input, this.charsets[settings.version]);
        }

        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType);
    }
}
