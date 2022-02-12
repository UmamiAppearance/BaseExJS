/**
 *  Utilities for every BaseEx class. The main 
 *  purpose is argument validation.
 * 
 * Requires:
 * -> SmartInput
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

    normalizeOutput(array) {
        // calculate a fitting byte length (2,4,8,16...)
        let bytesPerElem = 2 ** Math.ceil(Math.log(array.byteLength) / Math.log(2));
        
        // Take at least 2 bytes (byte amount for a int16/uint16)
        bytesPerElem = Math.max(bytesPerElem, 2);
        
        // calculate the missing bytes
        const byteDelta = bytesPerElem - array.byteLength;

        // if bytes are missing, construct a new array 
        // and set the values. The delta is the offset
        // eg. TypedArray([12, 32, 45]), length: 3 offset = (4-3=1)
        // --> set values with offset 1 --> [0, 12, 32, 45]
        if (byteDelta) {
            const normalizedArray = new Uint8Array(bytesPerElem);
            normalizedArray.set(array, byteDelta);
            array = normalizedArray;
        }

        return array;
    }

    negate(array) {
        // set the negative value of each byte 
        // which gets converted to the equivalent
        // positive value

        // xor with 255 
        array.forEach((b, i) => array[i] = b ^ 255);
        const lastElem = array.byteLength - 1;
        
        // add one to the last byte
        array[lastElem] += 1;
    }

    toSignedArray(array, negative) {
        array = this.normalizeOutput(array);

        // Negate the value if the input is negative
        if (negative) {
            this.negate(array);
        }

        return array;
    }

    invalidArgument(arg, versions, outputTypes) {
        const signedHint = (this.root.isMutable.signed) ? "\n * 'signed' to disable, 'unsigned', to enable the use of the twos's complement for negative integers" : "";
        const endiannessHint = (this.root.isMutable.littleEndian) ? "\n * 'be' for big , 'le' for little endian byte order for case conversion" : "";
        const padHint = (this.root.isMutable.padding) ? "\n * 'pad' to fill up, 'nopad' to not fill up the output with the particular padding" : "";
        const caseHint = (this.root.isMutable.upper) ? "\n * valid args for changing the encoded output case are 'upper' and 'lower'" : "";
        const outputHint = `\n * valid args for the output type are ${this.makeArgList(outputTypes)}`;
        const versionHint = (versions) ? `\n * the options for version (charset) are: ${this.makeArgList(versions)}` : "";
        
        throw new TypeError(`'${arg}'\n\nValid parameters are:${signedHint}${endiannessHint}${padHint}${caseHint}${outputHint}${versionHint}\n\nTraceback:`);
    }

    validateArgs(args, initial=false) {
        /* 
            Test if provided arguments are in the argument list.
            Everything gets converted to lowercase and returned
        */
        
        // default settings
        const parameters = {
            version: this.root.version,
            signed: this.root.signed,
            littleEndian: this.root.littleEndian,
            padding: this.root.padding,
            outputType: "buffer",
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

        // overwrite the default parameters for the initial call
        if (parameters.padding && parameters.signed) {
            parameters.padding = false;
            this.constructor.warning("Padding was set to false due to the signed conversion.");
        }
        
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
        
        let view;
        
        // 32 Bit
        if (input > 1.2e-38 && input < 3.4e+38) {
            view = this.makeDataView(4);
            view.setFloat32(0, input, littleEndian);
        }

        // 64 Bit
        else if (input > 2.3e-308 && input < 1.7e+308) {
            view = this.makeDataView(8);
            view.setFloat64(0, input, littleEndian);
        }

        else {
            throw new RangeError("Float is too complex to handle. Convert it to bytes manually before encoding.");
        }

        return view;
    }

    numbers(input, littleEndian=false) {

        let view;

        // Integer
        if (Number.isInteger(input)) {

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

                throw new RangeError(`The provided integer is ${smallerOrBigger} than ${minMax}_SAFE_INTEGER: '${safeInt}'\nData integrity is not possible. Use a BigInt to avoid this issue.`);
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
            view = this.floatingPoints(input, littleEndian);
        }

        return new Uint8Array(view.buffer);

    }


    bigInts(input, littleEndian=false) {
        // Since BigInts are not limited to 64 bits, they might
        // overflow the BigInt64Array values. A little more 
        // handwork is therefore needed.

        // as the integer size is not known yet, the bytes get a
        // makeshift home

        const byteArray = new Array();
        const append = (littleEndian) ? "push" : "unshift";

        if (input > 0) {
            
            const overflow = 18446744073709551616n; 

            while (input >= overflow) {
                byteArray[append](input % overflow);
                input >>= 64n;
            }
        }

        else if (input < 0) {
            const overflow = -9223372036854775808n;

            while (input <= overflow) {
                byteArray[append](input % overflow);
                input >>= 64n;
            }
        }

        byteArray[append](input);

        const byteLen = byteArray.length * 8;

        const buffer = new ArrayBuffer(byteLen);
        const view = new DataView(buffer);

        byteArray.forEach((bigInt, i) => {
            const offset = i * 8;
            view.setBigUint64(offset, bigInt, littleEndian);
        });

        return new Uint8Array(view.buffer);
    }


    toBytes(input, signed=false, littleEndian=false) {

        let inputUint8;
        let negative = false;
        let bytesInput = false;
        
        // Buffer:
        if (input instanceof ArrayBuffer) {
            inputUint8 = new Uint8Array(input);
            bytesInput = true;
        }

        // TypedArray or DataView:
        else if (ArrayBuffer.isView(input)) {
            inputUint8 = new Uint8Array(input.buffer);
            bytesInput = true;
        }
        
        // String:
        else if (typeof input === "string" || input instanceof String) {
            inputUint8 = new TextEncoder().encode(input);
        }
        
        // Number:
        else if (typeof input === "number" && !isNaN(input) && input !== Infinity) {
            if (signed && input < 0) {
                negative = true;
                input *= -1;
            }
            inputUint8 = this.numbers(input, littleEndian);    
        }

        // BigInt:
        else if (typeof input === "bigint") {
            if (signed && input < 0) {
                negative = true;
                input *= -1n;
            }
            inputUint8 = this.bigInts(input, littleEndian);
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

        return [inputUint8, negative, bytesInput];
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
        } else if (type === "int32" || type === "uint32") {
            const buffer = this.makeTypedArrayBuffer(inArray, 4, littleEndian);
            outArray = (type === "int32") ? new Int32Array(buffer) : new Uint32Array(buffer);
        } else if (type === "bigint64" || type === "biguint64") {
            const buffer = this.makeTypedArrayBuffer(inArray, 8, littleEndian);
            outArray = (type === "bigint64") ? new BigInt64Array(buffer) : new BigUint64Array(buffer);
        }

        return outArray;
    }

    compile(Uint8ArrayOut, type, littleEndian=false, negative=false) {
        type = this.getType(type);
        let compiled;

        if (type === "buffer") {
            compiled = Uint8ArrayOut.buffer;
        } else if (type === "bytes" || type === "Uint8") {
            compiled = Uint8ArrayOut;
        } else if (type === "int8") {
            compiled = new Int8Array(Uint8ArrayOut.buffer);
        } else if (type === "view") {
            compiled = new DataView(Uint8ArrayOut.buffer);
        } else if (type === "str") {
           compiled = new TextDecoder().decode(Uint8ArrayOut);
        } else if (type === "number") {

            compiled = Uint8ArrayOut;

            if (littleEndian) {
                compiled.reverse();
            }

            let n = 0n;
            compiled.forEach((b) => n = (n << 8n) + BigInt(b));

            if (n < Number.MAX_SAFE_INTEGER) {
                compiled = Number(n);
            } else {
                compiled = n;
            }

            if (negative) {
                compiled = -(compiled);
            }

        } else {
            compiled = this.makeTypedArray(Uint8ArrayOut, type, littleEndian);
        } 

        return compiled;
    }

    static validTypes() {
        const typeList = [
            "bigint64",
            "biguint64",
            "buffer",
            "bytes",
            "int8",
            "int16",
            "int32",
            "number",
            "str",
            "uint8",
            "uint16",
            "uint32",
            "view"
        ];
        return typeList; 
    }
}

class Base91 {
    /*
        En-/decoding to and from Base91.
        -------------------------------
        
        This is an implementation of Joachim Henkes method to
        encode binary data as ASCII characters -> basE91
        http://base91.sourceforge.net/

        As this method requires to split the bytes, the default
        conversion class "BaseConverter" is not used in this case.
        (Requires "Utils")
    */
    constructor(...args) {
        /*
            The default charset gets initialized, as well as
            some utilities.
        */

        this.byteOrder = "BE";

        this.charsets = {
            default: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\""
        };

        // predefined settings
        this.littleEndian = false;
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

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    encode(input, ...args) {
        /* 
            Encode from string or bytes to base92.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "default"   :  default charset 
        */
       
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        const inputBytes = this.utils.smartInput.toBytes(input, settings.signed, settings.littleEndian)[0];
  
        // As this base representation splits the bytes
        // the read bits need to be stores somewhere. 
        // This is done in "bitCount". "n", similar to 
        // other solutions here, holds the integer which
        // is converted to the desired base.

        let bitCount = 0;
        let n = 0;
        let output = "";

        // Shortcut
        const chars = this.charsets[settings.version];

        inputBytes.forEach(byte => {
            //n = n + byte * 2^bitcount;
            n += (byte << bitCount);

            // Add 8 bits forEach byte
            bitCount += 8;
            
            // If the count exceeds 13 bits, base convert the
            // current frame.

            if (bitCount > 13) {

                // Set bit amount "count" to 13, check the
                // remainder of n % 2^13. If it is 88 or 
                // lower. Take one more bit from the stream
                // and calculate the remainder for n % 2^14.

                let count = 13;
                let rN = n % 8192;

                if (rN < 89) {
                    count = 14;
                    rN = n % 16384;
                }

                // Remove 13 or 14 bits from the integer,
                // decrease the bitCount by the same amount.
                n >>= count;
                bitCount -= count;
                
                // Calculate quotient and remainder from
                // the before calculated remainder of n 
                // -> "rN"
                let q, r;
                [q, r] = this.divmod(rN, 91);

                // Lookup the corresponding characters for
                // "r" and "q" in the set, append it to the 
                // output string.
                output = `${output}${chars[r]}${chars[q]}`;
            }
        });
        
        // If the bitCount is not zero at the end,
        // calculate quotient and remainder of 91
        // once more.
        if (bitCount) {
            let q, r;
            [q, r] = this.divmod(n, 91);

            // The remainder is concatenated in any case
            output = output.concat(chars[r]);

            // The quotient is also appended, but only
            // if the bitCount still has the size of a byte
            // or n can still represent 91 conditions.
            if (bitCount > 7 || n > 90) {
                output = output.concat(chars[q]);
            }
        }
        
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base91 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base91-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "default"   :  sets the used charset to this variant
        */

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);

        // Make it a string, whatever goes in
        input = String(input);

        let l = input.length;

        // For starters leave the last char behind
        // if the length of the input string is odd.

        let odd = false;
        if (l % 2) {
            odd = true;
            l--;
        }

        // Set again integer n for base conversion.
        // Also initialize a bitCount(er)

        let n = 0;
        let bitCount = 0;
        const chars = this.charsets[settings.version];
        
        // Initialize an ordinary array
        const b256Array = new Array();
        
        // Walk through the string in steps of two
        // (aka collect remainder- and quotient-pairs)
        for (let i=0; i<l; i+=2) {

            // Calculate back the remainder of the integer "n"
            const rN = chars.indexOf(input[i]) + chars.indexOf(input[i+1]) * 91;
            n = (rN << bitCount) + n;
            bitCount += (rN % 8192 > 88) ? 13 : 14;

            // calculate back the individual bytes (base256)
            do {
                b256Array.push(n % 256);
                n >>= 8;
                bitCount -= 8;
            } while (bitCount > 7);
        }

        // Calculate the last byte if the input is odd
        // and add it
        if (odd) {
            const lastChar = input.charAt(l);
            const rN = chars.indexOf(lastChar);
            b256Array.push(((rN << bitCount) + n) % 256);
        }

        const output = Uint8Array.from(b256Array);

        // Return the output
        return this.utils.smartOutput.compile(output, settings.outputType);
    }

    divmod (x, y) {
        return [Math.floor(x/y), x%y];
    }
}

export { Base91 };
