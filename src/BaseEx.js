class Base16 {
    validateArgs(args) {
        if (Boolean(args.length)) {
            const validArgs = ["str", "array"];

            args.forEach(arg => {
                if (!validArgs.includes(arg)) {
                    throw new TypeError(`Invalid argument: "${arg}"\nValid arguments for in- and output-type are 'str' and 'array'.`);
                }
            });
        }
    }

    encode(input, ...args) {

        this.validateArgs(args);
        const inputType = (args.includes("array")) ? "array" : "str";
        input = utils.validateInput(input, inputType);

        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        const output = Array.from(inputBytes).map(b => b.toString(16).padStart(2, "0")).join("");

        return output;
    }

    decode(input, ...args) {
        /*
            inspired by:
            https://gist.github.com/don/871170d88cf6b9007f7663fdbc23fe09
        */
        
        this.validateArgs(args);
        const outputType = (args.includes("array")) ? "array" : "str";
        
        // remove the leading 0x if present
        input = input.replace(/^0x/, '');
        
        if (isNaN(parseInt(input, 16))) {
            throw new TypeError("The provided input is not a valid hexadecimal string.")
        }

        // ensure even number of characters
        if (Boolean(input.length % 2)) {
            input = "0".concat(input);
        }
        
        // Split the string into pairs of octets, convert to integers 
        // and create a Uin8array from the output.
        const uInt8 = Uint8Array.from(input.match(/../g).map(pair => parseInt(pair, 16))); 

        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
        
    }   
}

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
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        const chars = this.charsets[standard];

        let binaryStr = Array.from(inputBytes).map(b => b.toString(2).padStart(8, "0")).join("");

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
            if (index > -1) {                                       // -1 is the index if the char was not found, "=" was ignored
                binaryStr = binaryStr.concat(index.toString(2).padStart(5, "0"));
            }
        });
        
        const byteArray = binaryStr.match(/.{8}/g).map(bin => parseInt(bin, 2))
        const uInt8 = Uint8Array.from(byteArray);

        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }
}


class Base64 {
    constructor(charset=null) {

        if (charset && !(charset === "default" || charset === "urlsafe")) {
            throw new TypeError("Unknown charset.\nThe options are 'standard' and 'urlsafe'.");
        }
        this.charset = charset;
        
        const base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charssets = {
            default: `${base62}+/`,
            urlsafe: `${base62}-_`
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
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        const binaryStr = Array.from(inputBytes).map(b => b.toString(2).padStart(8, "0")).join("");
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

    decode(input, ...args) {
        this.validateArgs(args);

        let charset = "default";
        if (Boolean(this.charset)) {
            charset = this.charset;
        } else if (args.includes("urlsafe")) {
            charset = "urlsafe";
        }
    
        const outputType = (args.includes("array")) ? "array" : "str";
        const chars = this.charssets[charset];
        
        let binaryStr = "";

        input.split('').map((c) => {
            const index = chars.indexOf(c);
            if (index > -1) {                                       // -1 is the index if the char was not found, "=" was ignored
                binaryStr = binaryStr.concat(index.toString(2).padStart(6, "0"));
            }
        });
        
        const byteArray = binaryStr.match(/.{8}/g).map(bin => parseInt(bin, 2))
        const uInt8 = Uint8Array.from(byteArray);

        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }
}


class Base85 {

    constructor() {
        this.rfc1924Charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
    }
    
    validateArgs(args) {
        if (Boolean(args.length)) {
            const validArgs = ["str", "array", "rfc1924", "ipv6"];

            args.forEach(arg => {
                if (!validArgs.includes(arg)) {
                    throw new TypeError(`Invalid argument: "${arg}"\nValid arguments for in- and output-type are 'str' and 'array'.`);
                }
            });
        }
    }

    ipv6ToUint(address) {
        const normalizedAddress = address;
        const hexStr = normalizedAddress.replaceAll(":", "");
        const base16 = new Base16();
        const uint8 = base16.decode(hexStr, "array");
        return uint8;
    }

    encode(input, ...args) {
        this.validateArgs(args);

        let version;
        let inputType = "str";
        
        if (args.includes("ipv6")) {
            input = this.ipv6ToUint(input);
            inputType = "array";
            if (!args.includes("rfc1924")) args.push("rfc1924");
        } else if (args.includes("array")) {
            inputType = "array";
        }
        input = utils.validateInput(input, inputType);

        let bs;
        let add = 0;
        
        if (args.includes("rfc1924")) {
            version = "rfc1924";
            bs = 16;
        } else {
            version = "ascii85";
            bs = 4;
            add = 33;
        }

        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        const l = inputBytes.length;
        

        let output = "";
        let zeroFills = 0;

        for (let i=0; i<l; i+=bs) {
            let subArray = inputBytes.subarray(i, i+bs);

            if (subArray.length !== bs) {
                zeroFills = bs - subArray.length;
                const paddedArray = new Uint8Array(bs);
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            let n = BigInt(subArray[0]);                                        // set n to the first byte
            subArray.subarray(1).forEach((b) => n = (n << 8n) + BigInt(b));     // start shifting (e.g. times the base 256) and adding of all other bytes
            console.log(n);

            const b85Array = [];

            let q = n, r;
            while (true) {
                [q, r] = utils.divmod(q, 85n);
                console.log(q, r);
                b85Array.unshift(Number(r) + add);
                if (q < 85) {
                    b85Array.unshift(Number(q) + add);
                    break;
                }
            }
            console.log(b85Array);

            if (version === "ascii85") {
                const b85uInt8 = Uint8Array.from(b85Array);
                const ascii = new TextDecoder('windows-1252').decode(b85uInt8);
                output = output.concat(ascii);
            } else if (version === "rfc1924") {
                const x = 0;
                const classObject = this;
                b85Array.forEach(
                    charIndex => output = output.concat(classObject.rfc1924Charset[charIndex])
                );
            }
        }
        return output.slice(0, output.length-zeroFills);
    }

    decode(input, ...args) {
        this.validateArgs(args);
        const outputType = (args.includes("array")) ? "array" : "str";

        const inputBytes = new TextEncoder('windows-1252').encode(input);
        const l = inputBytes.length;

        let uInt8 = new Uint8Array();
        for (let i=0, l=inputBytes.length; i<l; i+=5) {
            const subArray = inputBytes.subarray(i, i+5);
            const pow85 = [52200625, 614125, 7225, 85, 1];      //[85^4, 85^3, 85^2, 85^1, 85^0]

            let n = 0;
            subArray.forEach((b, j) => n += (b-33) * pow85[j]);

            const uInt8AsciiArray = new Uint8Array(4);
            let q = n, r;
            for (let pos=3; pos>=0; pos--) {
                [q, r] = utils.divmod(q, 256);
                uInt8AsciiArray[pos] = r;
                if (q < 256) {
                    uInt8AsciiArray[pos-1] = q;
                    break;
                }
            }

            uInt8 = new Uint8Array([...uInt8, ...uInt8AsciiArray]);
        }

        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }

    }
}


const utils = {
    divmod: (x, y) => {
        if (typeof(x) === "bigint" || typeof(y) === "bigint") {
            return [(BigInt(x) / BigInt(y)), BigInt(x)%BigInt(y)];
        } else {
            return [Math.floor(x / y), x % y];
        }
    },

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

class BaseEx {
    constructor(inputType=null) {
        this.base16 = new Base16();
        this.base32_rfc3548 = new Base32("rfc3548");
        this.base32_rfc4648 = new Base32("rfc4648");
        this.base64 = new Base64("default");
        this.base64_urlsafe = new Base64("urlsafe");
        this.base85 = new Base85();
    }
}

//export {Base16, Base32, Base64, Base85, BaseEx}
