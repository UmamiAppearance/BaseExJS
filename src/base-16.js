import {  BaseConverter, Utils } from "./core.js";

export class Base16 {

    constructor(...args) {
        
        // default settings
        this.charsets = {
            default: "0123456789abcdef" 
        }
        
        this.converter = new BaseConverter(16, 1, 2);
        this.littleEndian = false;
        this.outputType = "buffer";
        this.padding = false;
        this.signed = false;
        this.upper = false;
        this.utils = new Utils(this);
        this.version = "default";
        
        this.isMutable = {
            littleEndian: false,
            padding: false,
            signed: true,
            upper: true,
        };

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        /* 
            Hex string encoder from string or bytes.
            -------------------------------

            @input: string or (typed) array of bytes
            @args:  possible alternative charset
        */
        
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        
        let inputBytes, negative;
        [inputBytes, negative] = this.utils.smartInput.toBytes(input, settings.signed);

        // Convert to Base16 string
        let output = this.converter.encode(inputBytes, this.charsets[settings.version])[0];

        // apply settings for results with or without two's complement system
        if (settings.signed) {
            output = this.utils.toSignedStr(output, negative);
        }

        if (settings.upper) {
            output = output.toUpperCase();
        }

        return output;
    }

    decode(input, ...args) {
        /*
            Hex string decoder.
            ------------------

            @input: hex-string
            @args:  possible alternative charset
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

        // Remove "0x" if present
        input = input.replace(/^0x/, "");

        // Make it lower case
        input = input.toLowerCase();

        // Ensure even number of characters
        if (input.length % 2) {
            input = "0".concat(input);
        }
        
        // Run the decoder
        let output = this.converter.decode(input, this.charsets[settings.version]);

        // If signed mode is set, calculate the bytes per element to
        // allow the conversion of output to an integer.
        
        if (settings.signed) {
            output = this.utils.toSignedArray(output, negative);
        }
        
        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType);
    }
}
