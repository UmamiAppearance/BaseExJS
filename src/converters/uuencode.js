/**
 * [BaseEx|UUencode Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/uuencode.js}
 *
 * @version 0.8.1
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT
 */

import { BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx UUencode Converter.
 * ------------------------
 * 
 * This is a UUencoder/UUdecoder. Various input can be 
 * converted to a UUencoded string or a UUencoded string
 * can be decoded into various formats.
 * 
 * Available charsets are:
 *  - default
 *  - original
 *  - xx
 */
export default class UUencode extends BaseTemplate {

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
        this.buffering = false;
        this.utils.converterArgs.buffering = ["nobuffering", "buffering"];
        this.isMutable.buffering = true;
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
            const outLen = outArray.length;
            settings.options.lineWrap = 0;
            
            
            if (settings.header && !settings.buffering) {
                const permissions = settings.options.permissions || een();
                const fileName = settings.options.file || ees();
                output = `begin ${permissions} ${fileName}\n`;
            }  else {
                output = "";
            }

            // repeatedly take 60 chars from the output 
            for (let start=0; start<outLen; start+=60) {
                const end = start+60;
                const lArray = outArray.slice(start, end);
                
                // if all chars are taken, remove eventually added pad zeros
                if (end >= outLen) { 
                    const byteCount = this.converter.padChars(lArray.length) - zeroPadding;
                    
                    // add the the current chars plus the leading
                    // count char
                    output += `${charset.at(byteCount)}${lArray.join("")}\n`;
                }
                
                // add the the current chars plus the leading
                // count char ("M" for default charsets) 
                else {
                    output += `${charset.at(45)}${lArray.join("")}\n`;
                }
            }

            if (!settings.buffering) {
                output += `${charset.at(0)}\n`;
                
                if (settings.header) {
                    output += "end\n";
                }
            }

            return output;
        }
            
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
            const lines = input.trim().split(/\r?\n/);
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
                    let len = lArray.length

                    // fix probably missing spaces for original charset
                    if (settings.version === "original") {
                        const expectedLen = calcUUStrLen(byteCount);
                        while (len < expectedLen) {
                            len++;
                            inArray.push(" ");
                        }
                    }

                    padChars = this.converter.padChars(len) - byteCount;
                    break;
                }

                // fix probably missing spaces for original charset
                else if (lArray.length !== 60 && settings.version === "original") {
                    while (inArray.length % 60) {
                        inArray.push(" ");
                    }
                }
            }

            return inArray.join("");

        }

        const removePadChars = ({ output }) => {
            if (padChars) {
                output = new Uint8Array(output.slice(0, -padChars));
            }
            return output;
        }

        return super.decode(input, format, removePadChars, true, ...args);
    }
}


const een = () => {
    const o = () => Math.floor(Math.random() * 8);
    return `${o()}${o()}${o()}`;
}

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

const calcUUStrLen = byteCount => {
    const len = byteCount / 3 * 4;
    if (len % 4) {
        return Math.floor(len/4) * 4 + 4;
    }
    return len;
}
