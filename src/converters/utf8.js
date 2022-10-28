/**
 * [BaseEx|UTF8 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/leb-128.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

 import { BaseConverter, BaseTemplate } from "../core.js";
 
 /**
  * BaseEx Little Endian Base 128 Converter.
  * ---------------------------------------
  * 
  * This is a utf8 converter. Various input can be 
  * converted to a utf8 string or a utf8 string
  * can be decoded into various formats.
  * 
  * There is no real charset available as the input is
  * getting converted to bytes. For having the chance 
  * to store these bytes, there is a hexadecimal output
  * available.
  */
 export default class Utf8 extends BaseTemplate {
     
     /**
      * BaseEx UTF8 Constructor.
      * @param {...string} [args] - Converter settings.
      */
    constructor(...args) {
        // initialize base template without utils
        super();

        // converters
        this.converter = new BaseConverter(10, 0, 0);
        
        // charsets
        this.charsets.default = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"];
        
        // predefined settings
        this.version = "default";
        this.frozenCharsets = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }
 
 
    /**
     * BaseEx UTF8 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns { sting } - UTF8 encoded Unit8Array (or hex string of it).
     */
    encode(input, ...args) {
         
         // argument validation and input settings
         const settings = this.utils.validateArgs(args);
         
         const inputBytes = this.utils.inputHandler.toBytes(input, settings)[0]; 
         
         let base10 = this.converter.encode(inputBytes, null, settings.littleEndian)[0];
 
         let n = BigInt(base10);

         return n;
    }

    show() {
        //
    }


    #ranges = {
        a: 1
    }
}
