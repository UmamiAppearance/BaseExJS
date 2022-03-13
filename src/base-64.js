import {  BaseConverter, Utils } from "./core.js";

export class Base64 {
    /*
        En-/decoding to and from Base64.
        -------------------------------
        
        Regular and urlsafe charsets can be used.
        (Requires "BaseConverter", "Utils")
    */

    constructor(...args) {
        /*
            The charset defined here is used by de- and encoder.
            This can be overwritten during the call of the function.
        */

        const b62Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets = {
            default: b62Chars.concat("+/"),
            urlsafe: b62Chars.concat("-_")
        }

        // predefined settings
        this.converter = new BaseConverter(64, 3, 4);
        this.littleEndian = false;
        this.outputType = "buffer";
        this.padding = true;
        this.signed = false;
        this.upper = null;
        this.utils = new Utils(this);
        this.version = "default";
        
        // list of allowed/disallowed args to change
        this.isMutable = {
            littleEndian: true,
            padding: true,
            signed: false,
            upper: false,
        };

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        /* 
            Encode from string or bytes to base64.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "rfc3548"   :  sets the used charset to this standard
                "rfc4648"   :  sets the used charset to this standard
        */

        // argument validation and input settings
        const settings = this.utils.validateArgs(args); 
        const inputBytes = this.utils.smartInput.toBytes(input, settings.signed, settings.littleEndian)[0];

        // Convert to Base64 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[settings.version]);
            
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
