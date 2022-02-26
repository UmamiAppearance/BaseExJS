import * as module from "../src/base-ex.js"

const exluded = ["Base1", "SimpleBase", "BaseEx"];


for (const mod in module) {
    if (!exluded.includes(mod)) {
        console.log(mod);
        console.log(typeof module[mod]);
    }
}
