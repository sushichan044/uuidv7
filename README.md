# uuidv7

[![npm](https://img.shields.io/npm/v/uuidv7)](https://www.npmjs.com/package/uuidv7)
[![License](https://img.shields.io/npm/l/uuidv7)](https://github.com/LiosK/uuidv7/blob/main/LICENSE)

An experimental implementation of the proposed UUID Version 7

```javascript
import { uuidv7 } from "uuidv7";

const result = uuidv7(); // e.g., "017fe537-bb13-7c35-b52a-cb5490cce7be"
```

On browsers and Deno:

```javascript
import { uuidv7 } from "https://unpkg.com/uuidv7@^0.6";

const result = uuidv7(); // e.g., "017fe537-bb13-7c35-b52a-cb5490cce7be"
```

Command-line interface:

```bash
$ npx uuidv7
0189f7e5-c883-7106-8272-ccb7fcba0575
$
$ npx uuidv7 -n 4
0189f7ea-ae2c-7809-8aeb-b819cf5e9e7f
0189f7ea-ae2f-72b9-9be8-9c3c5a60214f
0189f7ea-ae2f-72b9-9be8-9c3d224082ef
0189f7ea-ae2f-72b9-9be8-9c3e3e8abae8
```

See [draft-ietf-uuidrev-rfc4122bis-09](https://www.ietf.org/archive/id/draft-ietf-uuidrev-rfc4122bis-09.html).

## Field and bit layout

This implementation produces identifiers with the following bit layout:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          unix_ts_ms                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          unix_ts_ms           |  ver  |        counter        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|var|                        counter                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                             rand                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Where:

- The 48-bit `unix_ts_ms` field is dedicated to the Unix timestamp in
  milliseconds.
- The 4-bit `ver` field is set at `0111`.
- The 42-bit `counter` field accommodates a counter that ensures the increasing
  order of IDs generated within a millisecond. The counter is incremented by one
  for each new ID and is reset to a random number when the `unix_ts_ms` changes.
- The 2-bit `var` field is set at `10`.
- The remaining 32 `rand` bits are filled with a cryptographically strong random
  number.

The 42-bit `counter` is sufficiently large, so you do not usually need to worry
about overflow, but in an extremely rare circumstance where it overflows, this
library increments the `unix_ts_ms` field. As a result, the `unix_ts_ms` may
have a greater value than that of the system's real-time clock.

UUIDv7, by design, heavily relies on the system's wall clock to guarantee the
monotonically increasing order of generated IDs. A generator may not be able to
produce a monotonic sequence if the system clock goes backwards. This library
ignores a clock rollback and freezes the previously used `unix_ts_ms` unless the
clock rollback is considered significant (by more than ten seconds). If such a
significant rollback takes place, this library resets the generator and thus
breaks the monotonic order of generated IDs.

## Other features

This library also supports the generation of UUID version 4:

```javascript
import { uuidv4 } from "uuidv7";

const result = uuidv4(); // e.g., "83229083-75c3-4da5-8378-f88ef1a2bcd1"
```

`uuidv7obj()` and `uuidv4obj()` return an object that represents a UUID as a
16-byte byte array:

```javascript
import { uuidv7obj } from "uuidv7";

const object = uuidv7obj();
console.log(object.bytes); // Uint8Array(16) [ ... ]
console.log(String(object)); // e.g., "017fea6b-b877-7aef-b422-57db9ed15e9d"

console.assert(object.getVariant() === "VAR_10");
console.assert(object.getVersion() === 7);

console.assert(object.clone().equals(object));
console.assert(object.compareTo(uuidv7obj()) < 0);
```

The `V7Generator` primitive allows to utilize a separate counter state from that
of the global generator. It also provides a fallible variant of the generator
function to give an absolute guarantee of the increasing order of UUIDs despite
a significant rollback of the system timestamp source.

```javascript
import { V7Generator } from "uuidv7";

const g = new V7Generator();
const x = g.generate();
const y = g.generateOrAbort();
if (y === undefined) {
  throw new Error("The clock went backwards by ten seconds!");
}
console.assert(x.compareTo(y) < 0);
```

See the [API documentation](https://liosk.github.io/uuidv7/) for details.

## CommonJS support

The CommonJS entry point is deprecated and provided for backward compatibility
purposes only. The entry point is no longer tested and will be removed once this
library hits the stable version number of v1.

## License

Licensed under the Apache License, Version 2.0.
