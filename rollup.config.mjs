import { readdirSync } from 'fs';
import replace from "@rollup/plugin-replace";
import { terser } from "rollup-plugin-terser";

const toInitCap = (str) => (str.charAt(0).toUpperCase() + str.substr(1)).replaceAll(/-./g, (s) => s[1].toUpperCase());
const converters = new Array();
const bytesOnly = process.argv.includes("BYTES_ONLY");

const makeConverter = (inputFile, srcDir, distDir, useGroupDir, t=terser()) => {
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
                    plugins: [t]
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
                    plugins: [t]
                },
            ]
        };
        
        if (bytesOnly) {
            converter.plugins = [
                replace({
                    values: {
                        "SmartInput": " BytesInput",
                        "SmartOutput": " BytesOutput",
                    },
                    preventAssignment: true,
                    delimiters: [' ', ';'],
                })
            ]
        }

        converters.push(converter);
}

// allow only the main license for base-ex class
const selectiveTerser = terser({
    output: {
        // eslint-disable-next-line consistent-return
        comments: (node, comment) => {
            const text = comment.value;
            const type = comment.type;
            if (type === "comment2") {
                return !(/BaseEx\|\w+/).test(text) && (/@license/i).test(text);
            }
        }
    },
})

makeConverter("base-ex.js", "src/", "dist/", false, selectiveTerser);


readdirSync("./src/converters").forEach(inputFile => {
    makeConverter(inputFile, "src/converters/", "dist/converters/", true)
});

export default converters;
