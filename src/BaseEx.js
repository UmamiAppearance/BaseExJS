/*
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.1
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

class Base16 {
    /*
        Standalone en-/decoding to and from base16 (hexadecimal).
        (Requires "BaseExUtils")
    */

    constructor(input="str", output="str") {
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);

        [this.defaultInput, this.defaultOutput] = this.utils.validateArgs([input, output]);
    }

    encode(input, ...args) {
        /* 
            Hex encoder from string or bytes.
            --------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
        */
        
        // argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
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
                "str"       :  tells the encoder, that output should be a utf8-string (default)
                "bytes"     :  tells the encoder, that output should be an array of bytes
            ___________
            inspired by:
            https://gist.github.com/don/871170d88cf6b9007f7663fdbc23fe09
        */
        
        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const outputType = this.utils.setIOType(args, "out");
        
        // Remove the leading 0x if present
        input = String(input).replace(/^0x/, '');
        
        // Test if valid hex
        if (Boolean(input.match(/[^0-9A-Fa-f]/g))) {
            throw new TypeError("The provided input is not a valid hexadecimal string.");
        }

        // Ensure even number of characters
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

        if (outputType === "bytes") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }
}


class Base32 {
    /*
        Standalone en-/decoding to and from base32.
        Uses RFC standard 4658 by default (as used e.g
        for (t)otp keys), RFC 3548 is also supported.
        (Requires "BaseExUtils")
    */
    
    constructor(version="rfc4648", input="str", output="str", padding=true) {
        /*
            The RFC standard defined here is used by de- and encoder.
            This can still be overwritten during the call of the
            function.
        */

        this.charsets = {
            rfc3548: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            rfc4648: "0123456789ABCDEFGHIJKLMNOPQRSTUV" 
        }

        this.padding = Boolean(padding);
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);
    }
    
    encode(input, ...args) {
        /* 
            Encode from string or bytes to base32.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "rfc3548"   :  sets the used charset to this standard
                "rfc4648"   :  sets the used charset to this standard
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
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
                    block = block.padEnd(5, '0');
                    const charIndex = parseInt(block, 2);
                    output = output.concat(this.charsets[version][charIndex]);
                }
            );
        });

        // The length of a base32 string (if padding is used)
        // should not return a remainder if divided by eight.
        // If they do, missing characters are padded with "=".

        const missingChars = output.length % 8 * this.padding;
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
                "bytes"     :  tells the encoder, that output should be an array
                "rfc3548"   :  defines to use the charset of this version
                "rfc4648"   :  defines to use the charset of this version (default)
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");

        // Split the input into individual characters
        // Take the position (index) of the char in the
        // set and convert it into binary. The bits are
        // all concatinated to one string of binaries.

        let binaryStr = "";

        input.split('').map((c) => {
            const index = this.charsets[version].indexOf(c);
            if (index > -1) {
                binaryStr = binaryStr.concat(index.toString(2).padStart(5, "0"));
            }
        });
        
        // (re)group the binary string into regular 
        // bytes. Those get plugged into an Uint8array.

        const uInt8 = Uint8Array.from(
            binaryStr.match(/.{8}/g).map(bin => 
                parseInt(bin, 2)
            )
        );

        // Convert to utf8-string if requested
        if (outputType === "bytes") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }
    }
}


class Base64 {
    /*
        Standalone en-/decoding to and from base64.
        Regular and urlsafe charsets can be used.
        (Requires "BaseExUtils")
    */

    constructor(version="default", input="str", output="str", padding=true) {
        /*
            The charset defined here is used by de- and encoder.
            This can still be overwritten during the call of the
            function.
        */

        const b62Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets = {
            default: b62Chars.concat("+/"),
            urlsafe: b62Chars.concat("-_")
        }

        this.padding = Boolean(padding);
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);
    }

    encode(input, ...args) {
        /* 
            Encode from string or bytes to base64.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "default"   :  sets the used charset to this variant (default)
                "urlsafe"   :  sets the used charset to this variant
        */
       
        // Argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

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
                output = output.concat(this.charsets[version][charIndex]);
            })
        });

        // The length of a base62 string (if padding is used)
        // should not return a remainder if divided by four.
        // If they do, missing characters are padded with a "=".

        const missingChars = output.length % 4 * this.padding;
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
                "bytes"     :  tells the encoder, that output should be an array
                "default"   :  sets the used charset to this variant (default)
                "urlsafe"   :  sets the used charset to this variant
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
 
        // Split the input into individual characters
        // Take the position (index) of the char in the
        // set and convert it into binary. The bits are
        // all concatinated to one string of binaries.
        
        let binaryStr = "";

        input.split('').map((c) => {
            const index = this.charsets[version].indexOf(c);
            if (index > -1) {
                binaryStr = binaryStr.concat(index.toString(2).padStart(6, "0"));
            }
        });
        

        // (re)group the binary string into regular 
        // bytes. Those get plugged into an Uint8array.

        const uInt8 = Uint8Array.from(
            binaryStr.match(/.{8}/g).map(bin => 
                parseInt(bin, 2)
            )    
        );

        // Convert to utf8-string if requested
        if (outputType === "bytes") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
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

        (Requires "BaseExUtils")
        
    */

    constructor(version="ascii85", input="str", output="str") {
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
        
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);

        // This base85 en-/decoder uses some more
        // helper functions/vars. Those get append
        // to the default toolset.

        this.expandUtils();
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);
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
                "z85"       :  sets the used charset to this variant
        */
       
        // Argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;

        // Initialize output string and set yet unknown
        // zero padding to zero.
        let output = "";
        let zeroPadding = 0;

        // iterate over input array in steps of 4 bytes
        for (let i=0, l=inputBytes.length; i<l; i+=4) {

            // build a subarray of 4 bytes
            let subArray = inputBytes.slice(i, i+4);

            // At the very last block of 4 bytes, there 
            // is a change that the subarray has a length
            // less than 4. If this is the case, padding is
            // required. All missing bytes are filled with
            // zeros. The amout of zeros is stored in
            // "zeroPadding".

            if (subArray.length < 4) {
                zeroPadding = 4 - subArray.length;
                const paddedArray = new Uint8Array(4);
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            // The subarray gets converted into a 32-bit 
            // binary number "n", most significant byte 
            // first

            let n = 0;
            subArray.forEach((b, j) => n += b * this.utils.pow256[j]);

            // A new standard array gets initilized, to
            // store 5 radix-85 digits  
            const b85Array = new Array();

            // Initialize quotient and remainder for base convertion
            let q = n, r;

            // Divide n until the remainder is 85 or less
            while (q > 85) {
                [q, r] = this.utils.divmod(q, 85);
                b85Array.unshift(r);
            }
            // Append the reamining quotient to the array
            b85Array.unshift(q);

            // If the lenght of the array is less than 5
            // it gets filled up with zeros.
            while (b85Array.length < 5) {
                b85Array.unshift(0);
            }

            // Each base85 digit gets used as an index
            // to pick a corresponding char from the
            // charset. The chars get concatinated and
            // stored in "frame".
            let frame = "";
            b85Array.forEach(
                charIndex => frame = frame.concat(this.charsets[version][charIndex])
            );

            // For default ascii85, five consecutive null bits
            // (or "!") are replaced with the letter "z".

            if ((frame === "!!!!!") && Boolean(version.match(/adobe|ascii85/))) {
                output = output.concat("z");   
            } else {
                output = output.concat(frame);
            }
        }

        // If padding was taking place, the amout
        // of used zeros "zeroPadding" gets cut of
        // from the outpus string.

        output = output.slice(0, output.length-zeroPadding);
        
        // Adobes variant gets its <~framing~>
        if (version === "adobe") {
            output = `<~${output}~>`;
        }
        
        if (version === "rfc1924") this.utils.announce();
        
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
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
        input = input.replace(/\s/g,'');        //remove all whitespace from input
        
        // For default ascii85 convert "z" back to "!!!!!"
        if (Boolean(version.match(/adobe|ascii85/))) {
            input = input.replace(/z/g, "!!!!!");
            if (version === "adobe") {
                input = input.replace(/^<~|~>$/g, "");
            }
        }

        // Convert each char of the input to a radix-85
        // integer (this is the corresponding index of 
        // the char from the charset).

        const inputBytes = Uint8Array.from(
            input.split('').map(c => this.charsets[version].indexOf(c))
        );

        // Initialize a new default array to store
        // the converted radix-256 integers. And set 
        // yet unknown uPadding padding to zero.

        let b256Array = new Array();
        let uPadding = 0;

        // Iterate over the input bytes in steps of 5.
        for (let i=0, l=input.length; i<l; i+=5) {
            
            // build a subarray of 5 bytes
            let subArray = inputBytes.slice(i, i+5);

            // If the last subarray has a length less than
            // five, it gets padded with the highest possible
            // value, which is 84. The amout of padding is
            // stored in "uPadding".
            // ("u" is the corresponding char to 84 in the ascii85
            // charset).
            
            if (subArray.length < 5) {
                uPadding = 5 - subArray.length;
                const paddedArray = Uint8Array.from(Array(5).fill(84));
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            // To store the output chunks, initialize a
            // new default array.

            const subArray256 = new Array();

            // The subarray gets converted into a 32-bit 
            // binary number "n", most significant byte 
            // first
            let n = 0;
            subArray.forEach((b, j) => n += b * this.utils.pow85[j]);

            
            // Initialize quotient and remainder for base convertion
            let q = n, r;

            // Divide n until the remainder is 256 or less
            while (q > 256) {
                [q, r] = this.utils.divmod(q, 256);
                subArray256.unshift(r);
            }
            // Append the reamining quotient to the array
            subArray256.unshift(q);
            
            // If the lenght of the array is less than 4
            // it gets filled up with zeros.

            while (subArray256.length < 4) {
                subArray256.unshift(0);
            }
            
            // The subarray gets concatianted with the
            // main array.
            b256Array = b256Array.concat(subArray256);
        }

        // Convert default array to tyed uInt8 array.
        // The amount bytes according to the padded ues
        // is left behind.

        const uInt8 = Uint8Array.from(b256Array.slice(0, b256Array.length-uPadding));

        if (outputType === "bytes") {
            return uInt8;
        } else {
            return new TextDecoder().decode(uInt8);
        }

    }

    expandUtils() {
        /*
            Helper functions.
        */
        
        this.utils.announce = () => {
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
        }

        this.utils.divmod = (x, y) => [Math.floor(x / y), x % y];

        this.utils.pow256  = [16777216, 65536, 256, 1];

        this.utils.pow85 = [52200625, 614125, 7225, 85, 1];
    }
}


class BaseExUtils {
    /*
        Utilities for every BaseEx class.
        The main purpose is argument validation.
    */

    constructor(main) {

        // Store the calling class in this.root
        // for accessability.
        this.root = main;

        // If charsets are uses by the parent class,
        // add extra functions for the user.
        if ("charsets" in main) this.charsetUserToolsConstructor();
    }

    charsetUserToolsConstructor() {
        /*
            Contructor for the ability to add a charset and 
            change the default version.
        */

        this.root.addCharset = (name, charset) => {
            /*
                Save method to add a charset.
                ----------------------------

                @name: string that represents the key for the new charset
                @charset: string, array or Set of chars - the lenght must fit to the accoding class 
            */
                
            if (typeof name !== "string") {
                throw new TypeError("The charset name must be a string.");
            }

            // Get the approprite length for the charset
            // from the name of the parent function.
            // (Which is a little hacky...)

            const setLen = parseInt(this.root.constructor.name.replace(/[^0-9]/g, ""), 10);
            let inputLen = setLen;
            
            if (typeof charset === "string" || Array.isArray(charset)) {
                
                // Store the input length of the input
                inputLen = charset.length;
                
                // Convert to "Set" -> eliminate dublicates
                // If duvlicates are found the length of the
                // Set and the length of the initial input
                // differ.

                charset = new Set(charset);

            } else if (typeof charset !== "set") {
                throw new TypeError("The charset must be one of the types:\n'str', 'set', 'array'.");
            }
            
            if (charset.size === setLen) {
                charset = [...charset].join("");
                this.root.charsets[name] = charset;
                console.log(`New charset added with the name '${name}' added and ready to use`);
            } else if (inputLen === setLen) {
                throw new Error("There were repetitive chars found in your charset. Make sure each char is unique.");
            } else {
                throw new Error(`The the length of the charset must be ${setLen}.`);
            }
        }

        // Save method (argument gets validated) to 
        // change the default version.
        this.root.setDefaultVersion = (version) => [this.root.version] = this.validateArgs([version]);
    }

    makeArgList(args) {
        return args.map(s => `'${s}'`).join(", ")
    }

    setIOType(args, IO) {
        /* 
            Set type for input or output (bytes or string).
        */
        let type;
        if (args.includes("bytes")) {
            type = "bytes";
        } else if (args.includes("str")) { 
            type = "str";
        } else {
            type = (IO === "in") ? this.root.defaultInput : this.root.defaultOutput;
        }

        return type;
    }

    getVersion(args) {
        /*
            Test which version (charset) shoult be used.
            Sets either the default or overwrites it if
            requested.
        */
        let version = this.root.version;
        args.forEach(arg => {
            if (arg in this.root.charsets) {
                version = arg; 
            }
        })
        return version;
    }

    validateArgs(args) {
        /* 
            Test if provided arguments are in the argument list.
            Everything gets converted to lowercase and returned
        */
        let versions = null;
        let validArgs;
        const loweredArgs = new Array();

        if ("charsets" in this.root) {
            versions = Object.keys(this.root.charsets);
            validArgs = [...this.root.IOtypes, ...versions];
        } else {
            validArgs = this.root.IOtypes;
        }

        if (Boolean(args.length)) {
            args.forEach(arg => {
                arg = String(arg).toLowerCase();
                if (!validArgs.includes(arg)) {
                    const versionHint = (versions) ? `The options for version (charset) are:\n${this.makeArgList(versions)}\n\n` : "";
                    throw new TypeError(`'${arg}'\n\nValid arguments for in- and output-type are:\n${this.makeArgList(this.root.IOtypes)}\n\n${versionHint}Traceback:`);
                }
                loweredArgs.push(arg);
            });
        }
        return loweredArgs;
    }

    validateInput(input, inputType) {
        /* 
            Test if input type fits to the actual input.
        */
        if (inputType === "str") {
            if (typeof input !== "string") {
                this.warning("Your input was converted into a string.");
            }
            return String(input);
        } else {
            if (typeof input === "string") {
                throw new TypeError("Your provided input is a string, but some kind of (typed) Array is expected.");
            } else if (typeof input !== 'object') {
                throw new TypeError("Input must be some kind of (typed) Array if input type is set to 'bytes'.");
            }
            return input; 
        }
    }

    warning(message) {
        if (console.hasOwnProperty("warn")) {
            console.warn(message);
        } else {
            console.log(`___\n${message}\n`);
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
