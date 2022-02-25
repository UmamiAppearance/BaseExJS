
const readFileNode = async (filename) => {
    const fs = await import("fs");
    //const path = await import("path");
    const readFileAsync = (filename) => new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) { 
                reject(err); 
            } else { 
                resolve(JSON.parse(data));
            }
        });
    });

    const json = await readFileAsync(filename); 
    return json;
};

const loadEncodingMap = async () => {
    
    const absPath = import.meta.url.
                    replace("file://", "").
                    split("/").
                    slice(0, -1).
                    concat("encoding-map.json").
                    join("/");

    const encodingMap = await readFileNode(absPath);

    return encodingMap;
};

export { loadEncodingMap };
