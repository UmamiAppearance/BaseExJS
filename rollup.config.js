export default {
    input: "src/BaseEx.js",
    output: [ 
        {   
            format: "iife",
            name: "BaseEx",
            file: "dist/BaseEx.js"
        },
        {   
            format: "es",
            name: "BaseEx",
            file: "dist/BaseEx.esm.js"
        },
    ]
};
