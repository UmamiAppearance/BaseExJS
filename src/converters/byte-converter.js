/**
 * [BaseEx|Byte Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/leb-128.js}
 *
 * @version 0.4.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { SmartInput, SmartOutput } from "../io-handlers.js";

class ByteConverter {
    constructor() {

        this.littleEndian = true;
        this.numberMode = false;
        this.outputType = "buffer";

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
                        this.root[param] = parameters[param];
                    }
                }
        
                return parameters;
            }
        }
    }

    encode(input, ...args) {
        const settings = this.utils.validateArgs(args);
        return SmartInput.toBytes(input, settings)[0];
    }

    decode(input, ...args) {
        const settings = this.utils.validateArgs(args);
        return SmartOutput.compile(input, settings.outputType, settings.littleEndian);
    }
}

export { ByteConverter };
