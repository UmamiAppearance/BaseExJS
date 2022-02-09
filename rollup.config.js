import { terser } from "rollup-plugin-terser";

export default [
    {
        input: "src/base-ex.js",
        output: [ 
            {   
                format: "iife",
                name: "BaseEx",
                file: "dist/base-ex.iife.js"
            },
            {   
                format: "iife",
                name: "BaseEx",
                file: "dist/base-ex.iife.min.js",
                plugins: [terser()]
            },
            {   
                format: "es",
                name: "BaseEx",
                file: "dist/base-ex.esm.js"
            },
            {   
                format: "es",
                name: "BaseEx",
                file: "dist/base-ex.esm.min.js",
                plugins: [terser()]
            },
        ]
    }, {
        input: "src/base-16.js",
        output: [ 
            {   
                format: "iife",
                name: "Base16",
                file: "dist/components/base-16.iife.js"
            },
            {   
                format: "iife",
                name: "Base16",
                file: "dist/components/base-16.iife.min.js",
                plugins: [terser()]
            },
            {   
                format: "es",
                name: "Base16",
                file: "dist/components/base-16.esm.js"
            },
            {   
                format: "es",
                name: "Base16",
                file: "dist/components/base-16.esm.min.js",
                plugins: [terser()]
            },
        ]
    },
];

