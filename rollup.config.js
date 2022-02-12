import { readdirSync } from 'fs';
import { terser } from "rollup-plugin-terser";

const toInitCap = (str) => (str.charAt(0).toUpperCase() + str.substr(1)).replaceAll(/-./g, (s) => s[1].toUpperCase());

const converters = new Array();

readdirSync("./src/").forEach(inputFile => {
    if (inputFile !== "core.js") { 
        
        const filename = inputFile.replace(/\.js$/, "");
        const modName = toInitCap(filename);

        const subDir = (modName !== "BaseEx") ? "dist/single-converters/" : "dist/";

        converters.push({
            input: `src/${inputFile}`,
            output: [ 
                {   
                    format: "iife",
                    name: modName,
                    file: `${subDir}${filename}.iife.js`
                },
                {   
                    format: "iife",
                    name: modName,
                    file: `${subDir}${filename}.iife.min.js`,
                    plugins: [terser()]
                },
                {   
                    format: "es",
                    name: modName,
                    file: `${subDir}${filename}.esm.js`
                },
                {   
                    format: "es",
                    name: modName,
                    file: `${subDir}${filename}.esm.min.js`,
                    plugins: [terser()]
                },
            ]
        });
    }
});


export default converters;
