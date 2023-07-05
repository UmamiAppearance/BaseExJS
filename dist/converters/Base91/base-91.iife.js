var Base91 = (function () {
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
            if (ArrayBuffer.isView(input) && !(typeof Buffer !== "undefined" && input instanceof Buffer)) {
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
            
            // ArrayBuffer:
            if (input instanceof ArrayBuffer) {
                inputUint8 = new Uint8Array(input.slice());
            }

            // TypedArray/DataView or node Buffer:
            else if (ArrayBuffer.isView(input)) {
                if (typeof Buffer !== "undefined" && input instanceof Buffer) {
                    inputUint8 = new Uint8Array(input);
                } else {
                    inputUint8 = new Uint8Array(input.buffer.slice());
                }
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

    class DecodingError extends TypeError {
        constructor(char, msg=null) {
            if (msg === null) {
                msg = `Character '${char}' is not part of the charset.`;
            }
            super(msg);
            this.name = "DecodingError";
        }
    }


    /**
     * Utilities for every BaseEx class.
     * --------------------------------
     * Requires IO Handlers
     */
    class Utils {

        constructor(main) {

            // Store the calling class in this.root
            // for accessability.
            this.root = main;
            
            // set specific args object for converters
            this.converterArgs = {};

            // If charsets are uses by the parent class,
            // add extra functions for the user.

            this.#charsetUserToolsConstructor();
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
            this.root.addCharset = (name, _charset, _padChars=[], info=true) => {

                const normalize = (typeName, set, setLen) => {

                    if (setLen === 0 && set.length) {
                        console.warn(`This converter has no ${typeName}. The following argument was ignored:\n'${set}'`);
                        return [];
                    }

                    let inputLen = setLen;

                    if (typeof set === "string") {
                        set = [...set];
                    }
                    
                    if (Array.isArray(set)) {
                        
                        // Store the input length of the input
                        inputLen = set.length;
                        
                        // Convert to "Set" -> eliminate duplicates
                        // If duplicates are found the length of the
                        // Set and the length of the initial input
                        // differ.

                        set = new Set(set);

                    } else if (!(set instanceof Set)) {
                        throw new TypeError(`The ${typeName} must be one of the types:\n'str', 'set', 'array'."`);
                    }
                    
                    if (set.size === setLen) {
                        return [...set];
                    }
                    
                    if (inputLen !== setLen) {
                        throw new Error(`Your ${typeName} has a length of ${inputLen}. The converter requires a length of ${setLen}.`);
                    } else {
                        const charAmounts = {};
                        _charset = [..._charset];
                        _charset.forEach(c => {
                            if (c in charAmounts) {
                                charAmounts[c]++;
                            } else {
                                charAmounts[c] = 1;
                            }
                        });
                        
                        let infoStr = "";
                        if (setLen < 100) {
                            infoStr = `${_charset.join("")}\n`;
                            _charset.forEach(c => {
                                if (charAmounts[c] > 1) {
                                    infoStr += "^";
                                } else {
                                    infoStr += " ";
                                }
                            });
                        }
                        const rChars = Object.keys(charAmounts).filter(c => charAmounts[c] > 1);
                        throw new Error(`You have repetitive char(s) [ ${rChars.join(" | ")} ] in your ${typeName}. Make sure each character is unique.\n${infoStr}`);
                    }
                };

                if (this.root.frozenCharsets) {
                    throw new Error("The charsets of this converter cannot be changed.");
                }

                if (typeof name !== "string") {
                    throw new TypeError("The charset name must be a string.");
                }

                if (info && name in this.root.charsets) {
                    console.warn(`An existing charset with name ${name} will get replaced.`);
                }

                const charset = normalize("charset", _charset, this.root.converter.radix);
                const padChars = normalize("padding set", _padChars, this.root.padCharAmount);

                this.root.charsets[name] = charset;
                if (padChars.length) {
                    this.root.padChars[name] = padChars;
                }

                if (info) {
                    console.info(`New charset '${name}' was added and is ready to use`);
                }
            };

            // Save method (argument gets validated) to 
            // change the default version.
            this.root.setDefaultCharset = (version) => {
                if (!(version in this.root.charsets)) {
                    const sets = Object.keys(this.root.charsets).join("\n   * ");
                    const msg = `Charset ${version} was not found. Available charsets are:\n   * ${sets}`;
                    throw new TypeError(msg);
                }
                this.root.version = version;
            };
        }

        /**
         * Argument lists for error messages.
         * @param {string[]} args 
         * @returns string - Arguments joined as a string. 
         */
        #makeArgList(args) {
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
        #invalidArgument(arg, versions, outputTypes, initial) {
            const loopConverterArgs = () => Object.keys(this.converterArgs).map(
                key => this.converterArgs[key].map(
                    keyword => `'${keyword}'`
                )
                .join(" and ")
            )
            .join("\n   - ");
            
            throw new TypeError([
                `'${arg}'\n\nParameters:`,
                initial ? "\n * valid declarations for IO handlers are 'bytesOnly', 'bytesIn', 'bytesOut'" : "",
                this.root.isMutable.signed ? "\n * pass 'signed' to disable, 'unsigned' to enable the use of the twos's complement for negative integers" : "",
                this.root.isMutable.littleEndian ? "\n * 'be' for big , 'le' for little endian byte order for case conversion" : "",
                this.root.isMutable.padding ? "\n * pass 'pad' to fill up, 'nopad' to not fill up the output with the particular padding" : "",
                this.root.isMutable.upper ? "\n * valid args for changing the encoded output case are 'upper' and 'lower'" : "",
                `\n * valid args for the output type are ${this.#makeArgList(outputTypes)}`,
                versions ? `\n * the option(s) for version/charset are: ${this.#makeArgList(versions)}` : "",
                "\n * valid args for integrity check are: 'integrity' and 'nointegrity'",
                this.root.hasDecimalMode ? "\n * 'decimal' for decimal-mode (directly converts Numbers including decimal values, without byte-conversion)" : "",
                "\n * 'number' for number-mode (converts every number into a Float64Array to keep the natural js number type)",
                Object.keys(this.converterArgs).length ? `\n * converter specific args:\n   - ${loopConverterArgs()}` : "",
                "\n\nTraceback:"
            ].join(""));
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
                decimalMode: this.root.decimalMode,
                integrity: this.root.integrity,
                littleEndian: this.root.littleEndian,
                numberMode: this.root.numberMode,
                options: this.root.options,
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
            const versions = Object.keys(this.root.charsets);
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
            
            // test for the special "decimal" keyword
            if (extractArg("decimal")) {
                if (!this.root.hasDecimalMode) {
                    throw TypeError(`Argument 'decimal' is only allowed for converters with a non-integer base.`);
                }
                parameters.decimalMode = true;
                parameters.outputType = "decimal";

                if (parameters.numberMode) {
                    parameters.numberMode = false;
                    console.warn("-> number-mode was disabled due to the decimal-mode");
                }
            }

            // walk through the remaining arguments
            args.forEach((arg) => {
                
                // additional/optional non boolean options
                if (typeof arg === "object") {
                    parameters.options = {...parameters.options, ...arg};
                    return;
                }

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
                        this.#invalidArgument(arg, versions, outputTypes, initial);
                    }
                }
            });

            // If padding and signed are true, padding
            // is set to false and a warning is getting
            // displayed.
            if (parameters.padding && parameters.signed) {
                parameters.padding = false;
                console.warn("-> padding was set to false due to the signed conversion");
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

        /**
         * Wrap output to "cols" characters per line.
         * @param {string} output - Output string. 
         * @param {number} cols - Number of cols per line. 
         * @returns {string} - Wrapped output.
         */
        wrapOutput(output, cols=0) {
            if (!cols) {
                return output;
            }
            const m = new RegExp(`.{1,${cols}}`, "gu");
            return output.match(m).join("\n");
        }

        /**
         * Ensures a string input.
         * @param {*} input - Input.
         * @param {boolean} [keepWS=false] - If set to false, whitespace is getting removed from the input if present.
         * @returns {string} - Normalized input.
         */
        normalizeInput(input, keepWS=false) {
            if (keepWS) {
                return String(input);
            }
            return String(input).replace(/\s/g, "");
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
            this.decimalMode = false;
            this.frozenCharsets = false;
            this.hasDecimalMode = false;
            this.hasSignedMode = false;
            this.integrity = true;
            this.littleEndian = false;
            this.numberMode = false;
            this.outputType = "buffer";
            this.padding = false;
            this.padCharAmount = 0;
            this.padChars = {}; 
            this.nonASCII = false;
            this.signed = false;
            this.upper = null;
            if (appendUtils) this.utils = new Utils(this);
            this.version = "default";
            this.options = {
                lineWrap: 0
            };
            
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
            let [inputBytes, negative, type] = this.utils.inputHandler.toBytes(input, settings);

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

            return this.utils.wrapOutput(output, settings.options.lineWrap);
        }


        /**
         * BaseEx Generic Decoder.
         * @param {string} input - Base String.
         * @param {function} [preDecodeFN] - Function, which gets executed before decoding. 
         * @param {function} [postDecodeFN] - Function, which gets executed after decoding
         * @param  {...any} args - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, preDecodeFN, postDecodeFN, keepNL, ...args) {
        
            // apply settings
            const settings = this.utils.validateArgs(args);

            // ensure a string input
            input = this.utils.normalizeInput(input, keepNL);

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
     * [BaseEx|Base91 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-91.js}
     *
     * @version 0.8.1
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT AND BSD-3-Clause (Base91, Copyright (c) 2000-2006 Joachim Henke)
     */


    /**
     * BaseEx Base 91 Converter.
     * ------------------------
     * 
     * This is a base91 converter. Various input can be 
     * converted to a base91 string or a base91 string
     * can be decoded into various formats.
     * 
     * It is an  implementation of Joachim Henkes method
     * to encode binary data as ASCII characters -> basE91
     * http://base91.sourceforge.net/
     * 
     * As this method requires to split the bytes, the
     * default conversion class "BaseConverter" is not
     * getting used in this case.
     */
    class Base91 extends BaseTemplate {
        
        /**
         * BaseEx basE91 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();

            // converter (properties only)
            this.converter = {
                radix: 91,
                bsEnc: 0,
                bsDec: 0
            };

            // charsets
            this.charsets.default = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\""];
            this.version = "default";

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx basE91 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - basE91 encoded string.
         */
        encode(input, ...args) {
           
            // argument validation and input settings
            const settings = this.utils.validateArgs(args);
            const inputBytes = this.utils.inputHandler.toBytes(input, settings)[0];
      
            // As this base representation splits the bytes
            // the read bits need to be stores somewhere. 
            // This is done in "bitCount". "n", similar to 
            // other solutions here, holds the integer which
            // is converted to the desired base.

            let bitCount = 0;
            let n = 0;
            let output = "";

            const charset = this.charsets[settings.version];

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
                    [q, r] = this.#divmod(rN, 91);

                    // Lookup the corresponding characters for
                    // "r" and "q" in the set, append it to the 
                    // output string.
                    output = `${output}${charset[r]}${charset[q]}`;
                }
            });
            
            // If the bitCount is not zero at the end,
            // calculate quotient and remainder of 91
            // once more.
            if (bitCount) {
                let q, r;
                [q, r] = this.#divmod(n, 91);

                // The remainder is concatenated in any case
                output = output.concat(charset[r]);

                // The quotient is also appended, but only
                // if the bitCount still has the size of a byte
                // or n can still represent 91 conditions.
                if (bitCount > 7 || n > 90) {
                    output = output.concat(charset[q]);
                }
            }
            
            return this.utils.wrapOutput(output, settings.options.lineWrap);
        }


        /**
         * BaseEx basE91 Decoder.
         * @param {string} input - basE91 String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {

            // Argument validation and output settings
            const settings = this.utils.validateArgs(args);
            const charset = this.charsets[settings.version];

            // Make it a string, whatever goes in
            input = this.utils.normalizeInput(input);
            let inArray = [...input];

            // remove unwanted characters if integrity is false 
            if (!settings.integrity) {
                inArray = inArray.filter(c => charset.includes(c));
            }


            let l = inArray.length;

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
            
            // Initialize an ordinary array
            const b256Array = new Array();
            
            // Walk through the string in steps of two
            // (aka collect remainder- and quotient-pairs)
            for (let i=0; i<l; i+=2) {

                const c0 = charset.indexOf(inArray[i]);
                const c1 =  charset.indexOf(inArray[i+1]);
                
                if (c0 < 0) {
                    throw new DecodingError(inArray[i]);
                }
                if (c1 < 0) {
                    throw new DecodingError(inArray[i+1]);
                }

                // Calculate back the remainder of the integer "n"
                const rN = c0 + c1 * 91;
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
                const lastChar = inArray.at(l);
                const rN = charset.indexOf(lastChar);
                b256Array.push(((rN << bitCount) + n) % 256);
            }

            const output = Uint8Array.from(b256Array);

            // Return the output
            return this.utils.outputHandler.compile(output, settings.outputType);
        }


        /**
         * Divmod Function.
         * @param {*} x - number 1
         * @param {*} y - number 2
         * @returns {number} Modulo y of x
         */
        #divmod (x, y) {
            return [Math.floor(x/y), x%y];
        }
    }

    return Base91;

})();
