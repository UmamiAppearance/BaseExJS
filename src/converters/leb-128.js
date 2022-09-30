/**
 * [BaseEx|LEB128 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/leb-128.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";
import { BytesInput } from "../io-handlers.js";
import { Utils } from "../utils.js";

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
export default class LEB128 extends BaseTemplate {
    
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
        this.charsets.hex = "<placeholder>"

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
        
        let inputBytes, negative;
        const signed = settings.signed;
        settings.signed = true;
        [inputBytes, negative,] = this.utils.inputHandler.toBytes(input, settings);

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
                    output.push(byte)
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
            input = this.hexlify.decode(String(input).toLowerCase(), [..."0123456789abcdef"], [], settings.integrity, false);
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
