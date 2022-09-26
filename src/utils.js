import { BytesInput, BytesOutput, SmartInput, SmartOutput } from "./io-handlers.js";

const DEFAULT_INPUT_HANDLER = SmartInput;
const DEFAULT_OUTPUT_HANDLER = SmartOutput;

class SignError extends TypeError {
    constructor() {
        super("The input is signed but the converter is not set to treat input as signed.\nYou can pass the string 'signed' to the decode function or when constructing the converter.");
        this.name = "SignError";
    }
}
  

/**
 * Utilities for every BaseEx class.
 * --------------------------------
 * Requires IO Handlers
 */
export class Utils {

    constructor(main, addCharsetTools=true) {

        // Store the calling class in this.root
        // for accessability.
        this.root = main;
        
        // set specific args object for converters
        this.converterArgs = {};

        // If charsets are uses by the parent class,
        // add extra functions for the user.

        if ("charsets" in main && addCharsetTools) this.#charsetUserToolsConstructor();
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
        this.root.addCharset = (name, charset, info=true) => {
            // TODO: add padding chars
                
            if (typeof name !== "string") {
                throw new TypeError("The charset name must be a string.");
            }

            // Get the appropriate length for the charset
            // from the according converter
            
            const setLen = this.root.converter.radix;
            let inputLen = setLen;

            if (typeof charset === "string") {
                charset = [...charset];
            }
            
            if (Array.isArray(charset)) {
                
                // Store the input length of the input
                inputLen = charset.length;
                
                // Convert to "Set" -> eliminate duplicates
                // If duplicates are found the length of the
                // Set and the length of the initial input
                // differ.

                charset = new Set(charset);

            } else if (!(charset instanceof Set)) {
                throw new TypeError("The charset must be one of the types:\n'str', 'set', 'array'.");
            }
            
            if (charset.size === setLen) {
                charset = [...charset];
                this.root.charsets[name] = charset;
                if (info) {
                    console.info(`New charset '${name}' was added and is ready to use`);
                }
            } else if (inputLen === setLen) {
                throw new Error("There were repetitive chars found in your charset. Make sure each char is unique.");
            } else {
                throw new Error(`The length of the charset must be ${setLen}.`);
            }
        }

        // Save method (argument gets validated) to 
        // change the default version.
        this.root.setDefaultCharset = (version) => {
            ({version } = this.validateArgs([version]));
            this.root.version = version;
        }
    }

    /**
     * Argument lists for error messages.
     * @param {string[]} args 
     * @returns string - Arguments joined as a string. 
     */
    makeArgList(args) {
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
    invalidArgument(arg, versions, outputTypes, initial) {
        const loopConverterArgs = () => Object.keys(this.converterArgs).map(
            key => this.converterArgs[key].map(
                keyword => `'${keyword}'`
            ).
            join(" and ")
        ).
        join("\n   - ");

        const IOHandlerHint = (initial) ? "\n * valid declarations for IO handlers are 'bytesOnly', 'bytesIn', 'bytesOut'" : ""; 
        const signedHint = (this.root.isMutable.signed) ? "\n * pass 'signed' to disable, 'unsigned' to enable the use of the twos's complement for negative integers" : "";
        const endiannessHint = (this.root.isMutable.littleEndian) ? "\n * 'be' for big , 'le' for little endian byte order for case conversion" : "";
        const padHint = (this.root.isMutable.padding) ? "\n * pass 'pad' to fill up, 'nopad' to not fill up the output with the particular padding" : "";
        const caseHint = (this.root.isMutable.upper) ? "\n * valid args for changing the encoded output case are 'upper' and 'lower'" : "";
        const outputHint = `\n * valid args for the output type are ${this.makeArgList(outputTypes)}`;
        const versionHint = (versions) ? `\n * the options for version (charset) are: ${this.makeArgList(versions)}` : "";
        const integrityHint = "\n * valid args for integrity check are : 'integrity' and 'nointegrity'";
        const numModeHint = "\n * 'number' for number-mode (converts every number into a Float64Array to keep the natural js number type)";
        const converterArgsHint = Object.keys(this.converterArgs).length ? `\n * converter specific args:\n   - ${loopConverterArgs()}` : "";
        
        throw new TypeError(`'${arg}'\n\nInput parameters:${IOHandlerHint}${signedHint}${endiannessHint}${padHint}${caseHint}${outputHint}${versionHint}${integrityHint}${numModeHint}${converterArgsHint}\n\nTraceback:`);
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
            integrity: this.root.integrity,
            littleEndian: this.root.littleEndian,
            numberMode: this.root.numberMode,
            outputType: this.root.outputType,
            padding: this.root.padding,
            signed: this.root.signed,
            upper: this.root.upper,
            version: this.root.version
        }

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
        }

        // set available versions and extra arguments
        const versions = Object.prototype.hasOwnProperty.call(this.root, "charsets") ? Object.keys(this.root.charsets) : [];
        const extraArgList = {
            integrity: ["nointegrity", "integrity"],
            littleEndian: ["be", "le"],
            padding: ["nopad", "pad"],
            signed: ["unsigned", "signed"],
            upper: ["lower", "upper"],
            ...this.converterArgs
        }

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

        // walk through the remaining arguments
        args.forEach((arg) => {
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
                    this.invalidArgument(arg, versions, outputTypes, initial);
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

}

export { DEFAULT_INPUT_HANDLER, DEFAULT_OUTPUT_HANDLER };
