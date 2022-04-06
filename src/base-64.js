import { BaseConverter, BaseTemplate } from "./core.js";

export class Base64 extends BaseTemplate {

    constructor(...args) {
        super();

        const b62Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets.default = b62Chars.concat("+/");
        this.charsets.urlsafe = b62Chars.concat("-_");
     
        // predefined settings
        this.converter = new BaseConverter(64, 3, 4);
        this.padding = true;
        
        // list of allowed/disallowed args to change
        this.isMutable.padding = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        
        let {
            settings,
            output,
            zeroPadding
        } = super.encode(input, ...args);
    
        // Cut of redundant chars and append padding if set
        if (zeroPadding) {
            const padValue = this.converter.padBytes(zeroPadding);
            output = output.slice(0, output.length-padValue);
            if (settings.padding) { 
                output = output.concat("=".repeat(padValue));
            }
        }
        
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base64 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base32-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "rfc3548"   :  defines to use the charset of this version
                "rfc4648"   :  defines to use the charset of this version (default)
        */

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        // Make it a string, whatever goes in
        input = String(input);

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[settings.version]);
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType);
    }
}
