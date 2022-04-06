import {  BaseConverter, BaseTemplate } from "./core.js";

export class Base32 extends BaseTemplate {
    /*
        En-/decoding to and from Base32.
        -------------------------------

        Uses RFC standard 4658 by default (as used e.g
        for (t)otp keys), RFC 3548 is also supported.
        
        (Requires "BaseConverter", "Utils")
    */
    
    constructor(...args) {
        super();

        this.charsets.rfc3548 =  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        this.charsets.rfc4648 =  "0123456789ABCDEFGHIJKLMNOPQRSTUV";
        this.charsets.crockford = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
        this.charsets.zbase32 =   "YBNDRFG8EJKMCPQXOT1UWISZA345H769";
    
        // predefined settings
        this.converter = new BaseConverter(32, 5, 8);
        this.padding = true;
        this.version = "rfc4648";
        
        // list of allowed/disallowed args to change
        this.isMutable.littleEndian = true;
        this.isMutable.padding = true;
        this.isMutable.signed = true;
        this.isMutable.upper = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }
    
    encode(input, ...args) {
        
        let {
            settings,
            negative,
            output,
            zeroPadding
        } = super.encode(input, ...args);

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
