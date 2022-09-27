var Ecoji = (function () {
    'use strict';

    /**
     * Simple Input Handler.
     * --------------------
     * Accepts only bytes eg. TypedArray, ArrayBuffer,
     * DataView, also a regular array (filled with integers)
     * is possible.
     */
    class BytesInput {
        static toBytes(input) {
            if (ArrayBuffer.isView(input)) {
                input = input.buffer;
            } 
            return [new Uint8Array(input), false, "bytes"];
        }
    }

    /**
     * Simple Output Handler.
     * ---------------------
     * Returns bytes in the form of:
     *  - ArrayBuffer
     *  - Uint8Array
     *  - DataView 
     */
    class BytesOutput {

        static get typeList() {
            return [
                "buffer",
                "bytes",
                "uint8",
                "view"
            ];
        }

        static getType(type) {
            if (!BytesOutput.typeList.includes(type)) {
                throw new TypeError(`Unknown output type: '${type}'`);
            }
            return type;
        }

        static compile(Uint8ArrayOut, type) {
            type = BytesOutput.getType(type);
            let compiled;

            if (type === "buffer") {
                compiled = Uint8ArrayOut.buffer;
            } 

            else if (type === "view") {
                compiled = new DataView(Uint8ArrayOut.buffer);
            }

            else {
                compiled = Uint8ArrayOut;
            }
        
            return compiled;
        }
    }


    /**
     * Advanced Input Handler.
     * ----------------------
     * Accepts almost every Input and converts it
     * into an Uint8Array (bytes).
     */
    class SmartInput {

        static makeDataView(byteLen) {
            const buffer = new ArrayBuffer(byteLen);
            return new DataView(buffer);
        }

        static floatingPoints(input, littleEndian=false) {
            const view = this.makeDataView(8);
            view.setFloat64(0, input, littleEndian);
            return view;
        }

        static numbers(input, littleEndian=false) {

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


        static bigInts(input, littleEndian=false) {
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


        static toBytes(input, settings) {

            let inputUint8;
            let negative = false;
            let type = "bytes";
            
            // Buffer:
            if (input instanceof ArrayBuffer) {
                inputUint8 = new Uint8Array(input.slice());
            }

            // TypedArray or DataView:
            else if (ArrayBuffer.isView(input)) {
                inputUint8 = new Uint8Array(input.buffer.slice());
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
                    throw new TypeError("Cannot proceed. Input is Infinity.");
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
                    collection.push(...this.toBytes(elem, settings)[0]);
                }
                inputUint8 = Uint8Array.from(collection);
            }

            else {
                throw new TypeError("The provided input type can not be processed.");
            }

            return [inputUint8, negative, type];
        }
    }

    /** 
     * Advanced Output Handler.
     * ----------------------- 
     * This Output handler makes it possible to
     * convert an Uint8Array (bytes) into a desired
     * format of a big variety.
     * 
     * The default output is an ArrayBuffer.
     */
    class SmartOutput {

        static get typeList() {
            return [
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
        }

        static getType(type) {
            if (!this.typeList.includes(type)) {
                throw new TypeError(`Unknown output type: '${type}'`);
            }
            return type;
        }

        static makeTypedArrayBuffer(Uint8ArrayOut, bytesPerElem, littleEndian, negative) {
            
            const len = Uint8ArrayOut.byteLength;
            const delta = (bytesPerElem - (Uint8ArrayOut.byteLength % bytesPerElem)) % bytesPerElem;
            const newLen = len + delta;
            
            // if the array is negative and the len is gt 1
            // fill the whole array with 255
            const fillVal = (negative && len > 1) ? 255 : 0;

            let newArray = Uint8ArrayOut;

            if (delta) {
                newArray = new Uint8Array(newLen);
                newArray.fill(fillVal);
                
                const offset = (littleEndian) ? 0 : delta;
                newArray.set(Uint8ArrayOut, offset);
            }


            return newArray.buffer;
        }

        static makeTypedArray(inArray, type, littleEndian, negative) {
            let outArray;

            if (type === "int16" || type === "uint16") {

                const buffer = this.makeTypedArrayBuffer(inArray, 2, littleEndian, negative);
                outArray = (type === "int16") ? new Int16Array(buffer) : new Uint16Array(buffer);

            } else if (type === "int32" || type === "uint32" || type === "float32") {

                const buffer = this.makeTypedArrayBuffer(inArray, 4, littleEndian, negative);
                
                if (type === "int32") {
                    outArray = new Int32Array(buffer);
                } else if (type === "uint32") {
                    outArray = new Uint32Array(buffer);
                } else {
                    outArray = new Float32Array(buffer);
                }

            } else if (type === "bigint64" || type === "biguint64" || type === "float64") {
                
                const buffer = this.makeTypedArrayBuffer(inArray, 8, littleEndian, negative);
                
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

        static compile(Uint8ArrayOut, type, littleEndian=false, negative=false) {
            type = this.getType(type);
            let compiled;

            // If the array is negative (which is only
            // true for signed encoding) get the positive
            // decimal number first and feed it with a 
            // negative sign to SmartInput to construct
            // the unsigned output which is not shortened.

            if (negative) {
                let n;
                if (type.match(/^float/)) {
                    n = -(this.compile(Uint8ArrayOut, "float_n", littleEndian));
                } else {
                    n = -(this.compile(Uint8ArrayOut, "uint_n", littleEndian));
                }
                if (type === "float_n") {
                    return n;
                }
                Uint8ArrayOut = SmartInput.toBytes(n, {littleEndian, numberMode: false, signed: false})[0];
            }

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

                // If the input consists of only one byte, expand it
                if (Uint8ArrayOut.length === 1) {
                    const uint16Buffer = this.makeTypedArrayBuffer(Uint8ArrayOut, 2, littleEndian, negative);
                    Uint8ArrayOut = new Uint8Array(uint16Buffer);
                }
                
                if (littleEndian) {
                    Uint8ArrayOut.reverse();
                }

                // calculate a unsigned big integer
                let n = 0n;
                Uint8ArrayOut.forEach((b) => n = (n << 8n) + BigInt(b));

                // convert to signed int if requested 
                if (type !== "uint_n") {
                    n = BigInt.asIntN(Uint8ArrayOut.length*8, n);
                }
                
                // convert to regular number if possible (and no bigint was requested)
                if (type !== "bigint_n" && n >= Number.MIN_SAFE_INTEGER && n <= Number.MAX_SAFE_INTEGER) {                
                    compiled = Number(n);
                } else {
                    compiled = n;
                }
            } 
            
            else if (type === "float_n") {

                if (Uint8ArrayOut.length <= 4) {
                    
                    let array;
                    if (Uint8ArrayOut.length === 4) {
                        array = Uint8ArrayOut;
                    } else {
                        array = this.makeTypedArray(Uint8ArrayOut, "float32", false, negative);
                    }

                    const view = new DataView(array.buffer);
                    compiled = view.getFloat32(0, littleEndian);
                
                }
                
                else if (Uint8ArrayOut.length <= 8) {
                    
                    let array;
                    if (Uint8ArrayOut.length === 8) {
                        array = Uint8ArrayOut;
                    } else {
                        array = this.makeTypedArray(Uint8ArrayOut, "float64", false, negative);
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
                compiled = this.makeTypedArray(Uint8ArrayOut, type, littleEndian, negative);
            } 

            return compiled;
        }
    }

    const DEFAULT_INPUT_HANDLER = SmartInput;
    const DEFAULT_OUTPUT_HANDLER = SmartOutput;

    class SignError extends TypeError {
        constructor() {
            super("The input is signed but the converter is not set to treat input as signed.\nYou can pass the string 'signed' to the decode function or when constructing the converter.");
            this.name = "SignError";
        }
    }
      

    /**
     * Utilities for every BaseEx class.
     * --------------------------------
     * Requires IO Handlers
     */
    class Utils {

        constructor(main, addCharsetTools=true) {

            // Store the calling class in this.root
            // for accessability.
            this.root = main;
            
            // set specific args object for converters
            this.converterArgs = {};

            // If charsets are uses by the parent class,
            // add extra functions for the user.

            if ("charsets" in main && addCharsetTools) this.#charsetUserToolsConstructor();
        }

        setIOHandlers(inputHandler=DEFAULT_INPUT_HANDLER, outputHandler=DEFAULT_OUTPUT_HANDLER) {
            this.inputHandler = inputHandler;
            this.outputHandler = outputHandler;
        }


        /**
         * Constructor for the ability to add a charset and 
         * change the default version.
         */
        #charsetUserToolsConstructor() {

            /**
             * Save method to add a charset.
             * @param {string} name - "Charset name."
             * @param {[string|set|array]} - "Charset"
             */
            this.root.addCharset = (name, charset, padChars="", info=true) => {
                // TODO: add padding chars
                    
                if (typeof name !== "string") {
                    throw new TypeError("The charset name must be a string.");
                }

                // Get the appropriate length for the charset
                // from the according converter
                
                const setLen = this.root.converter.radix;
                let inputLen = setLen;

                if (typeof charset === "string") {
                    charset = [...charset];
                }
                
                if (Array.isArray(charset)) {
                    
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
                    charset = [...charset];
                    this.root.charsets[name] = charset;
                    if (info) {
                        console.info(`New charset '${name}' was added and is ready to use`);
                    }
                } else if (inputLen === setLen) {
                    throw new Error("There were repetitive chars found in your charset. Make sure each char is unique.");
                } else {
                    throw new Error(`The length of the charset must be ${setLen}.`);
                }
            };

            // Save method (argument gets validated) to 
            // change the default version.
            this.root.setDefaultCharset = (version) => {
                ({version } = this.validateArgs([version]));
                this.root.version = version;
            };
        }

        /**
         * Argument lists for error messages.
         * @param {string[]} args 
         * @returns string - Arguments joined as a string. 
         */
        makeArgList(args) {
            return args.map(s => `'${s}'`).join(", ");
        }

        /**
         * Removes all padded zeros a the start of the string,
         * adds a "-" if value is negative.
         * @param {string} output - Former output.
         * @param {boolean} negative - Indicates a negative value if true.
         * @returns {string} - Output without zero padding and a sign if negative.
         */
        toSignedStr(output, negative) {

            output = output.replace(/^0+(?!$)/, "");

            if (negative) {
                output = "-".concat(output);
            }

            return output;
        }

        /**
         * Analyzes the input for a negative sign.
         * If a sign is found, it gets removed but
         * negative bool gets true;
         * @param {string} input - Input number as a string. 
         * @returns {array} - Number without sign and negativity indication bool.
         */
        extractSign(input) {
            let negative = false;
            if (input[0] === "-") {
                negative = true;
                input = input.slice(1);
            }

            return [input, negative];
        }

        /**
         * All possible error messages for invalid arguments,
         * gets adjusted according to the converter settings.
         * @param {string} arg - Argument. 
         * @param {string[]} versions - Charset array. 
         * @param {string[]} outputTypes - Array of output types. 
         * @param {boolean} initial - Indicates if the arguments where passed during construction. 
         */
        invalidArgument(arg, versions, outputTypes, initial) {
            const loopConverterArgs = () => Object.keys(this.converterArgs).map(
                key => this.converterArgs[key].map(
                    keyword => `'${keyword}'`
                ).
                join(" and ")
            ).
            join("\n   - ");

            const IOHandlerHint = (initial) ? "\n * valid declarations for IO handlers are 'bytesOnly', 'bytesIn', 'bytesOut'" : ""; 
            const signedHint = (this.root.isMutable.signed) ? "\n * pass 'signed' to disable, 'unsigned' to enable the use of the twos's complement for negative integers" : "";
            const endiannessHint = (this.root.isMutable.littleEndian) ? "\n * 'be' for big , 'le' for little endian byte order for case conversion" : "";
            const padHint = (this.root.isMutable.padding) ? "\n * pass 'pad' to fill up, 'nopad' to not fill up the output with the particular padding" : "";
            const caseHint = (this.root.isMutable.upper) ? "\n * valid args for changing the encoded output case are 'upper' and 'lower'" : "";
            const outputHint = `\n * valid args for the output type are ${this.makeArgList(outputTypes)}`;
            const versionHint = (versions) ? `\n * the options for version (charset) are: ${this.makeArgList(versions)}` : "";
            const integrityHint = "\n * valid args for integrity check are : 'integrity' and 'nointegrity'";
            const numModeHint = "\n * 'number' for number-mode (converts every number into a Float64Array to keep the natural js number type)";
            const converterArgsHint = Object.keys(this.converterArgs).length ? `\n * converter specific args:\n   - ${loopConverterArgs()}` : "";
            
            throw new TypeError(`'${arg}'\n\nInput parameters:${IOHandlerHint}${signedHint}${endiannessHint}${padHint}${caseHint}${outputHint}${versionHint}${integrityHint}${numModeHint}${converterArgsHint}\n\nTraceback:`);
        }


        /**
         * Test if provided arguments are in the argument list.
         * Everything gets converted to lowercase and returned.
         * @param {string[]} args - Passed arguments. 
         * @param {boolean} initial - Indicates if the arguments where passed during construction.  
         * @returns {Object} - Converter settings object.
         */
        validateArgs(args, initial=false) {
            
            // default settings
            const parameters = {
                integrity: this.root.integrity,
                littleEndian: this.root.littleEndian,
                numberMode: this.root.numberMode,
                outputType: this.root.outputType,
                padding: this.root.padding,
                signed: this.root.signed,
                upper: this.root.upper,
                version: this.root.version
            };

            // add any existing converter specific args
            for (const param in this.converterArgs) {
                parameters[param] = this.root[param];
            }

            // if no args are provided return the default settings immediately
            if (!args.length) {

                // if initial call set default IO handlers
                if (initial) {
                    this.setIOHandlers();
                }
                
                return parameters;
            }

            // Helper function to test the presence of a 
            // particular arg. If found, true is returned
            // and it gets removed from the array.
            const extractArg = (arg) => {
                if (args.includes(arg)) {
                    args.splice(args.indexOf(arg), 1);
                    return true;
                }
                return false;
            };

            // set available versions and extra arguments
            const versions = Object.prototype.hasOwnProperty.call(this.root, "charsets") ? Object.keys(this.root.charsets) : [];
            const extraArgList = {
                integrity: ["nointegrity", "integrity"],
                littleEndian: ["be", "le"],
                padding: ["nopad", "pad"],
                signed: ["unsigned", "signed"],
                upper: ["lower", "upper"],
                ...this.converterArgs
            };

            // if initial, look for IO specifications
            if (initial) {
                if (extractArg("bytes_only")) {
                    this.setIOHandlers(BytesInput, BytesOutput);
                } else {
                    const inHandler = (extractArg("bytes_in")) ? BytesInput : DEFAULT_INPUT_HANDLER;
                    const outHandler = (extractArg("bytes_out")) ? BytesOutput : DEFAULT_OUTPUT_HANDLER;
                    this.setIOHandlers(inHandler, outHandler);
                }
            }

            // set valid output types
            const outputTypes = this.outputHandler.typeList;

            // test for special "number" keyword
            if (extractArg("number")) {
                parameters.numberMode = true;
                parameters.outputType = "float_n";
            }

            // walk through the remaining arguments
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
                        this.invalidArgument(arg, versions, outputTypes, initial);
                    }
                }
            });

            // If padding and signed are true, padding
            // is set to false and a warning is getting
            // displayed.
            if (parameters.padding && parameters.signed) {
                parameters.padding = false;
                console.warn("Padding was set to false due to the signed conversion.");
            }
            
            // overwrite the default parameters for the initial call
            if (initial) {
                for (const param in parameters) {
                    this.root[param] = parameters[param];
                }
            }

            return parameters;
        }

        /**
         * A TypeError specifically for sign errors.
         */
        signError() {
            throw new SignError();
        }

    }

    /**
     * BaseEx Base Converter.
     * ---------------------
     * Core class for base-conversion and substitution
     * based on a given charset.
     */
    class BaseConverter {

        /**
         * BaseEx BaseConverter Constructor.
         * @param {number} radix - Radix for the converter.
         * @param {number} [bsEnc] - Block Size (input bytes grouped by bs) for encoding (if zero the integer has no limitation).
         * @param {number} [bsDec] - Block Size (input bytes grouped by bs) for decoding (if zero the integer has no limitation).
         * @param {number} [decPadVal=0] - Value used for padding during decoding.
         */
        constructor(radix, bsEnc=null, bsDec=null, decPadVal=0) {
            
            this.radix = radix;

            if (bsEnc !== null && bsDec !== null) {
                this.bsEnc = bsEnc;
                this.bsDec = bsDec;
            } else {
                [this.bsEnc, this.bsDec] = this.constructor.guessBS(radix);
            }

            this.decPadVal = decPadVal;
        }

        /**
         * Experimental feature!
         * Calc how many bits are needed to represent
         * 256 conditions (1 byte). If the radix is 
         * less than 8 bits, skip that part and use
         * the radix value directly.
         */
        static guessBS(radix) {

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


        /**
         * BaseEx Universal Base Encoding.
         * @param {{ buffer: ArrayBufferLike; byteLength: any; byteOffset: any; length: any; BYTES_PER_ELEMENT: 1; }} inputBytes - Input as Uint8Array.
         * @param {string} charset - The charset used for conversion.
         * @param {boolean} littleEndian - Byte order, little endian bool.
         * @param {function} replacer - Replacer function can replace groups of characters during encoding.
         * @returns {number[]} - Output string and padding amount. 
         */
        encode(inputBytes, charset, littleEndian=false, replacer=null) {

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

            // If the radix is 10, make a shortcut here by converting
            // all bytes into the decimal number "n" and return the
            // result as a string.
            if (this.radix === 10) {
                let n = 0n;
                
                for (let i=0; i<bs; i++) {
                    n = (n << 8n) + BigInt(byteArray[i]);
                }
                return [n.toString(), 0];
            }
            
            // For any other radix, convert the subarray into a 
            // bs*8-bit binary number "n".
            // The blocksize defines the size of the corresponding
            // integer. Dependent on the blocksize this may lead  
            // to values, that are higher than the "MAX_SAFE_INTEGER",
            // therefore BigInts are used.
            for (let i=0, l=byteArray.length; i<l; i+=bs) {
      
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


        /**
         * BaseEx Universal Base Decoding.
         * Decodes to a string of the given radix to a byte array.
         * @param {string} inputBaseStr - Base as string (will also get converted to string but can only be used if valid after that).
         * @param {string[]} charset - The charset used for conversion.
         * @param {string[]} padSet - Padding characters for integrity check.
         * @param {boolean} integrity - If set to false invalid character will be ignored.
         * @param {boolean} littleEndian - Byte order, little endian bool.
         * @returns {{ buffer: ArrayBufferLike; byteLength: any; byteOffset: any; length: any; BYTES_PER_ELEMENT: 1; }} - The decoded output as Uint8Array.
         */
        decode(inputBaseStr, charset, padSet=[], integrity=true, littleEndian=false) {

            // Convert each char of the input to the radix-integer
            // (this becomes the corresponding index of the char
            // from the charset). Every char, that is not found in
            // in the set is getting ignored.

            if (!inputBaseStr) {
                return new Uint8Array(0);
            }

        
            let bs = this.bsDec;
            const byteArray = new Array();

            // Array Charset
            if (Array.isArray(charset)) {
                [...inputBaseStr].forEach(c => {
                    const index = charset.indexOf(c);
                    if (index > -1) { 
                        byteArray.push(index);
                    } else if (integrity && padSet.indexOf(c) === -1) {
                        throw new TypeError(`Invalid input. Character: '${c}' is not part of the charset.`)
                    }
                });
            }

            // Object Charset
            else {
                [...inputBaseStr].forEach(c => {
                    if (c in charset) {
                        byteArray.push(charset[c]);
                    } else if (integrity && !(c in padSet)) {
                        throw new TypeError(`Invalid input. Character: '${c}' is not part of the charset.`)
                    }
                });
            }

            
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
                if (b256Array.length > 1) {
                
                    // remove all zeros from the start of the array
                    while (!b256Array[0]) {
                        b256Array.shift();  
                    }
                    
                    if (!b256Array.length) {
                        b256Array.push(0);
                    }

                    b256Array.reverse();
                }
            } else if (this.bsDec) {
                const padding = this.padChars(padChars);

                // remove all bytes according to the padding
                b256Array.splice(b256Array.length-padding);
            }

            return Uint8Array.from(b256Array);
        }


        /**
         * Calculates the amount of bytes, which are padding bytes. 
         * @param {number} charCount - Pass the amount of characters, which were added during encoding. 
         * @returns {number} - Amount of padding characters.
         */
        padBytes(charCount) {
            return Math.floor((charCount * this.bsDec) / this.bsEnc);
        }

        /**
         * Calculates the amount of bytes which can get removed
         * from the decoded output bytes. 
         * @param {number} byteCount - Added bytes for padding 
         * @returns {number} - Amount of output bytes to be removed.
         */
        padChars(byteCount) {
            return Math.ceil((byteCount * this.bsEnc) / this.bsDec);
        }


        /**
         * Calculates the power for the current base
         * according to the given position as BigInt.
         * 
         * @param {number} n - Position 
         * @returns {BigInt} - BigInt power value
         */
        pow(n) {
            return BigInt(this.radix)**BigInt(n);
        }


        /**
         * Divmod function, which returns the results as
         * an array of two BigInts.
         * @param {*} x - Dividend
         * @param {*} y - Divisor
         * @returns {number[]} - [Quotient, Remainder]
         */
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
     * Requires BaseEx Utils
     */
    class BaseTemplate {

        /**
         * BaseEx BaseTemplate Constructor.
         * @param {boolean} appendUtils - If set to false, the utils are not getting used. 
         */
        constructor(appendUtils=true) {

            // predefined settings
            this.charsets = {};
            this.hasSignedMode = false;
            this.integrity = true;
            this.littleEndian = false;
            this.numberMode = false;
            this.outputType = "buffer";
            this.padding = false;
            this.padChars = {
                default: ""
            }; 
            this.signed = false;
            this.upper = null;
            if (appendUtils) this.utils = new Utils(this);
            this.version = "default";
            
            // list of allowed/disallowed args to change
            this.isMutable = {
                integrity: true,
                littleEndian: false,
                padding: false,
                signed: false,
                upper: false,
            };
        }

        /**
         * BaseEx Generic Encoder.
         * @param {*} input - Any input the used byte converter allows.
         * @param {function} [replacerFN] - Replacer function, which is passed to the encoder. 
         * @param {function} [postEncodeFN] - Function, which is executed after encoding.
         * @param  {...any} args - Converter settings.
         * @returns {string} - Base encoded string.
         */
        encode(input, replacerFN, postEncodeFN, ...args) {

            // apply settings
            const settings = this.utils.validateArgs(args);
            
            // handle input
            let inputBytes, negative, type;
            [inputBytes, negative, type] = this.utils.inputHandler.toBytes(input, settings);

            // generate replacer function if given
            let replacer = null;
            if (replacerFN) {
                replacer = replacerFN(settings);
            }
            
            // Convert to base string
            let [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[settings.version], settings.littleEndian, replacer);

            // set sign if requested
            if (settings.signed) {
                output = this.utils.toSignedStr(output, negative);
            }

            // set upper case if requested
            if (settings.upper) {
                output = output.toUpperCase();
            }

            // modify the output based on a given function (optionally)
            if (postEncodeFN) {
                output = postEncodeFN({ inputBytes, output, settings, zeroPadding, type });
            }

            return output;
        }


        /**
         * BaseEx Generic Decoder.
         * @param {string} input - Base String.
         * @param {function} [preDecodeFN] - Function, which gets executed before decoding. 
         * @param {function} [postDecodeFN] - Function, which gets executed after decoding
         * @param  {...any} args - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, preDecodeFN, postDecodeFN, ...args) {
        
            // apply settings
            const settings = this.utils.validateArgs(args);

            // ensure a string input
            input = String(input);

            // set negative to false for starters
            let negative = false;
            
            // Test for a negative sign if converter supports it
            if (this.hasSignedMode) {
                [ input, negative ] = this.utils.extractSign(input);   
                
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
            let output = this.converter.decode(
                input,
                this.charsets[settings.version],
                this.padChars[settings.version],
                settings.integrity,
                settings.littleEndian
            );

            // Run post decode function if provided
            if (postDecodeFN) {
                output = postDecodeFN({ input, output, settings });
            }

            return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
        }
    }

    /**
     * [BaseEx|Ecoji Converter]{@link https://github.com/UmamiAppearance/BaseExJS/src/converters/ecoji.js}
     *
     * @version 0.5.0
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license GPL-3.0 OR Apache-2.0
     * @see https://github.com/keith-turner/ecoji
     */

    /**
     * BaseEx Ecoji (a Base 1024) Converter.
     * ------------------------------------
     * This an implementation of the Ecoji converter.
     * Various input can be converted to an Ecoji string
     * or an Ecoji string can be decoded into various 
     * formats. Versions 1 and 2 are supported.
     * This variant pretty much follows the standard
     * (at least in its results, the algorithm is very
     * different from the original).
     * A deviation is the handling of padding. The last
     * pad char can be trimmed for both versions and
     * additionally ommitted completely if integrity
     * checks are disabled.
     */
    class Ecoji extends BaseTemplate {

        #revEmojiVersion = {};
        #padRegex = null;

        /**
         * BaseEx Ecoji Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();

            // charsets
            this.charsets.emojis_v1 = [..."🀄🃏🅰🅱🅾🅿🆎🆑🆒🆓🆔🆕🆖🆗🆘🆙🆚🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿🈁🈂🈚🈯🈲🈳🈴🈵🈶🈷🈸🈹🈺🉐🉑🌀🌁🌂🌃🌄🌅🌆🌇🌈🌉🌊🌋🌌🌍🌎🌏🌐🌑🌒🌓🌔🌕🌖🌗🌘🌙🌚🌛🌜🌝🌞🌟🌠🌡🌤🌥🌦🌧🌨🌩🌪🌫🌬🌭🌮🌯🌰🌱🌲🌳🌴🌵🌶🌷🌸🌹🌺🌻🌼🌽🌾🌿🍀🍁🍂🍃🍄🍅🍆🍇🍈🍉🍊🍋🍌🍍🍎🍏🍐🍑🍒🍓🍔🍕🍖🍗🍘🍙🍚🍛🍜🍝🍞🍟🍠🍡🍢🍣🍤🍥🍦🍧🍨🍩🍪🍫🍬🍭🍮🍯🍰🍱🍲🍳🍴🍵🍶🍷🍸🍹🍺🍻🍼🍽🍾🍿🎀🎁🎂🎃🎄🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🎖🎗🎙🎚🎛🎞🎟🎠🎡🎢🎣🎤🎥🎦🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏳🏴🏵🏷🏸🏹🏺🏻🏼🏽🏾🏿🐀🐁🐂🐃🐄🐅🐆🐇🐈🐉🐊🐋🐌🐍🐎🐏🐐🐑🐒🐓🐔🐕🐖🐗🐘🐙🐚🐛🐜🐝🐞🐟🐠🐡🐢🐣🐤🐥🐦🐧🐨🐩🐪🐫🐬🐭🐮🐯🐰🐱🐲🐳🐴🐵🐶🐷🐸🐹🐺🐻🐼🐽🐾🐿👀👁👂👃👄👅👆👇👈👉👊👋👌👍👎👏👐👑👒👓👔👕👖👗👘👙👚👛👜👝👞👟👠👡👢👣👤👥👦👧👨👩👪👫👬👭👮👯👰👱👲👳👴👵👶👷👸👹👺👻👼👽👾👿💀💁💂💃💄💅💆💇💈💉💊💋💌💍💎💏💐💑💒💓💔💕💖💗💘💙💚💛💜💝💞💟💠💡💢💣💤💥💦💧💨💩💪💫💬💭💮💯💰💱💲💳💴💵💶💷💸💹💺💻💼💽💾💿📀📁📂📃📄📅📆📇📈📉📊📋📌📍📎📏📐📒📓📔📕📖📗📘📙📚📛📜📝📞📟📠📡📢📣📤📥📦📧📨📩📪📫📬📭📮📯📰📱📲📳📴📵📶📷📸📹📺📻📼📽📿🔀🔁🔂🔃🔄🔅🔆🔇🔈🔉🔊🔋🔌🔍🔎🔏🔐🔑🔒🔓🔔🔕🔖🔗🔘🔙🔚🔛🔜🔝🔞🔟🔠🔡🔢🔣🔤🔥🔦🔧🔨🔩🔪🔫🔬🔭🔮🔯🔰🔱🔲🔳🔴🔵🔶🔷🔸🔹🔺🔻🔼🔽🕉🕊🕋🕌🕍🕎🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧🕯🕰🕳🕴🕵🕶🕷🕸🕹🕺🖇🖊🖋🖌🖍🖐🖕🖖🖤🖥🖨🖱🖲🖼🗂🗃🗄🗑🗒🗓🗜🗝🗞🗡🗣🗨🗯🗳🗺🗻🗼🗽🗾🗿😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳😴😵😶😷😸😹😺😻😼😽😾😿🙀🙁🙂🙃🙄🙅🙆🙇🙈🙉🙊🙌🙍🙎🙏🚀🚁🚂🚃🚄🚅🚆🚇🚈🚉🚊🚋🚌🚍🚎🚏🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🚚🚛🚜🚝🚞🚟🚠🚡🚢🚣🚤🚥🚦🚧🚨🚩🚪🚫🚬🚭🚮🚯🚰🚱🚲🚳🚴🚵🚶🚷🚸🚹🚺🚻🚼🚽🚾🚿🛀🛁🛂🛃🛄🛅🛋🛌🛍🛎🛏🛐🛑🛒🛠🛡🛢🛣🛤🛥🛩🛫🛬🛰🛳🛴🛵🛶🛷🛸🛹🤐🤑🤒🤓🤔🤕🤖🤗🤘🤙🤚🤛🤜🤝🤞🤟🤠🤡🤢🤣🤤🤥🤦🤧🤨🤩🤪🤫🤬🤭🤮🤯🤰🤱🤲🤳🤴🤵🤶🤷🤸🤹🤺🤼🤽🤾🥀🥁🥂🥃🥄🥅🥇🥈🥉🥊🥋🥌🥍🥎🥏🥐🥑🥒🥓🥔🥕🥖🥗🥘🥙🥚🥛🥜🥝🥞🥟🥠🥡🥢🥣🥤🥥🥦🥧🥨🥩🥪🥫🥬🥭🥮🥯🥰🥳🥴🥵🥶🥺🥼🥽🥾🥿🦀🦁🦂🦃🦄🦅🦆🦇🦈🦉🦊🦋🦌🦍🦎🦏🦐🦑🦒🦓🦔🦕🦖🦗🦘🦙🦚🦛🦜🦝🦞🦟🦠🦡🦢🦰🦱🦲🦳🦴🦵🦶🦷🦸🦹🧀🧁🧂🧐🧑🧒🧓🧔🧕"];
            this.padChars.emojis_v1 = [ "⚜", "🏍", "📑", "🙋", "☕" ];

            this.charsets.emojis_v2 = [..."🀄🃏⏰⏳☔♈♉♊♋♌♍♎♏♐♑♒♓♿⚓⚡⚽⚾⛄⛅⛎⛔⛪⛲⛳⛵⛺⛽✊✋✨⭐🛕🛖🛗🛝🛞🛟🛺🈁🛻🤌🤏🤿🥱🥲🥸🥹🥻🦣🦤🦥🦦🦧🌀🌁🌂🌃🌄🌅🌆🌇🌈🌉🌊🌋🌌🌍🌎🌏🌐🌑🌒🌓🌔🌕🌖🌗🌘🌙🌚🌛🌜🌝🌞🌟🌠🦨🦩🦪🦫🦬🦭🦮🦯🦺🦻🌭🌮🌯🌰🌱🌲🌳🌴🌵🦼🌷🌸🌹🌺🌻🌼🌽🌾🌿🍀🍁🍂🍃🍄🍅🍆🍇🍈🍉🍊🍋🍌🍍🍎🍏🍐🍑🍒🍓🍔🍕🍖🍗🍘🍙🍚🍛🍜🍝🍞🍟🍠🍡🍢🍣🍤🍥🍦🍧🍨🍩🍪🍫🍬🍭🍮🍯🍰🍱🍲🍳🍴🍵🍶🍷🍸🍹🍺🍻🍼🦽🍾🍿🎀🎁🎂🎃🎄🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🦾🦿🧃🧄🧅🧆🧇🎠🎡🎢🎣🎤🎥🧈🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🧉🧊🧋🏏🏐🏑🏒🏓🧌🧍🧎🧏🧖🧗🧘🧙🧚🧛🧜🧝🏠🏡🏢🏣🏤🏥🏦🧞🏨🏩🏪🏫🏬🏭🏮🏯🏰🧟🏴🧠🧢🏸🏹🏺🧣🧤🧥🧦🧧🐀🐁🐂🐃🐄🐅🐆🐇🐈🐉🐊🐋🐌🐍🐎🐏🐐🐑🐒🐓🐔🐕🐖🐗🐘🐙🐚🐛🐜🐝🐞🐟🐠🐡🐢🐣🐤🐥🐦🐧🐨🐩🐪🐫🐬🐭🐮🐯🐰🐱🐲🐳🐴🐵🐶🐷🐸🐹🐺🐻🐼🐽🐾🧨👀🧩👂👃👄👅👆👇👈👉👊👋👌👍👎👏👐👑👒👓👔👕👖👗👘👙👚👛👜👝👞👟👠👡👢👣👤👥👦👧👨👩👪👫👬👭👮👯👰👱👲👳👴👵👶👷👸👹👺👻👼👽👾👿💀💁💂💃💄💅💆💇💈💉💊💋💌💍💎💏💐💑💒💓💔💕💖💗💘💙💚💛💜💝💞💟💠💡💢💣💤💥💦💧💨💩💪💫💬💭💮💯💰💱💲💳💴💵💶💷💸🧪💺💻💼💽💾💿📀🧫📂📃📄🧬📆📇📈📉📊📋📌📍📎📏📐📒📓📔📕📖📗📘📙📚📛📜📝📞📟📠📡📢📣📤📥📦📧📨📩📪📫📬📭📮📯📰📱📲📳🧭📵📶📷📸📹📺📻📼🧮📿🧯🧰🧱🧲🧳🔅🔆🔇🔈🔉🔊🔋🔌🔍🔎🔏🔐🔑🔒🔓🔔🔕🔖🔗🔘🧴🧵🧶🧷🧸🧹🧺🧻🧼🧽🧾🧿🔥🔦🔧🔨🔩🔪🔫🔬🔭🔮🔯🔰🔱🔲🔳🩰🩱🩲🩳🩴🩸🩹🩺🩻🩼🪀🪁🕋🕌🕍🕎🪂🪃🪄🪅🪆🪐🪑🪒🪓🪔🪕🪖🪗🪘🪙🪚🪛🪜🪝🪞🪟🪠🪡🪢🪣🪤🪥🪦🪧🪨🪩🪪🪫🕺🪬🪰🪱🪲🪳🪴🖕🖖🖤🪵🪶🪷🪸🪹🪺🫀🫁🫂🫃🫄🫅🫐🫑🫒🫓🫔🫕🫖🫗🗻🗼🗽🗾🗿😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳😴😵😶😷😸😹😺😻😼😽😾😿🙀🙁🙂🙃🙄🙅🙆🙇🙈🙉🙊🙌🙍🙎🙏🚀🚁🚂🚃🚄🚅🚆🚇🚈🚉🚊🚋🚌🚍🚎🚏🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🚚🚛🚜🚝🚞🚟🚠🚡🚢🚣🚤🚥🚦🚧🚨🚩🚪🚫🚬🚭🚮🚯🚰🚱🚲🚳🚴🚵🚶🚷🚸🚹🚺🚻🚼🚽🚾🚿🛀🛁🛂🛃🛄🛅🫘🛌🫙🫠🫡🛐🛑🛒🫢🫣🫤🫥🫦🫧🫰🛫🛬🫱🫲🛴🛵🛶🛷🛸🛹🤐🤑🤒🤓🤔🤕🤖🤗🤘🤙🤚🤛🤜🤝🤞🤟🤠🤡🤢🤣🤤🤥🤦🤧🤨🤩🤪🤫🤬🤭🤮🤯🤰🤱🤲🤳🤴🤵🤶🤷🤸🤹🤺🤼🤽🤾🥀🥁🥂🥃🥄🥅🥇🥈🥉🥊🥋🥌🥍🥎🥏🥐🥑🥒🥓🥔🥕🥖🥗🥘🥙🥚🥛🥜🥝🥞🥟🥠🥡🥢🥣🥤🥥🥦🥧🥨🥩🥪🥫🥬🥭🥮🥯🥰🥳🥴🥵🥶🥺🥼🥽🥾🥿🦀🦁🦂🦃🦄🦅🦆🦇🦈🦉🦊🦋🦌🦍🦎🦏🦐🦑🦒🦓🦔🦕🦖🦗🦘🦙🦚🦛🦜🦝🦞🦟🦠🦡🦢🫳🫴🫵🫶🦴🦵🦶🦷🦸🦹🧀🧁🧂🧐🧑🧒🧓🧔🧕"];
            this.padChars.emojis_v2 = [ "🥷", "🛼", "📑", "🙋", "☕" ];
            
            // init decoding particularites for the two versions
            this.#init();

            // converter
            this.converter = new BaseConverter(1024, 5, 4);

            // predefined settings
            this.padding = true;
            this.version = "emojis_v1";
            
            // mutable extra args
            this.isMutable.padding = true;
            this.isMutable.trim = true;

            // set trim option
            this.trim = null;
            this.utils.converterArgs.trim = ["notrim", "trim"];
            
            // apply user settings
            this.utils.validateArgs(args, true);

            if (this.trim === null) {
                this.trim = this.version === "emojis_v2";
            }
        }


        /**
         * Analyzes v1 and two charsets for equal and
         * non eqaul characters, to be able to decide
         * of which version the input for deoding is. 
         */
        #init() {

            // Stores all padding for a regex generation.
            const padAll = {};

            // Creates an object which holds all characters
            // of both versions. Unique chars for version one
            // are getting the version value "1", version two "2"
            // and overlaps "3". 
            const revEmojisAdd = (version, set) => {
                set.forEach((char) => {
                    if (char in this.#revEmojiVersion) {
                        this.#revEmojiVersion[char].version += version;
                    } else {
                        this.#revEmojiVersion[char] = { version };
                    }
                });
            };

            // This function adds a padding character of both
            // versions to the object, with additional information
            // about the padding type. In this process each uinique
            // padChar is also added to the "padAll" object. 
            const handlePadding = (version, set, type) => {
                set.forEach(padChar => {
                
                    if (padChar in padAll) {
                        this.#revEmojiVersion[padChar].version = 3;
                    } else {
                        this.#revEmojiVersion[padChar] = {
                            version,
                            padding: type
                        };
                        padAll[padChar] = type;
                    }    
                });
            };

            revEmojisAdd(1, this.charsets.emojis_v1);
            revEmojisAdd(2, this.charsets.emojis_v2);

            handlePadding(1, this.padChars.emojis_v1.slice(0, -1), "last");
            handlePadding(2, this.padChars.emojis_v2.slice(0, -1), "last");
            handlePadding(1, this.padChars.emojis_v1.slice(-1), "fill");
            handlePadding(2, this.padChars.emojis_v2.slice(-1), "fill");

            
            // Create an array of keys for the final regex
            const regexArray = [];

            for (const padChar in padAll) {
                if (padAll[padChar] === "last") {
                    regexArray.push(padChar);
                } else {
                    regexArray.push(`${padChar}+`);
                }
            }

            // create a regex obj for matching all pad chars 
            this.#padRegex = new RegExp(regexArray.join("|"), "g");
        }


        /**
         * BaseEx Ecoji Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Ecoji encoded string.
         */
        encode(input, ...args) {

            const applyPadding = (scope) => {

                let { output, settings, zeroPadding } = scope;
                const charset = this.charsets[settings.version];
                let outArray = [...output];
                
                if (zeroPadding > 1) {
                    const padValue = this.converter.padBytes(zeroPadding);
                    if (settings.padding) {
                        const padLen = settings.trim ? 1 : padValue;
                        const padArr = new Array(padLen).fill(this.padChars[settings.version].at(-1));
                        outArray.splice(outArray.length-padValue, padValue, ...padArr);
                    } else {
                        outArray.splice(outArray.length-padValue, padValue);
                    }
                }
                
                else if (zeroPadding === 1) {
                    const lastVal = charset.indexOf(outArray.pop());
                    const x = lastVal >> 8;
                    outArray.push(this.padChars[settings.version].at(x));
                }

                return outArray.join("");
            };
            
            return super.encode(input, null, applyPadding, ...args);
        }

        
        /**
         * BaseEx Ecoji Decoder.
         * @param {string} input - Ecoji String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {

            // Argument validation and output settings
            const settings = this.utils.validateArgs(args);
            input = String(input);

            // versonKey can be both v1 or v2
            let versionKey = 3;

            // the actual decoding is wrapped in a function
            // for the possibility to call it multiple times
            const decode = (input) => {

                versionKey = this.preDecode(input, versionKey, settings.integrity);
                const version = (versionKey === 3)
                    ? settings.version
                    : `emojis_v${versionKey}`;
                
                const charset = this.charsets[version];
                
                const inArray = [...input];
                const lastChar = inArray.at(-1);
                let skipLast = false;

                for (let i=0; i<this.padChars[version].length-1; i++) {                
                    if (lastChar === this.padChars[version].at(i)) {
                        inArray.splice(-1, 1, charset.at(i << 8));
                        input = inArray.join("");
                        skipLast = true;
                        break;
                    }
                }

                let output = this.converter.decode(input,
                    this.charsets[version],
                    [],
                    false
                );

                if (skipLast) {
                    output = new Uint8Array(output.buffer.slice(0, -1));
                }

                return output;
            };

            const matchGroup = [...input.matchAll(this.#padRegex)];

            // decode the input directly if no or just one 
            // match for padding was found
            let output;
            if (matchGroup.length < 2) {
                output = decode(input);
            }
            
            // otherwise decode every group seperatly and join it
            // afterwards
            else {

                const preOutArray = [];
                let start = 0;
                
                matchGroup.forEach(match => {
                    const end = match.index + match.at(0).length;
                    preOutArray.push(...decode(input.slice(start, end)));
                    start = end;
                });

                // in case the last group has no padding, it is not yet
                // decoded -> do it now
                if (start !== input.length) {
                    preOutArray.push(...decode(input.slice(start, input.length)));
                }

                output = Uint8Array.from(preOutArray);
            }


            return this.utils.outputHandler.compile(output, settings.outputType);
        }


        /**
         * Determines the version (1/2) and analyzes the input for itegrity.
         * @param {string} input - Input string. 
         * @param {number} versionKey - Version key from former calls (initially alwas 3). 
         * @param {boolean} integrity - If false non standard or wrong padding gets ignored. 
         * @returns {number} - Version key (1|2|3)
         */
        preDecode(input, versionKey, integrity) {
            
            const inArray = [...input];
            let sawPadding;

            inArray.forEach((char, i) => {

                if (char in this.#revEmojiVersion) {

                    const charVersion = this.#revEmojiVersion[char].version;

                    // version changes can only happen if the char is
                    // not in both versions (not 3)
                    if (charVersion !== 3) {
                        if (versionKey === 3) {
                            versionKey = charVersion;
                        } else if (versionKey !== charVersion) {
                            throw new TypeError(`Emojis from different ecoji versions seen : ${char} from emojis_v${charVersion}`);
                        }
                    }

                    // analyze possible wron padding if integrity checks
                    // are enabled
                    if (integrity) {
                        const padding = this.#revEmojiVersion[char].padding;
                        if (padding) {

                            // index relative to a group of four bytes
                            const relIndex = i%4;
                            sawPadding = true;

                            if (padding === "fill") {
                                if (relIndex === 0) {
                                    throw new TypeError(`Padding unexpectedly seen in first position ${char}`);
                                }
                            } else if (relIndex !== 3) {
                                throw new TypeError(`Last padding seen in unexpected position ${char}`);
                            }
                        }

                        else if (sawPadding) {
                            throw new TypeError("Unexpectedly saw non-padding after padding");
                        }
                    }

                } else {
                    throw new TypeError(`Non Ecoji character seen : ${char}`);
                }
            });

            // lastely test for invalid string 
            if (integrity && inArray.length % 4) {
                if (
                    versionKey === 1 ||
                    this.#revEmojiVersion[inArray.at(-1)].padding !== "fill"
                ) {
                    throw new TypeError("Unexpected end of data, input data size not multiple of 4");
                }
            }

            return versionKey;
        }
    }

    return Ecoji;

})();
