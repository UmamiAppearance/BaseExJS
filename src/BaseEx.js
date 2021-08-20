class Base32 {
    constructor(standard=null) {
        
        if (standard && !(standard === "rfc3548" || standard === "rfc4648")) {
            throw new TypeError("Unknown standard.\nThe options are 'rfc3548' and 'rfc4648'.");
        }
        this.standard = standard;

        this.charsets = {
            rfc3548: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            rfc4648: "0123456789ABCDEFGHIJKLMNOPQRSTUV" 
        }
    }

    validateArgs(args) {
        if (Boolean(args.length)) {
            const validArgs = ["rfc3548", "rfc4648", "str", "array"];
            const globalStandard = Boolean(this.standard);

            args.forEach(arg => {
                if (!validArgs.includes(arg)) {
                    throw new TypeError(`Invalid argument: "${arg}"\nThe options are 'rfc3548' and 'rfc4648' for the rfc-standard. Valid arguments for in- and output-type are 'str' and 'array'.`);
                } else if (globalStandard && validArgs.slice(0, 2).includes(arg)) {
                    utils.warning(`Standard is already set.\nArgument '${arg}' was ignored.`)
                }
            });
        }
    }
    
    encode(input, ...args) {
        
        this.validateArgs(args);
        
        let standard = "rfc4648";
        if (Boolean(this.standard)) {
            standard = this.standard;
        } else if (args.includes("rfc3548")) {
            standard = "rfc3548";
        }

        const inputType = (args.includes("array")) ? "array" : "str";
        input = utils.validateInput(input, inputType);

        const chars = this.charsets[standard];

        let binaryStr;
        if (inputType === "str") {
            binaryStr = input.split('').map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join("");
        } else if (inputType === "array") {
            binaryStr = Array.from(input).map(b => b.toString(2).padStart(8, "0")).join("");
        }

        const bitGroups = binaryStr.match(/.{1,40}/g);

        let output = "";
        bitGroups.map(function(group) {
            const blocks = group.match(/.{1,5}/g).map(s=>s.padEnd(5, '0'));
            blocks.map(function(block) {
                const charIndex = parseInt(block, 2);
                output = output.concat(chars[charIndex]);
            });
        });
        const missingChars = output.length % 8;
        if (Boolean(missingChars)) {
            output = output.padEnd(output.length + 8-missingChars, "=");
        }

        return output;
    }

    decode(input, ...args) {

        this.validateArgs(args);
        let standard = "rfc4648";
        if (this.standard) {
            standard = this.standard;
        } else if (args.includes("rfc3548")) {
            standard = "rfc3548";
        }

        const outputType = (args.includes("array")) ? "array" : "str";
        const chars = this.charsets[standard];
        
        let binaryStr = "";

        input.split('').map((c) => {
            const index = chars.indexOf(c);
            console.log(index);
            if (index > -1) {                                       // -1 is the index if the char was not found, "=" was ignored
                binaryStr = binaryStr.concat(index.toString(2).padStart(5, "0"));
            }
        });
        
        const byteArray = binaryStr.match(/.{8}/g).map(bin => parseInt(bin, 2))
        const uInt8 = Uint8Array.from(byteArray);

        if (outputType === "array") {
            return uInt8;
        } else {
            return byteArray.map(b => String.fromCharCode(b)).join("");
        }
    }
}


class Base64 {
    constructor(charset=null) {

        if (charset && !(charset === "default" || charset === "urlsafe")) {
            throw new TypeError("Unknown charset.\nThe options are 'standard' and 'urlsafe'.");
        }
        this.charset = charset;
        
        this.charssets = {
            default: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
            urlsafe: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        }
    }

    validateArgs(args) {
        if (Boolean(args.length)) {
            const validArgs = ["default", "urlsafe", "str", "array"];
            const globalCharset = Boolean(this.charset);

            args.forEach(arg => {
                if (!validArgs.includes(arg)) {
                    throw new TypeError(`Invalid argument: "${arg}"\nThe options are 'default' and 'urlsafe' for the charset.\nValid arguments for in- and output-type are 'str' and 'array'.`);
                } else if (globalCharset && validArgs.slice(0, 2).includes(arg)) {
                    utils.warning(`Charset is already set.\nArgument '${arg}' was ignored.`)
                }
            });
        }
    }

    encode(input, ...args) {
        this.validateArgs(args);

        const inputType = (args.includes("array")) ? "array" : "str";
        input = utils.validateInput(input, inputType);

        let charset = "default";
        if (Boolean(this.charset)) {
            charset = this.charset;
        } else if (args.includes("urlsafe")) {
            charset = "urlsafe";
        }

        const chars = this.charssets[charset];
    
        let binaryStr;
        if (inputType === "str") {
            binaryStr = input.split('').map((c) => c.charCodeAt(0).toString(2).padStart(8, "0")).join("");
        } else if (inputType === "array") {
            binaryStr = Array.from(input).map(b => b.toString(2).padStart(8, "0")).join("");
        }
    
        const bitGroups = binaryStr.match(/.{1,24}/g);
    
        let output = "";
        bitGroups.map(function(group) {
            const blocks = group.match(/.{1,6}/g).map(s=>s.padEnd(6, '0'));
            blocks.map(function(block) {
                const charIndex = parseInt(block, 2);
                output = output.concat(chars[charIndex]);
            });
        });
        const missingChars = output.length % 4;
        if (Boolean(missingChars)) {
            output = output.padEnd(output.length + 4-missingChars, "=");
        }
    
        return output;
    }
}

const utils = {
    validateInput: (input, inputType) => {
        if (inputType === "str") {
            if (typeof input !== "string") {
                utils.warning("Your input was converted into a string.");
            }
            return String(input);
        } else {
            if (typeof input === "string") {
                throw new TypeError("Your provided input is a string, but some kind of (typed) Array is expected.");
            } else if (typeof input !== 'object') {
                throw new TypeError("Input must be some kind of (typed) Array if input type is set to 'array'.");
            }
            return input; 
        }
    },

    warning: (message) => {
        if (console.hasOwnProperty("warn")) {
            console.warn(message);
        } else {
            console.log(`___\n${message}\n`);
        }
    }
}