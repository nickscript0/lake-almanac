const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const d1 = '2021-01-02 17:07:54';
const d2 = '2021-01-02 18:00:00';

// In AST returns false
console.log(dayjs(d1).isAfter(dayjs(d2)));
// In AST returns true
console.log(dayjs.tz(d1, 'America/Vancouver').isAfter(dayjs.tz(d2, 'America/Vancouver')));
// In AST returns false
console.log(dayjs(d1).tz('America/Vancouver').isAfter(dayjs(d2).tz('America/Vancouver')));

// console.log(`dayjs.tz(d)`)
// const tz1a = dayjs.tz(d1, 'America/Vancouver');
// const tz2a = dayjs.tz(d2, 'America/Vancouver');
// console.log(tz1a);
// console.log(tz2a);
// console.log(tz1a.isAfter(tz2a));
// console.log(`dayjs(d).tz()`)
// const tz1b = dayjs(d1).tz('America/Vancouver');
// const tz2b = dayjs(d2).tz('America/Vancouver');
// console.log(tz1b);
// console.log(tz2b);
// console.log(tz1b.isAfter(tz2b));
