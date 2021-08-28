

class Base16 {
    /*
        Standalone en-/decoding to and from base16 (hexadecimal).
    */

    constructor() {
        this.utils = this.utilsConstructor();
    }

    encode(input, ...args) {
        /* 
            Hex encoder from string or bytes.
            --------------------------------

            @input: string or (typed) array
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "array"     :  tells the encoder, that input is an array
        */
        
        // input and output settings
        args = this.utils.validateArgs(args);
        const inputType = (args.includes("array")) ? "array" : "str";
        input = this.utils.validateInput(input, inputType);

        // convert to an array of bytes if necessary
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        
        // convert all bytes to hex and join to a string
        const output = Array.from(inputBytes).map(
            b => b.toString(16).padStart(2, "0")
        ).join("");

        return output;
    }

    decode(input, ...args) {
        /*
            Hex string decoder.
            ------------------

            @input: hex-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "array"     :  tells the encoder, that output should be an array
            ___________
            inspired by:
            https://gist.github.com/don/871170d88cf6b9007f7663fdbc23fe09
        */
        
        args = this.utils.validateArgs(args);
        const outputType = (args.includes("array")) ? "array" : "str";
        
        // remove the leading 0x if present
        input = String(input).replace(/^0x/, '');
        
        // test if valid hex
        if (Boolean(input.match(/[^0-9A-Fa-f]/g))) {
            throw new TypeError("The provided input is not a valid hexadecimal string.");
        }

        // ensure even number of characters
        if (Boolean(input.length % 2)) {
            input = "0".concat(input);
        }
        
        // Split the string into pairs of octets,
        // convert to integers (bytes) and create
        // an Uint8array from the output.

        const uInt8 = Uint8Array.from(
            input.match(/../g).map(
                octets => parseInt(octets, 16)
            )
        );

        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }

    utilsConstructor() {
        /*
            Toolset for user-input tests
        */

        // settings for validation
        const validArgs = ["str", "array"];
        const errorMessage = "Valid arguments for in- and output-type are 'str' and 'array'.";

        // utils object
        return {
            validateArgs: (args) => {
                const loweredArgs = new Array();
                if (Boolean(args.length)) {
                    args.forEach(arg => {
                        arg = String(arg).toLowerCase();
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
                        this.utils.warning("Your input was converted into a string.");
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
    }
}


class Base32 {
    /*
        Standalone en-/decoding to and from base32.
        Uses RFC standard 4658 by default (as used e.g
        for (t)otp keys), RFC 3548 is also supported.
    */
    
    constructor(standard=null) {
        /*
            The RFC-Standard can be set here. If the standard 
            is set, de- and encoding always uses this standard.

            If only one version is needed, this is the way to 
            go. De- and encoder are ignoring standard-changes if
            it is set here.
        */
        
        this.standards = ["rfc3548", "rfc4648"];

        if (standard) {
            standard = String(standard).toLocaleLowerCase();

            if (!this.standards.includes(standard)) {
                const versionString = this.standards.map(s => `'${s}'`).join(" and ");
                throw new TypeError(`Unknown standard.\nThe options are: ${versionString}`);
            }
        }

        this.standard = standard;

        this.charsets = {
            rfc3548: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            rfc4648: "0123456789ABCDEFGHIJKLMNOPQRSTUV" 
        }

        this.utils = this.utilsConstructor();
    }
    
    encode(input, ...args) {
        /* 
            Encode from string or bytes to base32.
            -------------------------------------

            @input: string or (typed) array
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "array"     :  tells the encoder, that input is an array
                "rfc3548"   :  sets the used charset to this standard
                "rfc4648"   :  sets the used charset to this standard
        */

        args = this.utils.validateArgs(args);
        
        let standard = "rfc4648";
        if (Boolean(this.standard)) {
            standard = this.standard;
        } else if (args.includes("rfc3548")) {
            standard = "rfc3548";
        }

        const inputType = (args.includes("array")) ? "array" : "str";
        input = this.utils.validateInput(input, inputType);
        
        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;

        // Convert to binary string
        let binaryStr = Array.from(inputBytes).map(
            b => b.toString(2).padStart(8, "0")
        ).join("");
        
        // Devide the binary string into groups of 40 bits. Each 
        // group of 40 bits is seperated into blocks of 5 bits.
        // Those are converted into integers which are used as 
        // an index. The corresponding char is picked from the
        // charset and appended to the output string.

        let output = "";
        binaryStr.match(/.{1,40}/g).forEach(group => {
            group.match(/.{1,5}/g).forEach(block => {
                    block = block.padEnd(5, '0');                   // The last block might be shorter then 5, it gets filled up with zeros in that case
                    const charIndex = parseInt(block, 2);
                    output = output.concat(this.charsets[standard][charIndex]);
                }
            );
        });

        // The length of a base32 string (if padding is used)
        // should not return a remainder if divided by eight.
        // If they do, missing characters are padded with a "=".

        const missingChars = output.length % 8;
        if (Boolean(missingChars)) {
            output = output.padEnd(output.length + 8-missingChars, "=");
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
                "array"     :  tells the encoder, that output should be an array
                "rfc3548"   :  defines to use the charset of this standard
                "rfc4648"   :  defines to use the charset of this standard (default)
        */

        args = this.utils.validateArgs(args);

        let standard = "rfc4648";
        if (this.standard) {
            standard = this.standard;
        } else if (args.includes("rfc3548")) {
            standard = "rfc3548";
        }

        const outputType = (args.includes("array")) ? "array" : "str";

        // Split the input into individual characters
        // Take the position (index) of the char in the
        // set and convert it into binary. The bits are
        // all concatinated to one string of binaries.

        let binaryStr = "";

        input.split('').map((c) => {
            const index = this.charsets[standard].indexOf(c);
            if (index > -1) {                                                     // -1 is the index if the char is not in the set, "=" e.g. gets ignored
                binaryStr = binaryStr.concat(index.toString(2).padStart(5, "0"));
            }
        });
        
        // Now the binary string can be (re)grouped 
        // into regular bytes. Those get plugged into
        // an Uint8array.

        const uInt8 = Uint8Array.from(
            binaryStr.match(/.{8}/g).map(bin => 
                parseInt(bin, 2)
            )
        );

        // Convert to utf8-string if requested
        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }

    utilsConstructor() {
        /*
            Toolset for user-input tests
        */

        // settings for validation
        const validArgs = ["str", "array", ...this.standards];
        const versionString = this.standards.map(s => `'${s}'`).join(" and ");
        const errorMessage = `The options are ${versionString} for the rfc-standard. Valid arguments for in- and output-type are 'str' and 'array'.`;

        // utils object
        return {
            validateArgs: (args) => {
                const loweredArgs = new Array();
                if (Boolean(args.length)) {
                    args.forEach(arg => {
                        arg = String(arg).toLowerCase();
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
                        this.utils.warning("Your input was converted into a string.");
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
    }
}


class Base64 {
    /*
        Standalone en-/decoding to and from base64.
        Regular and urlsafe charsets can be used.
    */
    constructor(charset=null) {
        /*
            Charset can be set here. If  set, de- and encoding
            always uses the defined charset.

            If only one variant is needed, this is the way to 
            go. De- and encoder are ignoring charset-changes if
            it is set here.
        */
       
        const base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets = {
            default: base62.concat("+/"),
            urlsafe: base62.concat("-_")
        }
        this.charsetNames = Object.keys(this.charsets);
        
        if (charset) {
            charset = String(charset).toLowerCase();
            if (!(this.charsetNames.includes(charset))) {
                const charsetNamesStr = this.charsetNames.map(cs => `'${cs}'`).join(" and ");
                throw new TypeError(`Unknown charset.\nThe options are ${charsetNamesStr}.`);
            }
        }
        this.charset = charset;
        
        this.utils = this.utilsConstructor();
    }

    encode(input, ...args) {
        /* 
            Encode from string or bytes to base64.
            -------------------------------------

            @input: string or (typed) array
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "array"     :  tells the encoder, that input is an array
                "default"   :  sets the used charset to this variant (default)
                "urlsafe"   :  sets the used charset to this variant
        */
       
        args = this.utils.validateArgs(args);

        const inputType = (args.includes("array")) ? "array" : "str";
        input = this.utils.validateInput(input, inputType);

        let charset = "default";
        if (Boolean(this.charset)) {
            charset = this.charset;
        } else if (args.includes("urlsafe")) {
            charset = "urlsafe";
        }

        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        
        // Convert to binary string
        const binaryStr = Array.from(inputBytes).map(
            b => b.toString(2).padStart(8, "0")
        ).join("");

        // Devide the binary string into groups of 24 bits. Each 
        // group of 24 bits is seperated into blocks of 6 bits.
        // Those are converted into integers which are used as 
        // an index. The corresponding char is picked from the
        // charset and appended to the output string.
        
        let output = "";
        binaryStr.match(/.{1,24}/g).forEach(group => {
            group.match(/.{1,6}/g).forEach(block => {
                block = block.padEnd(6, "0");
                const charIndex = parseInt(block, 2);
                output = output.concat(this.charsets[charset][charIndex]);
            })
        });

        // The length of a base62 string (if padding is used)
        // should not return a remainder if divided by four.
        // If they do, missing characters are padded with a "=".

        const missingChars = output.length % 4;
        if (Boolean(missingChars)) {
            output = output.padEnd(output.length + 4-missingChars, "=");
        }
    
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base64 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base32-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "array"     :  tells the encoder, that output should be an array
                "default"   :  sets the used charset to this variant (default)
                "urlsafe"   :  sets the used charset to this variant
        */

        args = this.utils.validateArgs(args);

        let charset = "default";
        if (Boolean(this.charset)) {
            charset = this.charset;
        } else if (args.includes("urlsafe")) {
            charset = "urlsafe";
        }
    
        const outputType = (args.includes("array")) ? "array" : "str";
        
        // Split the input into individual characters
        // Take the position (index) of the char in the
        // set and convert it into binary. The bits are
        // all concatinated to one string of binaries.
        
        let binaryStr = "";

        input.split('').map((c) => {
            const index = this.charsets[charset].indexOf(c);
            if (index > -1) {                                       // -1 is the index if the char was not found, "=" was ignored
                binaryStr = binaryStr.concat(index.toString(2).padStart(6, "0"));
            }
        });
        

        // Now the binary string can be (re)grouped 
        // into regular bytes. Those get plugged into
        // an Uint8array.

        const uInt8 = Uint8Array.from(
            binaryStr.match(/.{8}/g).map(bin => 
                parseInt(bin, 2)
            )    
        );

        // Convert to utf8-string if requested
        if (outputType === "array") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }

    utilsConstructor() {
        /*
            Toolset for user-input tests
        */

        // settings for validation
        const validArgs = ["str", "array", ...this.charsetNames];
        const charsetNamesStr = this.charsetNames.map(cs => `'${cs}'`).join(" and ");
        const errorMessage = `The options are ${charsetNamesStr} for the charset.\nValid arguments for in- and output-type are 'str' and 'array'.`;

        // utils object
        return {
            validateArgs: (args) => {
                const loweredArgs = new Array();
                if (Boolean(args.length)) {
                    args.forEach(arg => {
                        arg = String(arg).toLowerCase();
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
                        this.utils.warning("Your input was converted into a string.");
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
    }
}


class Base85 {
    /*
        Standalone en-/decoding to and from base85.
        Four versions are supported: 
          
            * adobe
            * ascii85
            * rfc1924
            * z85
        
        Adobe and ascii85 are the basically the same.
        Adobe will produce the same output, apart from
        the <~wrapping~>.
        
        Z85 is an important variant, because of the 
        more interpreter-friendly characterset.
        
        The RFC 1924 version is a hybrid. It is not
        using the mandatory 128 bit calculation.
        Instead only the charset is used. Do not use this
        for any real project. (Keep in mind, that is
        based on a joke).
        
    */
    constructor(version=null) {
        
        this.versions = ["adobe", "ascii85", "rfc1924", "z85"];
        this.version = null;

        if (version) {
            version = String(version).toLowerCase();
            if (this.versions.includes(version)) {
                this.version = version;
            } else {
                const versionString = this.versions.map(v => `'${v}'`).join(", ");
                throw new TypeError(`Available versions are: ${versionString}`);
            }
        }

        const asciiChars = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
        this.charsets = {
            ascii85: asciiChars,
            adobe: asciiChars,
            rfc1924: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~",
            z85: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()new Array(){}@%$#",
        }

        this.utils = this.utilsConstructor();
    }
    
    encode(input, ...args) {
        args = this.utils.validateArgs(args);

        const inputType = (args.includes("array")) ? "array" : "str";
        input = this.utils.validateInput(input, inputType);

        let version = this.version;
        if (!version) {
            version = "ascii85";
            args.forEach(arg => {
                if (this.versions.includes(arg)) version = arg;
            });
        }

        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;

        let zeroPadding = 0;
        let output = "";

        for (let i=0, l=inputBytes.length; i<l; i+=4) {
            let subArray = inputBytes.slice(i, i+4);

            if (subArray.length < 4) {
                zeroPadding = 4 - subArray.length;
                const paddedArray = new Uint8Array(4);
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            let n = 0;
            subArray.forEach((b, j) => n += b * this.utils.pow256[j]);

            const b85Array = new Array();

            let q = n, r;                                              // initialize quotient and remainder
            while (true) {

                [q, r] = this.utils.divmod(q, 85);
                b85Array.unshift(r);

                if (q < 85) {
                    b85Array.unshift(q);
                    break;
                }
            }
            
            while (b85Array.length < 5) {
                b85Array.unshift(0);
            }


            let section = ""
            b85Array.forEach(
                charIndex => section = section.concat(this.charsets[version][charIndex])
            );

            if ((section === "!!!!!") && Boolean(version.match(/adobe|ascii85/))) {
                output = output.concat("z");   
            } else {
                output = output.concat(section);
            }
        }

        if (version === "rfc1924") this.utils.announce();

        output = output.slice(0, output.length-zeroPadding);
        if (version === "adobe") {
            output = `<~${output}~>`;
        }
        
        return output;
    }

    decode(input, ...args) {
        args = this.utils.validateArgs(args);
        
        let version = this.version;
        if (!version) {
            version = "ascii85";
            args.forEach(arg => {
                if (this.versions.includes(arg)) version = arg;
            });
        }

        const outputType = (args.includes("array")) ? "array" : "str";
        input = input.replace(/\s/g,'');        //remove all whitespace from input
        if (Boolean(version.match(/adobe|ascii85/))) input = input.replace(/z/g, "!!!!!");

        const inputBytes = Uint8Array.from(
            input.split('').map(c => this.charsets[version].indexOf(c))
        );

        let uPadding = 0;
        let b256Array = new Array();
        for (let i=0, l=input.length; i<l; i+=5) {
            let subArray = inputBytes.slice(i, i+5);

            if (subArray.length < 5) {
                uPadding = 5 - subArray.length;
                const paddedArray = Uint8Array.from(Array(5).fill(84));
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            const subArray256 = new Array();

            let n = 0;
            subArray.forEach((b, j) => n += b * this.utils.pow85[j]);

            let q = n, r;
            while (true) {
                [q, r] = this.utils.divmod(q, 256);
                subArray256.unshift(r);
                
                if (q < 256) {
                    subArray256.unshift(q);
                    break;
                }
            }
            
            while (subArray256.length < 4) {
                subArray256.unshift(0);
            }

            
            b256Array = b256Array.concat(subArray256);
        }

        if (version === "rfc1924") this.utils.warning("You might have been fooled.");

        const uInt8 = Uint8Array.from(b256Array.slice(0, b256Array.length-uPadding));

        if (outputType === "array") {
            return uInt8;
        } else {
            const outputStr = new TextDecoder().decode(uInt8);
            return outputStr;
        }

    }

    utilsConstructor() {
        // settings for validation
        const validArgs = ["str", "array", ...this.versions];
        const versionString = this.versions.map(v=>`'${v}'`).join(", ");
        const errorMessage = `Valid arguments for in- and output-type are 'str' and 'array'.\nEn- and decoder have the options: ${versionString}`;
        
        return {
            divmod: (x, y) => [Math.floor(x / y), x % y],

            announce: () => {
                const date = new Date();
                if (date.getMonth() === 3 && date.getDate() === 1) {
                    console.log("         __\n _(\\    |@@|\n(__/\\__ \\--/ __\n   \\___|----|  |   __\n       \\ }{ /\\ )_ / _\\\n       /\\__/\\ \\__O (__\n      (--/\--)    \\__/\n      _)(  )(_\n     `---''---`");
                } else {
                    const ts = date.getTime();
                    date.setMonth(3, 1);
                    date.setHours(0, 0, 0);
                    if (date.getTime() < ts) date.setFullYear(date.getFullYear()+1);
                    const dist = date - ts;
                    const d = Math.floor(dist / 86400000);
                    const H = Math.floor((dist % 86400000) / 3600000);
                    const M = Math.floor((dist % 3600000) / 60000);
                    const msg = `Time left: ${d} days, ${H} hours, ${M} minutes`;
                    this.utils.warning("Only the charset is used. The input is not taken as a 128 bit integer. (because this is madness)");
                    this.utils.warning(msg);
                }
            },

            pow256: [16777216, 65536, 256, 1],

            pow85: [52200625, 614125, 7225, 85, 1],

            validateArgs: (args) => {
                const loweredArgs = new Array();
                if (Boolean(args.length)) {
                    args.forEach(arg => {
                        arg = String(arg).toLowerCase();
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
                        this.utils.warning("Your input was converted into a string.");
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
    }
}


class BaseEx {
    constructor() {
        this.base16 = new Base16();
        this.base32_rfc3548 = new Base32("rfc3548");
        this.base32_rfc4648 = new Base32("rfc4648");
        this.base64 = new Base64("default");
        this.base64_urlsafe = new Base64("urlsafe");
        this.base85adobe = new Base85("adobe");
        this.base85ascii = new Base85("ascii85");
        this.base85_z85 = new Base85("z85");
    }
}

//export {Base16, Base32, Base64, Base85, BaseEx}
