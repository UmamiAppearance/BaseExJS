/**
 * [BaseEx|Byte Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/byte-converter.js}
 *
 * @version 0.7.2
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT
 */

import { SmartInput, SmartOutput } from "../io-handlers.js";

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
export default class ByteConverter {

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
                }
        
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
        }

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
