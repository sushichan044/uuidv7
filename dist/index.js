/**
 * uuidv7: An experimental implementation of the proposed UUID Version 7
 *
 * @license Apache-2.0
 * @copyright 2021-2023 LiosK
 * @packageDocumentation
 */
const DIGITS = "0123456789abcdef";
/** Represents a UUID as a 16-byte byte array. */
export class UUID {
    /** @param bytes - The 16-byte byte array representation. */
    constructor(bytes) {
        this.bytes = bytes;
    }
    /**
     * Creates an object from the internal representation, a 16-byte byte array
     * containing the binary UUID representation in the big-endian byte order.
     *
     * This method does NOT shallow-copy the argument, and thus the created object
     * holds the reference to the underlying buffer.
     *
     * @throws TypeError if the length of the argument is not 16.
     */
    static ofInner(bytes) {
        if (bytes.length !== 16) {
            throw new TypeError("not 128-bit length");
        }
        else {
            return new UUID(bytes);
        }
    }
    /**
     * Builds a byte array from UUIDv7 field values.
     *
     * @param unixTsMs - A 48-bit `unix_ts_ms` field value.
     * @param randA - A 12-bit `rand_a` field value.
     * @param randBHi - The higher 30 bits of 62-bit `rand_b` field value.
     * @param randBLo - The lower 32 bits of 62-bit `rand_b` field value.
     * @throws RangeError if any field value is out of the specified range.
     */
    static fromFieldsV7(unixTsMs, randA, randBHi, randBLo) {
        if (!Number.isInteger(unixTsMs) ||
            !Number.isInteger(randA) ||
            !Number.isInteger(randBHi) ||
            !Number.isInteger(randBLo) ||
            unixTsMs < 0 ||
            randA < 0 ||
            randBHi < 0 ||
            randBLo < 0 ||
            unixTsMs > 281474976710655 ||
            randA > 0xfff ||
            randBHi > 1073741823 ||
            randBLo > 4294967295) {
            throw new RangeError("invalid field value");
        }
        const bytes = new Uint8Array(16);
        bytes[0] = unixTsMs / 2 ** 40;
        bytes[1] = unixTsMs / 2 ** 32;
        bytes[2] = unixTsMs / 2 ** 24;
        bytes[3] = unixTsMs / 2 ** 16;
        bytes[4] = unixTsMs / 2 ** 8;
        bytes[5] = unixTsMs;
        bytes[6] = 0x70 | (randA >>> 8);
        bytes[7] = randA;
        bytes[8] = 0x80 | (randBHi >>> 24);
        bytes[9] = randBHi >>> 16;
        bytes[10] = randBHi >>> 8;
        bytes[11] = randBHi;
        bytes[12] = randBLo >>> 24;
        bytes[13] = randBLo >>> 16;
        bytes[14] = randBLo >>> 8;
        bytes[15] = randBLo;
        return new UUID(bytes);
    }
    /**
     * Builds a byte array from the 8-4-4-4-12 canonical hexadecimal string
     * representation.
     *
     * This method is currently provided on an experimental basis and may be
     * changed or removed in the future.
     *
     * @throws SyntaxError if the argument could not parse as a valid UUID string.
     * @experimental
     */
    static parse(uuid) {
        var _a;
        const PATTERN = /^([0-9A-Fa-f]{8})-([0-9A-Fa-f]{4})-([0-9A-Fa-f]{4})-([0-9A-Fa-f]{4})-([0-9A-Fa-f]{12})$/;
        const hex = (_a = PATTERN.exec(uuid)) === null || _a === void 0 ? void 0 : _a.slice(1, 6).join("");
        if (hex) {
            const inner = new Uint8Array(16);
            for (let i = 0; i < 16; i += 4) {
                const n = parseInt(hex.substring(2 * i, 2 * i + 8), 16);
                inner[i + 0] = n >>> 24;
                inner[i + 1] = n >>> 16;
                inner[i + 2] = n >>> 8;
                inner[i + 3] = n;
            }
            return new UUID(inner);
        }
        else {
            throw new SyntaxError("could not parse UUID string");
        }
    }
    /** @returns The 8-4-4-4-12 canonical hexadecimal string representation. */
    toString() {
        let text = "";
        for (let i = 0; i < this.bytes.length; i++) {
            text += DIGITS.charAt(this.bytes[i] >>> 4);
            text += DIGITS.charAt(this.bytes[i] & 0xf);
            if (i === 3 || i === 5 || i === 7 || i === 9) {
                text += "-";
            }
        }
        return text;
    }
    /** @returns The 8-4-4-4-12 canonical hexadecimal string representation. */
    toJSON() {
        return this.toString();
    }
    /**
     * A deprecated synonym for {@link getVariant}.
     *
     * @deprecated
     * @hidden
     */
    getType() {
        return this.getVariant();
    }
    /**
     * Reports the variant field value of the UUID or, if appropriate, "NIL" or
     * "MAX".
     *
     * For convenience, this method reports "NIL" or "MAX" if `this` represents
     * the Nil or Max UUID, although the Nil and Max UUIDs are technically
     * subsumed under the variants `0b0` and `0b111`, respectively.
     */
    getVariant() {
        const n = this.bytes[8] >>> 4;
        if (n < 0) {
            throw new Error("unreachable");
        }
        else if (n <= 0b0111) {
            return this.bytes.every((e) => e === 0) ? "NIL" : "VAR_0";
        }
        else if (n <= 0b1011) {
            return "VAR_10";
        }
        else if (n <= 0b1101) {
            return "VAR_110";
        }
        else if (n <= 0b1111) {
            return this.bytes.every((e) => e === 0xff) ? "MAX" : "VAR_RESERVED";
        }
        else {
            throw new Error("unreachable");
        }
    }
    /**
     * Returns the version field value of the UUID or `undefined` if the UUID does
     * not have the variant field value of `0b10`.
     */
    getVersion() {
        return this.getVariant() === "VAR_10" ? this.bytes[6] >>> 4 : undefined;
    }
    /** Creates an object from `this`. */
    clone() {
        return new UUID(this.bytes.slice(0));
    }
    /** Returns true if `this` is equivalent to `other`. */
    equals(other) {
        return this.compareTo(other) === 0;
    }
    /**
     * Returns a negative integer, zero, or positive integer if `this` is less
     * than, equal to, or greater than `other`, respectively.
     */
    compareTo(other) {
        for (let i = 0; i < 16; i++) {
            const diff = this.bytes[i] - other.bytes[i];
            if (diff !== 0) {
                return Math.sign(diff);
            }
        }
        return 0;
    }
}
/**
 * Encapsulates the monotonic counter state.
 *
 * This class provides APIs to utilize a separate counter state from that of the
 * global generator used by {@link uuidv7} and {@link uuidv7obj}. In addition to
 * the default {@link generate} method, this class has {@link generateOrAbort}
 * that is useful to absolutely guarantee the monotonically increasing order of
 * generated UUIDs despite a significant rollback of the system clock.
 */
export class V7Generator {
    constructor(random) {
        this.random = random;
        this.timestamp = 0;
        this.counter = 0;
    }
    /**
     * Creates a new generator object configured with the default random number
     * generator.
     */
    static create() {
        return new V7Generator(new DefaultRandom());
    }
    /**
     * Generates a new UUIDv7 object from the current timestamp, or resets the
     * generator upon significant timestamp rollback.
     *
     * This method returns monotonically increasing UUIDs unless the up-to-date
     * timestamp is significantly (by ten seconds or more) smaller than the one
     * embedded in the immediately preceding UUID. If such a significant clock
     * rollback is detected, this method resets the generator and returns a new
     * UUID based on the current timestamp.
     */
    generate() {
        const value = this.generateOrAbort();
        if (value !== undefined) {
            return value;
        }
        else {
            // reset state and resume
            this.timestamp = 0;
            return this.generateOrAbort();
        }
    }
    /**
     * Generates a new UUIDv7 object from the current timestamp, or returns
     * `undefined` upon significant timestamp rollback.
     *
     * This method returns monotonically increasing UUIDs unless the up-to-date
     * timestamp is significantly (by ten seconds or more) smaller than the one
     * embedded in the immediately preceding UUID. If such a significant clock
     * rollback is detected, this method aborts and returns `undefined`.
     */
    generateOrAbort() {
        const MAX_COUNTER = 4398046511103;
        const ROLLBACK_ALLOWANCE = 10000; // 10 seconds
        const ts = Date.now();
        if (ts > this.timestamp) {
            this.timestamp = ts;
            this.resetCounter();
        }
        else if (ts + ROLLBACK_ALLOWANCE > this.timestamp) {
            // go on with previous timestamp if new one is not much smaller
            this.counter++;
            if (this.counter > MAX_COUNTER) {
                // increment timestamp at counter overflow
                this.timestamp++;
                this.resetCounter();
            }
        }
        else {
            // abort if clock went backwards to unbearable extent
            return undefined;
        }
        return UUID.fromFieldsV7(this.timestamp, Math.trunc(this.counter / 2 ** 30), this.counter & (2 ** 30 - 1), this.random.nextUint32());
    }
    /** Initializes the counter at a 42-bit random integer. */
    resetCounter() {
        this.counter =
            this.random.nextUint32() * 0x400 + (this.random.nextUint32() & 0x3ff);
    }
}
/** Stores `crypto.getRandomValues()` available in the environment. */
let getRandomValues = (buffer) => {
    // fall back on Math.random() unless the flag is set to true
    if (typeof UUIDV7_DENY_WEAK_RNG !== "undefined" && UUIDV7_DENY_WEAK_RNG) {
        throw new Error("no cryptographically strong RNG available");
    }
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] =
            Math.trunc(Math.random() * 65536) * 65536 +
                Math.trunc(Math.random() * 65536);
    }
    return buffer;
};
// detect Web Crypto API
if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    getRandomValues = (buffer) => crypto.getRandomValues(buffer);
}
/**
 * Wraps `crypto.getRandomValues()` and compatibles to enable buffering; this
 * uses a small buffer by default to avoid unbearable throughput decline in some
 * environments as well as the waste of time and space for unused values.
 */
class DefaultRandom {
    constructor() {
        this.buffer = new Uint32Array(8);
        this.cursor = 99;
    }
    nextUint32() {
        if (this.cursor >= this.buffer.length) {
            getRandomValues(this.buffer);
            this.cursor = 0;
        }
        return this.buffer[this.cursor++];
    }
}
let defaultGenerator;
/**
 * Generates a UUIDv7 string.
 *
 * @returns The 8-4-4-4-12 canonical hexadecimal string representation
 * ("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
 */
export const uuidv7 = () => uuidv7obj().toString();
/** Generates a UUIDv7 object. */
export const uuidv7obj = () => (defaultGenerator || (defaultGenerator = V7Generator.create())).generate();
/**
 * Generates a UUIDv4 string.
 *
 * @returns The 8-4-4-4-12 canonical hexadecimal string representation
 * ("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
 */
export const uuidv4 = () => uuidv4obj().toString();
/** Generates a UUIDv4 object. */
export const uuidv4obj = () => {
    const bytes = getRandomValues(new Uint8Array(16));
    bytes[6] = 0x40 | (bytes[6] >>> 4);
    bytes[8] = 0x80 | (bytes[8] >>> 2);
    return UUID.ofInner(bytes);
};
