import { readdirSync } from "fs";
import terser from "@rollup/plugin-terser";
import { yourFunction } from "rollup-plugin-your-function";

const toInitCap = str => {
    if (str === "uuencode") {
        return "UUencode";
    }

    if (str === "leb-128") {
        return "LEB128";
    }

    return str
        .at(0)
        .toUpperCase()
        .concat(
            str.slice(1))
                .replaceAll(/-./g, (s) => s
                    .at(1)
                    .toUpperCase()
        );
}
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
                yourFunction({
                    include: "**/utils.js",
                    fn: source => {
                        const code = source
                            .replace(
                                /DEFAULT_INPUT_HANDLER ?= ?SmartInput/,
                                "DEFAULT_INPUT_HANDLER = BytesInput"
                            )
                            .replace(
                                /DEFAULT_OUTPUT_HANDLER ?= ?SmartOutput/,
                                "DEFAULT_OUTPUT_HANDLER = BytesOutput"
                            );
                        return code;
                    }
                })
            ]
        }

        converters.push(converter);
}

// allow only the main license for base-ex class
const selectiveTerser = terser({
    format: {
        comments: (_, comment) => {
            const text = comment.value;
            const type = comment.type;
            return (
                type === "comment2" && 
                !(/BaseEx\|\w+/).test(text) && 
                (/@license/i).test(text)
            );
        }
    }
});

makeConverter("base-ex.js", "src/", "dist/", false, selectiveTerser);

readdirSync("./src/converters").forEach(inputFile => {
    makeConverter(inputFile, "src/converters/", "dist/converters/", true)
});


export default converters;
