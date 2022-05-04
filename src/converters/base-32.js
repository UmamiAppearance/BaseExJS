/**
 * [BaseEx|Base16 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/src/base-16.js}
 *
 * @version 0.4.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */


/**
 * En-/decoding to and from Base16/Hexadecimal.
 * -------------------------------------------
 * 
 * This is a base16/converter. Various input can be 
 * converted to a hex string or a hex string can be
 * decoded into various formats. It is possible to 
 * convert in both signed and unsigned mode.
 */


import {  BaseConverter, BaseTemplate } from "../core.js";

export class Base32 extends BaseTemplate {
    
    constructor(...args) {
        super();

        this.charsets.rfc3548 =   "abcdefghijklmnopqrstuvwxyz234567";
        this.charsets.rfc4648 =   "0123456789abcdefghijklmnopqrstuv";
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
