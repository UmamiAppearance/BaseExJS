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
 * big.js v6.2.1 // Copyright (c) 2022 Michael Mclaughlin // https://github.com/MikeMcl/big.js/LICENCE.md // Modified (reduced) and minified for BaseEx
 */
let DP=20,RM=1,MAX_DP=1e6,NE=-7,PE=21,STRICT=!1,NAME="[big.js] ",INVALID=NAME+"Invalid ",INVALID_DP=INVALID+"decimal places",INVALID_RM=INVALID+"rounding mode",P={},NUMERIC=/^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;function _Big_(){function Big(n){let x=this;if(!(x instanceof Big))return void 0===n?_Big_():new Big(n);if(n instanceof Big)x.s=n.s,x.e=n.e,x.c=n.c.slice();else {if("string"!=typeof n){if(!0===Big.strict&&"bigint"!=typeof n)throw TypeError(INVALID+"value");n=0===n&&1/n<0?"-0":String(n);}parse(x,n);}x.constructor=Big;}return Big.prototype=P,Big.DP=DP,Big.RM=RM,Big.NE=NE,Big.PE=PE,Big.strict=STRICT,Big.roundDown=0,Big.roundHalfUp=1,Big.roundHalfEven=2,Big.roundUp=3,Big}function parse(x,n){let e,i,nl;if(!NUMERIC.test(n))throw Error(`${INVALID}number`);for(x.s="-"==n.charAt(0)?(n=n.slice(1),-1):1,(e=n.indexOf("."))>-1&&(n=n.replace(".","")),(i=n.search(/e/i))>0?(e<0&&(e=i),e+=+n.slice(i+1),n=n.substring(0,i)):e<0&&(e=n.length),nl=n.length,i=0;i<nl&&"0"==n.charAt(i);)++i;if(i==nl)x.c=[x.e=0];else {for(;nl>0&&"0"==n.charAt(--nl););for(x.e=e-i-1,x.c=[],e=0;i<=nl;)x.c[e++]=+n.charAt(i++);}return x}function round(x,sd,rm,more){let xc=x.c;if(void 0===rm&&(rm=x.constructor.RM),0!==rm&&1!==rm&&2!==rm&&3!==rm)throw Error(INVALID_RM);if(sd<1)more=3===rm&&(more||!!xc[0])||0===sd&&(1===rm&&xc[0]>=5||2===rm&&(xc[0]>5||5===xc[0]&&(more||void 0!==xc[1]))),xc.length=1,more?(x.e=x.e-sd+1,xc[0]=1):xc[0]=x.e=0;else if(sd<xc.length){if(more=1===rm&&xc[sd]>=5||2===rm&&(xc[sd]>5||5===xc[sd]&&(more||void 0!==xc[sd+1]||1&xc[sd-1]))||3===rm&&(more||!!xc[0]),xc.length=sd,more)for(;++xc[--sd]>9;)if(xc[sd]=0,0===sd){++x.e,xc.unshift(1);break}for(sd=xc.length;!xc[--sd];)xc.pop();}return x}function stringify(x,doExponential,isNonzero){let e=x.e,s=x.c.join(""),n=s.length;if(doExponential)s=s.charAt(0)+(n>1?"."+s.slice(1):"")+(e<0?"e":"e+")+e;else if(e<0){for(;++e;)s="0"+s;s="0."+s;}else if(e>0)if(++e>n)for(e-=n;e--;)s+="0";else e<n&&(s=s.slice(0,e)+"."+s.slice(e));else n>1&&(s=s.charAt(0)+"."+s.slice(1));return x.s<0&&isNonzero?"-"+s:s}P.abs=function(){let x=new this.constructor(this);return x.s=1,x},P.cmp=function(y){let isneg,x=this,xc=x.c,yc=(y=new x.constructor(y)).c,i=x.s,j=y.s,k=x.e,l=y.e;if(!xc[0]||!yc[0])return xc[0]?i:yc[0]?-j:0;if(i!=j)return i;if(isneg=i<0,k!=l)return k>l^isneg?1:-1;for(j=(k=xc.length)<(l=yc.length)?k:l,i=-1;++i<j;)if(xc[i]!=yc[i])return xc[i]>yc[i]^isneg?1:-1;return k==l?0:k>l^isneg?1:-1},P.eq=function(y){return 0===this.cmp(y)},P.gt=function(y){return this.cmp(y)>0},P.gte=function(y){return this.cmp(y)>-1},P.lt=function(y){return this.cmp(y)<0},P.lte=function(y){return this.cmp(y)<1},P.minus=P.sub=function(y){let i,j,t,xlty,x=this,Big=x.constructor,a=x.s,b=(y=new Big(y)).s;if(a!=b)return y.s=-b,x.plus(y);let xc=x.c.slice(),xe=x.e,yc=y.c,ye=y.e;if(!xc[0]||!yc[0])return yc[0]?y.s=-b:xc[0]?y=new Big(x):y.s=1,y;if(a=xe-ye){for((xlty=a<0)?(a=-a,t=xc):(ye=xe,t=yc),t.reverse(),b=a;b--;)t.push(0);t.reverse();}else for(j=((xlty=xc.length<yc.length)?xc:yc).length,a=b=0;b<j;b++)if(xc[b]!=yc[b]){xlty=xc[b]<yc[b];break}if(xlty&&(t=xc,xc=yc,yc=t,y.s=-y.s),(b=(j=yc.length)-(i=xc.length))>0)for(;b--;)xc[i++]=0;for(b=i;j>a;){if(xc[--j]<yc[j]){for(i=j;i&&!xc[--i];)xc[i]=9;--xc[i],xc[j]+=10;}xc[j]-=yc[j];}for(;0===xc[--b];)xc.pop();for(;0===xc[0];)xc.shift(),--ye;return xc[0]||(y.s=1,xc=[ye=0]),y.c=xc,y.e=ye,y},P.plus=P.add=function(y){let e,k,t,x=this,Big=x.constructor;if(y=new Big(y),x.s!=y.s)return y.s=-y.s,x.minus(y);let xe=x.e,xc=x.c,ye=y.e,yc=y.c;if(!xc[0]||!yc[0])return yc[0]||(xc[0]?y=new Big(x):y.s=x.s),y;if(xc=xc.slice(),e=xe-ye){for(e>0?(ye=xe,t=yc):(e=-e,t=xc),t.reverse();e--;)t.push(0);t.reverse();}for(xc.length-yc.length<0&&(t=yc,yc=xc,xc=t),e=yc.length,k=0;e;xc[e]%=10)k=(xc[--e]=xc[e]+yc[e]+k)/10|0;for(k&&(xc.unshift(k),++ye),e=xc.length;0===xc[--e];)xc.pop();return y.c=xc,y.e=ye,y},P.round=function(dp,rm){if(void 0===dp)dp=0;else if(dp!==~~dp||dp<-MAX_DP||dp>MAX_DP)throw Error(INVALID_DP);return round(new this.constructor(this),dp+this.e+1,rm)},P.toFixed=function(dp,rm){let x=this,n=x.c[0];if(void 0!==dp){if(dp!==~~dp||dp<0||dp>MAX_DP)throw Error(INVALID_DP);for(x=round(new x.constructor(x),dp+x.e+1,rm),dp=dp+x.e+1;x.c.length<dp;)x.c.push(0);}return stringify(x,!1,!!n)},P[Symbol.for("nodejs.util.inspect.custom")]=P.toJSON=P.toString=function(){let x=this,Big=x.constructor;return stringify(x,x.e<=Big.NE||x.e>=Big.PE,!!x.c[0])},P.toNumber=function(){let n=Number(stringify(this,!0,!0));if(!0===this.constructor.strict&&!this.eq(n.toString()))throw Error(NAME+"Imprecise conversion");return n};const Big=_Big_();

/**
 * [BaseEx|BasePhi Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-phi.js}
 *
 * @version 0.7.1
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

export { BasePhi as default };
