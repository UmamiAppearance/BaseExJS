import {  BaseConverter, Utils } from "./core.js";
 
export class Base85 {
    /*
        En-/decoding to and from Base85.
        -------------------------------

        Four versions are supported: 
          
            * adobe
            * ascii85
            * rfc1924
            * z85
        
        Adobe and ascii85 are the basically the same.
        Adobe will produce the same output, apart from
        the <~wrapping~>.
        
        Z85 is an important variant, because of the 
        more interpreter-friendly character set.
        
        The RFC 1924 version is a hybrid. It is not using
        the mandatory 128 bit calculation. Instead only 
        the charset is used. Do not use this for any real
        project. (Keep in mind, that even the original is
        based on a joke).

        (Requires "BaseConverter", "Utils")
        
    */

    constructor(...args) {
        /*
            The charset defined here is used by de- and encoder.
            This can still be overwritten during the call of the
            function.
        */

        const asciiChars = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
        this.charsets = {
            ascii85: asciiChars,
            adobe: asciiChars,
            rfc1924: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~",
            z85: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#",
        }

        // predefined settings
        this.converter = new BaseConverter(85, 4, 5);
        this.littleEndian = false;
        this.outputType = "buffer";
        this.padding = false;
        this.signed = false;
        this.upper = null;
        this.utils = new Utils(this);
        this.version = "ascii85";
        
        // list of allowed/disallowed args to change
        this.isMutable = {
            littleEndian: false,
            padding: false,
            signed: false,
            upper: false,
        };

        // apply user settings
        this.utils.validateArgs(args, true);
    }
    
    encode(input, ...args) {
        /* 
            Encode from string or bytes to base85.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "adobe"     :  sets charset to ascii85 + <~frame~> 
                "ascii85"   :  sets charset to this commonly used one
                "rfc1924"   :  uses the charset (and only the charset) of this april fool
                    this.converter.padGroups = [0];    "z85"       :  sets the used charset to this variant
        */
       
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        const inputBytes = this.utils.smartInput.toBytes(input, settings.signed, settings.littleEndian)[0];
  
        // Initialize the replacing of null bytes for ascii85
        let replacer = null;
        if (settings.version.match(/adobe|ascii85/)) {
            replacer = (frame, zPad) => (!zPad && frame === "!!!!!") ? "z" : frame;
        }

        // Convert to Base85 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[settings.version], false, replacer);
        
        // Cut of redundant chars
        if (zeroPadding) {
            const padValue = this.converter.padBytes(zeroPadding);
            output = output.slice(0, output.length-padValue);
        }

        // Adobes variant gets its <~framing~>
        if (settings.version === "adobe") {
            output = `<~${output}~>`;
        }
        
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base85 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base85-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "adobe"     :  sets charset to ascii85 + <~frame~> 
                "ascii85"   :  sets charset to this commonly used one
                "rfc1924"   :  uses the charset (and only the charset) of this april fool
                "z85"       :  sets the used charset to this variant
        */

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        // Make it a string, whatever goes in
        input = String(input);

        // For default ascii85 convert "z" back to "!!!!!"
        if (settings.version.match(/adobe|ascii85/)) {
            input = input.replace(/z/g, "!!!!!");
            if (settings.version === "adobe") {
                input = input.replace(/^<~|~>$/g, "");
            }
        }

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[settings.version]);
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType);
    }
}
