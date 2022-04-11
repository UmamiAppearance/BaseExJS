import { BaseConverter, BaseTemplate } from "../core.js";

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

        const applyPadding = (scope) => {

            let { inputBytes, output, settings, type } = scope;

            if (settings.padding && type !== "int") { 
                
                // Count all null bytes at the start of the array
                // stop if a byte with a value is reached. If it goes
                // all the way through it, reset index and stop.
                let i = 0;
                const end = inputBytes.length;

                // only proceed if input has a length at all
                if (end) {
                    while (!inputBytes[i]) {
                        i++;
                        if (i === end) {
                            i = 0;
                            break;
                        }
                    }

                    // The value for zero padding is the index of the
                    // first byte with a value plus one.
                    const zeroPadding = i;

                    // Set a one for every leading null byte
                    if (zeroPadding) {
                        output = ("1".repeat(zeroPadding)).concat(output);
                    }
                }
            }

            return output;
        }
    
        return super.encode(input, null, applyPadding, ...args);
    }

    decode(rawInput, ...args) {
        
        // post decoding function
        const applyPadding = (scope) => {

            let { input, output, settings } = scope;

            if (settings.padding && input.length > 1) {
                
                // Count leading ones 
                let i = 0;
                while (input[i] === "1") {
                    i++;
                }
    
                // The counter becomes the zero padding value
                const zeroPadding = i;
    
                // Create a new Uint8Array with leading null bytes 
                // with the amount of zeroPadding
                if (zeroPadding) {
                    output = Uint8Array.from([...new Array(zeroPadding).fill(0), ...output]);
                }
    
            }

            return output;
        }

        return super.decode(rawInput, null, applyPadding, ...args);
    }
}
