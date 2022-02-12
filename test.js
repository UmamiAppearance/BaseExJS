import { readdirSync } from 'fs';

const capitalCamelize = (str) => (str.charAt(0).toUpperCase() + str.slice(1)).replaceAll(/-./g, (x) => x[1].toUpperCase());

const converters = new Array();

readdirSync("./src/").forEach(filename => {
    if (filename !== "core.js") { 
        
        const origName = filename.replace(/\.js$/, "");
        const modName = capitalCamelize(origName);

        const subDir = (modName !== "BaseEx") ? "dist/single-converters/" : "dist/";

        converters.push({
            input: `src/${filename}`,
            output: [ 
                {   
                    format: "iife",
                    name: modName,
                    file: `${subDir}${origName}.iife.js`
                },
                {   
                    format: "iife",
                    name: modName,
                    file: `${subDir}${origName}.iife.min.js`,
                    plugins: ["terser()"]
                },
                {   
                    format: "es",
                    name: modName,
                    file: `${subDir}${origName}.esm.js`
                },
                {   
                    format: "es",
                    name: modName,
                    file: `${subDir}${origName}.esm.min.js`,
                    plugins: ["terser()"]
                },
            ]
        });
    }
});

