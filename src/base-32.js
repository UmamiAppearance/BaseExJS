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

        this.charsets.rfc3548 =  "abcdefghijklmnopqrstuvwxyz234567";
        this.charsets.rfc4648 =  "0123456789abcdefghijklmnopqrstuv";
        this.charsets.crockford = "0123456789abcdefghjkmnpqrstvwxyz";
        this.charsets.zbase32 =   "ybndrfg8ejkmcpqxot1uwisza345h769";
    
        // predefined settings
        this.converter = new BaseConverter(32, 5, 8);
        this.hasSignedMode = true;
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

        const applyPadding = (scope) => {

            let { output, settings, zeroPadding } = scope;

            if (!settings.littleEndian) {
                
                // Cut of redundant chars and append padding if set

                if (zeroPadding) {
                    const padValue = this.converter.padBytes(zeroPadding);
                    output = output.slice(0, output.length-padValue);
                    if (settings.padding) { 
                        output = output.concat("=".repeat(padValue));
                    }
                }
            }

            return output;
        }
        
        return super.encode(input, null, applyPadding, ...args);
    }

    decode(rawInput, ...args) {
        return super.decode(rawInput, null, null, ...args);
    }
}
