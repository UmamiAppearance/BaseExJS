import {  BaseConverter, Utils } from "./core.js";

export class Base32 {
    /*
        En-/decoding to and from Base32.
        -------------------------------

        Uses RFC standard 4658 by default (as used e.g
        for (t)otp keys), RFC 3548 is also supported.
        
        (Requires "BaseConverter", "Utils")
    */
    
    constructor(...args) {
        /*
            The RFC standard defined here is used by de- and encoder.
            This can be overwritten during the call of the function.
        */
        
        this.charsets = {
            rfc3548:   "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            rfc4648:   "0123456789ABCDEFGHIJKLMNOPQRSTUV",
            crockford: "0123456789ABCDEFGHJKMNPQRSTVWXYZ",
            zbase32: "YBNDRFG8EJKMCPQXOT1UWISZA345H769",
        }
    
        // predefined settings
        this.converter = new BaseConverter(32, 5, 8);
        this.littleEndian = false;
        this.outputType = "buffer";
        this.padding = true;
        this.signed = false;
        this.upper = false;
        this.utils = new Utils(this);
        this.version = "rfc4648";
        
        // list of allowed/disallowed args to change
        this.isMutable = {
            littleEndian: true,
            padding: true,
            signed: true,
            upper: true,
        };

        // apply user settings
        this.utils.validateArgs(args, true);
    }
    
    encode(input, ...args) {
        /* 
            Encode from string or bytes to base32.
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
        
        let inputBytes, negative;
        [inputBytes, negative,] = this.utils.smartInput.toBytes(input, settings.signed, settings.littleEndian);

        // Convert to Base32 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[settings.version], settings.littleEndian);
        
        if (!settings.littleEndian) {
            
            // Cut of redundant chars and append padding if set

            if (zeroPadding) {
                const padValue = this.converter.padBytes(zeroPadding);
                output = output.slice(0, output.length-padValue);
                if (settings.padding) { 
                    output = output.concat("=".repeat(padValue));
                }
            }
        } else {
            
            // apply settings without two's complement system
            
            output = this.utils.toSignedStr(output, negative);
        }

        if (!settings.upper) {
            output = output.toLowerCase();
        }
        
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base32 string to utf8-string or bytes.
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
        
        // Test for a negative sign
        let negative;
        [input, negative] = this.utils.extractSign(input);   
        
        if (negative && !settings.signed) {
            this.utils.signError();
        }
        // Make it upper case
        input = input.toUpperCase();

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[settings.version], settings.littleEndian);
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}
