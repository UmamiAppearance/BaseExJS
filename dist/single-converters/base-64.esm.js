class BaseConverter {
    /*
        Core class for base-conversion and substitution
        based on a given charset.
    */

    constructor(radix, bsEnc=null, bsDec=null, decPadVal=0) {
        /*
            Stores the radix and blocksize for en-/decoding.
        */
        this.radix = radix;

        if (bsEnc !== null && bsDec !== null) {
            this.bsEnc = bsEnc;
            this.bsDec = bsDec;
        } else {
            [this.bsEnc, this.bsDec] = this.constructor.guessBS(radix);
        }

        this.decPadVal = decPadVal;
    }

    static guessBS(radix) {
        // experimental feature !
        // Calc how many bits are needed to represent
        // 256 conditions (1 byte)
        // If the radix is less than 8 bits, skip that part
        // and use the radix value directly.

        let bsDecPre = (radix < 8) ? radix : Math.ceil(256 / radix);
        
        // If the result is a multiple of 8 it
        // is appropriate to reduce the result

        while (bsDecPre > 8 && !(bsDecPre % 8)) {
            bsDecPre /= 8;
        }

        // Search for the amount of bytes, which are necessary
        // to represent the assumed amount of bytes. If the result
        // is equal or bigger than the assumption for decoding, the
        // amount of bytes for encoding is found. 

        let bsEnc = 0;
        while (((bsEnc * 8) * Math.log(2) / Math.log(radix)) < bsDecPre) {
            bsEnc++;
        }

        // The result for decoding can now get calculated accurately.
        const bsDec = Math.ceil((bsEnc * 8) * Math.log(2) / Math.log(radix));

        return [bsEnc, bsDec];
    }

    encode(inputBytes, charset, littleEndian=false, replacer=null) {
        /*
            Encodes to the given radix from a byte array
        */

        // Initialize output string and set yet unknown
        // zero padding to zero.
        let bs = this.bsEnc;
        if (bs === 0) {
            bs = inputBytes.byteLength;
        }

        let output = "";

        const zeroPadding = (bs) ? (bs - inputBytes.length % bs) % bs : 0;
        const zeroArray = new Array(zeroPadding).fill(0);
        let byteArray;
        
        if (littleEndian) {
            
            // as the following loop walks through the array
            // from left to right, the input bytes get reversed
            // to favor the least significant first

            inputBytes.reverse();
            byteArray = [...zeroArray, ...inputBytes];
        } else {
            byteArray = [...inputBytes, ...zeroArray];
        }
        
        // Iterate over the input array in groups with the length
        // of the given blocksize.

        for (let i=0, l=byteArray.length; i<l; i+=bs) {
            
            // Convert the subarray into a bs*8-bit binary 
            // number "n".
            // The blocksize defines the size of the corresponding
            // integer. Dependent on the blocksize this may lead  
            // to values, that are higher than the "MAX_SAFE_INTEGER",
            // therefore BigInts are used.
  
            let n = 0n;
            
            for (let j=i; j<i+bs; j++) {
                n = (n << 8n) + BigInt(byteArray[j]);
            }

            // Initialize a new ordinary array, to
            // store the digits with the given radix  
            const bXarray = new Array();

            // Initialize quotient and remainder for base conversion
            let q = n, r;

            // Divide n until the quotient becomes less than the radix.
            while (q >= this.radix) {
                [q, r] = this.divmod(q, this.radix);
                bXarray.unshift(parseInt(r, 10));
            }

            // Append the remaining quotient to the array
            bXarray.unshift(parseInt(q, 10));

            // If the length of the array is less than the
            // given output bs, it gets filled up with zeros.
            // (This happens in groups of null bytes)
            
            while (bXarray.length < this.bsDec) {
                bXarray.unshift(0);
            }

            // Each digit is used as an index to pick a 
            // corresponding char from the charset. The 
            // chars get concatenated and stored in "frame".

            let frame = "";
            bXarray.forEach(
                charIndex => frame = frame.concat(charset[charIndex])
            );

            // Ascii85 is replacing four consecutive "!" into "z"
            // Also other replacements can be implemented and used
            // at this point.
            if (replacer) {
                frame = replacer(frame, zeroPadding);
            }

            output = output.concat(frame);
        }

        // The output string is returned. Also the amount 
        // of padded zeros. The specific class decides how 
        // to handle the padding.

        return [output, zeroPadding];
    }

    decode(inputBaseStr, charset, littleEndian=false) {
        /*
            Decodes to a string of the given radix to a byte array
        */
        
        // Convert each char of the input to the radix-integer
        // (this becomes the corresponding index of the char
        // from the charset). Every char, that is not found in
        // in the set is getting ignored.

        if (!inputBaseStr) {
            return new Uint8Array(0);
        }

        let bs = this.bsDec;
        const byteArray = new Array();

        inputBaseStr.split('').forEach((c) => {
            const index = charset.indexOf(c);
            if (index > -1) { 
               byteArray.push(index);
            }
        });


        let padChars;

        if (bs === 0) {
            bs = byteArray.length;
        } else {
            padChars = (bs - byteArray.length % bs) % bs;
            const fillArray = new Array(padChars).fill(this.decPadVal);
            if (littleEndian) {
                byteArray.unshift(...fillArray);
            } else {
                byteArray.push(...fillArray);
            }
        }

        // Initialize a new default array to store
        // the converted radix-256 integers.

        let b256Array = new Array();

        // Iterate over the input bytes in groups of 
        // the blocksize.

        for (let i=0, l=byteArray.length; i<l; i+=bs) {
            
            // Build a subarray of bs bytes.
            let n = 0n;

            for (let j=0; j<bs; j++) {
                n += BigInt(byteArray[i+j]) * this.pow(bs-1-j);
            }
            
            // To store the output chunks, initialize a
            // new default array.
            const subArray256 = new Array();

            // The subarray gets converted into a bs*8-bit 
            // binary number "n", most significant byte 
            // first (big endian).

            // Initialize quotient and remainder for base conversion
            let q = n, r;

            // Divide n until the quotient is less than 256.
            while (q >= 256) {
                [q, r] = this.divmod(q, 256);
                subArray256.unshift(parseInt(r, 10));
            }

            // Append the remaining quotient to the array
            subArray256.unshift(parseInt(q, 10));
            
            // If the length of the array is less than the required
            // bs after decoding it gets filled up with zeros.
            // (Again, this happens with null bytes.)

            while (subArray256.length < this.bsEnc) {
                subArray256.unshift(0);
            }
            
            // The subarray gets concatenated with the
            // main array.
            b256Array = b256Array.concat(subArray256);
        }

        // Remove padded zeros (or in case of LE all leading zeros)

        if (littleEndian) {
            // remove all zeros from the start of the array
            while (!b256Array[0]) {
                b256Array.shift();  
            }
            
            if (!b256Array.length) {
                b256Array.push(0);
            }

            b256Array.reverse();
        } else if (this.bsDec) {
            const padding = this.padChars(padChars);

            // remove all bytes according to the padding
            b256Array.splice(b256Array.length-padding);
        }

        return Uint8Array.from(b256Array);
    }

    padBytes(charCount) {
        return Math.floor((charCount * this.bsDec) / this.bsEnc);
    }

    padChars(byteCount) {
        return Math.ceil((byteCount * this.bsEnc) / this.bsDec);
    }

    pow(n) {
        return BigInt(this.radix)**BigInt(n);
    }

    divmod(x, y) {
        [x, y] = [BigInt(x), BigInt(y)];
        return [(x / y), (x % y)];
    }
}

/**
 * Base of every BaseConverter. Provides basic
 * en- and decoding, makes sure, that every 
 * property is set (to false by default).
 * Also allows global feature additions.
 * 
 * Requires:
 * -> Utils
 */
class BaseTemplate {
    constructor() {

        // predefined settings
        this.charsets = {};
        this.hasSignedMode = false;
        this.littleEndian = false;
        this.numberMode = false;
        this.outputType = "buffer";
        this.padding = false;
        this.signed = false;
        this.upper = null;
        this.utils = new Utils(this);
        this.version = "default";
        
        // list of allowed/disallowed args to change
        this.isMutable = {
            littleEndian: false,
            padding: false,
            signed: false,
            upper: false,
        };
    }

    encode(input, replacerFN, postEncodeFN, ...args) {

        // apply settings
        const settings = this.utils.validateArgs(args);
        
        // handle input
        let inputBytes, negative, type;
        [inputBytes, negative, type] = this.utils.smartInput.toBytes(input, settings);

        // generate replacer function if given
        let replacer = null;
        if (replacerFN) {
            replacer = replacerFN(settings);
        }
        
        // Convert to base string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[settings.version], settings.littleEndian, replacer);

        // set sign if requested
        if (settings.signed) {
            output = this.utils.toSignedStr(output, negative);
        }

        // set upper case if requested
        if (settings.upper) {
            output = output.toUpperCase();
        }

        // modify the output based on a given function (or not)
        if (postEncodeFN) {
            output = postEncodeFN({ inputBytes, output, settings, zeroPadding, type });
        }

        return output;
    }

    decode(rawInput, preDecodeFN, postDecodeFN, ...args) {
    
        // apply settings
        const settings = this.utils.validateArgs(args);

        // ensure a string input
        let input = String(rawInput);

        // set negative to false for starters
        let negative = false;
        
        // Test for a negative sign if converter supports it
        if (this.hasSignedMode) {
            [input, negative] = this.utils.extractSign(input);   
            
            // But don't allow a sign if the decoder is not configured to use it
            if (negative && !settings.signed) {
                this.utils.signError();
            }
        }

        // Make the input lower case if alphabet has only one case
        // (single case alphabets are stored as lower case strings)
        if (this.isMutable.upper) {
            input = input.toLowerCase();
        }

        // Run pre decode function if provided
        if (preDecodeFN) {
            input = preDecodeFN({ input, settings });
        }

        // Run the decoder
        let output = this.converter.decode(input, this.charsets[settings.version], settings.littleEndian);

        // Run post decode function if provided
        if (postDecodeFN) {
            output = postDecodeFN({ input, output, settings });
        }

        return this.utils.smartOutput.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}


/**
 *  Utilities for every BaseEx class.
 * 
 * Requires:
 * -> SmartInput
 * -> SmartOutput
 */
class Utils {

    constructor(main) {

        // Store the calling class in this.root
        // for accessability.
        this.root = main;

        // If charsets are uses by the parent class,
        // add extra functions for the user.
        if ("charsets" in main) this.charsetUserToolsConstructor();

        this.smartInput = new SmartInput();
        this.smartOutput = new SmartOutput();
    }

    charsetUserToolsConstructor() {
        /*
            Constructor for the ability to add a charset and 
            change the default version.
        */

        this.root.addCharset = (name, charset) => {
            /*
                Save method to add a charset.
                ----------------------------

                @name: string that represents the key for the new charset
                @charset: string, array or Set of chars - the length must fit to the according class 
            */
                
            if (typeof name !== "string") {
                throw new TypeError("The charset name must be a string.");
            }

            // Get the appropriate length for the charset
            // from the according converter
            
            const setLen = this.root.converter.radix;
            let inputLen = setLen;
            
            if (typeof charset === "string" || Array.isArray(charset)) {
                
                // Store the input length of the input
                inputLen = charset.length;
                
                // Convert to "Set" -> eliminate duplicates
                // If duplicates are found the length of the
                // Set and the length of the initial input
                // differ.

                charset = new Set(charset);

            } else if (!(charset instanceof Set)) {
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
        };

        // Save method (argument gets validated) to 
        // change the default version.
        this.root.setDefaultVersion = (version) => [this.root.version] = this.validateArgs([version]);
    }

    makeArgList(args) {
        /*
            Returns argument lists for error messages.
        */
        return args.map(s => `'${s}'`).join(", ");
    }

    toSignedStr(output, negative) {

        output = output.replace(/^0+(?!$)/, "");

        if (negative) {
            output = "-".concat(output);
        }

        return output;
    }

    extractSign(input) {
        // Test for a negative sign
        let negative = false;
        if (input[0] === "-") {
            negative = true;
            input = input.slice(1);
        }

        return [input, negative];
    }

    invalidArgument(arg, versions, outputTypes) {
        const signedHint = (this.root.isMutable.signed) ? "\n * 'signed' to disable, 'unsigned', to enable the use of the twos's complement for negative integers" : "";
        const endiannessHint = (this.root.isMutable.littleEndian) ? "\n * 'be' for big , 'le' for little endian byte order for case conversion" : "";
        const padHint = (this.root.isMutable.padding) ? "\n * 'pad' to fill up, 'nopad' to not fill up the output with the particular padding" : "";
        const caseHint = (this.root.isMutable.upper) ? "\n * valid args for changing the encoded output case are 'upper' and 'lower'" : "";
        const outputHint = `\n * valid args for the output type are ${this.makeArgList(outputTypes)}`;
        const versionHint = (versions) ? `\n * the options for version (charset) are: ${this.makeArgList(versions)}` : "";
        const numModeHint = "\n * 'number' for number-mode (converts every number into a Float64Array to keep the natural js number type)";
        
        throw new TypeError(`'${arg}'\n\nValid parameters are:${signedHint}${endiannessHint}${padHint}${caseHint}${outputHint}${versionHint}${numModeHint}\n\nTraceback:`);
    }

    validateArgs(args, initial=false) {
        /* 
            Test if provided arguments are in the argument list.
            Everything gets converted to lowercase and returned
        */
        
        // default settings
        const parameters = {
            littleEndian: this.root.littleEndian,
            numberMode: this.root.numberMode,
            outputType: this.root.outputType,
            padding: this.root.padding,
            signed: this.root.signed,
            upper: this.root.upper,
            version: this.root.version
        };

        // if no args are provided return the default settings immediately
        if (!args.length) {
            return parameters;
        }

        const versions = Object.keys(this.root.charsets);
        const outputTypes = this.smartOutput.typeList;

        const extraArgList = {
            littleEndian: ["be", "le"],
            padding: ["nopad", "pad"],
            signed: ["unsigned", "signed"],
            upper: ["lower", "upper"],
        };

        if (args.includes("number")) {
            args.splice(args.indexOf("number"), 1);
            parameters.numberMode = true;
            parameters.outputType = "float_n";
        }

        args.forEach((arg) => {
            arg = String(arg).toLowerCase();

            if (versions.includes(arg)) {
                parameters.version = arg;
            } else if (outputTypes.includes(arg)) {
                parameters.outputType = arg;
            } else {
                // set invalid args to true for starters
                // if a valid arg is found later it will
                // get changed

                let invalidArg = true;

                // walk through the mutable parameter list

                for (const param in extraArgList) {
                    
                    if (extraArgList[param].includes(arg)) {
                        
                        invalidArg = false;

                        // extra params always have two options
                        // they are converted into booleans 
                        // index 0 > false
                        // index 1 > true

                        if (this.root.isMutable[param]) {
                            parameters[param] = Boolean(extraArgList[param].indexOf(arg));
                        } else {
                            throw TypeError(`Argument '${arg}' is not allowed for this type of converter.`);
                        }
                    }
                }

                if (invalidArg) {
                    this.invalidArgument(arg, versions, outputTypes);
                }
            }
        });

        // If padding and signed are true, padding
        // is set to false and a warning is getting
        // displayed.
        if (parameters.padding && parameters.signed) {
            parameters.padding = false;
            this.constructor.warning("Padding was set to false due to the signed conversion.");
        }
        
        // overwrite the default parameters for the initial call
        if (initial) {
            for (const param in parameters) {
                this.root[param] = parameters[param];
            }
        }

        return parameters;
    }

    signError() {
        throw new TypeError("The input is signed but the converter is not set to treat input as signed.\nYou can pass the string 'signed' to the decode function or when constructing the converter.");
    }

    static warning(message) {
        if (Object.prototype.hasOwnProperty.call(console, "warn")) {
            console.warn(message);
        } else {
            console.log(`___\n${message}\n`);
        }
    }
}


class SmartInput {

    makeDataView(byteLen) {
        const buffer = new ArrayBuffer(byteLen);
        return new DataView(buffer);
    }

    floatingPoints(input, littleEndian=false) {
        const view = this.makeDataView(8);
        view.setFloat64(0, input, littleEndian);
        return view;
    }

    numbers(input, littleEndian=false) {

        let view;
        let type;

        // Integer
        if (Number.isInteger(input)) {

            type = "int";

            if (!Number.isSafeInteger(input)) {
                
                let safeInt;
                let smallerOrBigger;
                let minMax;

                if (input < 0) {
                    safeInt = Number.MIN_SAFE_INTEGER;
                    smallerOrBigger = "smaller";
                    minMax = "MIN";
                } else {
                    safeInt = Number.MAX_SAFE_INTEGER;
                    smallerOrBigger = "bigger";
                    minMax = "MAX";
                }

                throw new RangeError(`The provided integer is ${smallerOrBigger} than ${minMax}_SAFE_INTEGER: '${safeInt}'\nData integrity is not guaranteed. Use a BigInt to avoid this issue.\n(If you see this error although a float was provided, the input has to many digits before the decimal point to store the decimal places in a float with 64 bits.)`);
            }

            // Signed Integer
            if (input < 0) {
                
                // 64 bit
                if (input < -2147483648) {
                    view = this.makeDataView(8);
                    view.setBigInt64(0, BigInt(input), littleEndian);
                }
                
                // 32 littleEndian
                else if (input < -32768) {
                    view = this.makeDataView(4);
                    view.setInt32(0, input, littleEndian);
                }

                // 16 littleEndian
                else {
                    view = this.makeDataView(2);
                    view.setInt16(0, input, littleEndian);
                }
            }

            // Unsigned Integer
            else if (input > 0) {

                // 64 bit
                if (input > 4294967295) {
                    view = this.makeDataView(8);
                    view.setBigUint64(0, BigInt(input), littleEndian);
                }
                
                // 32 bit
                else if (input > 65535) {
                    view = this.makeDataView(4);
                    view.setUint32(0, input, littleEndian);
                }
                
                // 16 bit
                else {
                    view = this.makeDataView(2);
                    view.setInt16(0, input, littleEndian);
                }
            }

            // Zero
            else {
                view = new Uint16Array([0]);
            }
        }
        
        // Floating Point Number:
        else {
            type = "float";
            view = this.floatingPoints(input, littleEndian);
        }

        return [new Uint8Array(view.buffer), type];

    }


    bigInts(input, littleEndian=false) {
        // Since BigInts are not limited to 64 bits, they might
        // overflow the BigInt64Array values. A little more 
        // handwork is therefore needed.

        // as the integer size is not known yet, the bytes get a
        // makeshift home "byteArray", which is a regular array

        const byteArray = new Array();
        const append = (littleEndian) ? "push" : "unshift";
        const maxN = 18446744073709551616n;

        // split the input into 64 bit integers
        if (input < 0) {
            while (input < -9223372036854775808n) {
                byteArray[append](input % maxN);
                input >>= 64n;
            }
        } else { 
            while (input >= maxN) {
                byteArray[append](input % maxN);
                input >>= 64n;
            }
        }

        // append the remaining byte
        byteArray[append](input);

        // determine the required size for the typed array
        // by taking the amount of 64 bit integers * 8
        // (8 bytes for each 64 bit integer)
        const byteLen = byteArray.length * 8;
        
        // create a fresh data view
        const view = this.makeDataView(byteLen);

        // set all 64 bit integers 
        byteArray.forEach((bigInt, i) => {
            const offset = i * 8;
            view.setBigUint64(offset, bigInt, littleEndian);
        });

        return new Uint8Array(view.buffer);
    }


    toBytes(input, settings) {

        let inputUint8;
        let negative = false;
        let type = "bytes";
        
        // Buffer:
        if (input instanceof ArrayBuffer) {
            inputUint8 = new Uint8Array(input);
        }

        // TypedArray or DataView:
        else if (ArrayBuffer.isView(input)) {
            inputUint8 = new Uint8Array(input.buffer);
        }
        
        // String:
        else if (typeof input === "string" || input instanceof String) {
            inputUint8 = new TextEncoder().encode(input);
        }
        
        // Number:
        else if (typeof input === "number") {
            if (isNaN(input)) {
                throw new TypeError("Cannot proceed. Input is NaN.");
            } else if (input == Infinity) {
                throw new TypeError("Cannot proceed. Input is 'Infinity'.");
            }

            if (settings.signed && input < 0) {
                negative = true;
                input = -input;
            }

            if (settings.numberMode) {
                const view = this.floatingPoints(input, settings.littleEndian);
                inputUint8 = new Uint8Array(view.buffer);
                type = "float";
            } else {
                [inputUint8, type] = this.numbers(input, settings.littleEndian);
            }
        }

        // BigInt:
        else if (typeof input === "bigint") {
            if (settings.signed && input < 0) {
                negative = true;
                input *= -1n;
            }
            inputUint8 = this.bigInts(input, settings.littleEndian);
            type = "int";
        }

        // Array
        else if (Array.isArray(input)) {
            const collection = new Array();
            for (const elem of input) {
                collection.push(...this.toBytes(elem));
            }
            inputUint8 = Uint8Array.from(collection);
        }

        else {
            throw new TypeError("The provided input type can not be processed.");
        }

        return [inputUint8, negative, type];
    }
}


class SmartOutput {
    
    constructor () {
        this.typeList = this.constructor.validTypes();
    }

    getType(type) {
        if (!this.typeList.includes(type)) {
            throw new TypeError(`Unknown output type: '${type}'`);
        }
        return type;
    }

    makeTypedArrayBuffer(Uint8ArrayOut, bytesPerElem, littleEndian) {
        
        const len = Uint8ArrayOut.byteLength;
        const delta = (bytesPerElem - (Uint8ArrayOut.byteLength % bytesPerElem)) % bytesPerElem;
        let newArray = Uint8ArrayOut;
        
        if (delta) {
            newArray = new Uint8Array(len + delta);
            const offset = (littleEndian) ? delta : 0;
            newArray.set(Uint8ArrayOut, offset);
        }

        return newArray.buffer;
    }

    makeTypedArray(inArray, type, littleEndian) {
        let outArray;

        if (type === "int16" || type === "uint16") {

            const buffer = this.makeTypedArrayBuffer(inArray, 2, littleEndian);
            outArray = (type === "int16") ? new Int16Array(buffer) : new Uint16Array(buffer);

        } else if (type === "int32" || type === "uint32" || type === "float32") {

            const buffer = this.makeTypedArrayBuffer(inArray, 4, littleEndian);
            
            if (type === "int32") {
                outArray = new Int32Array(buffer);
            } else if (type === "uint32") {
                outArray = new Uint32Array(buffer);
            } else {
                outArray = new Float32Array(buffer);
            }

        } else if (type === "bigint64" || type === "biguint64" || type === "float64") {
            
            const buffer = this.makeTypedArrayBuffer(inArray, 8, littleEndian);
            
            if (type === "bigint64") {
                outArray = new BigInt64Array(buffer);
            } else if (type === "biguint64") {
                outArray = new BigUint64Array(buffer);
            } else {
                outArray = new Float64Array(buffer);
            }

        }

        return outArray;
    }

    compile(Uint8ArrayOut, type, littleEndian=false, negative=false) {
        type = this.getType(type);
        let compiled;

        if (type === "buffer") {
            compiled = Uint8ArrayOut.buffer;
        } 
        
        else if (type === "bytes" || type === "uint8") {
            compiled = Uint8ArrayOut;
        }
        
        else if (type === "int8") {
            compiled = new Int8Array(Uint8ArrayOut.buffer);
        } 
        
        else if (type === "view") {
            compiled = new DataView(Uint8ArrayOut.buffer);
        }
        
        else if (type === "str") {
           compiled = new TextDecoder().decode(Uint8ArrayOut);
        }
        
        else if (type === "uint_n" || type === "int_n" || type === "bigint_n") {
            
            if (littleEndian) {
                Uint8ArrayOut.reverse();
            }

            // calculate a unsigned big integer
            let n = 0n;
            Uint8ArrayOut.forEach((b) => n = (n << 8n) + BigInt(b));

            // convert to signed int if requested 
            if (type === "int_n") {
                n = BigInt.asIntN(Uint8ArrayOut.length*8, n);
            }
            
            // convert to regular number if possible (and no bigint was requested)
            if (type !== "bigint_n" && n >= Number.MIN_SAFE_INTEGER && n <= Number.MAX_SAFE_INTEGER) {                
                compiled = Number(n);
            } else {
                compiled = n;
            }

            // change sign for signed modes (if necessary)
            if (negative) {
                compiled = -(compiled);
            }
        } 
        
        else if (type === "float_n") {

            if (Uint8ArrayOut.length <= 4) {
                
                let array;
                if (Uint8ArrayOut.length === 4) {
                    array = Uint8ArrayOut;
                } else {
                    array = this.makeTypedArray(Uint8ArrayOut, "float32", false);
                }

                const view = new DataView(array.buffer);
                compiled = view.getFloat32(0, littleEndian);
            
            }
            
            else if (Uint8ArrayOut.length <= 8) {
                
                let array;
                if (Uint8ArrayOut.length === 8) {
                    array = Uint8ArrayOut;
                } else {
                    array = this.makeTypedArray(Uint8ArrayOut, "float64", false);
                }

                const view = new DataView(array.buffer);
                compiled = view.getFloat64(0, littleEndian);
            
            }

            else {
                throw new RangeError("The provided input is to complex to be converted into a floating point.")
            }
        }

        else if (type === "number") {
            if (Uint8ArrayOut.length !== 8) {
                throw new TypeError("Type mismatch. Cannot convert into number.");
            }

            const float64 = new Float64Array(Uint8ArrayOut.buffer);
            compiled = Number(float64);
        }

        else {
            compiled = this.makeTypedArray(Uint8ArrayOut, type, littleEndian);
        } 

        return compiled;
    }

    static validTypes() {
        const typeList = [
            "bigint64",
            "bigint_n",
            "biguint64",
            "buffer",
            "bytes",
            "float32",
            "float64",
            "float_n",
            "int8",
            "int16",
            "int32",
            "int_n",
            "str",
            "uint8",
            "uint16",
            "uint32",
            "uint_n",
            "view"
        ];
        return typeList; 
    }
}

class Base64 extends BaseTemplate {

    constructor(...args) {
        super();

        const b62Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets.default = b62Chars.concat("+/");
        this.charsets.urlsafe = b62Chars.concat("-_");
     
        // predefined settings
        this.converter = new BaseConverter(64, 3, 4);
        this.padding = true;
        
        // list of allowed/disallowed args to change
        this.isMutable.padding = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        
        const applyPadding = (scope) => {

            let { output, settings, zeroPadding } = scope;

            // Cut of redundant chars and append padding if set
            if (zeroPadding) {
                const padValue = this.converter.padBytes(zeroPadding);
                output = output.slice(0, output.length-padValue);
                if (settings.padding) { 
                    output = output.concat("=".repeat(padValue));
                }
            }

            return output;
        };
            
        return super.encode(input, null, applyPadding, ...args);
    }

    decode(rawInput, ...args) {
        return super.decode(rawInput, null, null, ...args);
    }
}

export { Base64 };
