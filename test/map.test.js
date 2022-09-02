/* eslint-disable no-underscore-dangle */

import * as BaseEx from "base-ex";
import { baseTest } from "./fixtures/helpers.js";
import { loadEncodingMap } from "./fixtures/load-json.js";
import test from "ava";


const encodingMap = await loadEncodingMap();
for (const base in encodingMap) {
    
    const bFn = base === "LEB128" 
        ? new BaseEx[base]("hex", "signed")
        : new BaseEx[base]();
        
    for (const _type in encodingMap[base]) {
        
        for (let input in encodingMap[base][_type]) {
            const title = `En- and decode ${base} for type ${_type} with input '${input}'`;
            const expected = encodingMap[base][_type][input];
            
            let type = _type;
            if (type === "int") {
                input = (input.length > 12) ? BigInt(input) : Number(input);
                type = (input < 0) ? "int_n" : "uint_n";
            } else if (type === "float") {
                input = Number(input);
                type = "float_n"
            }
            
            test(title, baseTest, input, expected, bFn, type);
        }
    }
}
