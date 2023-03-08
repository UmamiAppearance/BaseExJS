var BaseEx = (function (exports) {
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

            [...inputBaseStr].forEach(c => {
                const index = charset.indexOf(c);
                if (index > -1) { 
                    byteArray.push(index);
                } else if (integrity && padSet.indexOf(c) === -1) {
                    throw new DecodingError(c);
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
     * [BaseEx|Base1 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-1.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 1 Converter.
     * -----------------------
     * This is a unary/base1 converter. It is converting input 
     * to a decimal number, which is converted into an unary
     * string. Due to the limitations on string (or array) length
     * it is only suitable for the  conversions of numbers up to
     * roughly 2^28.
     */
    class Base1 extends BaseTemplate {
        
        /**
         * BaseEx Base1 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();

            // All chars in the string are used and picked randomly (prob. suitable for obfuscation)
            this.charsets.all = [..." !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"];
            
            // The sequence is used from left to right again and again
            this.charsets.sequence = [..."Hello World!"];
            
            // Standard unary string with one character
            this.charsets.default = ["1"];

            // Telly Mark string, using hash for 5 and vertical bar for 1 
            this.charsets.tmark = ["|", "#"];

            // Base 10 converter
            this.converter = new BaseConverter(10, 0, 0);
            
            // converter settings
            this.hasSignedMode = true;
            this.littleEndian = true;
            this.signed = true;
            
            // mutable extra args
            this.isMutable.charsets = false;
            this.isMutable.signed = true;
            this.isMutable.upper = true;
            
            // apply user settings
            this.utils.validateArgs(args, true);
        }
        

        /**
         * BaseEx Base1 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base1 encoded string.
         */
        encode(input, ...args) {

            // argument validation and input settings
            const settings = this.utils.validateArgs(args);
            
            let inputBytes, negative;
            [inputBytes, negative,] = this.utils.inputHandler.toBytes(input, settings);

            // Convert to BaseRadix string
            let base10 = this.converter.encode(inputBytes, null, settings.littleEndian)[0];
            
            let n = BigInt(base10);

            // Limit the input before it even starts.
            // The executing engine will most likely
            // give up much earlier.
            // (2**29-24 during tests)

            if (n > Number.MAX_SAFE_INTEGER) {
                throw new RangeError("Invalid string length.");
            } else if (n > 16777216) {
                console.warn("The string length is really long. The JavaScript engine may have memory issues generating the output string.");
            }
            
            n = Number(n);
            
            const charset = this.charsets[settings.version];
            const charAmount = charset.length;
            let output = "";

            // Convert to unary in respect to the version differences
            if (charAmount === 1) {
                output = charset.at(0).repeat(n);
            } else if (settings.version === "all") {
                for (let i=0; i<n; i++) {
                    const charIndex = Math.floor(Math.random() * charAmount); 
                    output += charset[charIndex];
                }
            } else if (settings.version === "tmark") {
                const singulars = n % 5;
                if (n > 4) {
                    output = charset.at(1).repeat((n - singulars) / 5);
                }
                output += charset.at(0).repeat(singulars);
            } else {
                for (let i=0; i<n; i++) {
                    output += charset[i%charAmount];
                }
            }
            
            output = this.utils.toSignedStr(output, negative);

            if (settings.upper) {
                output = output.toUpperCase();
            }
            
            return this.utils.wrapOutput(output, settings.options.lineWrap);
        }
        

        /**
         * BaseEx Base1 Decoder.
         * @param {string} input - Base1/Unary String.
         * @param  {...any} [args] - Converter settings. 
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {

            // Argument validation and output settings
            const settings = this.utils.validateArgs(args);

            // Make it a string, whatever goes in
            input = this.utils.normalizeInput(input);
            
            // Test for a negative sign
            let negative;
            [input, negative] = this.utils.extractSign(input);
            
            // remove all but the relevant character
            if (settings.version !== "all") {
                const cleanedSet = [...new Set(this.charsets[settings.version])].join("");
                const regex = new RegExp(`[^${cleanedSet}]`,"g");
                input = input.replace(regex, "");
            }
            input = String(input.length);

            // Run the decoder
            const output = this.converter.decode(input, [..."0123456789"], [], "", settings.integrity, settings.littleEndian);
            
            // Return the output
            return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
        }
    }

    /**
     * [BaseEx|Base16 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-16.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 16 Converter.
     * ------------------------
     * This is a base16/converter. Various input can be 
     * converted to a hex string or a hex string can be
     * decoded into various formats. It is possible to 
     * convert in both signed and unsigned mode.
     */
    class Base16 extends BaseTemplate {

        /**
         * BaseEx Base16 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();

            // converter
            this.converter = new BaseConverter(16, 1, 2);

            // default settings
            this.charsets.default = [..."0123456789abcdef"];
            this.padChars.default = [];

            this.hasSignedMode = true;
            
            // mutable extra args
            this.isMutable.signed = true;
            this.isMutable.upper = true;

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx Base16 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base16 encoded string.
         */
        encode(input, ...args) {
            return super.encode(input, null, null, ...args);
        }

        
        /**
         * BaseEx Base16 Decoder.
         * @param {string} input - Base16/Hex String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {
            
            // pre decoding function
            const normalizeInput = ({ input: normInput, settings }) => {
                
                // Remove "0x" if present
                normInput = normInput.replace(/^0x/, "");

                // remove non-charset characters if integrity
                // check is disabled
                if (!settings.integrity) {
                    normInput = normInput
                        .toLowerCase()
                        .replace(/[^0-9a-f]/g, "");
                }

                // Ensure even number of characters
                if (normInput.length % 2) {
                    normInput = "0".concat(normInput);
                }

                return normInput;
            };
            
            return super.decode(input, normalizeInput, null, false, ...args);
        }
    }

    /**
     * [BaseEx|Base32 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-32.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 32 Converter.
     * ------------------------
     * 
     * This is a base32 converter. Various input can be 
     * converted to a base32 string or a base32 string
     * can be decoded into various formats. It is possible
     * to convert in both signed and unsigned mode in little
     * and big endian byte order.
     * 
     * Available charsets are:
     *  - RFC 3548
     *  - RFC 4648
     *  - crockford
     *  - zbase32
     */
    class Base32 extends BaseTemplate {
        
        /**
         * BaseEx Base32 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();
            this.converter = new BaseConverter(32, 5, 8);

            // charsets
            this.charsets.crockford = [ ..."0123456789abcdefghjkmnpqrstvwxyz" ];
            this.padChars.crockford = ["="],

            this.charsets.rfc3548 =   [..."abcdefghijklmnopqrstuvwxyz234567"];
            this.padChars.rfc3548 =   ["="];

            this.charsets.rfc4648 =   [..."0123456789abcdefghijklmnopqrstuv"];
            this.padChars.rfc4648 =   ["="];

            this.charsets.zbase32 =   [..."ybndrfg8ejkmcpqxot1uwisza345h769"];
            this.padChars.zbase32 =   ["="];
            
            // predefined settings
            this.padCharAmount = 1;
            this.hasSignedMode = true;
            this.version = "rfc4648";
            
            // mutable extra args
            this.isMutable.littleEndian = true;
            this.isMutable.padding = true;
            this.isMutable.signed = true;
            this.isMutable.upper = true;

            // apply user settings
            this.utils.validateArgs(args, true);
            this.padding = (/rfc3548|rfc4648/).test(this.version);
            this.upper = this.version === "crockford";
        }
        

        /**
         * BaseEx Base32 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base32 encoded string.
         */
        encode(input, ...args) {

            const applyPadding = ({ output, settings, zeroPadding }) => {

                if (!settings.littleEndian) {
                    // Cut of redundant chars and append padding if set
                    if (zeroPadding) {
                        const padValue = this.converter.padBytes(zeroPadding);
                        const padChar = this.padChars[settings.version].at(0);
                        output = output.slice(0, -padValue);
                        if (settings.padding) { 
                            output = output.concat(padChar.repeat(padValue));
                        }
                    }
                }

                return output;
            };
            
            return super.encode(input, null, applyPadding, ...args);
        }


        /**
         * BaseEx Base32 Decoder.
         * @param {string} input - Base32 String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {
            return super.decode(input, null, null, false, ...args);
        }
    }

    /**
     * [BaseEx|Base58 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-58.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 58 Converter.
     * ------------------------
     * 
     * This is a base58 converter. Various input can be 
     * converted to a base58 string or a base58 string
     * can be decoded into various formats.
     * 
     * Available charsets are:
     *  - default
     *  - bitcoin
     *  - flickr
     */
    class Base58 extends BaseTemplate{

        /**
         * BaseEx Base58 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();
            this.converter = new BaseConverter(58, 0, 0);

            // charsets
            this.charsets.default = [..."123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"];
            Object.defineProperty(this.padChars, "default", {
                get: () => [ this.charsets.default.at(0) ]
            });

            this.charsets.bitcoin = [..."123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"];
            Object.defineProperty(this.padChars, "bitcoin", {
                get: () => [ this.charsets.bitcoin.at(0) ]
            });
            
            this.charsets.flickr =  [..."123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"];
            Object.defineProperty(this.padChars, "flickr", {
                get: () => [ this.charsets.flickr.at(0) ]
            });
            

            // predefined settings
            this.padding = true;
            this.version = "bitcoin";
            
            // mutable extra args
            this.isMutable.padding = true;
            this.isMutable.signed = true;

            // apply user settings
            this.utils.validateArgs(args, true);
        }

        
        /**
         * BaseEx Base58 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base58 encoded string.
         */
        encode(input, ...args) {

            const applyPadding = ({ inputBytes, output, settings, type }) => {

                if (settings.padding && type !== "int") { 
                    
                    // Count all null bytes at the start of the array
                    // stop if a byte with a value is reached. If it goes
                    // all the way through it, reset index and stop.
                    let i = 0;
                    const end = inputBytes.length;

                    // pad char is always! the first char in the set
                    const padChar = this.charsets[settings.version].at(0);

                    // only proceed if input has a length at all
                    if (end) {
                        while (!inputBytes[i]) {
                            i++;
                            if (i === end) {
                                i = 0;
                                break;
                            }
                        }

                        // The value for zero padding is the index of the
                        // first byte with a value plus one.
                        const zeroPadding = i;

                        // Set a one for every leading null byte
                        if (zeroPadding) {
                            output = (padChar.repeat(zeroPadding)).concat(output);
                        }
                    }
                }

                return output;
            };
        
            return super.encode(input, null, applyPadding, ...args);
        }


        /**
         * BaseEx Base58 Decoder.
         * @param {string} input - Base58 String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {
            
            // post decoding function
            const applyPadding = ({ input, output, settings }) => {

                // pad char is always! the first char in the set
                const padChar = this.charsets[settings.version].at(0);

                if (settings.padding && input.length > 1) {
                    
                    // Count leading padding (char should be 1)
                    let i = 0;
                    while (input[i] === padChar) {
                        i++;
                    }
        
                    // The counter becomes the zero padding value
                    const zeroPadding = i;
        
                    // Create a new Uint8Array with leading null bytes 
                    // with the amount of zeroPadding
                    if (zeroPadding) {
                        output = Uint8Array.from([...new Array(zeroPadding).fill(0), ...output]);
                    }
        
                }

                return output;
            };

            return super.decode(input, null, applyPadding, false, ...args);
        }
    }

    /**
     * [BaseEx|Base64 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-64.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 64 Converter.
     * ------------------------
     * 
     * This is a base64 converter. Various input can be 
     * converted to a base64 string or a base64 string
     * can be decoded into various formats.
     * 
     * Available charsets are:
     *  - default
     *  - urlsafe
     */
    class Base64 extends BaseTemplate {

        /**this.padChars.
         * BaseEx Base64 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();
            this.converter = new BaseConverter(64, 3, 4);

            // charsets
            this.charsets.default = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"];
            this.padChars.default = ["="];
            
            this.charsets.urlsafe = this.charsets.default.slice(0, -2).concat(["-", "_"]);
            this.padChars.urlsafe = ["="];


            // predefined settings
            this.padCharAmount = 1;
            this.padding = true;
            
            // mutable extra args
            this.isMutable.padding = true;

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx Base64 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base64 encoded string.
         */
        encode(input, ...args) {
            
            const applyPadding = ({ output, settings, zeroPadding }) => {

                // Cut of redundant chars and append padding if set
                if (zeroPadding) {
                    const padValue = this.converter.padBytes(zeroPadding);
                    const padChar = this.padChars[settings.version].at(0);
                    output = output.slice(0, -padValue);
                    if (settings.padding) { 
                        output = output.concat(padChar.repeat(padValue));
                    }
                }

                return output;
            };
                
            return super.encode(input, null, applyPadding, ...args);
        }


        /**
         * BaseEx Base64 Decoder.
         * @param {string} input - Base64 String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {
            return super.decode(input, null, null, false, ...args);
        }
    }

    /**
     * [BaseEx|UUencode Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/uuencode.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx UUencode Converter.
     * ------------------------
     * 
     * This is a base64 converter. Various input can be 
     * converted to a base64 string or a base64 string
     * can be decoded into various formats.
     * 
     * Available charsets are:
     *  - default
     *  - urlsafe
     */
    class UUencode extends BaseTemplate {

        /**
         * BaseEx UUencode Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();
            this.converter = new BaseConverter(64, 3, 4);

            // charsets
            this.charsets.default = [..."`!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_"];
            Object.defineProperty(this.padChars, "default", {
                get: () => [ this.charsets.default.at(0) ]
            });

            this.charsets.original = [" ", ...this.charsets.default.slice(1)];
            Object.defineProperty(this.padChars, "original", {
                get: () => [ this.charsets.original.at(0) ]
            });

            this.charsets.xx = [..."+-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"];
            Object.defineProperty(this.padChars, "xx", {
                get: () => [ this.charsets.xx.at(0) ]
            });


            // predefined settings
            this.padding = true;
            this.header = false;
            this.utils.converterArgs.header = ["noheader", "header"];
            this.isMutable.header = true;
            this.isMutable.integrity = false;

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx UUencoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - UUencode string.
         */
        encode(input, ...args) {

            const format = ({ output, settings, zeroPadding }) => {

                const charset = this.charsets[settings.version];
                const outArray = [...output];
                
                
                if (settings.header) {
                    const permissions = settings.options.permissions || een();
                    const fileName = settings.options.file || ees();
                    output = `begin ${permissions} ${fileName}\n`;
                }  else {
                    output = "";
                }

                // repeatedly take 60 chars from the output until it is empty 
                for (;;) {
                    const lArray = outArray.splice(0, 60);
                    
                    // if all chars are taken, remove eventually added pad zeros
                    if (!outArray.length) { 
                        const byteCount = this.converter.padChars(lArray.length) - zeroPadding;
                        
                        // add the the current chars plus the leading
                        // count char
                        output += `${charset.at(byteCount)}${lArray.join("")}\n`;
                        break;
                    }
                    
                    // add the the current chars plus the leading
                    // count char ("M" for default charsets) 
                    output += `${charset.at(45)}${lArray.join("")}\n`;
                }

                output += `${charset.at(0)}\n`;

                if (settings.header) {
                    output += "\nend";
                }


                return output;
            };
                
            return super.encode(input, null, format, ...args);
        }


        /**
         * BaseEx UUdecoder.
         * @param {string} input - UUencode String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
         decode(input, ...args) {

            let padChars = 0;

            const format = ({ input, settings }) => {

                const charset = this.charsets[settings.version];
                const lines = input.trim().split("\n");
                const inArray = [];
                
                if ((/^begin/i).test(lines.at(0))) {
                    lines.shift();
                }
                
                for (const line of lines) {
                    const lArray = [...line];
                    const byteCount = charset.indexOf(lArray.shift());
                    
                    if (!(byteCount > 0)) {
                        break;
                    }

                    inArray.push(...lArray);

                    if (byteCount !== 45) {
                        padChars = this.converter.padChars(lArray.length) - byteCount;
                        break;
                    }
                }

                return inArray.join("");

            };

            const removePadChars = ({ output }) => {
                if (padChars) {
                    output = new Uint8Array(output.slice(0, -padChars));
                }
                return output;
            };

            return super.decode(input, format, removePadChars, true, ...args);
        }
    }


    const een = () => {
        const o = () => Math.floor(Math.random() * 8);
        return `${o()}${o()}${o()}`;
    };

    const ees = () => {
        const name = [
            "unchronological",
            "unconditionally",
            "underemphasized",
            "underprivileged",
            "undistinguished",
            "unsophisticated",
            "untitled",
            "untitled-1",
            "untitled-3",
            "uuencode"
        ];

        const ext = [
            "applescript",
            "bat",
            "beam",
            "bin",
            "exe",
            "js",
            "mam",
            "py",
            "sh",
            "vdo",
            "wiz"
        ];

        const pick = (arr) => arr.at(Math.floor(Math.random() * arr.length));

        return `${pick(name)}.${pick(ext)}`;
    };

    /**
     * [BaseEx|Base85 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-85.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 85 Converter.
     * ------------------------
     * 
     * This is a base85 converter. Various input can be 
     * converted to a base85 string or a base85 string
     * can be decoded into various formats.
     * 
     * Available charsets are:
     *  - adobe
     *  - ascii85
     *  - rfc1924
     *  - z85
     * 
     * Adobe and ascii85 are the basically the same.
     * Adobe will produce the same output, apart from
     * the <~wrapping~>.
     * 
     * Z85 is an important variant, because of the 
     * more interpreter-friendly character set.
     * 
     * The RFC 1924 version is a hybrid. It is not using
     * the mandatory 128 bit calculation. Instead only 
     * the charset is getting used.
     */
    class Base85 extends BaseTemplate {

        /**
         * BaseEx Base85 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();
            this.converter = new BaseConverter(85, 4, 5, 84);

            // charsets
            this.charsets.adobe   =  [..."!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu"];
            this.charsets.ascii85 =  this.charsets.adobe.slice();
            this.charsets.rfc1924 =  [..."0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~"];
            this.charsets.z85     =  [..."0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#"];

            // predefined settings
            this.version = "ascii85";
            
            // apply user settings
            this.utils.validateArgs(args, true);
        }
        

        /**
         * BaseEx Base85 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base85 encoded string.
         */
        encode(input, ...args) {

            // Replace five consecutive "!" with a "z"
            // for adobe and ascii85
            const replacerFN = (settings) => {
                let replacer;
                if (settings.version.match(/adobe|ascii85/)) {
                    replacer = (frame, zPad) => (!zPad && frame === "!!!!!") ? "z" : frame;
                }
                return replacer;
            };
                        
            // Remove padded values and add a frame for the
            // adobe variant
            const framesAndPadding = ({ output, settings, zeroPadding }) => {

                // Cut of redundant chars
                if (zeroPadding) {
                    const padValue = this.converter.padBytes(zeroPadding);
                    output = output.slice(0, -padValue);
                }

                // Adobes variant gets its <~framing~>
                if (settings.version === "adobe") {
                    output = `<~${output}~>`;
                }
                
                return output;
            };

            return super.encode(input, replacerFN, framesAndPadding, ...args);
        }


        /**
         * BaseEx Base85 Decoder.
         * @param {string} input - Base85 String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {

            const prepareInput = ({ input, settings }) => {

                // For default ascii85 convert "z" back to "!!!!!"
                // Remove the adobe <~frame~>
                if (settings.version.match(/adobe|ascii85/)) {
                    input = input.replace(/z/g, "!!!!!");
                    if (settings.version === "adobe") {
                        input = input.replace(/^<~|~>$/g, "");
                    }
                }

                return input
            };

            return super.decode(input, prepareInput, null, false, ...args);
        }
    }

    /**
     * [BaseEx|Base91 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-91.js}
     *
     * @version 0.7.4
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

    /**
     * [BaseEx|LEB128 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/leb-128.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Little Endian Base 128 Converter.
     * ---------------------------------------
     * 
     * This is a leb128 converter. Various input can be 
     * converted to a leb128 string or a leb128 string
     * can be decoded into various formats.
     * 
     * There is no real charset available as the input is
     * getting converted to bytes. For having the chance 
     * to store these bytes, there is a hexadecimal output
     * available.
     */
    class LEB128 extends BaseTemplate {
        
        /**
         * BaseEx LEB128 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            // initialize base template without utils
            super();

            // converters
            this.converter = new BaseConverter(10, 0, 0);
            this.hexlify = new BaseConverter(16, 1, 2);

            // charsets
            this.charsets.default = "<placeholder>";
            this.charsets.hex = "<placeholder>";

            // predefined settings
            this.version = "default";
            this.frozenCharsets = true;

            // predefined settings
            this.littleEndian = true;
            this.hasSignedMode = true;
            this.isMutable.signed = true;

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx LEB128 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {{ buffer: ArrayBufferLike; }} - LEB128 encoded Unit8Array (or hex string of it).
         */
        encode(input, ...args) {
            
            // argument validation and input settings
            const settings = this.utils.validateArgs(args);
            
            const signed = settings.signed;
            settings.signed = true;
            const [ inputBytes, negative, ] = this.utils.inputHandler.toBytes(input, settings);

            // Convert to BaseRadix string
            let base10 = this.converter.encode(inputBytes, null, settings.littleEndian)[0];

            let n = BigInt(base10);
            let output = new Array();
            
            if (negative) {
                if (!signed) {
                    throw new TypeError("Negative values in unsigned mode are invalid.");
                }
                n = -n;
            }
              
            if (signed) {

                for (;;) {
                    const byte = Number(n & 127n);
                    n >>= 7n;
                    if ((n == 0 && (byte & 64) == 0) || (n == -1 && (byte & 64) != 0)) {
                        output.push(byte);
                        break;
                    }
                    output.push(byte | 128);
                }
            }

            else {
                for (;;) {
                    const byte = Number(n & 127n);
                    n >>= 7n;
                    if (n == 0) {
                        output.push(byte);
                        break;
                    }
                    output.push(byte | 128);
                }
            }

            const Uint8Output = Uint8Array.from(output);

            if (settings.version === "hex") {
                return this.hexlify.encode(Uint8Output, [..."0123456789abcdef"], false)[0];
            }

            return Uint8Output;
        }


        /**
         * BaseEx LEB128 Decoder.
         * @param {{ buffer: ArrayBufferLike; }|string} input - LEB128-Bytes or String of Hex-Version.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {
            
            // Argument validation and output settings
            const settings = this.utils.validateArgs(args);

            if (settings.version === "hex") {
                input = this.hexlify.decode(this.utils.normalizeInput(input).toLowerCase(), [..."0123456789abcdef"], [], settings.integrity, false);
            } else if (typeof input.byteLength !== "undefined") {
                input = BytesInput.toBytes(input)[0];
            } else {
                throw new TypeError("Input must be a bytes like object.");
            }

            if (input.length === 1 && !input[0]) {
                return this.utils.outputHandler.compile(new Uint8Array(1), settings.outputType, true);
            }

            input = Array.from(input);

            let n = 0n;
            let shiftVal = -7n;
            let byte;

            for (byte of input) {
                shiftVal += 7n;
                n += (BigInt(byte & 127) << shiftVal);
            }
            
            if (settings.signed && ((byte & 64) !== 0)) {
                n |= -(1n << shiftVal + 7n);
            }

            // Test for a negative sign
            let decimalNum, negative;
            [decimalNum, negative] = this.utils.extractSign(n.toString());

            const output = this.converter.decode(decimalNum, [..."0123456789"], [], settings.integrity, true);

            // Return the output
            return this.utils.outputHandler.compile(output, settings.outputType, true, negative);
        }
    }

    /**
     * [BaseEx|Ecoji Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/ecoji.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT OR Apache-2.0
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
     * additionally omitted completely if integrity
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
          
            // init mapping for decoding particularities of the two versions
            this.#init();

            // converter
            this.converter = new BaseConverter(1024, 5, 4);

            // predefined settings
            this.padding = true;
            this.padCharAmount = 5;
            this.version = "emojis_v2";
            
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
         * Analyzes v1 and two charsets for equal and non
         * equal characters to create a "revEmojiObj" for
         * decoding lookup. Also generates a RegExp object 
         * for handling concatenated strings.
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
            // about the padding type. In this process each unique
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

            const applyPadding = ({ output, settings, zeroPadding }) => {

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
            input = this.utils.normalizeInput(input);

            let version = settings.version;
            let versionKey = null;

            if (settings.version === "emojis_v1" || settings.version === "emojis_v2") {
                // versionKey can be both v1 or v2
                versionKey = 3;
            }

            // the actual decoding is wrapped in a function
            // for the possibility to call it multiple times
            const decode = (input) => {

                if (versionKey !== null) {
                    versionKey = this.#preDecode(input, versionKey, settings.integrity);
                    version = (versionKey === 3)
                        ? settings.version
                        : `emojis_v${versionKey}`;
                }

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
            
            // otherwise decode every group separately and join it
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
         * Determines the version (1/2) and analyzes the input for integrity.
         * @param {string} input - Input string. 
         * @param {number} versionKey - Version key from former calls (initially always 3). 
         * @param {boolean} integrity - If false non standard or wrong padding gets ignored. 
         * @returns {number} - Version key (1|2|3)
         */
        #preDecode(input, versionKey, integrity) {
     
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

                    // analyze possible wrong padding if integrity checks
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
                    throw new DecodingError(char);
                }
            });

            // lastly test for invalid string 
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

    /**
     * [BaseEx|Base2048 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-2048.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base 2048 Converter.
     * ------------------------
     * This is a base2048/converter. Various input can be 
     * converted to a hex string or a hex string can be
     * decoded into various formats. It is possible to 
     * convert in both signed and unsigned mode.
     * 
     * @see https://github.com/qntm/base2048
     */
    class Base2048 extends BaseTemplate {

        /**
         * BaseEx Base2048 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();

            // converter (properties only)
            this.converter = {
                radix: 2048,
                bsEnc: 11,
                bsEncPad: 3,
                bsDec: 8
            };
            
            // default settings
            this.charsets.default = [..."89ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÆÐØÞßæðøþĐđĦħıĸŁłŊŋŒœŦŧƀƁƂƃƄƅƆƇƈƉƊƋƌƍƎƏƐƑƒƓƔƕƖƗƘƙƚƛƜƝƞƟƢƣƤƥƦƧƨƩƪƫƬƭƮƱƲƳƴƵƶƷƸƹƺƻƼƽƾƿǀǁǂǃǝǤǥǶǷȜȝȠȡȢȣȤȥȴȵȶȷȸȹȺȻȼȽȾȿɀɁɂɃɄɅɆɇɈɉɊɋɌɍɎɏɐɑɒɓɔɕɖɗɘəɚɛɜɝɞɟɠɡɢɣɤɥɦɧɨɩɪɫɬɭɮɯɰɱɲɳɴɵɶɷɸɹɺɻɼɽɾɿʀʁʂʃʄʅʆʇʈʉʊʋʌʍʎʏʐʑʒʓʔʕʖʗʘʙʚʛʜʝʞʟʠʡʢʣʤʥʦʧʨʩʪʫʬʭʮʯͰͱͲͳͶͷͻͼͽͿΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρςστυφχψωϏϗϘϙϚϛϜϝϞϟϠϡϢϣϤϥϦϧϨϩϪϫϬϭϮϯϳϷϸϺϻϼϽϾϿЂЄЅІЈЉЊЋЏАБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзиклмнопрстуфхцчшщъыьэюяђєѕіјљњћџѠѡѢѣѤѥѦѧѨѩѪѫѬѭѮѯѰѱѲѳѴѵѸѹѺѻѼѽѾѿҀҁҊҋҌҍҎҏҐґҒғҔҕҖҗҘҙҚқҜҝҞҟҠҡҢңҤҥҦҧҨҩҪҫҬҭҮүҰұҲҳҴҵҶҷҸҹҺһҼҽҾҿӀӃӄӅӆӇӈӉӊӋӌӍӎӏӔӕӘәӠӡӨөӶӷӺӻӼӽӾӿԀԁԂԃԄԅԆԇԈԉԊԋԌԍԎԏԐԑԒԓԔԕԖԗԘԙԚԛԜԝԞԟԠԡԢԣԤԥԦԧԨԩԪԫԬԭԮԯԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖաբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆאבגדהוזחטיךכלםמןנסעףפץצקרשתװױײؠءابةتثجحخدذرزسشصضطظعغػؼؽؾؿفقكلمنهوىي٠١٢٣٤٥٦٧٨٩ٮٯٱٲٳٴٹٺٻټٽپٿڀځڂڃڄڅچڇڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙښڛڜڝڞڟڠڡڢڣڤڥڦڧڨکڪګڬڭڮگڰڱڲڳڴڵڶڷڸڹںڻڼڽھڿہۃۄۅۆۇۈۉۊۋیۍێۏېۑےەۮۯ۰۱۲۳۴۵۶۷۸۹ۺۻۼۿܐܒܓܔܕܖܗܘܙܚܛܜܝܞܟܠܡܢܣܤܥܦܧܨܩܪܫܬܭܮܯݍݎݏݐݑݒݓݔݕݖݗݘݙݚݛݜݝݞݟݠݡݢݣݤݥݦݧݨݩݪݫݬݭݮݯݰݱݲݳݴݵݶݷݸݹݺݻݼݽݾݿހށނރބޅކއވމފދތލގޏސޑޒޓޔޕޖޗޘޙޚޛޜޝޞޟޠޡޢޣޤޥޱ߀߁߂߃߄߅߆߇߈߉ߊߋߌߍߎߏߐߑߒߓߔߕߖߗߘߙߚߛߜߝߞߟߠߡߢߣߤߥߦߧߨߩߪࠀࠁࠂࠃࠄࠅࠆࠇࠈࠉࠊࠋࠌࠍࠎࠏࠐࠑࠒࠓࠔࠕࡀࡁࡂࡃࡄࡅࡆࡇࡈࡉࡊࡋࡌࡍࡎࡏࡐࡑࡒࡓࡔࡕࡖࡗࡘࡠࡡࡢࡣࡤࡥࡦࡧࡨࡩࡪࢠࢡࢢࢣࢤࢥࢦࢧࢨࢩࢪࢫࢬࢭࢮࢯࢰࢱࢲࢳࢴࢶࢷࢸࢹࢺࢻࢼࢽऄअआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलळवशषसहऽॐॠॡ०१२३४५६७८९ॲॳॴॵॶॷॸॹॺॻॼॽॾॿঀঅআইঈউঊঋঌএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহঽৎৠৡ০১২৩৪৫৬৭৮৯ৰৱ৴৵৶৷৸৹ৼਅਆਇਈਉਊਏਐਓਔਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵਸਹੜ੦੧੨੩੪੫੬੭੮੯ੲੳੴઅઆઇઈઉઊઋઌઍએઐઑઓઔકખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલળવશષસહઽૐૠૡ૦૧૨૩૪૫૬૭૮૯ૹଅଆଇଈଉଊଋଌଏଐଓଔକଖଗଘଙଚଛଜଝଞଟଠଡଢଣତଥଦଧନପଫବଭମଯରଲଳଵଶଷସହଽୟୠୡ୦୧୨୩୪୫୬୭୮୯ୱ୲୳୴୵୶୷ஃஅஆஇஈஉஊஎஏஐஒஓகஙசஜஞடணதநனபமயரறலளழவஶஷஸஹௐ௦௧௨௩௪௫௬௭௮௯௰௱௲అఆఇఈఉఊఋఌఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరఱలళఴవశషసహఽౘౙౚౠౡ౦౧౨౩౪౫౬౭౮౯౸౹౺౻౼౽౾ಀಅಆಇಈಉಊಋಌಎಏಐಒಓಔಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಱಲಳವಶಷಸಹಽೞೠೡ೦೧೨೩೪೫೬೭೮೯ೱೲഅആഇഈഉഊഋഌഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനഩപഫബഭമയരറലളഴവശഷസഹഺഽൎൔൕൖ൘൙൚൛൜൝൞ൟൠൡ൦൧൨൩൪൫൬൭൮൯൰൱൲൳൴൵൶൷൸ൺൻർൽൾൿඅආඇඈඉඊඋඌඍඎඏඐඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆ෦෧෨෩෪෫෬෭෮෯กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮฯะาเแโใไๅ๐๑๒๓๔๕๖๗๘๙ກຂຄງຈຊຍດຕຖທນບປຜຝພຟມຢຣລວສຫອຮຯະາຽເແໂໃໄ໐໑໒໓໔໕໖໗໘໙ໞໟༀ༠༡༢༣༤༥༦༧༨༩༪༫༬༭༮༯༰༱༲༳ཀཁགངཅཆཇཉཊཋཌཎཏཐདནཔཕབམཙཚཛཝཞཟའཡརལཤཥསཧཨཪཫཬྈྉྊྋྌကခဂဃငစဆဇဈဉညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအဢဣဤဥဧဨဩဪဿ၀၁၂၃၄၅၆၇၈၉ၐၑၒၓၔၕ"];
            this.padChars.default = [..."01234567"];

            this.padCharAmount = 8;
            this.hasSignedMode = true;
            this.littleEndian = false;
            
            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx Base2048 Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...str} [args] - Converter settings.
         * @returns {string} - Base2048 encoded string.
         */
        encode(input, ...args) {

            const settings = this.utils.validateArgs(args);
            let inputBytes = this.utils.inputHandler.toBytes(input, settings).at(0);

            const charset = this.charsets[settings.version];
            const padChars = this.padChars[settings.version];

            let output = "";
            let z = 0;
            let numZBits = 0;

            inputBytes.forEach(uint8 => {
                
                for (let i=this.converter.bsDec-1; i>=0; i--) {

                    z = (z << 1) + ((uint8 >> i) & 1);
                    numZBits++;

                    if (numZBits === this.converter.bsEnc) {
                        output += charset.at(z);
                        z = 0;
                        numZBits = 0;
                    }
                }
            });

            if (numZBits !== 0) {
                
                let bitCount;
                let isPadding;

                if (numZBits <= this.converter.bsEncPad) {
                    bitCount = this.converter.bsEncPad;
                    isPadding = true;
                } else {
                    bitCount = this.converter.bsEnc; 
                    isPadding = false;
                }

                while (numZBits !== bitCount) {
                    z = (z << 1) + 1;
                    numZBits++;
                    if (numZBits > this.converter.bsEnc) {
                        throw new Error("Cannot process input. This is a bug!");
                    }
                }
              
                if (isPadding) { 
                    output += padChars.at(z);
                } else {
                    output += charset.at(z);
                }
            }

            return this.utils.wrapOutput(output, settings.options.lineWrap);
        }

        
        /**
         * BaseEx Base2048 Decoder.
         * @param {string} input - Base2048/Hex String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(input, ...args) {

            // apply settings
            const settings = this.utils.validateArgs(args);

            // ensure a string input
            input = this.utils.normalizeInput(input);
            const inArray = [...input];

            const charset = this.charsets[settings.version];
            const padChars = this.padChars[settings.version];

            const byteArray = new Array();
            let uint8 = 0;
            let numUint8Bits = 0;

            inArray.forEach((c, i) => {

                let numZBits;
                let z = charset.indexOf(c);
                if (z > -1) { 
                    numZBits = this.converter.bsEnc;
                } else {
                    z = padChars.indexOf(c);

                    if (z > -1) {
                        if (i+1 !== inArray.length) {
                            throw new DecodingError(null, `Secondary character found before end of input, index: ${i}`);    
                        }

                        numZBits = this.converter.bsEncPad;
                    }
                    
                    else if (settings.integrity) {
                        throw new DecodingError(c);
                    }
                }

                // Take most significant bit first
                for (let j=numZBits-1; j>=0; j--) {

                    uint8 = (uint8 << 1) + ((z >> j) & 1);
                    numUint8Bits++;

                    if (numUint8Bits === this.converter.bsDec) {
                        byteArray.push(uint8);
                        uint8 = 0;
                        numUint8Bits = 0;
                    }
                }
            });

            return this.utils.outputHandler.compile(
                Uint8Array.from(byteArray),
                settings.outputType
            );
        }
    }

    /**
     * [BaseEx|SimpleBase Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/simple-base.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */


    /**
     * BaseEx SimpleBase Converter.
     * ---------------------------
     * SimpleBase provides the simple mathematical base
     * conversion as known from (n).toString(radix) and
     * parseInt(n, radix).
     * 
     * The constructor needs a radix between 2-62 as the
     * first argument. In other regards it behaves pretty
     * much as any other converter. 
     */
    class SimpleBase extends BaseTemplate {
        
        /**
         * SimpleBase Constructor.
         * @param {number} radix - Radix between 2 and 62 
         * @param  {...any} args - Converter settings.
         */
        constructor(radix, ...args) {
            super();

            if (!radix || !Number.isInteger(radix) || radix < 2 || radix > 62) {
                throw new RangeError("Radix argument must be provided and has to be an integer between 2 and 62.")
            }
            this.converter = new BaseConverter(radix, 0, 0);


            // charsets
            this.charsets.default = [..."0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"].slice(0, radix);
        

            // predefined settings
            this.frozenCharsets = true;
            this.hasSignedMode = true;
            this.littleEndian = !(radix === 2 || radix === 16);
            this.signed = true;
            this.version = "default";
            
            // list of allowed/disallowed args to change
            this.isMutable.littleEndian = true,
            this.isMutable.upper = radix <= 36;

            // apply user settings
            this.utils.validateArgs(args, true);
        }
        

        /**
         * BaseEx SimpleBase Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...any} [args] - Converter settings.
         * @returns {string} - Base 2-62 encoded string.
         */
        encode(input, ...args) {
            return super.encode(input, null, null, ...args);
        }


        /**
         * BaseEx SimpleBase Decoder.
         * @param {string} input - Base 2-62 String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
        decode(rawInput, ...args) {

            // pre decoding function
            const normalizeInput = ({ input }) => {
                
                // normalize input (add leading zeros) for base 2 and 16
                if (this.converter.radix === 2) {
                    const leadingZeros = (8 - (input.length % 8)) % 8;
                    input = `${"0".repeat(leadingZeros)}${input}`;
                } else if (this.converter.radix === 16) {
                    const leadingZeros = input.length % 2;
                    input = `${"0".repeat(leadingZeros)}${input}`;
                }

                return input;
            };
            
            return super.decode(rawInput, normalizeInput, null, false, ...args);

        }
    }

    /**
     * big.js v6.2.1 // Copyright (c) 2022 Michael Mclaughlin // https://github.com/MikeMcl/big.js/LICENCE.md // Modified (reduced) and minified for BaseEx
     */
    let DP=20,RM=1,MAX_DP=1e6,NE=-7,PE=21,STRICT=!1,NAME="[big.js] ",INVALID=NAME+"Invalid ",INVALID_DP=INVALID+"decimal places",INVALID_RM=INVALID+"rounding mode",P={},NUMERIC=/^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;function _Big_(){function Big(n){let x=this;if(!(x instanceof Big))return void 0===n?_Big_():new Big(n);if(n instanceof Big)x.s=n.s,x.e=n.e,x.c=n.c.slice();else {if("string"!=typeof n){if(!0===Big.strict&&"bigint"!=typeof n)throw TypeError(INVALID+"value");n=0===n&&1/n<0?"-0":String(n);}parse(x,n);}x.constructor=Big;}return Big.prototype=P,Big.DP=DP,Big.RM=RM,Big.NE=NE,Big.PE=PE,Big.strict=STRICT,Big.roundDown=0,Big.roundHalfUp=1,Big.roundHalfEven=2,Big.roundUp=3,Big}function parse(x,n){let e,i,nl;if(!NUMERIC.test(n))throw Error(`${INVALID}number`);for(x.s="-"==n.charAt(0)?(n=n.slice(1),-1):1,(e=n.indexOf("."))>-1&&(n=n.replace(".","")),(i=n.search(/e/i))>0?(e<0&&(e=i),e+=+n.slice(i+1),n=n.substring(0,i)):e<0&&(e=n.length),nl=n.length,i=0;i<nl&&"0"==n.charAt(i);)++i;if(i==nl)x.c=[x.e=0];else {for(;nl>0&&"0"==n.charAt(--nl););for(x.e=e-i-1,x.c=[],e=0;i<=nl;)x.c[e++]=+n.charAt(i++);}return x}function round(x,sd,rm,more){let xc=x.c;if(void 0===rm&&(rm=x.constructor.RM),0!==rm&&1!==rm&&2!==rm&&3!==rm)throw Error(INVALID_RM);if(sd<1)more=3===rm&&(more||!!xc[0])||0===sd&&(1===rm&&xc[0]>=5||2===rm&&(xc[0]>5||5===xc[0]&&(more||void 0!==xc[1]))),xc.length=1,more?(x.e=x.e-sd+1,xc[0]=1):xc[0]=x.e=0;else if(sd<xc.length){if(more=1===rm&&xc[sd]>=5||2===rm&&(xc[sd]>5||5===xc[sd]&&(more||void 0!==xc[sd+1]||1&xc[sd-1]))||3===rm&&(more||!!xc[0]),xc.length=sd,more)for(;++xc[--sd]>9;)if(xc[sd]=0,0===sd){++x.e,xc.unshift(1);break}for(sd=xc.length;!xc[--sd];)xc.pop();}return x}function stringify(x,doExponential,isNonzero){let e=x.e,s=x.c.join(""),n=s.length;if(doExponential)s=s.charAt(0)+(n>1?"."+s.slice(1):"")+(e<0?"e":"e+")+e;else if(e<0){for(;++e;)s="0"+s;s="0."+s;}else if(e>0)if(++e>n)for(e-=n;e--;)s+="0";else e<n&&(s=s.slice(0,e)+"."+s.slice(e));else n>1&&(s=s.charAt(0)+"."+s.slice(1));return x.s<0&&isNonzero?"-"+s:s}P.abs=function(){let x=new this.constructor(this);return x.s=1,x},P.cmp=function(y){let isneg,x=this,xc=x.c,yc=(y=new x.constructor(y)).c,i=x.s,j=y.s,k=x.e,l=y.e;if(!xc[0]||!yc[0])return xc[0]?i:yc[0]?-j:0;if(i!=j)return i;if(isneg=i<0,k!=l)return k>l^isneg?1:-1;for(j=(k=xc.length)<(l=yc.length)?k:l,i=-1;++i<j;)if(xc[i]!=yc[i])return xc[i]>yc[i]^isneg?1:-1;return k==l?0:k>l^isneg?1:-1},P.eq=function(y){return 0===this.cmp(y)},P.gt=function(y){return this.cmp(y)>0},P.gte=function(y){return this.cmp(y)>-1},P.lt=function(y){return this.cmp(y)<0},P.lte=function(y){return this.cmp(y)<1},P.minus=P.sub=function(y){let i,j,t,xlty,x=this,Big=x.constructor,a=x.s,b=(y=new Big(y)).s;if(a!=b)return y.s=-b,x.plus(y);let xc=x.c.slice(),xe=x.e,yc=y.c,ye=y.e;if(!xc[0]||!yc[0])return yc[0]?y.s=-b:xc[0]?y=new Big(x):y.s=1,y;if(a=xe-ye){for((xlty=a<0)?(a=-a,t=xc):(ye=xe,t=yc),t.reverse(),b=a;b--;)t.push(0);t.reverse();}else for(j=((xlty=xc.length<yc.length)?xc:yc).length,a=b=0;b<j;b++)if(xc[b]!=yc[b]){xlty=xc[b]<yc[b];break}if(xlty&&(t=xc,xc=yc,yc=t,y.s=-y.s),(b=(j=yc.length)-(i=xc.length))>0)for(;b--;)xc[i++]=0;for(b=i;j>a;){if(xc[--j]<yc[j]){for(i=j;i&&!xc[--i];)xc[i]=9;--xc[i],xc[j]+=10;}xc[j]-=yc[j];}for(;0===xc[--b];)xc.pop();for(;0===xc[0];)xc.shift(),--ye;return xc[0]||(y.s=1,xc=[ye=0]),y.c=xc,y.e=ye,y},P.plus=P.add=function(y){let e,k,t,x=this,Big=x.constructor;if(y=new Big(y),x.s!=y.s)return y.s=-y.s,x.minus(y);let xe=x.e,xc=x.c,ye=y.e,yc=y.c;if(!xc[0]||!yc[0])return yc[0]||(xc[0]?y=new Big(x):y.s=x.s),y;if(xc=xc.slice(),e=xe-ye){for(e>0?(ye=xe,t=yc):(e=-e,t=xc),t.reverse();e--;)t.push(0);t.reverse();}for(xc.length-yc.length<0&&(t=yc,yc=xc,xc=t),e=yc.length,k=0;e;xc[e]%=10)k=(xc[--e]=xc[e]+yc[e]+k)/10|0;for(k&&(xc.unshift(k),++ye),e=xc.length;0===xc[--e];)xc.pop();return y.c=xc,y.e=ye,y},P.round=function(dp,rm){if(void 0===dp)dp=0;else if(dp!==~~dp||dp<-MAX_DP||dp>MAX_DP)throw Error(INVALID_DP);return round(new this.constructor(this),dp+this.e+1,rm)},P.toFixed=function(dp,rm){let x=this,n=x.c[0];if(void 0!==dp){if(dp!==~~dp||dp<0||dp>MAX_DP)throw Error(INVALID_DP);for(x=round(new x.constructor(x),dp+x.e+1,rm),dp=dp+x.e+1;x.c.length<dp;)x.c.push(0);}return stringify(x,!1,!!n)},P[Symbol.for("nodejs.util.inspect.custom")]=P.toJSON=P.toString=function(){let x=this,Big=x.constructor;return stringify(x,x.e<=Big.NE||x.e>=Big.PE,!!x.c[0])},P.toNumber=function(){let n=Number(stringify(this,!0,!0));if(!0===this.constructor.strict&&!this.eq(n.toString()))throw Error(NAME+"Imprecise conversion");return n};const Big=_Big_();

    /**
     * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Base Phi Converter.
     * ------------------------
     * 
     * This is a base phi converter. Various input can be 
     * converted to a base phi string or a base phi string
     * can be decoded into various formats.
     * 
     */
    class BasePhi extends BaseTemplate {

        #Phi = Big("1.618033988749894848204586834365638117720309179805762862135448622705260462818902449707207204189391137484754088075386891752");
        
        /**
         * BaseEx basE91 Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {
            super();

            // converter (properties only)
            this.converter = {
                radix: 2, // radix is Phi, but the normalized representation allows two chars
                bsEnc: 0,
                bsDec: 0
            };

            // base10 converter to have always have a numerical input 
            this.b10 = new BaseConverter(10, 0, 0);

            // charsets
            this.charsets.default = ["0", "1"];

            this.version = "default";
            this.signed = true;
            this.hasDecimalMode = true;

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx BasePhi Encoder.
         * @param {*} input - Input according to the used byte converter.
         * @param  {...string} [args] - Converter settings.
         * @returns {string} - BasePhi encoded string.
         */
        encode(input, ...args) {
            
            // argument validation and input settings
            const settings = this.utils.validateArgs(args);
            const charset = this.charsets[settings.version];
            
            let inputBytes;
            let negative;
            let n;
            let output = "";

            // Base Phi allows direct encoding of rational 
            // and irrational numbers, which can be enabled
            // by using the special type "decimal". Input 
            // type must be "Number" for this mode. 
            if (settings.decimalMode) {
                if (Number.isFinite(input)) {
                    if (input < 0) {
                        negative = true;
                        n = Big(-input);
                    } else {
                        negative = false;
                        n = Big(input);
                    }       
                }

                else {
                    throw new TypeError("When running the converter in decimal-mode, only input of type 'Number' is allowed.")
                }
            }

            // Every other type first converts the byte representation
            // of the input to base 10.
            else {
                [ inputBytes, negative, ] = this.utils.inputHandler.toBytes(input, settings);
                n = Big(
                    this.b10.encode(inputBytes, null, settings.littleEndian)[0]
                );
            }

            // if "n" if 0 or 1 stop here and return 0 or 1 (according to the charset)
            if (n.eq(0) || n.eq(1)) {
                output = charset[n.toNumber()]; 
                if (negative) {
                    output = `-${output}`;
                }           
                return output;
            }
            
            // create two arrays to store all exponents
            const exponents = [];
            const decExponents = [];


            // The very first step is to find the highest exponent
            // of Phi which fits into "n" (the rounded highest exponent
            // is also the highest Lucas number which fits into "n")
            // To find the highest fitting exponent start with 
            // Phi^0 (1) and Phi^1 (Phi).

            let last = Big(1);
            let cur = this.#Phi;
            let exp = 0;
            
            // Now add the result with the last higher value "cur",
            // util "cur" is bigger than "n"
            while (cur.lt(n)) {
                [ last, cur ] = this.#nextPhiExp(last, cur);
                exp++;
            }
            
            /**
             * Recursive reduction function for "n". Finds the largest
             * fitting exponent of Phi (Lucas index), stores that index
             * in the exponent arrays and reduces "n" by the current exponents
             * power.
             * Once started, it calls itself until "n" is zero.  
             * @param {Object} cur - Current result of Phi^exp as a Big.js object. 
             * @param {Object} prev - Previous result of Phi^exp as a Big.js object. 
             * @param {number} exp - Exponent of Phi/Lucas index. 
             */
            const reduceN = (cur, prev, exp) => {

                // Due to the high floating point precision "n" should
                // be exactly zero, but if not, an approximation is 
                // sufficient.
                if (this.#approxNull(n)) return;

                // Reduce the exponents of Phi until it power fits into "n" 
                while (cur.gt(n)) {
                    [ cur, prev ] = this.#prevPhiExp(cur, prev);
                    
                    // if "cur" gets negative return immediately
                    // prevent an infinite loop
                    if (cur.lte(0)) {
                        console.warn("Could not find an exact base-phi representation. Value is approximated.");
                        return;
                    }
                    exp--;
                }

                // Store the exponents
                if (exp > -1) {
                    exponents.unshift(exp);
                } else {
                    decExponents.push(exp);
                }

                // Reduce "n"
                n = n.minus(cur);

                reduceN(cur, prev, exp);
            };

            // Initial call of the reduction function
            reduceN(last, cur, exp);


            // Create a BasePhi string by setting a "1" at every
            // index stored in the "exponent" array. for every
            // number between two indices a zero is added. 
            exp = 0; 
            exponents.forEach(nExp => {
                while (exp < nExp) {
                    output = `${charset[0]}${output}`;
                    exp++;
                }
                output = `${charset[1]}${output}`;
                exp++;
            });

            // Add a decimal point
            if (!output) {
                output = "0.";
            } else {
                output += ".";
            }
            
            // Proceed with the decimal exponents
            exp = -1;
            decExponents.forEach(nExp => {
                while (exp > nExp) {
                    output += charset[0];
                    exp--;
                }
                output += charset[1];
                exp--;
            });

            // Add a "-" if the input is negative.
            if (negative) {
                output = `-${output}`;
            }
     
            return output;
        }


        /**
         * BaseEx Base Phi Decoder.
         * @param {string} input - Base Phi String.
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output according to converter settings.
         */
         decode(input, ...args) {
            
            // Argument validation and output settings
            const settings = this.utils.validateArgs(args);
            const charset = this.charsets[settings.version];

            let negative;
            [ input, negative ] = this.utils.extractSign(
                this.utils.normalizeInput(input)
            );

            // remove unwanted characters if integrity is false
            if (!settings.integrity) {
                const testChars = [...charset, "."];
                input = [...input].filter(c => testChars.includes(c)).join("");
            }
            
            // Split the input String at the decimal sign
            // and initialize a big.js-object with value 0
            const inputSplit = input.split(".");
            if (settings.integrity && inputSplit.length > 2) {
                throw new DecodingError(null, "There are multiple decimal points in the input.");
            } 

            const [ posExpStr, decExpStr ] = inputSplit;
            let n = Big(0);

            // Initialize two variables "last" and "cur"
            // for Phi^exp-1 and Phi^exp
            let last = this.#Phi.minus(1);
            let cur = Big(1); 
            
            // Convert the left side of the input string
            // to an array of chars and reverse it. Raise
            // the exponent of Phi and its values until a
            // one is found in the array, if a "1" was found
            // add the value "cur" to number "n" (one can
            // also be another corresponding char of the set
            // which represents 1).
            [...posExpStr].reverse().forEach((char) => {
                const charIndex = charset.indexOf(char);
                if (charIndex === 1) {
                    n = n.plus(cur);
                } else if (charIndex !== 0) {
                    throw new DecodingError(char);
                }
                [ last, cur ] = this.#nextPhiExp(last, cur);
            });

            // Now also add the values for the decimal places.
            if (decExpStr) {      
                let prev = Big(1); 
                cur = this.#Phi.minus(prev);
                
                [...decExpStr].forEach((char) => {
                    const charIndex = charset.indexOf(char);
                    if (charIndex === 1) {
                        n = n.plus(cur);
                    } else if (charIndex !== 0) {
                        throw new DecodingError(char);
                    }
                    [ cur, prev ] = this.#prevPhiExp(cur, prev);
                });
            }

            // If running in decimal mode return n as a Number
            if (settings.decimalMode) {
                return n.toNumber();
            }

            // For every other case round "n" and turn it
            // into a string of an integer. 
            n = n.round().toFixed();

            // Use the base 10 decoder to get the byte
            // representation of "n".
            const output = this.b10.decode(n, [..."0123456789"], [], settings.integrity, settings.littleEndian);
     
            // Return the output according to the settings.
            return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
        }

        /**
         * Test if n is approximately zero.
         * @param {Object} n - Big.js Object. 
         * @returns {Boolean}
         */
        #approxNull(n) { 
            return !(n.round(50)
                .abs()
                .toNumber()
            );
        }
        
        /**
         * Get the results of of the following exponents of Phi
         * from the predecessors.
         * @param {Object} last - Phi^exp-1 as a big.js-object 
         * @param {Object} cur - Phi^exp as a big.js-object
         * @returns {Object[]} - Array with Phi^exp and Phi^exp+1
         */
        #nextPhiExp(last, cur) {
            return [ cur, last.plus(cur) ];
        }

        /**
         * Get the results of of the previous exponents of Phi
         * from the predecessors.
         * @param {Object} cur - Phi^exp as a big.js-object 
         * @param {Object} prev - Phi^exp-1 as a big.js-object
         * @returns {Object[]} - Array with Phi^exp-1 and Phi^exp
         */
        #prevPhiExp(cur, prev) {
            return [ prev.minus(cur), cur ];
        }
    }

    /**
     * [BaseEx|Byte Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/byte-converter.js}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    // Endianness of the system
    const LITTLE_ENDIAN = (() => {
        const testInt = new Uint16Array([1]);
        const byteRepresentation = new Uint8Array(testInt.buffer);
        return Boolean(byteRepresentation.at(0));
    })();


    /**
     * BaseEx Byte Converter.
     * ---------------------
     * 
     * This is a byte converter. Various input can be 
     * converted to a bytes or bytes can be decoded into
     * various formats.
     * 
     * As en- and decoder were already available, for the
     * use of converting in- and output for the base
     * converters, this is just a little extra tool, which
     * was fast and easy to create.
     */
    class ByteConverter {

        /**
         * BaseEx ByteConverter Constructor.
         * @param {...string} [args] - Converter settings.
         */
        constructor(...args) {

            // predefined settings
            this.littleEndian = LITTLE_ENDIAN;
            this.numberMode = false;
            this.outputType = "buffer";

            // simplified utils
            this.utils = {
                validateArgs: (args, initial=false) => {

                    const parameters = {
                        littleEndian: this.littleEndian,
                        numberMode: this.numberMode,
                        outputType: this.outputType,
                        signed: false,
                    };
            
                    if (!args.length) {
                        return parameters;
                    }
            
                    if (args.includes("number")) {
                        args.splice(args.indexOf("number"), 1);
                        parameters.numberMode = true;
                        parameters.outputType = "float_n";
                    }
            
                    const outTypes = SmartOutput.typeList.map(s => `'${s}'`).join(", ");
            
                    args.forEach((arg) => {
                        arg = String(arg).toLowerCase();
            
                        if (arg === "le") {
                            parameters.littleEndian = true;
                        } else if (arg === "be") {
                            parameters.littleEndian = false;
                        } else if (SmartOutput.typeList.includes(arg)) {
                            parameters.outputType = arg;
                        } else {
                            throw new TypeError(`Invalid argument: '${arg}.\nValid arguments are:\n'le', 'be', ${outTypes}`);
                        }
                    });
                    
                    if (initial) {
                        for (const param in parameters) {
                            this[param] = parameters[param];
                        }
                    }
            
                    return parameters;
                }
            };

            // apply user settings
            this.utils.validateArgs(args, true);
        }


        /**
         * BaseEx Byte Encoder.
         * @param {*} input - Almost any input.
         * @param  {...str} [args] - Converter settings.
         * @returns {{ buffer: ArrayBufferLike; }} - Bytes of Input.
         */
        encode(input, ...args) {
            const settings = this.utils.validateArgs(args);
            return SmartInput.toBytes(input, settings)[0];
        }


        /**
         * BaseEx Byte Decoder.
         * @param {{ buffer: ArrayBufferLike; }} input - Bytes/Buffer/View
         * @param  {...any} [args] - Converter settings.
         * @returns {*} - Output of requested type.
         */
        decode(input, ...args) {
            const settings = this.utils.validateArgs(args);
            return SmartOutput.compile(input, settings.outputType, settings.littleEndian);
        }
    }

    /**
     * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
     *
     * @version 0.7.4
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license MIT
     */

    /**
     * BaseEx Converter Collection.
     * ---------------------------
     * This class holds almost any available converter
     * of the whole BaseEx converter collection. The 
     * instances are ready to use. Various input can be 
     * converted to a base string or the base string can be
     * decoded into various formats.
     */
    class BaseEx {
        
        /**
         * BaseEx Base Collection Constructor.
         * @param {string} [outputType] - Output type. 
         */
        constructor(outputType="buffer") {

            if (!DEFAULT_OUTPUT_HANDLER.typeList.includes(outputType)) {
                let message = `Invalid argument '${outputType}' for output type. Allowed types are:\n`;
                message = message.concat(DEFAULT_OUTPUT_HANDLER.typeList.join(", "));

                throw new TypeError(message);
            }

            this.base1 = new Base1("default", outputType);
            this.base16 = new Base16("default", outputType);
            this.base32_crockford = new Base32("rfc4648", outputType);
            this.base32_rfc3548 = new Base32("rfc3548", outputType);
            this.base32_rfc4648 = new Base32("rfc4648", outputType);
            this.base32_zbase32 = new Base32("zbase32", outputType);
            this.base58 = new Base58("default", outputType);
            this.base58_bitcoin = new Base58("bitcoin", outputType);
            this.base58_flickr = new Base58("flickr", outputType);
            this.base64 = new Base64("default", outputType);
            this.base64_urlsafe = new Base64("urlsafe", outputType);
            this.uuencode = new UUencode("default", outputType);
            this.xxencode = new UUencode("xx", outputType);
            this.base85_adobe = new Base85("adobe", outputType);
            this.base85_ascii = new Base85("ascii85", outputType);
            this.base85_z85 = new Base85("z85", outputType);
            this.base91 = new Base91("default",outputType);
            this.leb128 = new LEB128("default", outputType);
            this.ecoji_v1 = new Ecoji("emojis_v1", outputType);
            this.ecoji_v2 = new Ecoji("emojis_v2", outputType);
            this.base2048 = new Base2048("default", outputType);
            this.basePhi = new BasePhi("default", outputType);
            this.byteConverter = new ByteConverter(outputType);

            this.simpleBase = {};
            for (let i=2; i<=62; i++) {
                this.simpleBase[`base${i}`] = new SimpleBase(i, outputType);
            }
        }
    }

    exports.Base1 = Base1;
    exports.Base16 = Base16;
    exports.Base2048 = Base2048;
    exports.Base32 = Base32;
    exports.Base58 = Base58;
    exports.Base64 = Base64;
    exports.Base85 = Base85;
    exports.Base91 = Base91;
    exports.BaseEx = BaseEx;
    exports.BasePhi = BasePhi;
    exports.ByteConverter = ByteConverter;
    exports.Ecoji = Ecoji;
    exports.LEB128 = LEB128;
    exports.SimpleBase = SimpleBase;
    exports.UUencode = UUencode;

    return exports;

})({});
