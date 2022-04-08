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

        const applyPadding = (scope) => {

            let { inputBytes, output, settings, type } = scope;

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

                if (zeroPadding) {
                    output = ("1".repeat(zeroPadding)).concat(output);
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

            if (settings.padding) {
            
                let i = 0;
                while (input[i] === "1") {
                    i++;
                }
    
                const zeroPadding = i;
    
                if (zeroPadding) {
                    output = Uint8Array.from([...new Array(zeroPadding).fill(0), ...output]);
                }
    
            }

            return output;
        }

        return super.decode(rawInput, null, applyPadding, ...args);
    }
}
