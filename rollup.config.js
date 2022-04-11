import { readdirSync } from 'fs';
import { terser } from "rollup-plugin-terser";

const toInitCap = (str) => (str.charAt(0).toUpperCase() + str.substr(1)).replaceAll(/-./g, (s) => s[1].toUpperCase());

const converters = new Array();

const makeConverter = (inputFile, srcDir, distDir, useGroupDir=false) => {
    const filename = inputFile.replace(/\.js$/, "");
        const modName = toInitCap(filename);
        const groupDir = (useGroupDir) ? `${modName}/`: "";

        converters.push({
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
        });
}


makeConverter("base-ex.js", "src/", "dist/");

readdirSync("./src/converters").forEach(inputFile => {
    makeConverter(inputFile, "src/converters/", "dist/converters/", true)
});

export default converters;
