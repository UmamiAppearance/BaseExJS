const divmod = (x, y) => [ Math.floor(x/y), x%y ];
const normalize = (x, norm=256) => {
    const [ q, r ] = divmod(x, norm);
    return [ q*norm, q, r ];
}

const gcd = (a, b) => {
    if (!b) return a;
    return gcd(b, a % b);
};

const initials = (val) => {

    const totalBytes = Math.ceil(Math.log2(val)/8);
    console.log(totalBytes);

    const slope = 2**(8*(totalBytes-1));
    console.log(slope);

    const [ y1, factor ] = normalize(val, slope);
    const y2 = val;
    const y3 =  y1 + slope;

    return [y1, y2, y3, slope, factor, totalBytes];
};


const calc = (val, x1=0, x2=2, x3=4) => {
    let [y1, y2, y3, slope, factor, totalBytes] = initials(val);

    // y = ax^2 + bx + c

    const denom = (x1-x2) * (x1-x3) * (x2-x3);
    let a       = (x3 * (y2-y1) + x2 * (y1-y3) + x1 * (y3-y2)) / denom;
    let b       = (x3*x3 * (y1-y2) + x2*x2 * (y3-y1) + x1*x1 * (y2-y3)) / denom;
    let c       = (x2 * x3 * (x2-x3) * y1+x3 * x1 * (x3-x1) * y2+x1 * x2 * (x1-x2) * y3) / denom;    
    console.log(a,b,c);
};


const exp = (val, x0=null, x1=null) => {
    let [y0, y1, y2, slope, factor, totalBytes] = initials(val);

    if (x0 === null) x0 = 0;
    if (x1 === null) x1 = 4;

    // y = ab^x

    let a = y0;
    let b = Math.sqrt(y1/y0);

    console.log(a,b);
};
