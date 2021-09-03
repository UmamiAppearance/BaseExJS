/*
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.1
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL3
 */


class Base16 {
    /*
        En-/decoding to and from base16 (hexadecimal).
        (Requires "BaseExConv", "BaseExUtils")
    */

    constructor(version="default", input="str", output="str") {
        this.charsets = {
            default: "0123456789abcdef" 
        }

        this.padding = false;
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(16, 1, 2);
        this.converter.padAmount = [0]
    }

    encode(input, ...args) {
        /* 
            Hex string encoder from string or bytes.
            --------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
        */
        
        // argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // convert to an array of bytes if necessary
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        
        // Convert to Base16 string
        let output;
        output = this.converter.encode(inputBytes, this.charsets[version])[0];

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
        */
        
        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
        
        // Remove the leading 0x if present
        input = String(input).replace(/^0x/, '');
        
        // Ensure even number of characters
        if (Boolean(input.length % 2)) {
            input = "0".concat(input);
        }
        
        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);
        
        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }
}


class Base32 {
    /*
        En-/decoding to and from Base32.
        -------------------------------

        Uses RFC standard 4658 by default (as used e.g
        for (t)otp keys), RFC 3548 is also supported.
        
        (Requires "BaseExConv", "BaseExUtils")
    */
    
    constructor(version="rfc4648", input="str", output="str", padding=true) {
        /*
            The RFC standard defined here is used by de- and encoder.
            This can be overwritten during the call of the function.
        */

        this.charsets = {
            rfc3548: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            rfc4648: "0123456789ABCDEFGHIJKLMNOPQRSTUV" 
        }

        this.padding = Boolean(padding);
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(32, 5, 8);
        this.converter.padAmount = [0, 1, 3, 4, 6]; // -> ["", "=", "===", "====", "======"]
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
        
        // Convert to Base32 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[version]);
        
        // Cut of redundant chars and append padding if set
        if (zeroPadding) {
            const padValue = this.converter.padAmount[zeroPadding];
            output = output.slice(0, output.length-padValue);
            if (this.padding) { 
                output = output.concat("=".repeat(padValue));
            }
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

        // If the input is unpadded, pad it.
        const missingChars = input.length % 8;
        if (Boolean(missingChars)) {
            input = input.padEnd(input.length + 8-missingChars, "=");
        }

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);
        
        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }
}


class Base64 {
    /*
        En-/decoding to and from Base64.
        -------------------------------
        
        Regular and urlsafe charsets can be used.
        (Requires "BaseExConv", "BaseExUtils")
    */

    constructor(version="default", input="str", output="str", padding=true) {
        /*
            The charset defined here is used by de- and encoder.
            This can be overwritten during the call of the function.
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

        this.converter = new BaseExConv(64, 3, 4);
        this.converter.padAmount = [0, 1, 2]; // ["", "=", "=="]
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
        
        // Convert to Base64 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[version]);
        
        // Cut of redundant chars and append padding if set
        if (zeroPadding) {
            const padValue = this.converter.padAmount[zeroPadding];
            output = output.slice(0, output.length-padValue);
            if (this.padding) { 
                output = output.concat("=".repeat(padValue));
            }
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
 
        // If the input is unpadded, pad it.
        const missingChars = input.length % 4;
        if (Boolean(missingChars)) {
            input = input.padEnd(input.length + 4-missingChars, "=");
        }

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);

        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }
}


class Base85 {
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
        more interpreter-friendly characterset.
        
        The RFC 1924 version is a hybrid. It is not using
        the mandatory 128 bit calculation. Instead only 
        the charset is used. Do not use this for any real
        project. (Keep in mind, that even the original is
        based on a joke).

        (Requires "BaseExConv", "BaseExUtils")
        
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
        this.expandUtils();
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(85, 4, 5);
        this.converter.padAmount = [0]; // Padding gets cut of completely
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

        // Initialize the replacing of null bytes for ascii85
        let replacer = null;
        if (Boolean(version.match(/adobe|ascii85/))) {
            replacer = frame => (frame === "!!!!!") ? "z" : frame;
        }

        // Convert to Base85 string        
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[version], replacer);
        output = output.slice(0, output.length-zeroPadding);
    
        // Adobes variant gets its <~framing~>
        if (version === "adobe") {
            output = `<~${output}~>`;
        }
        
        // ...
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

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);

        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }

    expandUtils() {        
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
    }
}


class BaseExConv {
    /*
        Core class for base-convertion and substitution
        based on a given charset.
    */

    constructor(radix, bsEnc, bsDec) {
        /*
            Stores the radix and blocksize for en-/decoding.
        */
        this.radix = radix;
        this.bsEnc = bsEnc;
        this.bsDec = bsDec
    }

    encode(inputBytes, charset, replacer=null) {
        /*
            Encodes to the given radix from a byte array
        */

        // Initialize output string and set yet unknown
        // zero padding to zero.
        let output = "";
        let zeroPadding = 0;
        const bs = this.bsEnc;
        
        // The blocksize defines the size of the corresponding
        // interger, calculated for base conversion. Values 
        // above 6 lead to number that are higher than the 
        // "MAX_SAFE_INTEGER" (2^bs*8).

        if (bs > 6) {
            throw new RangeError("The given blocksize may require big integers (> 2^53) during conversion.\nThis is not supported.")
        }

        // Iterate over the input array in groups with the length
        // of the given blocksize.

        for (let i=0, l=inputBytes.length; i<l; i+=bs) {
            
            // Build a subarray of bs bytes
            let subArray = inputBytes.slice(i, i+bs);

            // At the very last block of bytes, there 
            // is a change that the subarray has a length
            // less than bs. If this is the case, padding is
            // required. All missing bytes are filled with
            // zeros. The amout of zeros is stored in
            // "zeroPadding".

            if (subArray.length < bs) {
                zeroPadding = bs - subArray.length;
                const paddedArray = new Uint8Array(bs);
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            // Convert the subarray into a bs*8-bit binary 
            // number "n", most significant byte first (big endian).

            let n = 0;
            subArray.forEach((b, j) => n += b * this.pow(256, (bs-1-j)));

            // A new ordinary array gets initilized, to
            // store the digits with the given radix  
            const bXarray = new Array();

            // Initialize quotient and remainder for base convertion
            let q = n, r;

            // Divide n until the quotient less than the radix.
            while (this.radix < q) {
                [q, r] = this.divmod(q, this.radix);
                bXarray.unshift(r);
            }

            // Append the remaining quotient to the array
            bXarray.unshift(q);

            // If the length of the array is less than the
            // given output bs, it gets filled up with zeros.
            // (This happens in groups of null bytes)
            
            while (bXarray.length < this.bsDec) {
                bXarray.unshift(0);
            }

            // Each digit is used as an index to pick a 
            // corresponding char from the charset. The 
            // chars get concatinated and stored in "frame".

            let frame = "";
            bXarray.forEach(
                charIndex => frame = frame.concat(charset[charIndex])
            );

            // Ascii85 is replacing four consecutive "!" into "z"
            if (Boolean(replacer)) {
                frame = replacer(frame);
            }

            output = output.concat(frame);
        }

        // The output string is returned. Also the amount 
        // of padded zeros. The specific class decides how 
        // to handle the padding.

        return [output, zeroPadding];
    }

    decode(inputBaseStr, charset) {
        /*
            Decodes to a string of the given radix to a byte array
        */
        
        // Convert each char of the input to the radix-integer
        // (this becomes the corresponding index of the char
        // from the charset). Every char, that is not found in
        // in the set is assumed to be a padding char. The integer
        // is set to zero in this case.

        const bs = this.bsDec;
        let padChars = 0;

        const inputBytes = Uint8Array.from(
            inputBaseStr.split('').map(c => {
                const index = charset.indexOf(c);
                if (index < 0) { 
                    padChars++;
                    return 0;
                } else {
                    return index;
                }
            })
        );
        
        // The amount of pading characters is not equal
        // to the amount of padded zeros. This the
        // defined by the specific class and gets
        // converted.

        let padding = this.padAmount.indexOf(padChars);

        // Initialize a new default array to store
        // the converted radix-256 integers.

        let b256Array = new Array();

        // Iterate over the input bytes in groups of 
        // the blocksize.

        for (let i=0, l=inputBaseStr.length; i<l; i+=bs) {
            
            // Build a subarray of bs bytes.
            let subArray = inputBytes.slice(i, i+bs);

            // Ascii85 is cutting of the padding in any case. 
            // It is possible for this group of algorithms, that
            // the last subarray has a length which is less than
            // the bs. This is padded with the highest possible
            // value, which is radix-1 (=> 84 or char "u"). The amout 
            // of padding is stored in "padding".
            
            if (subArray.length < bs) {
                padding = bs - subArray.length;
                const paddedArray = Uint8Array.from(Array(bs).fill(this.radix-1));
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            // To store the output chunks, initialize a
            // new default array.
            const subArray256 = new Array();

            // The subarray gets converted into a bs*8-bit 
            // binary number "n", most significant byte 
            // first (big endian).

            let n = 0;
            subArray.forEach(
                (b, j) => n += b * this.pow(this.radix, bs-1-j)
            );
            
            // Initialize quotient and remainder for base convertion
            let q = n, r;

            // Divide n until the quotient is less than 256.
            while (q > 256) {
                [q, r] = this.divmod(q, 256);
                subArray256.unshift(r);
            }

            // Append the remaning quotient to the array
            subArray256.unshift(q);
            
            // If the lenght of the array is less than the required
            // bs after decoding it gets filled up with zeros.
            // (Again, this happens with null bytes.)

            while (subArray256.length < this.bsEnc) {
                subArray256.unshift(0);
            }
            
            // The subarray gets concatianted with the
            // main array.
            b256Array = b256Array.concat(subArray256);
        }

        // Convert default array to typed uInt8 array.
        // The amount of bytes added for padding is left 
        // behind.

        const output = Uint8Array.from(b256Array.slice(0, b256Array.length-padding));
        
        return output;
    }


    divmod(x, y) {
        return [Math.floor(x / y), x % y];
    }

    pow(radix, n) {
        // Precaluclated powers for each radix
        const powList = {
             16: [16**0, 16**1],
             32: [32**0, 32**1, 32**2, 32**3, 32**4, 32**5, 32**6, 32**7],
             64: [64**0, 64**1, 64**2, 64**3],
             85: [85**0, 85**1, 85**2, 85**3, 85**4 ],
            256: [256**0, 256**1, 256**2, 256**3, 256**4]
        }
        return powList[radix][n];
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
        /*
            Returns argument lists for error messages.
        */
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
    /*
        Collection of commen converters. Ready to use
        instances.
    */
   
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
