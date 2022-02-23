const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

const readFileBrowser = async (url) => {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw Error(response);
    }
    const json = await response.json();
    return json;
}

const readFileNode = async (filename) => {
    const fs = await import("fs");
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

export const loadEncodingMap = async () => {
    let encodingMap;
    const fileName = "./test/encoding-map.json";

    if (isBrowser) {
        encodingMap = await readFileBrowser(fileName);
    } else {
        encodingMap = await readFileNode(fileName);
    }

    return encodingMap;
};
