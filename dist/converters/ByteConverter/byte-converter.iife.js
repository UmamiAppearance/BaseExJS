var ByteConverter = (function () {
    'use strict';

    /**
     * Simple Input Handler.
     * --------------------
     * Accepts only bytes eg. TypedArray, ArrayBuffer,
     * DataView, also a regular array (filled with integers)
     * is possible.
     */


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

    return ByteConverter;

})();
