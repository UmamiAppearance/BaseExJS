class Base16 {
    validateArgs() {
        return utils.validateArgs(
            args,
            ["str", "array"],
            "Valid arguments for in- and output-type are 'str' and 'array'."
        );
    }

    encode(input, ...args) {

        args = this.validateArgs(args);
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
        
        args = this.validateArgs(args);
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
        return utils.validateArgs(
            args,
            ["rfc3548", "rfc4648", "str", "array"],
            "The options are 'rfc3548' and 'rfc4648' for the rfc-standard. Valid arguments for in- and output-type are 'str' and 'array'."
        );
    }
    
    encode(input, ...args) {
        
        args = this.validateArgs(args);
        
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

        args = this.validateArgs(args);
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
            default: base62.concat("+/"),
            urlsafe: base62.concat("-_")
        }
    }

    validateArgs(args) {
        return utils.validateArgs(
            args,
            ["default", "urlsafe", "str", "array"],
            "The options are 'default' and 'urlsafe' for the charset.\nValid arguments for in- and output-type are 'str' and 'array'."
        );
    }

    encode(input, ...args) {
        args = this.validateArgs(args);

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
        args = this.validateArgs(args);

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
        this.z85Charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
    }
    
    validateArgs(args) {
        return utils.validateArgs(
            args,
            ["str", "array", "ascii85", "rfc1924", "ipv6", "z85"],
            "Valid arguments for in- and output-type are 'str' and 'array'.\nEn- and decoder have the options: 'ascii85', 'rfc1924', 'ipv6' and 'z85'"
        );
    }

    ipv6ToUint8(address) {
        /*
            Converts a IPv6-Address into a Typed Uint8 Array,
        */

        // Test at first if zeros where removed.
        // Expand if it is the case.
        console.log(address.indexOf("::"));
        if (address.indexOf("::") > -1) {
            let start, end;

            // Split the address at the double colon
            [start, end] = address.split("::");

            // If no values where present at the colons
            // set it to "0"
            if (start === "") start = "0";
            if (end === "") end = "0";

            // Start fresh with an address array of zeros
            const addressArray = Array(8).fill(0);

            // Put the left hand part to the
            // beginning of the array, the
            // right hand part to the end.
            start.split(":").forEach((group, i) => addressArray[i] = group);
            end.split(":").reverse().forEach((unit, i) => addressArray[7-i] = unit);
            
            // Join it back to a string
            address = addressArray.join(":");
        }

        console.log(address);
        // Split the address at the colons,
        // add zero padding of 4 and join it
        // into a hex string.
        const hexStr = address.split(":").map(group => group.padStart(4, "0")).join("");
        console.log(hexStr);
        
        // Split the string every second char
        // to receive a pair of  octets. Convert
        // it into an integer and plug it all into
        // an Uint8 array.
        const uInt8 = Uint8Array.from(hexStr.match(/../g).map(pair => parseInt(pair, 16)));
        return uInt8;
    }

    uint8ToIpv6(uInt8) {
        const hexStr = Array.from(uInt8).map(b => b.toString(16).padStart(2, "0")).join("");
        return hexStr;
    }
    
    encode(input, ...args) {
        args = this.validateArgs(args);

        let version;
        let inputType = "str";
        
        if (args.includes("ipv6")) {
            input = this.ipv6ToUint8(input);
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
        } else if (args.includes("z85")) {
            version = "z85";
            bs = 4;
        } else {
            version = "ascii85";
            bs = 4;
            add = 33;
        } 

        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        const l = inputBytes.length;

        let output = "";
        let zeroPadding = 0;

        for (let i=0; i<l; i+=bs) {
            let subArray = inputBytes.subarray(i, i+bs);

            if (subArray.length !== bs) {
                zeroPadding = bs - subArray.length;
                console.log("zeroPadding: ", zeroPadding);
                const paddedArray = new Uint8Array(bs);
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            let n = BigInt(subArray[0]);                                        // set n to the first byte
            subArray.subarray(1).forEach((b) => n = (n << 8n) + BigInt(b));     // start shifting (e.g. times the base 256) and adding of all other bytes
            console.log(n);

            const b85Array = [];

            let q = n, r;                                                       // initialize quotient and remainder
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

            const classObject = this;
            if (version === "ascii85") {
                const b85uInt8 = Uint8Array.from(b85Array);
                const ascii = new TextDecoder("windows-1252").decode(b85uInt8);
                output = output.concat(ascii);
            } else if (version === "rfc1924") {
                b85Array.forEach(
                    charIndex => output = output.concat(classObject.rfc1924Charset[charIndex])
                );
            } else if (version === "z85") {
                b85Array.forEach(
                    charIndex => output = output.concat(classObject.z85Charset[charIndex])
                );
            }
        }
        return output.slice(0, output.length-zeroPadding);
    }

    decode(input, ...args) {
        args = this.validateArgs(args);

        let outputType;
        if (args.includes("array")) {
            outputType = "array";
        } else if (args.includes("ipv6")) {
            outputType = "ipv6";
        } else {
            outputType = "str";
        }
        let version;
        let bs;
        let l;
        let sub = 0;
        let inputBytes;
        let charset;
        
        if (args.includes("rfc1924")) {
            version = "rfc1924";
            bs = 20;
            charset = this.rfc1924Charset;
        } else if (args.includes("ipv6")) {
            version = "ipv6";
            bs = 20;
            charset = this.rfc1924Charset;
        } else if (args.includes("z85")) {
            version = "z85";
            bs = 5;
            charset = this.z85Charset;
        } else {
            version = "ascii85";
            bs = 5;
            sub = 33;
            inputBytes = new TextEncoder("windows-1252").encode(input);
            l = inputBytes.length
        }
        
        if (version !== "ascii85") {
            l = input.length;
            inputBytes = new Uint8Array(l);
            input.split('').forEach((c, i) => inputBytes[i] = charset.indexOf(c));
        }        
        console.log(l);
        let uPadding = 0;
        let b256Array = [];
        for (let i=0; i<l; i+=bs) {
            let subArray = inputBytes.subarray(i, i+bs);

            if (subArray.length !== bs) {
                uPadding = bs - subArray.length;
                console.log("uPadding", uPadding);
                const paddedArray = Uint8Array.from(Array(bs).fill(84+sub));
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            const subArray256 = [];

            let n = 0n;
            subArray.forEach((b, j) => n += BigInt(b-sub) * 85n**BigInt(bs-1-j));
            console.log(n);
            let q = n, r;
            while (true) {
                [q, r] = utils.divmod(q, 256n);
                console.log(q, r);
                subArray256.unshift(Number(r));
                if (q < 256) {
                    subArray256.unshift(Number(q));
                    break;
                }
            }
            console.log(subArray256);
            b256Array = b256Array.concat(subArray256)
        }

        const uInt8 = Uint8Array.from(b256Array.slice(0, b256Array.length-uPadding));

        if (outputType === "array") {
            return uInt8;
        } else if (outputType === "ipv6") {
            return this.uint8ToIpv6(uInt8);
        } else {
            const outputStr = new TextDecoder().decode(uInt8);
            return outputStr;
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

    validateArgs: (args, validArgs, errorMessage) => {
        const loweredArgs = [];
        if (Boolean(args.length)) {
            args.forEach(arg => {
                arg = arg.toLowerCase();
                if (!validArgs.includes(arg)) {
                    throw new TypeError(`Invalid argument: '${arg}'\n${errorMessage}`);
                }
                loweredArgs.push(arg);
            });
        }
        return loweredArgs;
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

const b = new Base85();

//export {Base16, Base32, Base64, Base85, BaseEx}
