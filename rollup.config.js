import { readdirSync } from 'fs';
import replace from "@rollup/plugin-replace";
import { terser } from "rollup-plugin-terser";

const toInitCap = (str) => (str.charAt(0).toUpperCase() + str.substr(1)).replaceAll(/-./g, (s) => s[1].toUpperCase());
const converters = new Array();
const bytesOnly = process.argv.includes("BYTES_ONLY");

const makeConverter = (inputFile, srcDir, distDir, useGroupDir=false) => {
    const filename = inputFile.replace(/\.js$/, "");
        const modName = toInitCap(filename);
        const groupDir = (useGroupDir) ? `${modName}/`: "";

        const converter = {
            input: `${srcDir}${inputFile}`,
            output: [ 
                {   
                    format: "iife",
                    name: modName,
                    file: `${distDir}${groupDir}${filename}.iife.js`
                },
                {   
                    format: "iife",
                    name: modName,
                    file: `${distDir}${groupDir}${filename}.iife.min.js`,
                    plugins: [terser()]
                },
                {   
                    format: "es",
                    name: modName,
                    file: `${distDir}${groupDir}${filename}.esm.js`
                },
                {   
                    format: "es",
                    name: modName,
                    file: `${distDir}${groupDir}${filename}.esm.min.js`,
                    plugins: [terser()]
                },
            ]
        };
        
        if (bytesOnly) {
            converter.plugins = [
                replace({
                    values: {
                        "DEFAULT_INPUT_HANDLER": "BytesInput",
                        "DEFAULT_OUTPUT_HANDLER": "BytesOutput",
                    },
                    preventAssignment: true,
                })
            ]
        }

        converters.push(converter);
}


makeConverter("base-ex.js", "src/", "dist/");

readdirSync("./src/converters").forEach(inputFile => {
    makeConverter(inputFile, "src/converters/", "dist/converters/", true)
});

export default converters;
