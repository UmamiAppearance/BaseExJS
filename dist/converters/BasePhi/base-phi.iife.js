var BasePhi = (function () {
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

    class CharsetError extends TypeError {
        constructor(char) {
            super(`Invalid input. Character: '${char}' is not part of the charset.`);
            this.name = "CharsetError";
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

            const IOHandlerHint = (initial) ? "\n * valid declarations for IO handlers are 'bytesOnly', 'bytesIn', 'bytesOut'" : ""; 
            const signedHint = (this.root.isMutable.signed) ? "\n * pass 'signed' to disable, 'unsigned' to enable the use of the twos's complement for negative integers" : "";
            const endiannessHint = (this.root.isMutable.littleEndian) ? "\n * 'be' for big , 'le' for little endian byte order for case conversion" : "";
            const padHint = (this.root.isMutable.padding) ? "\n * pass 'pad' to fill up, 'nopad' to not fill up the output with the particular padding" : "";
            const caseHint = (this.root.isMutable.upper) ? "\n * valid args for changing the encoded output case are 'upper' and 'lower'" : "";
            const outputHint = `\n * valid args for the output type are ${this.#makeArgList(outputTypes)}`;
            const versionHint = (versions) ? `\n * the option(s) for version/charset are: ${this.#makeArgList(versions)}` : "";
            const integrityHint = "\n * valid args for integrity check are: 'integrity' and 'nointegrity'";
            const numModeHint = "\n * 'number' for number-mode (converts every number into a Float64Array to keep the natural js number type)";
            const converterArgsHint = Object.keys(this.converterArgs).length ? `\n * converter specific args:\n   - ${loopConverterArgs()}` : "";
            
            throw new TypeError(`'${arg}'\n\nParameters:${IOHandlerHint}${signedHint}${endiannessHint}${padHint}${caseHint}${outputHint}${versionHint}${integrityHint}${numModeHint}${converterArgsHint}\n\nTraceback:`);
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
            else if (extractArg("decimal")) {
                parameters.decimalMode = true;
                parameters.outputType = "decimal";
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
         * @param {boolean} [keepNL=false] - If set to false, the newline character is getting removed from the input if present.
         * @returns {string} - Normalized input.
         */
        normalizeInput(input, keepNL=false) {
            if (keepNL) {
                return String(input);
            }
            return String(input).replace(/\n/g, "");
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
                    throw new CharsetError(c);
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

    /*
     *  big.js v6.2.1
     *  A small, fast, easy-to-use library for arbitrary-precision decimal arithmetic.
     *  Copyright (c) 2022 Michael Mclaughlin
     *  https://github.com/MikeMcl/big.js/LICENCE.md
     */


    /************************************** EDITABLE DEFAULTS *****************************************/


      // The default values below must be integers within the stated ranges.

      /*
       * The maximum number of decimal places (DP) of the results of operations involving division:
       * div and sqrt, and pow with negative exponents.
       */
    var DP = 20,          // 0 to MAX_DP

      /*
       * The rounding mode (RM) used when rounding to the above decimal places.
       *
       *  0  Towards zero (i.e. truncate, no rounding).       (ROUND_DOWN)
       *  1  To nearest neighbour. If equidistant, round up.  (ROUND_HALF_UP)
       *  2  To nearest neighbour. If equidistant, to even.   (ROUND_HALF_EVEN)
       *  3  Away from zero.                                  (ROUND_UP)
       */
      RM = 1,             // 0, 1, 2 or 3

      // The maximum value of DP and Big.DP.
      MAX_DP = 1E6,       // 0 to 1000000

      // The maximum magnitude of the exponent argument to the pow method.
      MAX_POWER = 1E6,    // 1 to 1000000

      /*
       * The negative exponent (NE) at and beneath which toString returns exponential notation.
       * (JavaScript numbers: -7)
       * -1000000 is the minimum recommended exponent value of a Big.
       */
      NE = -7,            // 0 to -1000000

      /*
       * The positive exponent (PE) at and above which toString returns exponential notation.
       * (JavaScript numbers: 21)
       * 1000000 is the maximum recommended exponent value of a Big, but this limit is not enforced.
       */
      PE = 21,            // 0 to 1000000

      /*
       * When true, an error will be thrown if a primitive number is passed to the Big constructor,
       * or if valueOf is called, or if toNumber is called on a Big which cannot be converted to a
       * primitive number without a loss of precision.
       */
      STRICT = false,     // true or false


    /**************************************************************************************************/


      // Error messages.
      NAME = '[big.js] ',
      INVALID = NAME + 'Invalid ',
      INVALID_DP = INVALID + 'decimal places',
      INVALID_RM = INVALID + 'rounding mode',
      DIV_BY_ZERO = NAME + 'Division by zero',

      // The shared prototype object.
      P = {},
      UNDEFINED = void 0,
      NUMERIC = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;


    /*
     * Create and return a Big constructor.
     */
    function _Big_() {

      /*
       * The Big constructor and exported function.
       * Create and return a new instance of a Big number object.
       *
       * n {number|string|Big} A numeric value.
       */
      function Big(n) {
        var x = this;

        // Enable constructor usage without new.
        if (!(x instanceof Big)) return n === UNDEFINED ? _Big_() : new Big(n);

        // Duplicate.
        if (n instanceof Big) {
          x.s = n.s;
          x.e = n.e;
          x.c = n.c.slice();
        } else {
          if (typeof n !== 'string') {
            if (Big.strict === true && typeof n !== 'bigint') {
              throw TypeError(INVALID + 'value');
            }

            // Minus zero?
            n = n === 0 && 1 / n < 0 ? '-0' : String(n);
          }

          parse(x, n);
        }

        // Retain a reference to this Big constructor.
        // Shadow Big.prototype.constructor which points to Object.
        x.constructor = Big;
      }

      Big.prototype = P;
      Big.DP = DP;
      Big.RM = RM;
      Big.NE = NE;
      Big.PE = PE;
      Big.strict = STRICT;
      Big.roundDown = 0;
      Big.roundHalfUp = 1;
      Big.roundHalfEven = 2;
      Big.roundUp = 3;

      return Big;
    }


    /*
     * Parse the number or string value passed to a Big constructor.
     *
     * x {Big} A Big number instance.
     * n {number|string} A numeric value.
     */
    function parse(x, n) {
      var e, i, nl;

      if (!NUMERIC.test(n)) {
        throw Error(INVALID + 'number');
      }

      // Determine sign.
      x.s = n.charAt(0) == '-' ? (n = n.slice(1), -1) : 1;

      // Decimal point?
      if ((e = n.indexOf('.')) > -1) n = n.replace('.', '');

      // Exponential form?
      if ((i = n.search(/e/i)) > 0) {

        // Determine exponent.
        if (e < 0) e = i;
        e += +n.slice(i + 1);
        n = n.substring(0, i);
      } else if (e < 0) {

        // Integer.
        e = n.length;
      }

      nl = n.length;

      // Determine leading zeros.
      for (i = 0; i < nl && n.charAt(i) == '0';) ++i;

      if (i == nl) {

        // Zero.
        x.c = [x.e = 0];
      } else {

        // Determine trailing zeros.
        for (; nl > 0 && n.charAt(--nl) == '0';);
        x.e = e - i - 1;
        x.c = [];

        // Convert string to array of digits without leading/trailing zeros.
        for (e = 0; i <= nl;) x.c[e++] = +n.charAt(i++);
      }

      return x;
    }


    /*
     * Round Big x to a maximum of sd significant digits using rounding mode rm.
     *
     * x {Big} The Big to round.
     * sd {number} Significant digits: integer, 0 to MAX_DP inclusive.
     * rm {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
     * [more] {boolean} Whether the result of division was truncated.
     */
    function round(x, sd, rm, more) {
      var xc = x.c;

      if (rm === UNDEFINED) rm = x.constructor.RM;
      if (rm !== 0 && rm !== 1 && rm !== 2 && rm !== 3) {
        throw Error(INVALID_RM);
      }

      if (sd < 1) {
        more =
          rm === 3 && (more || !!xc[0]) || sd === 0 && (
          rm === 1 && xc[0] >= 5 ||
          rm === 2 && (xc[0] > 5 || xc[0] === 5 && (more || xc[1] !== UNDEFINED))
        );

        xc.length = 1;

        if (more) {

          // 1, 0.1, 0.01, 0.001, 0.0001 etc.
          x.e = x.e - sd + 1;
          xc[0] = 1;
        } else {

          // Zero.
          xc[0] = x.e = 0;
        }
      } else if (sd < xc.length) {

        // xc[sd] is the digit after the digit that may be rounded up.
        more =
          rm === 1 && xc[sd] >= 5 ||
          rm === 2 && (xc[sd] > 5 || xc[sd] === 5 &&
            (more || xc[sd + 1] !== UNDEFINED || xc[sd - 1] & 1)) ||
          rm === 3 && (more || !!xc[0]);

        // Remove any digits after the required precision.
        xc.length = sd;

        // Round up?
        if (more) {

          // Rounding up may mean the previous digit has to be rounded up.
          for (; ++xc[--sd] > 9;) {
            xc[sd] = 0;
            if (sd === 0) {
              ++x.e;
              xc.unshift(1);
              break;
            }
          }
        }

        // Remove trailing zeros.
        for (sd = xc.length; !xc[--sd];) xc.pop();
      }

      return x;
    }


    /*
     * Return a string representing the value of Big x in normal or exponential notation.
     * Handles P.toExponential, P.toFixed, P.toJSON, P.toPrecision, P.toString and P.valueOf.
     */
    function stringify(x, doExponential, isNonzero) {
      var e = x.e,
        s = x.c.join(''),
        n = s.length;

      // Exponential notation?
      if (doExponential) {
        s = s.charAt(0) + (n > 1 ? '.' + s.slice(1) : '') + (e < 0 ? 'e' : 'e+') + e;

      // Normal notation.
      } else if (e < 0) {
        for (; ++e;) s = '0' + s;
        s = '0.' + s;
      } else if (e > 0) {
        if (++e > n) {
          for (e -= n; e--;) s += '0';
        } else if (e < n) {
          s = s.slice(0, e) + '.' + s.slice(e);
        }
      } else if (n > 1) {
        s = s.charAt(0) + '.' + s.slice(1);
      }

      return x.s < 0 && isNonzero ? '-' + s : s;
    }


    // Prototype/instance methods


    /*
     * Return a new Big whose value is the absolute value of this Big.
     */
    P.abs = function () {
      var x = new this.constructor(this);
      x.s = 1;
      return x;
    };


    /*
     * Return 1 if the value of this Big is greater than the value of Big y,
     *       -1 if the value of this Big is less than the value of Big y, or
     *        0 if they have the same value.
     */
    P.cmp = function (y) {
      var isneg,
        x = this,
        xc = x.c,
        yc = (y = new x.constructor(y)).c,
        i = x.s,
        j = y.s,
        k = x.e,
        l = y.e;

      // Either zero?
      if (!xc[0] || !yc[0]) return !xc[0] ? !yc[0] ? 0 : -j : i;

      // Signs differ?
      if (i != j) return i;

      isneg = i < 0;

      // Compare exponents.
      if (k != l) return k > l ^ isneg ? 1 : -1;

      j = (k = xc.length) < (l = yc.length) ? k : l;

      // Compare digit by digit.
      for (i = -1; ++i < j;) {
        if (xc[i] != yc[i]) return xc[i] > yc[i] ^ isneg ? 1 : -1;
      }

      // Compare lengths.
      return k == l ? 0 : k > l ^ isneg ? 1 : -1;
    };


    /*
     * Return a new Big whose value is the value of this Big divided by the value of Big y, rounded,
     * if necessary, to a maximum of Big.DP decimal places using rounding mode Big.RM.
     */
    P.div = function (y) {
      var x = this,
        Big = x.constructor,
        a = x.c,                  // dividend
        b = (y = new Big(y)).c,   // divisor
        k = x.s == y.s ? 1 : -1,
        dp = Big.DP;

      if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
        throw Error(INVALID_DP);
      }

      // Divisor is zero?
      if (!b[0]) {
        throw Error(DIV_BY_ZERO);
      }

      // Dividend is 0? Return +-0.
      if (!a[0]) {
        y.s = k;
        y.c = [y.e = 0];
        return y;
      }

      var bl, bt, n, cmp, ri,
        bz = b.slice(),
        ai = bl = b.length,
        al = a.length,
        r = a.slice(0, bl),   // remainder
        rl = r.length,
        q = y,                // quotient
        qc = q.c = [],
        qi = 0,
        p = dp + (q.e = x.e - y.e) + 1;    // precision of the result

      q.s = k;
      k = p < 0 ? 0 : p;

      // Create version of divisor with leading zero.
      bz.unshift(0);

      // Add zeros to make remainder as long as divisor.
      for (; rl++ < bl;) r.push(0);

      do {

        // n is how many times the divisor goes into current remainder.
        for (n = 0; n < 10; n++) {

          // Compare divisor and remainder.
          if (bl != (rl = r.length)) {
            cmp = bl > rl ? 1 : -1;
          } else {
            for (ri = -1, cmp = 0; ++ri < bl;) {
              if (b[ri] != r[ri]) {
                cmp = b[ri] > r[ri] ? 1 : -1;
                break;
              }
            }
          }

          // If divisor < remainder, subtract divisor from remainder.
          if (cmp < 0) {

            // Remainder can't be more than 1 digit longer than divisor.
            // Equalise lengths using divisor with extra leading zero?
            for (bt = rl == bl ? b : bz; rl;) {
              if (r[--rl] < bt[rl]) {
                ri = rl;
                for (; ri && !r[--ri];) r[ri] = 9;
                --r[ri];
                r[rl] += 10;
              }
              r[rl] -= bt[rl];
            }

            for (; !r[0];) r.shift();
          } else {
            break;
          }
        }

        // Add the digit n to the result array.
        qc[qi++] = cmp ? n : ++n;

        // Update the remainder.
        if (r[0] && cmp) r[rl] = a[ai] || 0;
        else r = [a[ai]];

      } while ((ai++ < al || r[0] !== UNDEFINED) && k--);

      // Leading zero? Do not remove if result is simply zero (qi == 1).
      if (!qc[0] && qi != 1) {

        // There can't be more than one zero.
        qc.shift();
        q.e--;
        p--;
      }

      // Round?
      if (qi > p) round(q, p, Big.RM, r[0] !== UNDEFINED);

      return q;
    };


    /*
     * Return true if the value of this Big is equal to the value of Big y, otherwise return false.
     */
    P.eq = function (y) {
      return this.cmp(y) === 0;
    };


    /*
     * Return true if the value of this Big is greater than the value of Big y, otherwise return
     * false.
     */
    P.gt = function (y) {
      return this.cmp(y) > 0;
    };


    /*
     * Return true if the value of this Big is greater than or equal to the value of Big y, otherwise
     * return false.
     */
    P.gte = function (y) {
      return this.cmp(y) > -1;
    };


    /*
     * Return true if the value of this Big is less than the value of Big y, otherwise return false.
     */
    P.lt = function (y) {
      return this.cmp(y) < 0;
    };


    /*
     * Return true if the value of this Big is less than or equal to the value of Big y, otherwise
     * return false.
     */
    P.lte = function (y) {
      return this.cmp(y) < 1;
    };


    /*
     * Return a new Big whose value is the value of this Big minus the value of Big y.
     */
    P.minus = P.sub = function (y) {
      var i, j, t, xlty,
        x = this,
        Big = x.constructor,
        a = x.s,
        b = (y = new Big(y)).s;

      // Signs differ?
      if (a != b) {
        y.s = -b;
        return x.plus(y);
      }

      var xc = x.c.slice(),
        xe = x.e,
        yc = y.c,
        ye = y.e;

      // Either zero?
      if (!xc[0] || !yc[0]) {
        if (yc[0]) {
          y.s = -b;
        } else if (xc[0]) {
          y = new Big(x);
        } else {
          y.s = 1;
        }
        return y;
      }

      // Determine which is the bigger number. Prepend zeros to equalise exponents.
      if (a = xe - ye) {

        if (xlty = a < 0) {
          a = -a;
          t = xc;
        } else {
          ye = xe;
          t = yc;
        }

        t.reverse();
        for (b = a; b--;) t.push(0);
        t.reverse();
      } else {

        // Exponents equal. Check digit by digit.
        j = ((xlty = xc.length < yc.length) ? xc : yc).length;

        for (a = b = 0; b < j; b++) {
          if (xc[b] != yc[b]) {
            xlty = xc[b] < yc[b];
            break;
          }
        }
      }

      // x < y? Point xc to the array of the bigger number.
      if (xlty) {
        t = xc;
        xc = yc;
        yc = t;
        y.s = -y.s;
      }

      /*
       * Append zeros to xc if shorter. No need to add zeros to yc if shorter as subtraction only
       * needs to start at yc.length.
       */
      if ((b = (j = yc.length) - (i = xc.length)) > 0) for (; b--;) xc[i++] = 0;

      // Subtract yc from xc.
      for (b = i; j > a;) {
        if (xc[--j] < yc[j]) {
          for (i = j; i && !xc[--i];) xc[i] = 9;
          --xc[i];
          xc[j] += 10;
        }

        xc[j] -= yc[j];
      }

      // Remove trailing zeros.
      for (; xc[--b] === 0;) xc.pop();

      // Remove leading zeros and adjust exponent accordingly.
      for (; xc[0] === 0;) {
        xc.shift();
        --ye;
      }

      if (!xc[0]) {

        // n - n = +0
        y.s = 1;

        // Result must be zero.
        xc = [ye = 0];
      }

      y.c = xc;
      y.e = ye;

      return y;
    };


    /*
     * Return a new Big whose value is the value of this Big modulo the value of Big y.
     */
    P.mod = function (y) {
      var ygtx,
        x = this,
        Big = x.constructor,
        a = x.s,
        b = (y = new Big(y)).s;

      if (!y.c[0]) {
        throw Error(DIV_BY_ZERO);
      }

      x.s = y.s = 1;
      ygtx = y.cmp(x) == 1;
      x.s = a;
      y.s = b;

      if (ygtx) return new Big(x);

      a = Big.DP;
      b = Big.RM;
      Big.DP = Big.RM = 0;
      x = x.div(y);
      Big.DP = a;
      Big.RM = b;

      return this.minus(x.times(y));
    };


    /*
     * Return a new Big whose value is the value of this Big negated.
     */
    P.neg = function () {
      var x = new this.constructor(this);
      x.s = -x.s;
      return x;
    };


    /*
     * Return a new Big whose value is the value of this Big plus the value of Big y.
     */
    P.plus = P.add = function (y) {
      var e, k, t,
        x = this,
        Big = x.constructor;

      y = new Big(y);

      // Signs differ?
      if (x.s != y.s) {
        y.s = -y.s;
        return x.minus(y);
      }

      var xe = x.e,
        xc = x.c,
        ye = y.e,
        yc = y.c;

      // Either zero?
      if (!xc[0] || !yc[0]) {
        if (!yc[0]) {
          if (xc[0]) {
            y = new Big(x);
          } else {
            y.s = x.s;
          }
        }
        return y;
      }

      xc = xc.slice();

      // Prepend zeros to equalise exponents.
      // Note: reverse faster than unshifts.
      if (e = xe - ye) {
        if (e > 0) {
          ye = xe;
          t = yc;
        } else {
          e = -e;
          t = xc;
        }

        t.reverse();
        for (; e--;) t.push(0);
        t.reverse();
      }

      // Point xc to the longer array.
      if (xc.length - yc.length < 0) {
        t = yc;
        yc = xc;
        xc = t;
      }

      e = yc.length;

      // Only start adding at yc.length - 1 as the further digits of xc can be left as they are.
      for (k = 0; e; xc[e] %= 10) k = (xc[--e] = xc[e] + yc[e] + k) / 10 | 0;

      // No need to check for zero, as +x + +y != 0 && -x + -y != 0

      if (k) {
        xc.unshift(k);
        ++ye;
      }

      // Remove trailing zeros.
      for (e = xc.length; xc[--e] === 0;) xc.pop();

      y.c = xc;
      y.e = ye;

      return y;
    };


    /*
     * Return a Big whose value is the value of this Big raised to the power n.
     * If n is negative, round to a maximum of Big.DP decimal places using rounding
     * mode Big.RM.
     *
     * n {number} Integer, -MAX_POWER to MAX_POWER inclusive.
     */
    P.pow = function (n) {
      var x = this,
        one = new x.constructor('1'),
        y = one,
        isneg = n < 0;

      if (n !== ~~n || n < -MAX_POWER || n > MAX_POWER) {
        throw Error(INVALID + 'exponent');
      }

      if (isneg) n = -n;

      for (;;) {
        if (n & 1) y = y.times(x);
        n >>= 1;
        if (!n) break;
        x = x.times(x);
      }

      return isneg ? one.div(y) : y;
    };


    /*
     * Return a new Big whose value is the value of this Big rounded to a maximum precision of sd
     * significant digits using rounding mode rm, or Big.RM if rm is not specified.
     *
     * sd {number} Significant digits: integer, 1 to MAX_DP inclusive.
     * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
     */
    P.prec = function (sd, rm) {
      if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
        throw Error(INVALID + 'precision');
      }
      return round(new this.constructor(this), sd, rm);
    };


    /*
     * Return a new Big whose value is the value of this Big rounded to a maximum of dp decimal places
     * using rounding mode rm, or Big.RM if rm is not specified.
     * If dp is negative, round to an integer which is a multiple of 10**-dp.
     * If dp is not specified, round to 0 decimal places.
     *
     * dp? {number} Integer, -MAX_DP to MAX_DP inclusive.
     * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
     */
    P.round = function (dp, rm) {
      if (dp === UNDEFINED) dp = 0;
      else if (dp !== ~~dp || dp < -MAX_DP || dp > MAX_DP) {
        throw Error(INVALID_DP);
      }
      return round(new this.constructor(this), dp + this.e + 1, rm);
    };


    /*
     * Return a new Big whose value is the square root of the value of this Big, rounded, if
     * necessary, to a maximum of Big.DP decimal places using rounding mode Big.RM.
     */
    P.sqrt = function () {
      var r, c, t,
        x = this,
        Big = x.constructor,
        s = x.s,
        e = x.e,
        half = new Big('0.5');

      // Zero?
      if (!x.c[0]) return new Big(x);

      // Negative?
      if (s < 0) {
        throw Error(NAME + 'No square root');
      }

      // Estimate.
      s = Math.sqrt(x + '');

      // Math.sqrt underflow/overflow?
      // Re-estimate: pass x coefficient to Math.sqrt as integer, then adjust the result exponent.
      if (s === 0 || s === 1 / 0) {
        c = x.c.join('');
        if (!(c.length + e & 1)) c += '0';
        s = Math.sqrt(c);
        e = ((e + 1) / 2 | 0) - (e < 0 || e & 1);
        r = new Big((s == 1 / 0 ? '5e' : (s = s.toExponential()).slice(0, s.indexOf('e') + 1)) + e);
      } else {
        r = new Big(s + '');
      }

      e = r.e + (Big.DP += 4);

      // Newton-Raphson iteration.
      do {
        t = r;
        r = half.times(t.plus(x.div(t)));
      } while (t.c.slice(0, e).join('') !== r.c.slice(0, e).join(''));

      return round(r, (Big.DP -= 4) + r.e + 1, Big.RM);
    };


    /*
     * Return a new Big whose value is the value of this Big times the value of Big y.
     */
    P.times = P.mul = function (y) {
      var c,
        x = this,
        Big = x.constructor,
        xc = x.c,
        yc = (y = new Big(y)).c,
        a = xc.length,
        b = yc.length,
        i = x.e,
        j = y.e;

      // Determine sign of result.
      y.s = x.s == y.s ? 1 : -1;

      // Return signed 0 if either 0.
      if (!xc[0] || !yc[0]) {
        y.c = [y.e = 0];
        return y;
      }

      // Initialise exponent of result as x.e + y.e.
      y.e = i + j;

      // If array xc has fewer digits than yc, swap xc and yc, and lengths.
      if (a < b) {
        c = xc;
        xc = yc;
        yc = c;
        j = a;
        a = b;
        b = j;
      }

      // Initialise coefficient array of result with zeros.
      for (c = new Array(j = a + b); j--;) c[j] = 0;

      // Multiply.

      // i is initially xc.length.
      for (i = b; i--;) {
        b = 0;

        // a is yc.length.
        for (j = a + i; j > i;) {

          // Current sum of products at this digit position, plus carry.
          b = c[j] + yc[i] * xc[j - i - 1] + b;
          c[j--] = b % 10;

          // carry
          b = b / 10 | 0;
        }

        c[j] = b;
      }

      // Increment result exponent if there is a final carry, otherwise remove leading zero.
      if (b) ++y.e;
      else c.shift();

      // Remove trailing zeros.
      for (i = c.length; !c[--i];) c.pop();
      y.c = c;

      return y;
    };


    /*
     * Return a string representing the value of this Big in exponential notation rounded to dp fixed
     * decimal places using rounding mode rm, or Big.RM if rm is not specified.
     *
     * dp? {number} Decimal places: integer, 0 to MAX_DP inclusive.
     * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
     */
    P.toExponential = function (dp, rm) {
      var x = this,
        n = x.c[0];

      if (dp !== UNDEFINED) {
        if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
          throw Error(INVALID_DP);
        }
        x = round(new x.constructor(x), ++dp, rm);
        for (; x.c.length < dp;) x.c.push(0);
      }

      return stringify(x, true, !!n);
    };


    /*
     * Return a string representing the value of this Big in normal notation rounded to dp fixed
     * decimal places using rounding mode rm, or Big.RM if rm is not specified.
     *
     * dp? {number} Decimal places: integer, 0 to MAX_DP inclusive.
     * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
     *
     * (-0).toFixed(0) is '0', but (-0.1).toFixed(0) is '-0'.
     * (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
     */
    P.toFixed = function (dp, rm) {
      var x = this,
        n = x.c[0];

      if (dp !== UNDEFINED) {
        if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
          throw Error(INVALID_DP);
        }
        x = round(new x.constructor(x), dp + x.e + 1, rm);

        // x.e may have changed if the value is rounded up.
        for (dp = dp + x.e + 1; x.c.length < dp;) x.c.push(0);
      }

      return stringify(x, false, !!n);
    };


    /*
     * Return a string representing the value of this Big.
     * Return exponential notation if this Big has a positive exponent equal to or greater than
     * Big.PE, or a negative exponent equal to or less than Big.NE.
     * Omit the sign for negative zero.
     */
    P[Symbol.for('nodejs.util.inspect.custom')] = P.toJSON = P.toString = function () {
      var x = this,
        Big = x.constructor;
      return stringify(x, x.e <= Big.NE || x.e >= Big.PE, !!x.c[0]);
    };


    /*
     * Return the value of this Big as a primitve number.
     */
    P.toNumber = function () {
      var n = Number(stringify(this, true, true));
      if (this.constructor.strict === true && !this.eq(n.toString())) {
        throw Error(NAME + 'Imprecise conversion');
      }
      return n;
    };


    /*
     * Return a string representing the value of this Big rounded to sd significant digits using
     * rounding mode rm, or Big.RM if rm is not specified.
     * Use exponential notation if sd is less than the number of digits necessary to represent
     * the integer part of the value in normal notation.
     *
     * sd {number} Significant digits: integer, 1 to MAX_DP inclusive.
     * rm? {number} Rounding mode: 0 (down), 1 (half-up), 2 (half-even) or 3 (up).
     */
    P.toPrecision = function (sd, rm) {
      var x = this,
        Big = x.constructor,
        n = x.c[0];

      if (sd !== UNDEFINED) {
        if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
          throw Error(INVALID + 'precision');
        }
        x = round(new Big(x), sd, rm);
        for (; x.c.length < sd;) x.c.push(0);
      }

      return stringify(x, sd <= x.e || x.e <= Big.NE || x.e >= Big.PE, !!n);
    };


    /*
     * Return a string representing the value of this Big.
     * Return exponential notation if this Big has a positive exponent equal to or greater than
     * Big.PE, or a negative exponent equal to or less than Big.NE.
     * Include the sign for negative zero.
     */
    P.valueOf = function () {
      var x = this,
        Big = x.constructor;
      if (Big.strict === true) {
        throw Error(NAME + 'valueOf disallowed');
      }
      return stringify(x, x.e <= Big.NE || x.e >= Big.PE, true);
    };


    // Export


    var Big = _Big_();

    /**
     * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
     *
     * @version 0.5.0
     * @author UmamiAppearance [mail@umamiappearance.eu]
     * @license GPL-3.0
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

            this.b10 = new BaseConverter(10, 0, 0);

            // charsets
            this.charsets.default = ["0", "1"];

            this.version = "default";
            this.signed = true;

            // apply user settings
            this.utils.validateArgs(args, true);

            // mutable extra args
            this.isMutable.integrity = false;
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
            const charset = this.charsets[settings.version];
            
            let inputBytes;
            let negative;
            let n;
            let output = "";

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
                    throw new TypeError("When running the converter in 'decimalMode' only input of type Number is allowed.")
                }
            }

            else {
                [ inputBytes, negative, ] = this.utils.inputHandler.toBytes(input, settings);
                n = Big(
                    this.b10.encode(inputBytes, null, settings.littleEndian)[0]
                );
            }

            if (n.eq(0) || n.eq(1)) {
                output = charset[n.toNumber()]; 
                if (negative) {
                    output = `-${output}`;
                }           
                return output;
            }
            
            const exponents = [];
            const decExponents = [];

            let last = Big(1);
            let cur = this.#Phi;
            let exp = 0;
            
            while (cur.lt(n)) {
                [ last, cur ] = this.#nextPhiExp(last, cur);
                exp++;
            }
            
            const reduceN = (cur, prev, exp) => {

                if (this.#approxNull(n)) {
                    console.warn(0);
                    return;
                }

                while (cur.gt(n)) {
                    [ cur, prev ] = this.#prevPhiExp(cur, prev);
                    if (cur.lte(0)) {
                        console.warn("below 0");
                        return;
                    }
                    exp--;
                }

                if (exp > -1) {
                    exponents.unshift(exp);
                } else {
                    decExponents.push(exp);
                }
                n = n.minus(cur);

                reduceN(cur, prev, exp);
            };

            reduceN(last, cur, exp);

            exp = 0; 
            exponents.forEach(nExp => {
                while (exp < nExp) {
                    output = `${charset[0]}${output}`;
                    exp++;
                }
                output = `${charset[1]}${output}`;
                exp++;
            });

            if (!output) {
                output = "0.";
            } else {
                output += ".";
            }
            
            exp = -1;
            decExponents.forEach(nExp => {
                while (exp > nExp) {
                    output += charset[0];
                    exp--;
                }
                output += charset[1];
                exp--;
            });

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
            
            const [ posExpStr, decExpStr ] = input.split(".");
            let n = Big(0);

            let last = this.#Phi.minus(1);
            let cur = Big(1); 
            
            [...posExpStr].reverse().forEach((char) => {
                const charIndex = charset.indexOf(char);
                if (charIndex === 1) {
                    n = n.plus(cur);
                } else if (charIndex !== 0) {
                    throw new CharsetError(char);
                }
                [ last, cur ] = this.#nextPhiExp(last, cur);
            });


            if (decExpStr) {      
                let prev = Big(1); 
                cur = this.#Phi.minus(prev);
                
                [...decExpStr].forEach((char) => {
                    const charIndex = charset.indexOf(char);
                    if (charIndex === 1) {
                        n = n.plus(cur);
                    } else if (charIndex !== 0) {
                        throw new CharsetError(char);
                    }
                    [ cur, prev ] = this.#prevPhiExp(cur, prev);
                });
            }

            if (settings.decimalMode) {
                return n.toNumber();
            }

            n = n.round().toFixed();

            const output = this.b10.decode(n, [..."0123456789"], [], settings.integrity, settings.littleEndian);
     
            // Return the output
            return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
        }

        #approxNull(n) { 
            return !(n.round(50)
                .abs()
                .toNumber()
            );
        }
        
        #nextPhiExp(last, cur) {
            return [ cur, last.plus(cur) ];
        }

        #prevPhiExp(cur, prev) {
            return [ prev.minus(cur), cur ];
        }
    }

    return BasePhi;

})();
