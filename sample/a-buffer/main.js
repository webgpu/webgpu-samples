/* wgpu-matrix@3.3.0, license MIT */
function wrapConstructor(OriginalConstructor, modifier) {
    return class extends OriginalConstructor {
        constructor(...args) {
            super(...args);
            modifier(this);
        }
    }; // Type assertion is necessary here
}
const ZeroArray = wrapConstructor((Array), a => a.fill(0));

/*
 * Copyright 2022 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
let EPSILON = 0.000001;

/*
 * Copyright 2022 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
/**
 * Generates am typed API for Vec3
 */
function getAPIImpl$5(Ctor) {
    /**
     * Creates a Vec2; may be called with x, y, z to set initial values.
     *
     * Note: Since passing in a raw JavaScript array
     * is valid in all circumstances, if you want to
     * force a JavaScript array into a Vec2's specified type
     * it would be faster to use
     *
     * ```
     * const v = vec2.clone(someJSArray);
     * ```
     *
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @returns the created vector
     */
    function create(x = 0, y = 0) {
        const newDst = new Ctor(2);
        if (x !== undefined) {
            newDst[0] = x;
            if (y !== undefined) {
                newDst[1] = y;
            }
        }
        return newDst;
    }
    /**
     * Creates a Vec2; may be called with x, y, z to set initial values. (same as create)
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @returns the created vector
     */
    const fromValues = create;
    /**
     * Sets the values of a Vec2
     * Also see {@link vec2.create} and {@link vec2.copy}
     *
     * @param x first value
     * @param y second value
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector with its elements set.
     */
    function set(x, y, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = x;
        newDst[1] = y;
        return newDst;
    }
    /**
     * Applies Math.ceil to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the ceil of each element of v.
     */
    function ceil(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = Math.ceil(v[0]);
        newDst[1] = Math.ceil(v[1]);
        return newDst;
    }
    /**
     * Applies Math.floor to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the floor of each element of v.
     */
    function floor(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = Math.floor(v[0]);
        newDst[1] = Math.floor(v[1]);
        return newDst;
    }
    /**
     * Applies Math.round to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the round of each element of v.
     */
    function round(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = Math.round(v[0]);
        newDst[1] = Math.round(v[1]);
        return newDst;
    }
    /**
     * Clamp each element of vector between min and max
     * @param v - Operand vector.
     * @param max - Min value, default 0
     * @param min - Max value, default 1
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that the clamped value of each element of v.
     */
    function clamp(v, min = 0, max = 1, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = Math.min(max, Math.max(min, v[0]));
        newDst[1] = Math.min(max, Math.max(min, v[1]));
        return newDst;
    }
    /**
     * Adds two vectors; assumes a and b have the same dimension.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the sum of a and b.
     */
    function add(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] + b[0];
        newDst[1] = a[1] + b[1];
        return newDst;
    }
    /**
     * Adds two vectors, scaling the 2nd; assumes a and b have the same dimension.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param scale - Amount to scale b
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the sum of a + b * scale.
     */
    function addScaled(a, b, scale, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] + b[0] * scale;
        newDst[1] = a[1] + b[1] * scale;
        return newDst;
    }
    /**
     * Returns the angle in radians between two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns The angle in radians between the 2 vectors.
     */
    function angle(a, b) {
        const ax = a[0];
        const ay = a[1];
        const bx = b[0];
        const by = b[1];
        const mag1 = Math.sqrt(ax * ax + ay * ay);
        const mag2 = Math.sqrt(bx * bx + by * by);
        const mag = mag1 * mag2;
        const cosine = mag && dot(a, b) / mag;
        return Math.acos(cosine);
    }
    /**
     * Subtracts two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the difference of a and b.
     */
    function subtract(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] - b[0];
        newDst[1] = a[1] - b[1];
        return newDst;
    }
    /**
     * Subtracts two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the difference of a and b.
     */
    const sub = subtract;
    /**
     * Check if 2 vectors are approximately equal
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns true if vectors are approximately equal
     */
    function equalsApproximately(a, b) {
        return Math.abs(a[0] - b[0]) < EPSILON &&
            Math.abs(a[1] - b[1]) < EPSILON;
    }
    /**
     * Check if 2 vectors are exactly equal
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns true if vectors are exactly equal
     */
    function equals(a, b) {
        return a[0] === b[0] && a[1] === b[1];
    }
    /**
     * Performs linear interpolation on two vectors.
     * Given vectors a and b and interpolation coefficient t, returns
     * a + t * (b - a).
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param t - Interpolation coefficient.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The linear interpolated result.
     */
    function lerp(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] + t * (b[0] - a[0]);
        newDst[1] = a[1] + t * (b[1] - a[1]);
        return newDst;
    }
    /**
     * Performs linear interpolation on two vectors.
     * Given vectors a and b and interpolation coefficient vector t, returns
     * a + t * (b - a).
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param t - Interpolation coefficients vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns the linear interpolated result.
     */
    function lerpV(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] + t[0] * (b[0] - a[0]);
        newDst[1] = a[1] + t[1] * (b[1] - a[1]);
        return newDst;
    }
    /**
     * Return max values of two vectors.
     * Given vectors a and b returns
     * [max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2])].
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The max components vector.
     */
    function max(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = Math.max(a[0], b[0]);
        newDst[1] = Math.max(a[1], b[1]);
        return newDst;
    }
    /**
     * Return min values of two vectors.
     * Given vectors a and b returns
     * [min(a[0], b[0]), min(a[1], b[1]), min(a[2], b[2])].
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The min components vector.
     */
    function min(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = Math.min(a[0], b[0]);
        newDst[1] = Math.min(a[1], b[1]);
        return newDst;
    }
    /**
     * Multiplies a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    function mulScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = v[0] * k;
        newDst[1] = v[1] * k;
        return newDst;
    }
    /**
     * Multiplies a vector by a scalar. (same as mulScalar)
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    const scale = mulScalar;
    /**
     * Divides a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    function divScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = v[0] / k;
        newDst[1] = v[1] / k;
        return newDst;
    }
    /**
     * Inverse a vector.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The inverted vector.
     */
    function inverse(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = 1 / v[0];
        newDst[1] = 1 / v[1];
        return newDst;
    }
    /**
     * Invert a vector. (same as inverse)
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The inverted vector.
     */
    const invert = inverse;
    /**
     * Computes the cross product of two vectors; assumes both vectors have
     * three entries.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of a cross b.
     */
    function cross(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        const z = a[0] * b[1] - a[1] * b[0];
        newDst[0] = 0;
        newDst[1] = 0;
        newDst[2] = z;
        return newDst;
    }
    /**
     * Computes the dot product of two vectors; assumes both vectors have
     * three entries.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns dot product
     */
    function dot(a, b) {
        return a[0] * b[0] + a[1] * b[1];
    }
    /**
     * Computes the length of vector
     * @param v - vector.
     * @returns length of vector.
     */
    function length(v) {
        const v0 = v[0];
        const v1 = v[1];
        return Math.sqrt(v0 * v0 + v1 * v1);
    }
    /**
     * Computes the length of vector (same as length)
     * @param v - vector.
     * @returns length of vector.
     */
    const len = length;
    /**
     * Computes the square of the length of vector
     * @param v - vector.
     * @returns square of the length of vector.
     */
    function lengthSq(v) {
        const v0 = v[0];
        const v1 = v[1];
        return v0 * v0 + v1 * v1;
    }
    /**
     * Computes the square of the length of vector (same as lengthSq)
     * @param v - vector.
     * @returns square of the length of vector.
     */
    const lenSq = lengthSq;
    /**
     * Computes the distance between 2 points
     * @param a - vector.
     * @param b - vector.
     * @returns distance between a and b
     */
    function distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Computes the distance between 2 points (same as distance)
     * @param a - vector.
     * @param b - vector.
     * @returns distance between a and b
     */
    const dist = distance;
    /**
     * Computes the square of the distance between 2 points
     * @param a - vector.
     * @param b - vector.
     * @returns square of the distance between a and b
     */
    function distanceSq(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return dx * dx + dy * dy;
    }
    /**
     * Computes the square of the distance between 2 points (same as distanceSq)
     * @param a - vector.
     * @param b - vector.
     * @returns square of the distance between a and b
     */
    const distSq = distanceSq;
    /**
     * Divides a vector by its Euclidean length and returns the quotient.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The normalized vector.
     */
    function normalize(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        const v0 = v[0];
        const v1 = v[1];
        const len = Math.sqrt(v0 * v0 + v1 * v1);
        if (len > 0.00001) {
            newDst[0] = v0 / len;
            newDst[1] = v1 / len;
        }
        else {
            newDst[0] = 0;
            newDst[1] = 0;
        }
        return newDst;
    }
    /**
     * Negates a vector.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns -v.
     */
    function negate(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = -v[0];
        newDst[1] = -v[1];
        return newDst;
    }
    /**
     * Copies a vector. (same as {@link vec2.clone})
     * Also see {@link vec2.create} and {@link vec2.set}
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A copy of v.
     */
    function copy(v, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = v[0];
        newDst[1] = v[1];
        return newDst;
    }
    /**
     * Clones a vector. (same as {@link vec2.copy})
     * Also see {@link vec2.create} and {@link vec2.set}
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A copy of v.
     */
    const clone = copy;
    /**
     * Multiplies a vector by another vector (component-wise); assumes a and
     * b have the same length.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of products of entries of a and b.
     */
    function multiply(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] * b[0];
        newDst[1] = a[1] * b[1];
        return newDst;
    }
    /**
     * Multiplies a vector by another vector (component-wise); assumes a and
     * b have the same length. (same as mul)
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of products of entries of a and b.
     */
    const mul = multiply;
    /**
     * Divides a vector by another vector (component-wise); assumes a and
     * b have the same length.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of quotients of entries of a and b.
     */
    function divide(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = a[0] / b[0];
        newDst[1] = a[1] / b[1];
        return newDst;
    }
    /**
     * Divides a vector by another vector (component-wise); assumes a and
     * b have the same length. (same as divide)
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of quotients of entries of a and b.
     */
    const div = divide;
    /**
     * Creates a random unit vector * scale
     * @param scale - Default 1
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The random vector.
     */
    function random(scale = 1, dst) {
        const newDst = (dst ?? new Ctor(2));
        const angle = Math.random() * 2 * Math.PI;
        newDst[0] = Math.cos(angle) * scale;
        newDst[1] = Math.sin(angle) * scale;
        return newDst;
    }
    /**
     * Zero's a vector
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The zeroed vector.
     */
    function zero(dst) {
        const newDst = (dst ?? new Ctor(2));
        newDst[0] = 0;
        newDst[1] = 0;
        return newDst;
    }
    /**
     * transform Vec2 by 4x4 matrix
     * @param v - the vector
     * @param m - The matrix.
     * @param dst - optional Vec2 to store result. If not passed a new one is created.
     * @returns the transformed vector
     */
    function transformMat4(v, m, dst) {
        const newDst = (dst ?? new Ctor(2));
        const x = v[0];
        const y = v[1];
        newDst[0] = x * m[0] + y * m[4] + m[12];
        newDst[1] = x * m[1] + y * m[5] + m[13];
        return newDst;
    }
    /**
     * Transforms vec4 by 3x3 matrix
     *
     * @param v - the vector
     * @param m - The matrix.
     * @param dst - optional Vec2 to store result. If not passed a new one is created.
     * @returns the transformed vector
     */
    function transformMat3(v, m, dst) {
        const newDst = (dst ?? new Ctor(2));
        const x = v[0];
        const y = v[1];
        newDst[0] = m[0] * x + m[4] * y + m[8];
        newDst[1] = m[1] * x + m[5] * y + m[9];
        return newDst;
    }
    /**
     * Rotate a 2D vector
     *
     * @param a The vec2 point to rotate
     * @param b The origin of the rotation
     * @param rad The angle of rotation in radians
     * @returns the rotated vector
     */
    function rotate(a, b, rad, dst) {
        const newDst = (dst ?? new Ctor(2));
        // Translate point to the origin
        const p0 = a[0] - b[0];
        const p1 = a[1] - b[1];
        const sinC = Math.sin(rad);
        const cosC = Math.cos(rad);
        //perform rotation and translate to correct position
        newDst[0] = p0 * cosC - p1 * sinC + b[0];
        newDst[1] = p0 * sinC + p1 * cosC + b[1];
        return newDst;
    }
    /**
     * Treat a 2D vector as a direction and set it's length
     *
     * @param a The vec2 to lengthen
     * @param len The length of the resulting vector
     * @returns The lengthened vector
     */
    function setLength(a, len, dst) {
        const newDst = (dst ?? new Ctor(2));
        normalize(a, newDst);
        return mulScalar(newDst, len, newDst);
    }
    /**
     * Ensure a vector is not longer than a max length
     *
     * @param a The vec2 to limit
     * @param maxLen The longest length of the resulting vector
     * @returns The vector, shortened to maxLen if it's too long
     */
    function truncate(a, maxLen, dst) {
        const newDst = (dst ?? new Ctor(2));
        if (length(a) > maxLen) {
            return setLength(a, maxLen, newDst);
        }
        return copy(a, newDst);
    }
    /**
     * Return the vector exactly between 2 endpoint vectors
     *
     * @param a Endpoint 1
     * @param b Endpoint 2
     * @returns The vector exactly residing between endpoints 1 and 2
     */
    function midpoint(a, b, dst) {
        const newDst = (dst ?? new Ctor(2));
        return lerp(a, b, 0.5, newDst);
    }
    return {
        create,
        fromValues,
        set,
        ceil,
        floor,
        round,
        clamp,
        add,
        addScaled,
        angle,
        subtract,
        sub,
        equalsApproximately,
        equals,
        lerp,
        lerpV,
        max,
        min,
        mulScalar,
        scale,
        divScalar,
        inverse,
        invert,
        cross,
        dot,
        length,
        len,
        lengthSq,
        lenSq,
        distance,
        dist,
        distanceSq,
        distSq,
        normalize,
        negate,
        copy,
        clone,
        multiply,
        mul,
        divide,
        div,
        random,
        zero,
        transformMat4,
        transformMat3,
        rotate,
        setLength,
        truncate,
        midpoint,
    };
}
const cache$5 = new Map();
function getAPI$5(Ctor) {
    let api = cache$5.get(Ctor);
    if (!api) {
        api = getAPIImpl$5(Ctor);
        cache$5.set(Ctor, api);
    }
    return api;
}

/*
 * Copyright 2022 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
/**
 * Generates am typed API for Vec3
 * */
function getAPIImpl$4(Ctor) {
    /**
     * Creates a vec3; may be called with x, y, z to set initial values.
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @param z - Initial z value.
     * @returns the created vector
     */
    function create(x, y, z) {
        const newDst = new Ctor(3);
        if (x !== undefined) {
            newDst[0] = x;
            if (y !== undefined) {
                newDst[1] = y;
                if (z !== undefined) {
                    newDst[2] = z;
                }
            }
        }
        return newDst;
    }
    /**
     * Creates a vec3; may be called with x, y, z to set initial values. (same as create)
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @param z - Initial z value.
     * @returns the created vector
     */
    const fromValues = create;
    /**
     * Sets the values of a Vec3
     * Also see {@link vec3.create} and {@link vec3.copy}
     *
     * @param x first value
     * @param y second value
     * @param z third value
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector with its elements set.
     */
    function set(x, y, z, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = x;
        newDst[1] = y;
        newDst[2] = z;
        return newDst;
    }
    /**
     * Applies Math.ceil to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the ceil of each element of v.
     */
    function ceil(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = Math.ceil(v[0]);
        newDst[1] = Math.ceil(v[1]);
        newDst[2] = Math.ceil(v[2]);
        return newDst;
    }
    /**
     * Applies Math.floor to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the floor of each element of v.
     */
    function floor(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = Math.floor(v[0]);
        newDst[1] = Math.floor(v[1]);
        newDst[2] = Math.floor(v[2]);
        return newDst;
    }
    /**
     * Applies Math.round to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the round of each element of v.
     */
    function round(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = Math.round(v[0]);
        newDst[1] = Math.round(v[1]);
        newDst[2] = Math.round(v[2]);
        return newDst;
    }
    /**
     * Clamp each element of vector between min and max
     * @param v - Operand vector.
     * @param max - Min value, default 0
     * @param min - Max value, default 1
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that the clamped value of each element of v.
     */
    function clamp(v, min = 0, max = 1, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = Math.min(max, Math.max(min, v[0]));
        newDst[1] = Math.min(max, Math.max(min, v[1]));
        newDst[2] = Math.min(max, Math.max(min, v[2]));
        return newDst;
    }
    /**
     * Adds two vectors; assumes a and b have the same dimension.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the sum of a and b.
     */
    function add(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] + b[0];
        newDst[1] = a[1] + b[1];
        newDst[2] = a[2] + b[2];
        return newDst;
    }
    /**
     * Adds two vectors, scaling the 2nd; assumes a and b have the same dimension.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param scale - Amount to scale b
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the sum of a + b * scale.
     */
    function addScaled(a, b, scale, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] + b[0] * scale;
        newDst[1] = a[1] + b[1] * scale;
        newDst[2] = a[2] + b[2] * scale;
        return newDst;
    }
    /**
     * Returns the angle in radians between two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns The angle in radians between the 2 vectors.
     */
    function angle(a, b) {
        const ax = a[0];
        const ay = a[1];
        const az = a[2];
        const bx = b[0];
        const by = b[1];
        const bz = b[2];
        const mag1 = Math.sqrt(ax * ax + ay * ay + az * az);
        const mag2 = Math.sqrt(bx * bx + by * by + bz * bz);
        const mag = mag1 * mag2;
        const cosine = mag && dot(a, b) / mag;
        return Math.acos(cosine);
    }
    /**
     * Subtracts two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the difference of a and b.
     */
    function subtract(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] - b[0];
        newDst[1] = a[1] - b[1];
        newDst[2] = a[2] - b[2];
        return newDst;
    }
    /**
     * Subtracts two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the difference of a and b.
     */
    const sub = subtract;
    /**
     * Check if 2 vectors are approximately equal
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns true if vectors are approximately equal
     */
    function equalsApproximately(a, b) {
        return Math.abs(a[0] - b[0]) < EPSILON &&
            Math.abs(a[1] - b[1]) < EPSILON &&
            Math.abs(a[2] - b[2]) < EPSILON;
    }
    /**
     * Check if 2 vectors are exactly equal
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns true if vectors are exactly equal
     */
    function equals(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    }
    /**
     * Performs linear interpolation on two vectors.
     * Given vectors a and b and interpolation coefficient t, returns
     * a + t * (b - a).
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param t - Interpolation coefficient.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The linear interpolated result.
     */
    function lerp(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] + t * (b[0] - a[0]);
        newDst[1] = a[1] + t * (b[1] - a[1]);
        newDst[2] = a[2] + t * (b[2] - a[2]);
        return newDst;
    }
    /**
     * Performs linear interpolation on two vectors.
     * Given vectors a and b and interpolation coefficient vector t, returns
     * a + t * (b - a).
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param t - Interpolation coefficients vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns the linear interpolated result.
     */
    function lerpV(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] + t[0] * (b[0] - a[0]);
        newDst[1] = a[1] + t[1] * (b[1] - a[1]);
        newDst[2] = a[2] + t[2] * (b[2] - a[2]);
        return newDst;
    }
    /**
     * Return max values of two vectors.
     * Given vectors a and b returns
     * [max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2])].
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The max components vector.
     */
    function max(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = Math.max(a[0], b[0]);
        newDst[1] = Math.max(a[1], b[1]);
        newDst[2] = Math.max(a[2], b[2]);
        return newDst;
    }
    /**
     * Return min values of two vectors.
     * Given vectors a and b returns
     * [min(a[0], b[0]), min(a[1], b[1]), min(a[2], b[2])].
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The min components vector.
     */
    function min(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = Math.min(a[0], b[0]);
        newDst[1] = Math.min(a[1], b[1]);
        newDst[2] = Math.min(a[2], b[2]);
        return newDst;
    }
    /**
     * Multiplies a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    function mulScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = v[0] * k;
        newDst[1] = v[1] * k;
        newDst[2] = v[2] * k;
        return newDst;
    }
    /**
     * Multiplies a vector by a scalar. (same as mulScalar)
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    const scale = mulScalar;
    /**
     * Divides a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    function divScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = v[0] / k;
        newDst[1] = v[1] / k;
        newDst[2] = v[2] / k;
        return newDst;
    }
    /**
     * Inverse a vector.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The inverted vector.
     */
    function inverse(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = 1 / v[0];
        newDst[1] = 1 / v[1];
        newDst[2] = 1 / v[2];
        return newDst;
    }
    /**
     * Invert a vector. (same as inverse)
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The inverted vector.
     */
    const invert = inverse;
    /**
     * Computes the cross product of two vectors; assumes both vectors have
     * three entries.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of a cross b.
     */
    function cross(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        const t1 = a[2] * b[0] - a[0] * b[2];
        const t2 = a[0] * b[1] - a[1] * b[0];
        newDst[0] = a[1] * b[2] - a[2] * b[1];
        newDst[1] = t1;
        newDst[2] = t2;
        return newDst;
    }
    /**
     * Computes the dot product of two vectors; assumes both vectors have
     * three entries.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns dot product
     */
    function dot(a, b) {
        return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
    }
    /**
     * Computes the length of vector
     * @param v - vector.
     * @returns length of vector.
     */
    function length(v) {
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        return Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
    }
    /**
     * Computes the length of vector (same as length)
     * @param v - vector.
     * @returns length of vector.
     */
    const len = length;
    /**
     * Computes the square of the length of vector
     * @param v - vector.
     * @returns square of the length of vector.
     */
    function lengthSq(v) {
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        return v0 * v0 + v1 * v1 + v2 * v2;
    }
    /**
     * Computes the square of the length of vector (same as lengthSq)
     * @param v - vector.
     * @returns square of the length of vector.
     */
    const lenSq = lengthSq;
    /**
     * Computes the distance between 2 points
     * @param a - vector.
     * @param b - vector.
     * @returns distance between a and b
     */
    function distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    /**
     * Computes the distance between 2 points (same as distance)
     * @param a - vector.
     * @param b - vector.
     * @returns distance between a and b
     */
    const dist = distance;
    /**
     * Computes the square of the distance between 2 points
     * @param a - vector.
     * @param b - vector.
     * @returns square of the distance between a and b
     */
    function distanceSq(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return dx * dx + dy * dy + dz * dz;
    }
    /**
     * Computes the square of the distance between 2 points (same as distanceSq)
     * @param a - vector.
     * @param b - vector.
     * @returns square of the distance between a and b
     */
    const distSq = distanceSq;
    /**
     * Divides a vector by its Euclidean length and returns the quotient.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The normalized vector.
     */
    function normalize(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const len = Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
        if (len > 0.00001) {
            newDst[0] = v0 / len;
            newDst[1] = v1 / len;
            newDst[2] = v2 / len;
        }
        else {
            newDst[0] = 0;
            newDst[1] = 0;
            newDst[2] = 0;
        }
        return newDst;
    }
    /**
     * Negates a vector.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns -v.
     */
    function negate(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = -v[0];
        newDst[1] = -v[1];
        newDst[2] = -v[2];
        return newDst;
    }
    /**
     * Copies a vector. (same as {@link vec3.clone})
     * Also see {@link vec3.create} and {@link vec3.set}
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A copy of v.
     */
    function copy(v, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = v[0];
        newDst[1] = v[1];
        newDst[2] = v[2];
        return newDst;
    }
    /**
     * Clones a vector. (same as {@link vec3.copy})
     * Also see {@link vec3.create} and {@link vec3.set}
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A copy of v.
     */
    const clone = copy;
    /**
     * Multiplies a vector by another vector (component-wise); assumes a and
     * b have the same length.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of products of entries of a and b.
     */
    function multiply(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] * b[0];
        newDst[1] = a[1] * b[1];
        newDst[2] = a[2] * b[2];
        return newDst;
    }
    /**
     * Multiplies a vector by another vector (component-wise); assumes a and
     * b have the same length. (same as mul)
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of products of entries of a and b.
     */
    const mul = multiply;
    /**
     * Divides a vector by another vector (component-wise); assumes a and
     * b have the same length.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of quotients of entries of a and b.
     */
    function divide(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = a[0] / b[0];
        newDst[1] = a[1] / b[1];
        newDst[2] = a[2] / b[2];
        return newDst;
    }
    /**
     * Divides a vector by another vector (component-wise); assumes a and
     * b have the same length. (same as divide)
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of quotients of entries of a and b.
     */
    const div = divide;
    /**
     * Creates a random vector
     * @param scale - Default 1
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The random vector.
     */
    function random(scale = 1, dst) {
        const newDst = (dst ?? new Ctor(3));
        const angle = Math.random() * 2 * Math.PI;
        const z = Math.random() * 2 - 1;
        const zScale = Math.sqrt(1 - z * z) * scale;
        newDst[0] = Math.cos(angle) * zScale;
        newDst[1] = Math.sin(angle) * zScale;
        newDst[2] = z * scale;
        return newDst;
    }
    /**
     * Zero's a vector
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The zeroed vector.
     */
    function zero(dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = 0;
        newDst[1] = 0;
        newDst[2] = 0;
        return newDst;
    }
    /**
     * transform vec3 by 4x4 matrix
     * @param v - the vector
     * @param m - The matrix.
     * @param dst - optional vec3 to store result. If not passed a new one is created.
     * @returns the transformed vector
     */
    function transformMat4(v, m, dst) {
        const newDst = (dst ?? new Ctor(3));
        const x = v[0];
        const y = v[1];
        const z = v[2];
        const w = (m[3] * x + m[7] * y + m[11] * z + m[15]) || 1;
        newDst[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
        newDst[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        newDst[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
        return newDst;
    }
    /**
     * Transform vec3 by upper 3x3 matrix inside 4x4 matrix.
     * @param v - The direction.
     * @param m - The matrix.
     * @param dst - optional vec3 to store result. If not passed a new one is created.
     * @returns The transformed vector.
     */
    function transformMat4Upper3x3(v, m, dst) {
        const newDst = (dst ?? new Ctor(3));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        newDst[0] = v0 * m[0 * 4 + 0] + v1 * m[1 * 4 + 0] + v2 * m[2 * 4 + 0];
        newDst[1] = v0 * m[0 * 4 + 1] + v1 * m[1 * 4 + 1] + v2 * m[2 * 4 + 1];
        newDst[2] = v0 * m[0 * 4 + 2] + v1 * m[1 * 4 + 2] + v2 * m[2 * 4 + 2];
        return newDst;
    }
    /**
     * Transforms vec3 by 3x3 matrix
     *
     * @param v - the vector
     * @param m - The matrix.
     * @param dst - optional vec3 to store result. If not passed a new one is created.
     * @returns the transformed vector
     */
    function transformMat3(v, m, dst) {
        const newDst = (dst ?? new Ctor(3));
        const x = v[0];
        const y = v[1];
        const z = v[2];
        newDst[0] = x * m[0] + y * m[4] + z * m[8];
        newDst[1] = x * m[1] + y * m[5] + z * m[9];
        newDst[2] = x * m[2] + y * m[6] + z * m[10];
        return newDst;
    }
    /**
     * Transforms vec3 by Quaternion
     * @param v - the vector to transform
     * @param q - the quaternion to transform by
     * @param dst - optional vec3 to store result. If not passed a new one is created.
     * @returns the transformed
     */
    function transformQuat(v, q, dst) {
        const newDst = (dst ?? new Ctor(3));
        const qx = q[0];
        const qy = q[1];
        const qz = q[2];
        const w2 = q[3] * 2;
        const x = v[0];
        const y = v[1];
        const z = v[2];
        const uvX = qy * z - qz * y;
        const uvY = qz * x - qx * z;
        const uvZ = qx * y - qy * x;
        newDst[0] = x + uvX * w2 + (qy * uvZ - qz * uvY) * 2;
        newDst[1] = y + uvY * w2 + (qz * uvX - qx * uvZ) * 2;
        newDst[2] = z + uvZ * w2 + (qx * uvY - qy * uvX) * 2;
        return newDst;
    }
    /**
     * Returns the translation component of a 4-by-4 matrix as a vector with 3
     * entries.
     * @param m - The matrix.
     * @param dst - vector to hold result. If not passed a new one is created.
     * @returns The translation component of m.
     */
    function getTranslation(m, dst) {
        const newDst = (dst ?? new Ctor(3));
        newDst[0] = m[12];
        newDst[1] = m[13];
        newDst[2] = m[14];
        return newDst;
    }
    /**
     * Returns an axis of a 4x4 matrix as a vector with 3 entries
     * @param m - The matrix.
     * @param axis - The axis 0 = x, 1 = y, 2 = z;
     * @returns The axis component of m.
     */
    function getAxis(m, axis, dst) {
        const newDst = (dst ?? new Ctor(3));
        const off = axis * 4;
        newDst[0] = m[off + 0];
        newDst[1] = m[off + 1];
        newDst[2] = m[off + 2];
        return newDst;
    }
    /**
     * Returns the scaling component of the matrix
     * @param m - The Matrix
     * @param dst - The vector to set. If not passed a new one is created.
     */
    function getScaling(m, dst) {
        const newDst = (dst ?? new Ctor(3));
        const xx = m[0];
        const xy = m[1];
        const xz = m[2];
        const yx = m[4];
        const yy = m[5];
        const yz = m[6];
        const zx = m[8];
        const zy = m[9];
        const zz = m[10];
        newDst[0] = Math.sqrt(xx * xx + xy * xy + xz * xz);
        newDst[1] = Math.sqrt(yx * yx + yy * yy + yz * yz);
        newDst[2] = Math.sqrt(zx * zx + zy * zy + zz * zz);
        return newDst;
    }
    /**
     * Rotate a 3D vector around the x-axis
     *
     * @param {ReadonlyVec3} a The vec3 point to rotate
     * @param {ReadonlyVec3} b The origin of the rotation
     * @param {Number} rad The angle of rotation in radians
     * @param dst - The vector to set. If not passed a new one is created.
     * @returns the rotated vector
     */
    function rotateX(a, b, rad, dst) {
        const newDst = (dst ?? new Ctor(3));
        const p = [];
        const r = [];
        //Translate point to the origin
        p[0] = a[0] - b[0];
        p[1] = a[1] - b[1];
        p[2] = a[2] - b[2];
        //perform rotation
        r[0] = p[0];
        r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
        r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
        //translate to correct position
        newDst[0] = r[0] + b[0];
        newDst[1] = r[1] + b[1];
        newDst[2] = r[2] + b[2];
        return newDst;
    }
    /**
     * Rotate a 3D vector around the y-axis
     *
     * @param {ReadonlyVec3} a The vec3 point to rotate
     * @param {ReadonlyVec3} b The origin of the rotation
     * @param {Number} rad The angle of rotation in radians
     * @param dst - The vector to set. If not passed a new one is created.
     * @returns the rotated vector
     */
    function rotateY(a, b, rad, dst) {
        const newDst = (dst ?? new Ctor(3));
        const p = [];
        const r = [];
        // translate point to the origin
        p[0] = a[0] - b[0];
        p[1] = a[1] - b[1];
        p[2] = a[2] - b[2];
        // perform rotation
        r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
        r[1] = p[1];
        r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
        // translate to correct position
        newDst[0] = r[0] + b[0];
        newDst[1] = r[1] + b[1];
        newDst[2] = r[2] + b[2];
        return newDst;
    }
    /**
     * Rotate a 3D vector around the z-axis
     *
     * @param {ReadonlyVec3} a The vec3 point to rotate
     * @param {ReadonlyVec3} b The origin of the rotation
     * @param {Number} rad The angle of rotation in radians
     * @param dst - The vector to set. If not passed a new one is created.
     * @returns {vec3} out
     */
    function rotateZ(a, b, rad, dst) {
        const newDst = (dst ?? new Ctor(3));
        const p = [];
        const r = [];
        // translate point to the origin
        p[0] = a[0] - b[0];
        p[1] = a[1] - b[1];
        p[2] = a[2] - b[2];
        // perform rotation
        r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
        r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
        r[2] = p[2];
        // translate to correct position
        newDst[0] = r[0] + b[0];
        newDst[1] = r[1] + b[1];
        newDst[2] = r[2] + b[2];
        return newDst;
    }
    /**
     * Treat a 3D vector as a direction and set it's length
     *
     * @param a The vec3 to lengthen
     * @param len The length of the resulting vector
     * @returns The lengthened vector
     */
    function setLength(a, len, dst) {
        const newDst = (dst ?? new Ctor(3));
        normalize(a, newDst);
        return mulScalar(newDst, len, newDst);
    }
    /**
     * Ensure a vector is not longer than a max length
     *
     * @param a The vec3 to limit
     * @param maxLen The longest length of the resulting vector
     * @returns The vector, shortened to maxLen if it's too long
     */
    function truncate(a, maxLen, dst) {
        const newDst = (dst ?? new Ctor(3));
        if (length(a) > maxLen) {
            return setLength(a, maxLen, newDst);
        }
        return copy(a, newDst);
    }
    /**
     * Return the vector exactly between 2 endpoint vectors
     *
     * @param a Endpoint 1
     * @param b Endpoint 2
     * @returns The vector exactly residing between endpoints 1 and 2
     */
    function midpoint(a, b, dst) {
        const newDst = (dst ?? new Ctor(3));
        return lerp(a, b, 0.5, newDst);
    }
    return {
        create,
        fromValues,
        set,
        ceil,
        floor,
        round,
        clamp,
        add,
        addScaled,
        angle,
        subtract,
        sub,
        equalsApproximately,
        equals,
        lerp,
        lerpV,
        max,
        min,
        mulScalar,
        scale,
        divScalar,
        inverse,
        invert,
        cross,
        dot,
        length,
        len,
        lengthSq,
        lenSq,
        distance,
        dist,
        distanceSq,
        distSq,
        normalize,
        negate,
        copy,
        clone,
        multiply,
        mul,
        divide,
        div,
        random,
        zero,
        transformMat4,
        transformMat4Upper3x3,
        transformMat3,
        transformQuat,
        getTranslation,
        getAxis,
        getScaling,
        rotateX,
        rotateY,
        rotateZ,
        setLength,
        truncate,
        midpoint,
    };
}
const cache$4 = new Map();
function getAPI$4(Ctor) {
    let api = cache$4.get(Ctor);
    if (!api) {
        api = getAPIImpl$4(Ctor);
        cache$4.set(Ctor, api);
    }
    return api;
}

/*
 * Copyright 2022 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
/**
 * Generates a typed API for Mat3
 * */
function getAPIImpl$3(Ctor) {
    const vec2 = getAPI$5(Ctor);
    const vec3 = getAPI$4(Ctor);
    /**
     * Create a Mat3 from values
     *
     * Note: Since passing in a raw JavaScript array
     * is valid in all circumstances, if you want to
     * force a JavaScript array into a Mat3's specified type
     * it would be faster to use
     *
     * ```
     * const m = mat3.clone(someJSArray);
     * ```
     *
     * @param v0 - value for element 0
     * @param v1 - value for element 1
     * @param v2 - value for element 2
     * @param v3 - value for element 3
     * @param v4 - value for element 4
     * @param v5 - value for element 5
     * @param v6 - value for element 6
     * @param v7 - value for element 7
     * @param v8 - value for element 8
     * @returns matrix created from values.
     */
    function create(v0, v1, v2, v3, v4, v5, v6, v7, v8) {
        const newDst = new Ctor(12);
        // to make the array homogenous
        newDst[3] = 0;
        newDst[7] = 0;
        newDst[11] = 0;
        if (v0 !== undefined) {
            newDst[0] = v0;
            if (v1 !== undefined) {
                newDst[1] = v1;
                if (v2 !== undefined) {
                    newDst[2] = v2;
                    if (v3 !== undefined) {
                        newDst[4] = v3;
                        if (v4 !== undefined) {
                            newDst[5] = v4;
                            if (v5 !== undefined) {
                                newDst[6] = v5;
                                if (v6 !== undefined) {
                                    newDst[8] = v6;
                                    if (v7 !== undefined) {
                                        newDst[9] = v7;
                                        if (v8 !== undefined) {
                                            newDst[10] = v8;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return newDst;
    }
    /**
     * Sets the values of a Mat3
     * Also see {@link mat3.create} and {@link mat3.copy}
     *
     * @param v0 - value for element 0
     * @param v1 - value for element 1
     * @param v2 - value for element 2
     * @param v3 - value for element 3
     * @param v4 - value for element 4
     * @param v5 - value for element 5
     * @param v6 - value for element 6
     * @param v7 - value for element 7
     * @param v8 - value for element 8
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns Mat3 set from values.
     */
    function set(v0, v1, v2, v3, v4, v5, v6, v7, v8, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = v0;
        newDst[1] = v1;
        newDst[2] = v2;
        newDst[3] = 0;
        newDst[4] = v3;
        newDst[5] = v4;
        newDst[6] = v5;
        newDst[7] = 0;
        newDst[8] = v6;
        newDst[9] = v7;
        newDst[10] = v8;
        newDst[11] = 0;
        return newDst;
    }
    /**
     * Creates a Mat3 from the upper left 3x3 part of a Mat4
     * @param m4 - source matrix
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns Mat3 made from m4
     */
    function fromMat4(m4, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = m4[0];
        newDst[1] = m4[1];
        newDst[2] = m4[2];
        newDst[3] = 0;
        newDst[4] = m4[4];
        newDst[5] = m4[5];
        newDst[6] = m4[6];
        newDst[7] = 0;
        newDst[8] = m4[8];
        newDst[9] = m4[9];
        newDst[10] = m4[10];
        newDst[11] = 0;
        return newDst;
    }
    /**
     * Creates a Mat3 rotation matrix from a quaternion
     * @param q - quaternion to create matrix from
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns Mat3 made from q
     */
    function fromQuat(q, dst) {
        const newDst = (dst ?? new Ctor(12));
        const x = q[0];
        const y = q[1];
        const z = q[2];
        const w = q[3];
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;
        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;
        newDst[0] = 1 - yy - zz;
        newDst[1] = yx + wz;
        newDst[2] = zx - wy;
        newDst[3] = 0;
        newDst[4] = yx - wz;
        newDst[5] = 1 - xx - zz;
        newDst[6] = zy + wx;
        newDst[7] = 0;
        newDst[8] = zx + wy;
        newDst[9] = zy - wx;
        newDst[10] = 1 - xx - yy;
        newDst[11] = 0;
        return newDst;
    }
    /**
     * Negates a matrix.
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns -m.
     */
    function negate(m, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = -m[0];
        newDst[1] = -m[1];
        newDst[2] = -m[2];
        newDst[4] = -m[4];
        newDst[5] = -m[5];
        newDst[6] = -m[6];
        newDst[8] = -m[8];
        newDst[9] = -m[9];
        newDst[10] = -m[10];
        return newDst;
    }
    /**
     * Copies a matrix. (same as {@link mat3.clone})
     * Also see {@link mat3.create} and {@link mat3.set}
     * @param m - The matrix.
     * @param dst - The matrix. If not passed a new one is created.
     * @returns A copy of m.
     */
    function copy(m, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = m[0];
        newDst[1] = m[1];
        newDst[2] = m[2];
        newDst[4] = m[4];
        newDst[5] = m[5];
        newDst[6] = m[6];
        newDst[8] = m[8];
        newDst[9] = m[9];
        newDst[10] = m[10];
        return newDst;
    }
    /**
     * Copies a matrix (same as {@link mat3.copy})
     * Also see {@link mat3.create} and {@link mat3.set}
     * @param m - The matrix.
     * @param dst - The matrix. If not passed a new one is created.
     * @returns A copy of m.
     */
    const clone = copy;
    /**
     * Check if 2 matrices are approximately equal
     * @param a Operand matrix.
     * @param b Operand matrix.
     * @returns true if matrices are approximately equal
     */
    function equalsApproximately(a, b) {
        return Math.abs(a[0] - b[0]) < EPSILON &&
            Math.abs(a[1] - b[1]) < EPSILON &&
            Math.abs(a[2] - b[2]) < EPSILON &&
            Math.abs(a[4] - b[4]) < EPSILON &&
            Math.abs(a[5] - b[5]) < EPSILON &&
            Math.abs(a[6] - b[6]) < EPSILON &&
            Math.abs(a[8] - b[8]) < EPSILON &&
            Math.abs(a[9] - b[9]) < EPSILON &&
            Math.abs(a[10] - b[10]) < EPSILON;
    }
    /**
     * Check if 2 matrices are exactly equal
     * @param a Operand matrix.
     * @param b Operand matrix.
     * @returns true if matrices are exactly equal
     */
    function equals(a, b) {
        return a[0] === b[0] &&
            a[1] === b[1] &&
            a[2] === b[2] &&
            a[4] === b[4] &&
            a[5] === b[5] &&
            a[6] === b[6] &&
            a[8] === b[8] &&
            a[9] === b[9] &&
            a[10] === b[10];
    }
    /**
     * Creates a 3-by-3 identity matrix.
     *
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns A 3-by-3 identity matrix.
     */
    function identity(dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = 1;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = 1;
        newDst[6] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        return newDst;
    }
    /**
     * Takes the transpose of a matrix.
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The transpose of m.
     */
    function transpose(m, dst) {
        const newDst = (dst ?? new Ctor(12));
        if (newDst === m) {
            let t;
            // 0 1 2
            // 4 5 6
            // 8 9 10
            t = m[1];
            m[1] = m[4];
            m[4] = t;
            t = m[2];
            m[2] = m[8];
            m[8] = t;
            t = m[6];
            m[6] = m[9];
            m[9] = t;
            return newDst;
        }
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        newDst[0] = m00;
        newDst[1] = m10;
        newDst[2] = m20;
        newDst[4] = m01;
        newDst[5] = m11;
        newDst[6] = m21;
        newDst[8] = m02;
        newDst[9] = m12;
        newDst[10] = m22;
        return newDst;
    }
    /**
     * Computes the inverse of a 3-by-3 matrix.
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The inverse of m.
     */
    function inverse(m, dst) {
        const newDst = (dst ?? new Ctor(12));
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const b01 = m22 * m11 - m12 * m21;
        const b11 = -m22 * m10 + m12 * m20;
        const b21 = m21 * m10 - m11 * m20;
        const invDet = 1 / (m00 * b01 + m01 * b11 + m02 * b21);
        newDst[0] = b01 * invDet;
        newDst[1] = (-m22 * m01 + m02 * m21) * invDet;
        newDst[2] = (m12 * m01 - m02 * m11) * invDet;
        newDst[4] = b11 * invDet;
        newDst[5] = (m22 * m00 - m02 * m20) * invDet;
        newDst[6] = (-m12 * m00 + m02 * m10) * invDet;
        newDst[8] = b21 * invDet;
        newDst[9] = (-m21 * m00 + m01 * m20) * invDet;
        newDst[10] = (m11 * m00 - m01 * m10) * invDet;
        return newDst;
    }
    /**
     * Compute the determinant of a matrix
     * @param m - the matrix
     * @returns the determinant
     */
    function determinant(m) {
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        return m00 * (m11 * m22 - m21 * m12) -
            m10 * (m01 * m22 - m21 * m02) +
            m20 * (m01 * m12 - m11 * m02);
    }
    /**
     * Computes the inverse of a 3-by-3 matrix. (same as inverse)
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The inverse of m.
     */
    const invert = inverse;
    /**
     * Multiplies two 3-by-3 matrices with a on the left and b on the right
     * @param a - The matrix on the left.
     * @param b - The matrix on the right.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The matrix product of a and b.
     */
    function multiply(a, b, dst) {
        const newDst = (dst ?? new Ctor(12));
        const a00 = a[0];
        const a01 = a[1];
        const a02 = a[2];
        const a10 = a[4 + 0];
        const a11 = a[4 + 1];
        const a12 = a[4 + 2];
        const a20 = a[8 + 0];
        const a21 = a[8 + 1];
        const a22 = a[8 + 2];
        const b00 = b[0];
        const b01 = b[1];
        const b02 = b[2];
        const b10 = b[4 + 0];
        const b11 = b[4 + 1];
        const b12 = b[4 + 2];
        const b20 = b[8 + 0];
        const b21 = b[8 + 1];
        const b22 = b[8 + 2];
        newDst[0] = a00 * b00 + a10 * b01 + a20 * b02;
        newDst[1] = a01 * b00 + a11 * b01 + a21 * b02;
        newDst[2] = a02 * b00 + a12 * b01 + a22 * b02;
        newDst[4] = a00 * b10 + a10 * b11 + a20 * b12;
        newDst[5] = a01 * b10 + a11 * b11 + a21 * b12;
        newDst[6] = a02 * b10 + a12 * b11 + a22 * b12;
        newDst[8] = a00 * b20 + a10 * b21 + a20 * b22;
        newDst[9] = a01 * b20 + a11 * b21 + a21 * b22;
        newDst[10] = a02 * b20 + a12 * b21 + a22 * b22;
        return newDst;
    }
    /**
     * Multiplies two 3-by-3 matrices with a on the left and b on the right (same as multiply)
     * @param a - The matrix on the left.
     * @param b - The matrix on the right.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The matrix product of a and b.
     */
    const mul = multiply;
    /**
     * Sets the translation component of a 3-by-3 matrix to the given
     * vector.
     * @param a - The matrix.
     * @param v - The vector.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The matrix with translation set.
     */
    function setTranslation(a, v, dst) {
        const newDst = (dst ?? identity());
        if (a !== newDst) {
            newDst[0] = a[0];
            newDst[1] = a[1];
            newDst[2] = a[2];
            newDst[4] = a[4];
            newDst[5] = a[5];
            newDst[6] = a[6];
        }
        newDst[8] = v[0];
        newDst[9] = v[1];
        newDst[10] = 1;
        return newDst;
    }
    /**
     * Returns the translation component of a 3-by-3 matrix as a vector with 3
     * entries.
     * @param m - The matrix.
     * @param dst - vector to hold result. If not passed a new one is created.
     * @returns The translation component of m.
     */
    function getTranslation(m, dst) {
        const newDst = (dst ?? vec2.create());
        newDst[0] = m[8];
        newDst[1] = m[9];
        return newDst;
    }
    /**
     * Returns an axis of a 3x3 matrix as a vector with 2 entries
     * @param m - The matrix.
     * @param axis - The axis 0 = x, 1 = y,
     * @returns The axis component of m.
     */
    function getAxis(m, axis, dst) {
        const newDst = (dst ?? vec2.create());
        const off = axis * 4;
        newDst[0] = m[off + 0];
        newDst[1] = m[off + 1];
        return newDst;
    }
    /**
     * Sets an axis of a 3x3 matrix as a vector with 2 entries
     * @param m - The matrix.
     * @param v - the axis vector
     * @param axis - The axis  0 = x, 1 = y;
     * @param dst - The matrix to set. If not passed a new one is created.
     * @returns The matrix with axis set.
     */
    function setAxis(m, v, axis, dst) {
        const newDst = (dst === m ? m : copy(m, dst));
        const off = axis * 4;
        newDst[off + 0] = v[0];
        newDst[off + 1] = v[1];
        return newDst;
    }
    /**
     * Returns the "2d" scaling component of the matrix
     * @param m - The Matrix
     * @param dst - The vector to set. If not passed a new one is created.
     */
    function getScaling(m, dst) {
        const newDst = (dst ?? vec2.create());
        const xx = m[0];
        const xy = m[1];
        const yx = m[4];
        const yy = m[5];
        newDst[0] = Math.sqrt(xx * xx + xy * xy);
        newDst[1] = Math.sqrt(yx * yx + yy * yy);
        return newDst;
    }
    /**
     * Returns the "3d" scaling component of the matrix
     * @param m - The Matrix
     * @param dst - The vector to set. If not passed a new one is created.
     */
    function get3DScaling(m, dst) {
        const newDst = (dst ?? vec3.create());
        const xx = m[0];
        const xy = m[1];
        const xz = m[2];
        const yx = m[4];
        const yy = m[5];
        const yz = m[6];
        const zx = m[8];
        const zy = m[9];
        const zz = m[10];
        newDst[0] = Math.sqrt(xx * xx + xy * xy + xz * xz);
        newDst[1] = Math.sqrt(yx * yx + yy * yy + yz * yz);
        newDst[2] = Math.sqrt(zx * zx + zy * zy + zz * zz);
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which translates by the given vector v.
     * @param v - The vector by which to translate.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The translation matrix.
     */
    function translation(v, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = 1;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = 1;
        newDst[6] = 0;
        newDst[8] = v[0];
        newDst[9] = v[1];
        newDst[10] = 1;
        return newDst;
    }
    /**
     * Translates the given 3-by-3 matrix by the given vector v.
     * @param m - The matrix.
     * @param v - The vector by which to translate.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The translated matrix.
     */
    function translate(m, v, dst) {
        const newDst = (dst ?? new Ctor(12));
        const v0 = v[0];
        const v1 = v[1];
        const m00 = m[0];
        const m01 = m[1];
        const m02 = m[2];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        if (m !== newDst) {
            newDst[0] = m00;
            newDst[1] = m01;
            newDst[2] = m02;
            newDst[4] = m10;
            newDst[5] = m11;
            newDst[6] = m12;
        }
        newDst[8] = m00 * v0 + m10 * v1 + m20;
        newDst[9] = m01 * v0 + m11 * v1 + m21;
        newDst[10] = m02 * v0 + m12 * v1 + m22;
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which rotates  by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    function rotation(angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(12));
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c;
        newDst[1] = s;
        newDst[2] = 0;
        newDst[4] = -s;
        newDst[5] = c;
        newDst[6] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        return newDst;
    }
    /**
     * Rotates the given 3-by-3 matrix  by the given angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function rotate(m, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(12));
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c * m00 + s * m10;
        newDst[1] = c * m01 + s * m11;
        newDst[2] = c * m02 + s * m12;
        newDst[4] = c * m10 - s * m00;
        newDst[5] = c * m11 - s * m01;
        newDst[6] = c * m12 - s * m02;
        if (m !== newDst) {
            newDst[8] = m[8];
            newDst[9] = m[9];
            newDst[10] = m[10];
        }
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which rotates around the x-axis by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    function rotationX(angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(12));
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = 1;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = c;
        newDst[6] = s;
        newDst[8] = 0;
        newDst[9] = -s;
        newDst[10] = c;
        return newDst;
    }
    /**
     * Rotates the given 3-by-3 matrix around the x-axis by the given
     * angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function rotateX(m, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(12));
        const m10 = m[4];
        const m11 = m[5];
        const m12 = m[6];
        const m20 = m[8];
        const m21 = m[9];
        const m22 = m[10];
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[4] = c * m10 + s * m20;
        newDst[5] = c * m11 + s * m21;
        newDst[6] = c * m12 + s * m22;
        newDst[8] = c * m20 - s * m10;
        newDst[9] = c * m21 - s * m11;
        newDst[10] = c * m22 - s * m12;
        if (m !== newDst) {
            newDst[0] = m[0];
            newDst[1] = m[1];
            newDst[2] = m[2];
        }
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which rotates around the y-axis by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    function rotationY(angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(12));
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c;
        newDst[1] = 0;
        newDst[2] = -s;
        newDst[4] = 0;
        newDst[5] = 1;
        newDst[6] = 0;
        newDst[8] = s;
        newDst[9] = 0;
        newDst[10] = c;
        return newDst;
    }
    /**
     * Rotates the given 3-by-3 matrix around the y-axis by the given
     * angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function rotateY(m, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(12));
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c * m00 - s * m20;
        newDst[1] = c * m01 - s * m21;
        newDst[2] = c * m02 - s * m22;
        newDst[8] = c * m20 + s * m00;
        newDst[9] = c * m21 + s * m01;
        newDst[10] = c * m22 + s * m02;
        if (m !== newDst) {
            newDst[4] = m[4];
            newDst[5] = m[5];
            newDst[6] = m[6];
        }
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which rotates around the z-axis by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    const rotationZ = rotation;
    /**
     * Rotates the given 3-by-3 matrix around the z-axis by the given
     * angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    const rotateZ = rotate;
    /**
     * Creates a 3-by-3 matrix which scales in each dimension by an amount given by
     * the corresponding entry in the given vector; assumes the vector has two
     * entries.
     * @param v - A vector of
     *     2 entries specifying the factor by which to scale in each dimension.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaling matrix.
     */
    function scaling(v, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = v[0];
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = v[1];
        newDst[6] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        return newDst;
    }
    /**
     * Scales the given 3-by-3 matrix in each dimension by an amount
     * given by the corresponding entry in the given vector; assumes the vector has
     * two entries.
     * @param m - The matrix to be modified.
     * @param v - A vector of 2 entries specifying the
     *     factor by which to scale in each dimension.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaled matrix.
     */
    function scale(m, v, dst) {
        const newDst = (dst ?? new Ctor(12));
        const v0 = v[0];
        const v1 = v[1];
        newDst[0] = v0 * m[0 * 4 + 0];
        newDst[1] = v0 * m[0 * 4 + 1];
        newDst[2] = v0 * m[0 * 4 + 2];
        newDst[4] = v1 * m[1 * 4 + 0];
        newDst[5] = v1 * m[1 * 4 + 1];
        newDst[6] = v1 * m[1 * 4 + 2];
        if (m !== newDst) {
            newDst[8] = m[8];
            newDst[9] = m[9];
            newDst[10] = m[10];
        }
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which scales in each dimension by an amount given by
     * the corresponding entry in the given vector; assumes the vector has three
     * entries.
     * @param v - A vector of
     *     3 entries specifying the factor by which to scale in each dimension.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaling matrix.
     */
    function scaling3D(v, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = v[0];
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = v[1];
        newDst[6] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = v[2];
        return newDst;
    }
    /**
     * Scales the given 3-by-3 matrix in each dimension by an amount
     * given by the corresponding entry in the given vector; assumes the vector has
     * three entries.
     * @param m - The matrix to be modified.
     * @param v - A vector of 3 entries specifying the
     *     factor by which to scale in each dimension.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaled matrix.
     */
    function scale3D(m, v, dst) {
        const newDst = (dst ?? new Ctor(12));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        newDst[0] = v0 * m[0 * 4 + 0];
        newDst[1] = v0 * m[0 * 4 + 1];
        newDst[2] = v0 * m[0 * 4 + 2];
        newDst[4] = v1 * m[1 * 4 + 0];
        newDst[5] = v1 * m[1 * 4 + 1];
        newDst[6] = v1 * m[1 * 4 + 2];
        newDst[8] = v2 * m[2 * 4 + 0];
        newDst[9] = v2 * m[2 * 4 + 1];
        newDst[10] = v2 * m[2 * 4 + 2];
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which scales uniformly in the X and Y dimensions
     * @param s - Amount to scale
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaling matrix.
     */
    function uniformScaling(s, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = s;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = s;
        newDst[6] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        return newDst;
    }
    /**
     * Scales the given 3-by-3 matrix in the X and Y dimension by an amount
     * given.
     * @param m - The matrix to be modified.
     * @param s - Amount to scale.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaled matrix.
     */
    function uniformScale(m, s, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = s * m[0 * 4 + 0];
        newDst[1] = s * m[0 * 4 + 1];
        newDst[2] = s * m[0 * 4 + 2];
        newDst[4] = s * m[1 * 4 + 0];
        newDst[5] = s * m[1 * 4 + 1];
        newDst[6] = s * m[1 * 4 + 2];
        if (m !== newDst) {
            newDst[8] = m[8];
            newDst[9] = m[9];
            newDst[10] = m[10];
        }
        return newDst;
    }
    /**
     * Creates a 3-by-3 matrix which scales uniformly in each dimension
     * @param s - Amount to scale
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaling matrix.
     */
    function uniformScaling3D(s, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = s;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[4] = 0;
        newDst[5] = s;
        newDst[6] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = s;
        return newDst;
    }
    /**
     * Scales the given 3-by-3 matrix in each dimension by an amount
     * given.
     * @param m - The matrix to be modified.
     * @param s - Amount to scale.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaled matrix.
     */
    function uniformScale3D(m, s, dst) {
        const newDst = (dst ?? new Ctor(12));
        newDst[0] = s * m[0 * 4 + 0];
        newDst[1] = s * m[0 * 4 + 1];
        newDst[2] = s * m[0 * 4 + 2];
        newDst[4] = s * m[1 * 4 + 0];
        newDst[5] = s * m[1 * 4 + 1];
        newDst[6] = s * m[1 * 4 + 2];
        newDst[8] = s * m[2 * 4 + 0];
        newDst[9] = s * m[2 * 4 + 1];
        newDst[10] = s * m[2 * 4 + 2];
        return newDst;
    }
    return {
        clone,
        create,
        set,
        fromMat4,
        fromQuat,
        negate,
        copy,
        equalsApproximately,
        equals,
        identity,
        transpose,
        inverse,
        invert,
        determinant,
        mul,
        multiply,
        setTranslation,
        getTranslation,
        getAxis,
        setAxis,
        getScaling,
        get3DScaling,
        translation,
        translate,
        rotation,
        rotate,
        rotationX,
        rotateX,
        rotationY,
        rotateY,
        rotationZ,
        rotateZ,
        scaling,
        scale,
        uniformScaling,
        uniformScale,
        scaling3D,
        scale3D,
        uniformScaling3D,
        uniformScale3D,
    };
}
const cache$3 = new Map();
function getAPI$3(Ctor) {
    let api = cache$3.get(Ctor);
    if (!api) {
        api = getAPIImpl$3(Ctor);
        cache$3.set(Ctor, api);
    }
    return api;
}

/**
 * Generates a typed API for Mat4
 * */
function getAPIImpl$2(Ctor) {
    const vec3 = getAPI$4(Ctor);
    /**
     * 4x4 Matrix math math functions.
     *
     * Almost all functions take an optional `newDst` argument. If it is not passed in the
     * functions will create a new matrix. In other words you can do this
     *
     *     const mat = mat4.translation([1, 2, 3]);  // Creates a new translation matrix
     *
     * or
     *
     *     const mat = mat4.create();
     *     mat4.translation([1, 2, 3], mat);  // Puts translation matrix in mat.
     *
     * The first style is often easier but depending on where it's used it generates garbage where
     * as there is almost never allocation with the second style.
     *
     * It is always save to pass any matrix as the destination. So for example
     *
     *     const mat = mat4.identity();
     *     const trans = mat4.translation([1, 2, 3]);
     *     mat4.multiply(mat, trans, mat);  // Multiplies mat * trans and puts result in mat.
     *
     */
    /**
     * Create a Mat4 from values
     *
     * Note: Since passing in a raw JavaScript array
     * is valid in all circumstances, if you want to
     * force a JavaScript array into a Mat4's specified type
     * it would be faster to use
     *
     * ```
     * const m = mat4.clone(someJSArray);
     * ```
     *
     * @param v0 - value for element 0
     * @param v1 - value for element 1
     * @param v2 - value for element 2
     * @param v3 - value for element 3
     * @param v4 - value for element 4
     * @param v5 - value for element 5
     * @param v6 - value for element 6
     * @param v7 - value for element 7
     * @param v8 - value for element 8
     * @param v9 - value for element 9
     * @param v10 - value for element 10
     * @param v11 - value for element 11
     * @param v12 - value for element 12
     * @param v13 - value for element 13
     * @param v14 - value for element 14
     * @param v15 - value for element 15
     * @returns created from values.
     */
    function create(v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15) {
        const newDst = new Ctor(16);
        if (v0 !== undefined) {
            newDst[0] = v0;
            if (v1 !== undefined) {
                newDst[1] = v1;
                if (v2 !== undefined) {
                    newDst[2] = v2;
                    if (v3 !== undefined) {
                        newDst[3] = v3;
                        if (v4 !== undefined) {
                            newDst[4] = v4;
                            if (v5 !== undefined) {
                                newDst[5] = v5;
                                if (v6 !== undefined) {
                                    newDst[6] = v6;
                                    if (v7 !== undefined) {
                                        newDst[7] = v7;
                                        if (v8 !== undefined) {
                                            newDst[8] = v8;
                                            if (v9 !== undefined) {
                                                newDst[9] = v9;
                                                if (v10 !== undefined) {
                                                    newDst[10] = v10;
                                                    if (v11 !== undefined) {
                                                        newDst[11] = v11;
                                                        if (v12 !== undefined) {
                                                            newDst[12] = v12;
                                                            if (v13 !== undefined) {
                                                                newDst[13] = v13;
                                                                if (v14 !== undefined) {
                                                                    newDst[14] = v14;
                                                                    if (v15 !== undefined) {
                                                                        newDst[15] = v15;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return newDst;
    }
    /**
     * Sets the values of a Mat4
     * Also see {@link mat4.create} and {@link mat4.copy}
     *
     * @param v0 - value for element 0
     * @param v1 - value for element 1
     * @param v2 - value for element 2
     * @param v3 - value for element 3
     * @param v4 - value for element 4
     * @param v5 - value for element 5
     * @param v6 - value for element 6
     * @param v7 - value for element 7
     * @param v8 - value for element 8
     * @param v9 - value for element 9
     * @param v10 - value for element 10
     * @param v11 - value for element 11
     * @param v12 - value for element 12
     * @param v13 - value for element 13
     * @param v14 - value for element 14
     * @param v15 - value for element 15
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns Mat4 created from values.
     */
    function set(v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = v0;
        newDst[1] = v1;
        newDst[2] = v2;
        newDst[3] = v3;
        newDst[4] = v4;
        newDst[5] = v5;
        newDst[6] = v6;
        newDst[7] = v7;
        newDst[8] = v8;
        newDst[9] = v9;
        newDst[10] = v10;
        newDst[11] = v11;
        newDst[12] = v12;
        newDst[13] = v13;
        newDst[14] = v14;
        newDst[15] = v15;
        return newDst;
    }
    /**
     * Creates a Mat4 from a Mat3
     * @param m3 - source matrix
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns Mat4 made from m3
     */
    function fromMat3(m3, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = m3[0];
        newDst[1] = m3[1];
        newDst[2] = m3[2];
        newDst[3] = 0;
        newDst[4] = m3[4];
        newDst[5] = m3[5];
        newDst[6] = m3[6];
        newDst[7] = 0;
        newDst[8] = m3[8];
        newDst[9] = m3[9];
        newDst[10] = m3[10];
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Creates a Mat4 rotation matrix from a quaternion
     * @param q - quaternion to create matrix from
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns Mat4 made from q
     */
    function fromQuat(q, dst) {
        const newDst = (dst ?? new Ctor(16));
        const x = q[0];
        const y = q[1];
        const z = q[2];
        const w = q[3];
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;
        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;
        newDst[0] = 1 - yy - zz;
        newDst[1] = yx + wz;
        newDst[2] = zx - wy;
        newDst[3] = 0;
        newDst[4] = yx - wz;
        newDst[5] = 1 - xx - zz;
        newDst[6] = zy + wx;
        newDst[7] = 0;
        newDst[8] = zx + wy;
        newDst[9] = zy - wx;
        newDst[10] = 1 - xx - yy;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Negates a matrix.
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns -m.
     */
    function negate(m, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = -m[0];
        newDst[1] = -m[1];
        newDst[2] = -m[2];
        newDst[3] = -m[3];
        newDst[4] = -m[4];
        newDst[5] = -m[5];
        newDst[6] = -m[6];
        newDst[7] = -m[7];
        newDst[8] = -m[8];
        newDst[9] = -m[9];
        newDst[10] = -m[10];
        newDst[11] = -m[11];
        newDst[12] = -m[12];
        newDst[13] = -m[13];
        newDst[14] = -m[14];
        newDst[15] = -m[15];
        return newDst;
    }
    /**
     * Copies a matrix. (same as {@link mat4.clone})
     * Also see {@link mat4.create} and {@link mat4.set}
     * @param m - The matrix.
     * @param dst - The matrix. If not passed a new one is created.
     * @returns A copy of m.
     */
    function copy(m, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = m[0];
        newDst[1] = m[1];
        newDst[2] = m[2];
        newDst[3] = m[3];
        newDst[4] = m[4];
        newDst[5] = m[5];
        newDst[6] = m[6];
        newDst[7] = m[7];
        newDst[8] = m[8];
        newDst[9] = m[9];
        newDst[10] = m[10];
        newDst[11] = m[11];
        newDst[12] = m[12];
        newDst[13] = m[13];
        newDst[14] = m[14];
        newDst[15] = m[15];
        return newDst;
    }
    /**
     * Copies a matrix (same as {@link mat4.copy})
     * Also see {@link mat4.create} and {@link mat4.set}
     * @param m - The matrix.
     * @param dst - The matrix. If not passed a new one is created.
     * @returns A copy of m.
     */
    const clone = copy;
    /**
     * Check if 2 matrices are approximately equal
     * @param a - Operand matrix.
     * @param b - Operand matrix.
     * @returns true if matrices are approximately equal
     */
    function equalsApproximately(a, b) {
        return Math.abs(a[0] - b[0]) < EPSILON &&
            Math.abs(a[1] - b[1]) < EPSILON &&
            Math.abs(a[2] - b[2]) < EPSILON &&
            Math.abs(a[3] - b[3]) < EPSILON &&
            Math.abs(a[4] - b[4]) < EPSILON &&
            Math.abs(a[5] - b[5]) < EPSILON &&
            Math.abs(a[6] - b[6]) < EPSILON &&
            Math.abs(a[7] - b[7]) < EPSILON &&
            Math.abs(a[8] - b[8]) < EPSILON &&
            Math.abs(a[9] - b[9]) < EPSILON &&
            Math.abs(a[10] - b[10]) < EPSILON &&
            Math.abs(a[11] - b[11]) < EPSILON &&
            Math.abs(a[12] - b[12]) < EPSILON &&
            Math.abs(a[13] - b[13]) < EPSILON &&
            Math.abs(a[14] - b[14]) < EPSILON &&
            Math.abs(a[15] - b[15]) < EPSILON;
    }
    /**
     * Check if 2 matrices are exactly equal
     * @param a - Operand matrix.
     * @param b - Operand matrix.
     * @returns true if matrices are exactly equal
     */
    function equals(a, b) {
        return a[0] === b[0] &&
            a[1] === b[1] &&
            a[2] === b[2] &&
            a[3] === b[3] &&
            a[4] === b[4] &&
            a[5] === b[5] &&
            a[6] === b[6] &&
            a[7] === b[7] &&
            a[8] === b[8] &&
            a[9] === b[9] &&
            a[10] === b[10] &&
            a[11] === b[11] &&
            a[12] === b[12] &&
            a[13] === b[13] &&
            a[14] === b[14] &&
            a[15] === b[15];
    }
    /**
     * Creates a 4-by-4 identity matrix.
     *
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns A 4-by-4 identity matrix.
     */
    function identity(dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = 1;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = 1;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Takes the transpose of a matrix.
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The transpose of m.
     */
    function transpose(m, dst) {
        const newDst = (dst ?? new Ctor(16));
        if (newDst === m) {
            let t;
            t = m[1];
            m[1] = m[4];
            m[4] = t;
            t = m[2];
            m[2] = m[8];
            m[8] = t;
            t = m[3];
            m[3] = m[12];
            m[12] = t;
            t = m[6];
            m[6] = m[9];
            m[9] = t;
            t = m[7];
            m[7] = m[13];
            m[13] = t;
            t = m[11];
            m[11] = m[14];
            m[14] = t;
            return newDst;
        }
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m03 = m[0 * 4 + 3];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m13 = m[1 * 4 + 3];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const m23 = m[2 * 4 + 3];
        const m30 = m[3 * 4 + 0];
        const m31 = m[3 * 4 + 1];
        const m32 = m[3 * 4 + 2];
        const m33 = m[3 * 4 + 3];
        newDst[0] = m00;
        newDst[1] = m10;
        newDst[2] = m20;
        newDst[3] = m30;
        newDst[4] = m01;
        newDst[5] = m11;
        newDst[6] = m21;
        newDst[7] = m31;
        newDst[8] = m02;
        newDst[9] = m12;
        newDst[10] = m22;
        newDst[11] = m32;
        newDst[12] = m03;
        newDst[13] = m13;
        newDst[14] = m23;
        newDst[15] = m33;
        return newDst;
    }
    /**
     * Computes the inverse of a 4-by-4 matrix.
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The inverse of m.
     */
    function inverse(m, dst) {
        const newDst = (dst ?? new Ctor(16));
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m03 = m[0 * 4 + 3];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m13 = m[1 * 4 + 3];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const m23 = m[2 * 4 + 3];
        const m30 = m[3 * 4 + 0];
        const m31 = m[3 * 4 + 1];
        const m32 = m[3 * 4 + 2];
        const m33 = m[3 * 4 + 3];
        const tmp0 = m22 * m33;
        const tmp1 = m32 * m23;
        const tmp2 = m12 * m33;
        const tmp3 = m32 * m13;
        const tmp4 = m12 * m23;
        const tmp5 = m22 * m13;
        const tmp6 = m02 * m33;
        const tmp7 = m32 * m03;
        const tmp8 = m02 * m23;
        const tmp9 = m22 * m03;
        const tmp10 = m02 * m13;
        const tmp11 = m12 * m03;
        const tmp12 = m20 * m31;
        const tmp13 = m30 * m21;
        const tmp14 = m10 * m31;
        const tmp15 = m30 * m11;
        const tmp16 = m10 * m21;
        const tmp17 = m20 * m11;
        const tmp18 = m00 * m31;
        const tmp19 = m30 * m01;
        const tmp20 = m00 * m21;
        const tmp21 = m20 * m01;
        const tmp22 = m00 * m11;
        const tmp23 = m10 * m01;
        const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
            (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
        const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
            (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
        const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
            (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
        const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
            (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
        const d = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
        newDst[0] = d * t0;
        newDst[1] = d * t1;
        newDst[2] = d * t2;
        newDst[3] = d * t3;
        newDst[4] = d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
            (tmp0 * m10 + tmp3 * m20 + tmp4 * m30));
        newDst[5] = d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
            (tmp1 * m00 + tmp6 * m20 + tmp9 * m30));
        newDst[6] = d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
            (tmp2 * m00 + tmp7 * m10 + tmp10 * m30));
        newDst[7] = d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
            (tmp5 * m00 + tmp8 * m10 + tmp11 * m20));
        newDst[8] = d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
            (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
        newDst[9] = d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
            (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
        newDst[10] = d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
            (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
        newDst[11] = d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
            (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));
        newDst[12] = d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
            (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
        newDst[13] = d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
            (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
        newDst[14] = d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
            (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
        newDst[15] = d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
            (tmp20 * m12 + tmp23 * m22 + tmp17 * m02));
        return newDst;
    }
    /**
     * Compute the determinant of a matrix
     * @param m - the matrix
     * @returns the determinant
     */
    function determinant(m) {
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m03 = m[0 * 4 + 3];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m13 = m[1 * 4 + 3];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const m23 = m[2 * 4 + 3];
        const m30 = m[3 * 4 + 0];
        const m31 = m[3 * 4 + 1];
        const m32 = m[3 * 4 + 2];
        const m33 = m[3 * 4 + 3];
        const tmp0 = m22 * m33;
        const tmp1 = m32 * m23;
        const tmp2 = m12 * m33;
        const tmp3 = m32 * m13;
        const tmp4 = m12 * m23;
        const tmp5 = m22 * m13;
        const tmp6 = m02 * m33;
        const tmp7 = m32 * m03;
        const tmp8 = m02 * m23;
        const tmp9 = m22 * m03;
        const tmp10 = m02 * m13;
        const tmp11 = m12 * m03;
        const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
            (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
        const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
            (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
        const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
            (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
        const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
            (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
        return m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3;
    }
    /**
     * Computes the inverse of a 4-by-4 matrix. (same as inverse)
     * @param m - The matrix.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The inverse of m.
     */
    const invert = inverse;
    /**
     * Multiplies two 4-by-4 matrices with a on the left and b on the right
     * @param a - The matrix on the left.
     * @param b - The matrix on the right.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The matrix product of a and b.
     */
    function multiply(a, b, dst) {
        const newDst = (dst ?? new Ctor(16));
        const a00 = a[0];
        const a01 = a[1];
        const a02 = a[2];
        const a03 = a[3];
        const a10 = a[4 + 0];
        const a11 = a[4 + 1];
        const a12 = a[4 + 2];
        const a13 = a[4 + 3];
        const a20 = a[8 + 0];
        const a21 = a[8 + 1];
        const a22 = a[8 + 2];
        const a23 = a[8 + 3];
        const a30 = a[12 + 0];
        const a31 = a[12 + 1];
        const a32 = a[12 + 2];
        const a33 = a[12 + 3];
        const b00 = b[0];
        const b01 = b[1];
        const b02 = b[2];
        const b03 = b[3];
        const b10 = b[4 + 0];
        const b11 = b[4 + 1];
        const b12 = b[4 + 2];
        const b13 = b[4 + 3];
        const b20 = b[8 + 0];
        const b21 = b[8 + 1];
        const b22 = b[8 + 2];
        const b23 = b[8 + 3];
        const b30 = b[12 + 0];
        const b31 = b[12 + 1];
        const b32 = b[12 + 2];
        const b33 = b[12 + 3];
        newDst[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
        newDst[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
        newDst[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
        newDst[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
        newDst[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
        newDst[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
        newDst[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
        newDst[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
        newDst[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
        newDst[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
        newDst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
        newDst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
        newDst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
        newDst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
        newDst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
        newDst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
        return newDst;
    }
    /**
     * Multiplies two 4-by-4 matrices with a on the left and b on the right (same as multiply)
     * @param a - The matrix on the left.
     * @param b - The matrix on the right.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The matrix product of a and b.
     */
    const mul = multiply;
    /**
     * Sets the translation component of a 4-by-4 matrix to the given
     * vector.
     * @param a - The matrix.
     * @param v - The vector.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The matrix with translation set.
     */
    function setTranslation(a, v, dst) {
        const newDst = (dst ?? identity());
        if (a !== newDst) {
            newDst[0] = a[0];
            newDst[1] = a[1];
            newDst[2] = a[2];
            newDst[3] = a[3];
            newDst[4] = a[4];
            newDst[5] = a[5];
            newDst[6] = a[6];
            newDst[7] = a[7];
            newDst[8] = a[8];
            newDst[9] = a[9];
            newDst[10] = a[10];
            newDst[11] = a[11];
        }
        newDst[12] = v[0];
        newDst[13] = v[1];
        newDst[14] = v[2];
        newDst[15] = 1;
        return newDst;
    }
    ///**
    // * Returns the translation component of a 4-by-4 matrix as a vector with 3
    // * entries.
    // * @param m - The matrix.
    // * @param dst - vector to hold result. If not passed a new one is created.
    // * @returns The translation component of m.
    // */
    function getTranslation(m, dst) {
        const newDst = (dst ?? vec3.create());
        newDst[0] = m[12];
        newDst[1] = m[13];
        newDst[2] = m[14];
        return newDst;
    }
    /**
     * Returns an axis of a 4x4 matrix as a vector with 3 entries
     * @param m - The matrix.
     * @param axis - The axis 0 = x, 1 = y, 2 = z;
     * @returns The axis component of m.
     */
    function getAxis(m, axis, dst) {
        const newDst = (dst ?? vec3.create());
        const off = axis * 4;
        newDst[0] = m[off + 0];
        newDst[1] = m[off + 1];
        newDst[2] = m[off + 2];
        return newDst;
    }
    /**
     * Sets an axis of a 4x4 matrix as a vector with 3 entries
     * @param m - The matrix.
     * @param v - the axis vector
     * @param axis - The axis  0 = x, 1 = y, 2 = z;
     * @param dst - The matrix to set. If not passed a new one is created.
     * @returns The matrix with axis set.
     */
    function setAxis(m, v, axis, dst) {
        const newDst = (dst === m) ? dst : copy(m, dst);
        const off = axis * 4;
        newDst[off + 0] = v[0];
        newDst[off + 1] = v[1];
        newDst[off + 2] = v[2];
        return newDst;
    }
    /**
     * Returns the "3d" scaling component of the matrix
     * @param m - The Matrix
     * @param dst - The vector to set. If not passed a new one is created.
     */
    function getScaling(m, dst) {
        const newDst = (dst ?? vec3.create());
        const xx = m[0];
        const xy = m[1];
        const xz = m[2];
        const yx = m[4];
        const yy = m[5];
        const yz = m[6];
        const zx = m[8];
        const zy = m[9];
        const zz = m[10];
        newDst[0] = Math.sqrt(xx * xx + xy * xy + xz * xz);
        newDst[1] = Math.sqrt(yx * yx + yy * yy + yz * yz);
        newDst[2] = Math.sqrt(zx * zx + zy * zy + zz * zz);
        return newDst;
    }
    /**
     * Computes a 4-by-4 perspective transformation matrix given the angular height
     * of the frustum, the aspect ratio, and the near and far clipping planes.  The
     * arguments define a frustum extending in the negative z direction.  The given
     * angle is the vertical angle of the frustum, and the horizontal angle is
     * determined to produce the given aspect ratio.  The arguments near and far are
     * the distances to the near and far clipping planes.  Note that near and far
     * are not z coordinates, but rather they are distances along the negative
     * z-axis.  The matrix generated sends the viewing frustum to the unit box.
     * We assume a unit box extending from -1 to 1 in the x and y dimensions and
     * from 0 to 1 in the z dimension.
     *
     * Note: If you pass `Infinity` for zFar then it will produce a projection matrix
     * returns -Infinity for Z when transforming coordinates with Z <= 0 and +Infinity for Z
     * otherwise.
     *
     * @param fieldOfViewYInRadians - The camera angle from top to bottom (in radians).
     * @param aspect - The aspect ratio width / height.
     * @param zNear - The depth (negative z coordinate)
     *     of the near clipping plane.
     * @param zFar - The depth (negative z coordinate)
     *     of the far clipping plane.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The perspective matrix.
     */
    function perspective(fieldOfViewYInRadians, aspect, zNear, zFar, dst) {
        const newDst = (dst ?? new Ctor(16));
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
        newDst[0] = f / aspect;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = f;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[11] = -1;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[15] = 0;
        if (Number.isFinite(zFar)) {
            const rangeInv = 1 / (zNear - zFar);
            newDst[10] = zFar * rangeInv;
            newDst[14] = zFar * zNear * rangeInv;
        }
        else {
            newDst[10] = -1;
            newDst[14] = -zNear;
        }
        return newDst;
    }
    /**
     * Computes a 4-by-4 reverse-z perspective transformation matrix given the angular height
     * of the frustum, the aspect ratio, and the near and far clipping planes.  The
     * arguments define a frustum extending in the negative z direction.  The given
     * angle is the vertical angle of the frustum, and the horizontal angle is
     * determined to produce the given aspect ratio.  The arguments near and far are
     * the distances to the near and far clipping planes.  Note that near and far
     * are not z coordinates, but rather they are distances along the negative
     * z-axis.  The matrix generated sends the viewing frustum to the unit box.
     * We assume a unit box extending from -1 to 1 in the x and y dimensions and
     * from 1 (at -zNear) to 0 (at -zFar) in the z dimension.
     *
     * @param fieldOfViewYInRadians - The camera angle from top to bottom (in radians).
     * @param aspect - The aspect ratio width / height.
     * @param zNear - The depth (negative z coordinate)
     *     of the near clipping plane.
     * @param zFar - The depth (negative z coordinate)
     *     of the far clipping plane. (default = Infinity)
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The perspective matrix.
     */ function perspectiveReverseZ(fieldOfViewYInRadians, aspect, zNear, zFar = Infinity, dst) {
        const newDst = (dst ?? new Ctor(16));
        const f = 1 / Math.tan(fieldOfViewYInRadians * 0.5);
        newDst[0] = f / aspect;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = f;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[11] = -1;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[15] = 0;
        if (zFar === Infinity) {
            newDst[10] = 0;
            newDst[14] = zNear;
        }
        else {
            const rangeInv = 1 / (zFar - zNear);
            newDst[10] = zNear * rangeInv;
            newDst[14] = zFar * zNear * rangeInv;
        }
        return newDst;
    }
    /**
     * Computes a 4-by-4 orthogonal transformation matrix that transforms from
     * the given the left, right, bottom, and top dimensions to -1 +1 in x, and y
     * and 0 to +1 in z.
     * @param left - Left side of the near clipping plane viewport.
     * @param right - Right side of the near clipping plane viewport.
     * @param bottom - Bottom of the near clipping plane viewport.
     * @param top - Top of the near clipping plane viewport.
     * @param near - The depth (negative z coordinate)
     *     of the near clipping plane.
     * @param far - The depth (negative z coordinate)
     *     of the far clipping plane.
     * @param dst - Output matrix. If not passed a new one is created.
     * @returns The orthographic projection matrix.
     */
    function ortho(left, right, bottom, top, near, far, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = 2 / (right - left);
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = 2 / (top - bottom);
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1 / (near - far);
        newDst[11] = 0;
        newDst[12] = (right + left) / (left - right);
        newDst[13] = (top + bottom) / (bottom - top);
        newDst[14] = near / (near - far);
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Computes a 4-by-4 perspective transformation matrix given the left, right,
     * top, bottom, near and far clipping planes. The arguments define a frustum
     * extending in the negative z direction. The arguments near and far are the
     * distances to the near and far clipping planes. Note that near and far are not
     * z coordinates, but rather they are distances along the negative z-axis. The
     * matrix generated sends the viewing frustum to the unit box. We assume a unit
     * box extending from -1 to 1 in the x and y dimensions and from 0 to 1 in the z
     * dimension.
     * @param left - The x coordinate of the left plane of the box.
     * @param right - The x coordinate of the right plane of the box.
     * @param bottom - The y coordinate of the bottom plane of the box.
     * @param top - The y coordinate of the right plane of the box.
     * @param near - The negative z coordinate of the near plane of the box.
     * @param far - The negative z coordinate of the far plane of the box.
     * @param dst - Output matrix. If not passed a new one is created.
     * @returns The perspective projection matrix.
     */
    function frustum(left, right, bottom, top, near, far, dst) {
        const newDst = (dst ?? new Ctor(16));
        const dx = (right - left);
        const dy = (top - bottom);
        const dz = (near - far);
        newDst[0] = 2 * near / dx;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = 2 * near / dy;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = (left + right) / dx;
        newDst[9] = (top + bottom) / dy;
        newDst[10] = far / dz;
        newDst[11] = -1;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = near * far / dz;
        newDst[15] = 0;
        return newDst;
    }
    /**
     * Computes a 4-by-4 reverse-z perspective transformation matrix given the left, right,
     * top, bottom, near and far clipping planes. The arguments define a frustum
     * extending in the negative z direction. The arguments near and far are the
     * distances to the near and far clipping planes. Note that near and far are not
     * z coordinates, but rather they are distances along the negative z-axis. The
     * matrix generated sends the viewing frustum to the unit box. We assume a unit
     * box extending from -1 to 1 in the x and y dimensions and from 1 (-near) to 0 (-far) in the z
     * dimension.
     * @param left - The x coordinate of the left plane of the box.
     * @param right - The x coordinate of the right plane of the box.
     * @param bottom - The y coordinate of the bottom plane of the box.
     * @param top - The y coordinate of the right plane of the box.
     * @param near - The negative z coordinate of the near plane of the box.
     * @param far - The negative z coordinate of the far plane of the box.
     * @param dst - Output matrix. If not passed a new one is created.
     * @returns The perspective projection matrix.
     */
    function frustumReverseZ(left, right, bottom, top, near, far = Infinity, dst) {
        const newDst = (dst ?? new Ctor(16));
        const dx = (right - left);
        const dy = (top - bottom);
        newDst[0] = 2 * near / dx;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = 2 * near / dy;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = (left + right) / dx;
        newDst[9] = (top + bottom) / dy;
        newDst[11] = -1;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[15] = 0;
        if (far === Infinity) {
            newDst[10] = 0;
            newDst[14] = near;
        }
        else {
            const rangeInv = 1 / (far - near);
            newDst[10] = near * rangeInv;
            newDst[14] = far * near * rangeInv;
        }
        return newDst;
    }
    const xAxis = vec3.create();
    const yAxis = vec3.create();
    const zAxis = vec3.create();
    /**
     * Computes a 4-by-4 aim transformation.
     *
     * This is a matrix which positions an object aiming down positive Z.
     * toward the target.
     *
     * Note: this is **NOT** the inverse of lookAt as lookAt looks at negative Z.
     *
     * @param position - The position of the object.
     * @param target - The position meant to be aimed at.
     * @param up - A vector pointing up.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The aim matrix.
     */
    function aim(position, target, up, dst) {
        const newDst = (dst ?? new Ctor(16));
        vec3.normalize(vec3.subtract(target, position, zAxis), zAxis);
        vec3.normalize(vec3.cross(up, zAxis, xAxis), xAxis);
        vec3.normalize(vec3.cross(zAxis, xAxis, yAxis), yAxis);
        newDst[0] = xAxis[0];
        newDst[1] = xAxis[1];
        newDst[2] = xAxis[2];
        newDst[3] = 0;
        newDst[4] = yAxis[0];
        newDst[5] = yAxis[1];
        newDst[6] = yAxis[2];
        newDst[7] = 0;
        newDst[8] = zAxis[0];
        newDst[9] = zAxis[1];
        newDst[10] = zAxis[2];
        newDst[11] = 0;
        newDst[12] = position[0];
        newDst[13] = position[1];
        newDst[14] = position[2];
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Computes a 4-by-4 camera aim transformation.
     *
     * This is a matrix which positions an object aiming down negative Z.
     * toward the target.
     *
     * Note: this is the inverse of `lookAt`
     *
     * @param eye - The position of the object.
     * @param target - The position meant to be aimed at.
     * @param up - A vector pointing up.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The aim matrix.
     */
    function cameraAim(eye, target, up, dst) {
        const newDst = (dst ?? new Ctor(16));
        vec3.normalize(vec3.subtract(eye, target, zAxis), zAxis);
        vec3.normalize(vec3.cross(up, zAxis, xAxis), xAxis);
        vec3.normalize(vec3.cross(zAxis, xAxis, yAxis), yAxis);
        newDst[0] = xAxis[0];
        newDst[1] = xAxis[1];
        newDst[2] = xAxis[2];
        newDst[3] = 0;
        newDst[4] = yAxis[0];
        newDst[5] = yAxis[1];
        newDst[6] = yAxis[2];
        newDst[7] = 0;
        newDst[8] = zAxis[0];
        newDst[9] = zAxis[1];
        newDst[10] = zAxis[2];
        newDst[11] = 0;
        newDst[12] = eye[0];
        newDst[13] = eye[1];
        newDst[14] = eye[2];
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Computes a 4-by-4 view transformation.
     *
     * This is a view matrix which transforms all other objects
     * to be in the space of the view defined by the parameters.
     *
     * @param eye - The position of the object.
     * @param target - The position meant to be aimed at.
     * @param up - A vector pointing up.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The look-at matrix.
     */
    function lookAt(eye, target, up, dst) {
        const newDst = (dst ?? new Ctor(16));
        vec3.normalize(vec3.subtract(eye, target, zAxis), zAxis);
        vec3.normalize(vec3.cross(up, zAxis, xAxis), xAxis);
        vec3.normalize(vec3.cross(zAxis, xAxis, yAxis), yAxis);
        newDst[0] = xAxis[0];
        newDst[1] = yAxis[0];
        newDst[2] = zAxis[0];
        newDst[3] = 0;
        newDst[4] = xAxis[1];
        newDst[5] = yAxis[1];
        newDst[6] = zAxis[1];
        newDst[7] = 0;
        newDst[8] = xAxis[2];
        newDst[9] = yAxis[2];
        newDst[10] = zAxis[2];
        newDst[11] = 0;
        newDst[12] = -(xAxis[0] * eye[0] + xAxis[1] * eye[1] + xAxis[2] * eye[2]);
        newDst[13] = -(yAxis[0] * eye[0] + yAxis[1] * eye[1] + yAxis[2] * eye[2]);
        newDst[14] = -(zAxis[0] * eye[0] + zAxis[1] * eye[1] + zAxis[2] * eye[2]);
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which translates by the given vector v.
     * @param v - The vector by
     *     which to translate.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The translation matrix.
     */
    function translation(v, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = 1;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = 1;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        newDst[11] = 0;
        newDst[12] = v[0];
        newDst[13] = v[1];
        newDst[14] = v[2];
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Translates the given 4-by-4 matrix by the given vector v.
     * @param m - The matrix.
     * @param v - The vector by
     *     which to translate.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The translated matrix.
     */
    function translate(m, v, dst) {
        const newDst = (dst ?? new Ctor(16));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const m00 = m[0];
        const m01 = m[1];
        const m02 = m[2];
        const m03 = m[3];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m13 = m[1 * 4 + 3];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const m23 = m[2 * 4 + 3];
        const m30 = m[3 * 4 + 0];
        const m31 = m[3 * 4 + 1];
        const m32 = m[3 * 4 + 2];
        const m33 = m[3 * 4 + 3];
        if (m !== newDst) {
            newDst[0] = m00;
            newDst[1] = m01;
            newDst[2] = m02;
            newDst[3] = m03;
            newDst[4] = m10;
            newDst[5] = m11;
            newDst[6] = m12;
            newDst[7] = m13;
            newDst[8] = m20;
            newDst[9] = m21;
            newDst[10] = m22;
            newDst[11] = m23;
        }
        newDst[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
        newDst[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
        newDst[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
        newDst[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which rotates around the x-axis by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    function rotationX(angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = 1;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = c;
        newDst[6] = s;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = -s;
        newDst[10] = c;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Rotates the given 4-by-4 matrix around the x-axis by the given
     * angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function rotateX(m, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        const m10 = m[4];
        const m11 = m[5];
        const m12 = m[6];
        const m13 = m[7];
        const m20 = m[8];
        const m21 = m[9];
        const m22 = m[10];
        const m23 = m[11];
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[4] = c * m10 + s * m20;
        newDst[5] = c * m11 + s * m21;
        newDst[6] = c * m12 + s * m22;
        newDst[7] = c * m13 + s * m23;
        newDst[8] = c * m20 - s * m10;
        newDst[9] = c * m21 - s * m11;
        newDst[10] = c * m22 - s * m12;
        newDst[11] = c * m23 - s * m13;
        if (m !== newDst) {
            newDst[0] = m[0];
            newDst[1] = m[1];
            newDst[2] = m[2];
            newDst[3] = m[3];
            newDst[12] = m[12];
            newDst[13] = m[13];
            newDst[14] = m[14];
            newDst[15] = m[15];
        }
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which rotates around the y-axis by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    function rotationY(angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c;
        newDst[1] = 0;
        newDst[2] = -s;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = 1;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = s;
        newDst[9] = 0;
        newDst[10] = c;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Rotates the given 4-by-4 matrix around the y-axis by the given
     * angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function rotateY(m, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m03 = m[0 * 4 + 3];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const m23 = m[2 * 4 + 3];
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c * m00 - s * m20;
        newDst[1] = c * m01 - s * m21;
        newDst[2] = c * m02 - s * m22;
        newDst[3] = c * m03 - s * m23;
        newDst[8] = c * m20 + s * m00;
        newDst[9] = c * m21 + s * m01;
        newDst[10] = c * m22 + s * m02;
        newDst[11] = c * m23 + s * m03;
        if (m !== newDst) {
            newDst[4] = m[4];
            newDst[5] = m[5];
            newDst[6] = m[6];
            newDst[7] = m[7];
            newDst[12] = m[12];
            newDst[13] = m[13];
            newDst[14] = m[14];
            newDst[15] = m[15];
        }
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which rotates around the z-axis by the given angle.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotation matrix.
     */
    function rotationZ(angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c;
        newDst[1] = s;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = -s;
        newDst[5] = c;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = 1;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Rotates the given 4-by-4 matrix around the z-axis by the given
     * angle.
     * @param m - The matrix.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function rotateZ(m, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m03 = m[0 * 4 + 3];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m13 = m[1 * 4 + 3];
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        newDst[0] = c * m00 + s * m10;
        newDst[1] = c * m01 + s * m11;
        newDst[2] = c * m02 + s * m12;
        newDst[3] = c * m03 + s * m13;
        newDst[4] = c * m10 - s * m00;
        newDst[5] = c * m11 - s * m01;
        newDst[6] = c * m12 - s * m02;
        newDst[7] = c * m13 - s * m03;
        if (m !== newDst) {
            newDst[8] = m[8];
            newDst[9] = m[9];
            newDst[10] = m[10];
            newDst[11] = m[11];
            newDst[12] = m[12];
            newDst[13] = m[13];
            newDst[14] = m[14];
            newDst[15] = m[15];
        }
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which rotates around the given axis by the given
     * angle.
     * @param axis - The axis
     *     about which to rotate.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns A matrix which rotates angle radians
     *     around the axis.
     */
    function axisRotation(axis, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        let x = axis[0];
        let y = axis[1];
        let z = axis[2];
        const n = Math.sqrt(x * x + y * y + z * z);
        x /= n;
        y /= n;
        z /= n;
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        const oneMinusCosine = 1 - c;
        newDst[0] = xx + (1 - xx) * c;
        newDst[1] = x * y * oneMinusCosine + z * s;
        newDst[2] = x * z * oneMinusCosine - y * s;
        newDst[3] = 0;
        newDst[4] = x * y * oneMinusCosine - z * s;
        newDst[5] = yy + (1 - yy) * c;
        newDst[6] = y * z * oneMinusCosine + x * s;
        newDst[7] = 0;
        newDst[8] = x * z * oneMinusCosine + y * s;
        newDst[9] = y * z * oneMinusCosine - x * s;
        newDst[10] = zz + (1 - zz) * c;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which rotates around the given axis by the given
     * angle. (same as axisRotation)
     * @param axis - The axis
     *     about which to rotate.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns A matrix which rotates angle radians
     *     around the axis.
     */
    const rotation = axisRotation;
    /**
     * Rotates the given 4-by-4 matrix around the given axis by the
     * given angle.
     * @param m - The matrix.
     * @param axis - The axis
     *     about which to rotate.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    function axisRotate(m, axis, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(16));
        let x = axis[0];
        let y = axis[1];
        let z = axis[2];
        const n = Math.sqrt(x * x + y * y + z * z);
        x /= n;
        y /= n;
        z /= n;
        const xx = x * x;
        const yy = y * y;
        const zz = z * z;
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        const oneMinusCosine = 1 - c;
        const r00 = xx + (1 - xx) * c;
        const r01 = x * y * oneMinusCosine + z * s;
        const r02 = x * z * oneMinusCosine - y * s;
        const r10 = x * y * oneMinusCosine - z * s;
        const r11 = yy + (1 - yy) * c;
        const r12 = y * z * oneMinusCosine + x * s;
        const r20 = x * z * oneMinusCosine + y * s;
        const r21 = y * z * oneMinusCosine - x * s;
        const r22 = zz + (1 - zz) * c;
        const m00 = m[0];
        const m01 = m[1];
        const m02 = m[2];
        const m03 = m[3];
        const m10 = m[4];
        const m11 = m[5];
        const m12 = m[6];
        const m13 = m[7];
        const m20 = m[8];
        const m21 = m[9];
        const m22 = m[10];
        const m23 = m[11];
        newDst[0] = r00 * m00 + r01 * m10 + r02 * m20;
        newDst[1] = r00 * m01 + r01 * m11 + r02 * m21;
        newDst[2] = r00 * m02 + r01 * m12 + r02 * m22;
        newDst[3] = r00 * m03 + r01 * m13 + r02 * m23;
        newDst[4] = r10 * m00 + r11 * m10 + r12 * m20;
        newDst[5] = r10 * m01 + r11 * m11 + r12 * m21;
        newDst[6] = r10 * m02 + r11 * m12 + r12 * m22;
        newDst[7] = r10 * m03 + r11 * m13 + r12 * m23;
        newDst[8] = r20 * m00 + r21 * m10 + r22 * m20;
        newDst[9] = r20 * m01 + r21 * m11 + r22 * m21;
        newDst[10] = r20 * m02 + r21 * m12 + r22 * m22;
        newDst[11] = r20 * m03 + r21 * m13 + r22 * m23;
        if (m !== newDst) {
            newDst[12] = m[12];
            newDst[13] = m[13];
            newDst[14] = m[14];
            newDst[15] = m[15];
        }
        return newDst;
    }
    /**
     * Rotates the given 4-by-4 matrix around the given axis by the
     * given angle. (same as rotate)
     * @param m - The matrix.
     * @param axis - The axis
     *     about which to rotate.
     * @param angleInRadians - The angle by which to rotate (in radians).
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The rotated matrix.
     */
    const rotate = axisRotate;
    /**
     * Creates a 4-by-4 matrix which scales in each dimension by an amount given by
     * the corresponding entry in the given vector; assumes the vector has three
     * entries.
     * @param v - A vector of
     *     three entries specifying the factor by which to scale in each dimension.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaling matrix.
     */
    function scaling(v, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = v[0];
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = v[1];
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = v[2];
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Scales the given 4-by-4 matrix in each dimension by an amount
     * given by the corresponding entry in the given vector; assumes the vector has
     * three entries.
     * @param m - The matrix to be modified.
     * @param v - A vector of three entries specifying the
     *     factor by which to scale in each dimension.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaled matrix.
     */
    function scale(m, v, dst) {
        const newDst = (dst ?? new Ctor(16));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        newDst[0] = v0 * m[0 * 4 + 0];
        newDst[1] = v0 * m[0 * 4 + 1];
        newDst[2] = v0 * m[0 * 4 + 2];
        newDst[3] = v0 * m[0 * 4 + 3];
        newDst[4] = v1 * m[1 * 4 + 0];
        newDst[5] = v1 * m[1 * 4 + 1];
        newDst[6] = v1 * m[1 * 4 + 2];
        newDst[7] = v1 * m[1 * 4 + 3];
        newDst[8] = v2 * m[2 * 4 + 0];
        newDst[9] = v2 * m[2 * 4 + 1];
        newDst[10] = v2 * m[2 * 4 + 2];
        newDst[11] = v2 * m[2 * 4 + 3];
        if (m !== newDst) {
            newDst[12] = m[12];
            newDst[13] = m[13];
            newDst[14] = m[14];
            newDst[15] = m[15];
        }
        return newDst;
    }
    /**
     * Creates a 4-by-4 matrix which scales a uniform amount in each dimension.
     * @param s - the amount to scale
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaling matrix.
     */
    function uniformScaling(s, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = s;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        newDst[4] = 0;
        newDst[5] = s;
        newDst[6] = 0;
        newDst[7] = 0;
        newDst[8] = 0;
        newDst[9] = 0;
        newDst[10] = s;
        newDst[11] = 0;
        newDst[12] = 0;
        newDst[13] = 0;
        newDst[14] = 0;
        newDst[15] = 1;
        return newDst;
    }
    /**
     * Scales the given 4-by-4 matrix in each dimension by a uniform scale.
     * @param m - The matrix to be modified.
     * @param s - The amount to scale.
     * @param dst - matrix to hold result. If not passed a new one is created.
     * @returns The scaled matrix.
     */
    function uniformScale(m, s, dst) {
        const newDst = (dst ?? new Ctor(16));
        newDst[0] = s * m[0 * 4 + 0];
        newDst[1] = s * m[0 * 4 + 1];
        newDst[2] = s * m[0 * 4 + 2];
        newDst[3] = s * m[0 * 4 + 3];
        newDst[4] = s * m[1 * 4 + 0];
        newDst[5] = s * m[1 * 4 + 1];
        newDst[6] = s * m[1 * 4 + 2];
        newDst[7] = s * m[1 * 4 + 3];
        newDst[8] = s * m[2 * 4 + 0];
        newDst[9] = s * m[2 * 4 + 1];
        newDst[10] = s * m[2 * 4 + 2];
        newDst[11] = s * m[2 * 4 + 3];
        if (m !== newDst) {
            newDst[12] = m[12];
            newDst[13] = m[13];
            newDst[14] = m[14];
            newDst[15] = m[15];
        }
        return newDst;
    }
    return {
        create,
        set,
        fromMat3,
        fromQuat,
        negate,
        copy,
        clone,
        equalsApproximately,
        equals,
        identity,
        transpose,
        inverse,
        determinant,
        invert,
        multiply,
        mul,
        setTranslation,
        getTranslation,
        getAxis,
        setAxis,
        getScaling,
        perspective,
        perspectiveReverseZ,
        ortho,
        frustum,
        frustumReverseZ,
        aim,
        cameraAim,
        lookAt,
        translation,
        translate,
        rotationX,
        rotateX,
        rotationY,
        rotateY,
        rotationZ,
        rotateZ,
        axisRotation,
        rotation,
        axisRotate,
        rotate,
        scaling,
        scale,
        uniformScaling,
        uniformScale,
    };
}
const cache$2 = new Map();
function getAPI$2(Ctor) {
    let api = cache$2.get(Ctor);
    if (!api) {
        api = getAPIImpl$2(Ctor);
        cache$2.set(Ctor, api);
    }
    return api;
}

/*
 * Copyright 2022 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
/**
 * Generates am typed API for Qud
 * */
function getAPIImpl$1(Ctor) {
    const vec3 = getAPI$4(Ctor);
    /**
     * Creates a quat4; may be called with x, y, z to set initial values.
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @param z - Initial z value.
     * @param w - Initial w value.
     * @returns the created vector
     */
    function create(x, y, z, w) {
        const newDst = new Ctor(4);
        if (x !== undefined) {
            newDst[0] = x;
            if (y !== undefined) {
                newDst[1] = y;
                if (z !== undefined) {
                    newDst[2] = z;
                    if (w !== undefined) {
                        newDst[3] = w;
                    }
                }
            }
        }
        return newDst;
    }
    /**
     * Creates a Quat; may be called with x, y, z to set initial values. (same as create)
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @param z - Initial z value.
     * @param z - Initial w value.
     * @returns the created vector
     */
    const fromValues = create;
    /**
     * Sets the values of a Quat
     * Also see {@link quat.create} and {@link quat.copy}
     *
     * @param x first value
     * @param y second value
     * @param z third value
     * @param w fourth value
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector with its elements set.
     */
    function set(x, y, z, w, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = x;
        newDst[1] = y;
        newDst[2] = z;
        newDst[3] = w;
        return newDst;
    }
    /**
     * Sets a quaternion from the given angle and  axis,
     * then returns it.
     *
     * @param axis - the axis to rotate around
     * @param angleInRadians - the angle
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The quaternion that represents the given axis and angle
     **/
    function fromAxisAngle(axis, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(4));
        const halfAngle = angleInRadians * 0.5;
        const s = Math.sin(halfAngle);
        newDst[0] = s * axis[0];
        newDst[1] = s * axis[1];
        newDst[2] = s * axis[2];
        newDst[3] = Math.cos(halfAngle);
        return newDst;
    }
    /**
     * Gets the rotation axis and angle
     * @param q - quaternion to compute from
     * @param dst - Vec3 to hold result. If not passed in a new one is created.
     * @return angle and axis
     */
    function toAxisAngle(q, dst) {
        const newDst = (dst ?? vec3.create(3));
        const angle = Math.acos(q[3]) * 2;
        const s = Math.sin(angle * 0.5);
        if (s > EPSILON) {
            newDst[0] = q[0] / s;
            newDst[1] = q[1] / s;
            newDst[2] = q[2] / s;
        }
        else {
            newDst[0] = 1;
            newDst[1] = 0;
            newDst[2] = 0;
        }
        return { angle, axis: newDst };
    }
    /**
     * Returns the angle in degrees between two rotations a and b.
     * @param a - quaternion a
     * @param b - quaternion b
     * @return angle in radians between the two quaternions
     */
    function angle(a, b) {
        const d = dot(a, b);
        return Math.acos(2 * d * d - 1);
    }
    /**
     * Multiplies two quaternions
     *
     * @param a - the first quaternion
     * @param b - the second quaternion
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the result of a * b
     */
    function multiply(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        const ax = a[0];
        const ay = a[1];
        const az = a[2];
        const aw = a[3];
        const bx = b[0];
        const by = b[1];
        const bz = b[2];
        const bw = b[3];
        newDst[0] = ax * bw + aw * bx + ay * bz - az * by;
        newDst[1] = ay * bw + aw * by + az * bx - ax * bz;
        newDst[2] = az * bw + aw * bz + ax * by - ay * bx;
        newDst[3] = aw * bw - ax * bx - ay * by - az * bz;
        return newDst;
    }
    /**
     * Multiplies two quaternions
     *
     * @param a - the first quaternion
     * @param b - the second quaternion
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the result of a * b
     */
    const mul = multiply;
    /**
     * Rotates the given quaternion around the X axis by the given angle.
     * @param q - quaternion to rotate
     * @param angleInRadians - The angle by which to rotate
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the result of a * b
     */
    function rotateX(q, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(4));
        const halfAngle = angleInRadians * 0.5;
        const qx = q[0];
        const qy = q[1];
        const qz = q[2];
        const qw = q[3];
        const bx = Math.sin(halfAngle);
        const bw = Math.cos(halfAngle);
        newDst[0] = qx * bw + qw * bx;
        newDst[1] = qy * bw + qz * bx;
        newDst[2] = qz * bw - qy * bx;
        newDst[3] = qw * bw - qx * bx;
        return newDst;
    }
    /**
     * Rotates the given quaternion around the Y axis by the given angle.
     * @param q - quaternion to rotate
     * @param angleInRadians - The angle by which to rotate
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the result of a * b
     */
    function rotateY(q, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(4));
        const halfAngle = angleInRadians * 0.5;
        const qx = q[0];
        const qy = q[1];
        const qz = q[2];
        const qw = q[3];
        const by = Math.sin(halfAngle);
        const bw = Math.cos(halfAngle);
        newDst[0] = qx * bw - qz * by;
        newDst[1] = qy * bw + qw * by;
        newDst[2] = qz * bw + qx * by;
        newDst[3] = qw * bw - qy * by;
        return newDst;
    }
    /**
     * Rotates the given quaternion around the Z axis by the given angle.
     * @param q - quaternion to rotate
     * @param angleInRadians - The angle by which to rotate
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the result of a * b
     */
    function rotateZ(q, angleInRadians, dst) {
        const newDst = (dst ?? new Ctor(4));
        const halfAngle = angleInRadians * 0.5;
        const qx = q[0];
        const qy = q[1];
        const qz = q[2];
        const qw = q[3];
        const bz = Math.sin(halfAngle);
        const bw = Math.cos(halfAngle);
        newDst[0] = qx * bw + qy * bz;
        newDst[1] = qy * bw - qx * bz;
        newDst[2] = qz * bw + qw * bz;
        newDst[3] = qw * bw - qz * bz;
        return newDst;
    }
    /**
     * Spherically linear interpolate between two quaternions
     *
     * @param a - starting value
     * @param b - ending value
     * @param t - value where 0 = a and 1 = b
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the result of a * b
     */
    function slerp(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(4));
        const ax = a[0];
        const ay = a[1];
        const az = a[2];
        const aw = a[3];
        let bx = b[0];
        let by = b[1];
        let bz = b[2];
        let bw = b[3];
        let cosOmega = ax * bx + ay * by + az * bz + aw * bw;
        if (cosOmega < 0) {
            cosOmega = -cosOmega;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }
        let scale0;
        let scale1;
        if (1.0 - cosOmega > EPSILON) {
            const omega = Math.acos(cosOmega);
            const sinOmega = Math.sin(omega);
            scale0 = Math.sin((1 - t) * omega) / sinOmega;
            scale1 = Math.sin(t * omega) / sinOmega;
        }
        else {
            scale0 = 1.0 - t;
            scale1 = t;
        }
        newDst[0] = scale0 * ax + scale1 * bx;
        newDst[1] = scale0 * ay + scale1 * by;
        newDst[2] = scale0 * az + scale1 * bz;
        newDst[3] = scale0 * aw + scale1 * bw;
        return newDst;
    }
    /**
     * Compute the inverse of a quaternion
     *
     * @param q - quaternion to compute the inverse of
     * @returns A quaternion that is the result of a * b
     */
    function inverse(q, dst) {
        const newDst = (dst ?? new Ctor(4));
        const a0 = q[0];
        const a1 = q[1];
        const a2 = q[2];
        const a3 = q[3];
        const dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
        const invDot = dot ? 1 / dot : 0;
        newDst[0] = -a0 * invDot;
        newDst[1] = -a1 * invDot;
        newDst[2] = -a2 * invDot;
        newDst[3] = a3 * invDot;
        return newDst;
    }
    /**
     * Compute the conjugate of a quaternion
     * For quaternions with a magnitude of 1 (a unit quaternion)
     * this returns the same as the inverse but is faster to calculate.
     *
     * @param q - quaternion to compute the conjugate of.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The conjugate of q
     */
    function conjugate(q, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = -q[0];
        newDst[1] = -q[1];
        newDst[2] = -q[2];
        newDst[3] = q[3];
        return newDst;
    }
    /**
     * Creates a quaternion from the given rotation matrix.
     *
     * The created quaternion is not normalized.
     *
     * @param m - rotation matrix
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns the result
     */
    function fromMat(m, dst) {
        const newDst = (dst ?? new Ctor(4));
        /*
        0 1 2
        3 4 5
        6 7 8
      
        0 1 2
        4 5 6
        8 9 10
         */
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".
        const trace = m[0] + m[5] + m[10];
        if (trace > 0.0) {
            // |w| > 1/2, may as well choose w > 1/2
            const root = Math.sqrt(trace + 1); // 2w
            newDst[3] = 0.5 * root;
            const invRoot = 0.5 / root; // 1/(4w)
            newDst[0] = (m[6] - m[9]) * invRoot;
            newDst[1] = (m[8] - m[2]) * invRoot;
            newDst[2] = (m[1] - m[4]) * invRoot;
        }
        else {
            // |w| <= 1/2
            let i = 0;
            if (m[5] > m[0]) {
                i = 1;
            }
            if (m[10] > m[i * 4 + i]) {
                i = 2;
            }
            const j = (i + 1) % 3;
            const k = (i + 2) % 3;
            const root = Math.sqrt(m[i * 4 + i] - m[j * 4 + j] - m[k * 4 + k] + 1.0);
            newDst[i] = 0.5 * root;
            const invRoot = 0.5 / root;
            newDst[3] = (m[j * 4 + k] - m[k * 4 + j]) * invRoot;
            newDst[j] = (m[j * 4 + i] + m[i * 4 + j]) * invRoot;
            newDst[k] = (m[k * 4 + i] + m[i * 4 + k]) * invRoot;
        }
        return newDst;
    }
    /**
     * Creates a quaternion from the given euler angle x, y, z using the provided intrinsic order for the conversion.
     *
     * @param xAngleInRadians - angle to rotate around X axis in radians.
     * @param yAngleInRadians - angle to rotate around Y axis in radians.
     * @param zAngleInRadians - angle to rotate around Z axis in radians.
     * @param order - order to apply euler angles
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion representing the same rotation as the euler angles applied in the given order
     */
    function fromEuler(xAngleInRadians, yAngleInRadians, zAngleInRadians, order, dst) {
        const newDst = (dst ?? new Ctor(4));
        const xHalfAngle = xAngleInRadians * 0.5;
        const yHalfAngle = yAngleInRadians * 0.5;
        const zHalfAngle = zAngleInRadians * 0.5;
        const sx = Math.sin(xHalfAngle);
        const cx = Math.cos(xHalfAngle);
        const sy = Math.sin(yHalfAngle);
        const cy = Math.cos(yHalfAngle);
        const sz = Math.sin(zHalfAngle);
        const cz = Math.cos(zHalfAngle);
        switch (order) {
            case 'xyz':
                newDst[0] = sx * cy * cz + cx * sy * sz;
                newDst[1] = cx * sy * cz - sx * cy * sz;
                newDst[2] = cx * cy * sz + sx * sy * cz;
                newDst[3] = cx * cy * cz - sx * sy * sz;
                break;
            case 'xzy':
                newDst[0] = sx * cy * cz - cx * sy * sz;
                newDst[1] = cx * sy * cz - sx * cy * sz;
                newDst[2] = cx * cy * sz + sx * sy * cz;
                newDst[3] = cx * cy * cz + sx * sy * sz;
                break;
            case 'yxz':
                newDst[0] = sx * cy * cz + cx * sy * sz;
                newDst[1] = cx * sy * cz - sx * cy * sz;
                newDst[2] = cx * cy * sz - sx * sy * cz;
                newDst[3] = cx * cy * cz + sx * sy * sz;
                break;
            case 'yzx':
                newDst[0] = sx * cy * cz + cx * sy * sz;
                newDst[1] = cx * sy * cz + sx * cy * sz;
                newDst[2] = cx * cy * sz - sx * sy * cz;
                newDst[3] = cx * cy * cz - sx * sy * sz;
                break;
            case 'zxy':
                newDst[0] = sx * cy * cz - cx * sy * sz;
                newDst[1] = cx * sy * cz + sx * cy * sz;
                newDst[2] = cx * cy * sz + sx * sy * cz;
                newDst[3] = cx * cy * cz - sx * sy * sz;
                break;
            case 'zyx':
                newDst[0] = sx * cy * cz - cx * sy * sz;
                newDst[1] = cx * sy * cz + sx * cy * sz;
                newDst[2] = cx * cy * sz - sx * sy * cz;
                newDst[3] = cx * cy * cz + sx * sy * sz;
                break;
            default:
                throw new Error(`Unknown rotation order: ${order}`);
        }
        return newDst;
    }
    /**
     * Copies a quaternion. (same as {@link quat.clone})
     * Also see {@link quat.create} and {@link quat.set}
     * @param q - The quaternion.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is a copy of q
     */
    function copy(q, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = q[0];
        newDst[1] = q[1];
        newDst[2] = q[2];
        newDst[3] = q[3];
        return newDst;
    }
    /**
     * Clones a quaternion. (same as {@link quat.copy})
     * Also see {@link quat.create} and {@link quat.set}
     * @param q - The quaternion.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A copy of q.
     */
    const clone = copy;
    /**
     * Adds two quaternions; assumes a and b have the same dimension.
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the sum of a and b.
     */
    function add(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] + b[0];
        newDst[1] = a[1] + b[1];
        newDst[2] = a[2] + b[2];
        newDst[3] = a[3] + b[3];
        return newDst;
    }
    /**
     * Subtracts two quaternions.
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the difference of a and b.
     */
    function subtract(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] - b[0];
        newDst[1] = a[1] - b[1];
        newDst[2] = a[2] - b[2];
        newDst[3] = a[3] - b[3];
        return newDst;
    }
    /**
     * Subtracts two quaternions.
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns A quaternion that is the difference of a and b.
     */
    const sub = subtract;
    /**
     * Multiplies a quaternion by a scalar.
     * @param v - The quaternion.
     * @param k - The scalar.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The scaled quaternion.
     */
    function mulScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = v[0] * k;
        newDst[1] = v[1] * k;
        newDst[2] = v[2] * k;
        newDst[3] = v[3] * k;
        return newDst;
    }
    /**
     * Multiplies a quaternion by a scalar. (same as mulScalar)
     * @param v - The quaternion.
     * @param k - The scalar.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The scaled quaternion.
     */
    const scale = mulScalar;
    /**
     * Divides a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The scaled quaternion.
     */
    function divScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = v[0] / k;
        newDst[1] = v[1] / k;
        newDst[2] = v[2] / k;
        newDst[3] = v[3] / k;
        return newDst;
    }
    /**
     * Computes the dot product of two quaternions
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @returns dot product
     */
    function dot(a, b) {
        return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]) + (a[3] * b[3]);
    }
    /**
     * Performs linear interpolation on two quaternions.
     * Given quaternions a and b and interpolation coefficient t, returns
     * a + t * (b - a).
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @param t - Interpolation coefficient.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The linear interpolated result.
     */
    function lerp(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] + t * (b[0] - a[0]);
        newDst[1] = a[1] + t * (b[1] - a[1]);
        newDst[2] = a[2] + t * (b[2] - a[2]);
        newDst[3] = a[3] + t * (b[3] - a[3]);
        return newDst;
    }
    /**
     * Computes the length of quaternion
     * @param v - quaternion.
     * @returns length of quaternion.
     */
    function length(v) {
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const v3 = v[3];
        return Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
    }
    /**
     * Computes the length of quaternion (same as length)
     * @param v - quaternion.
     * @returns length of quaternion.
     */
    const len = length;
    /**
     * Computes the square of the length of quaternion
     * @param v - quaternion.
     * @returns square of the length of quaternion.
     */
    function lengthSq(v) {
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const v3 = v[3];
        return v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
    }
    /**
     * Computes the square of the length of quaternion (same as lengthSq)
     * @param v - quaternion.
     * @returns square of the length of quaternion.
     */
    const lenSq = lengthSq;
    /**
     * Divides a quaternion by its Euclidean length and returns the quotient.
     * @param v - The quaternion.
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns The normalized quaternion.
     */
    function normalize(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const v3 = v[3];
        const len = Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
        if (len > 0.00001) {
            newDst[0] = v0 / len;
            newDst[1] = v1 / len;
            newDst[2] = v2 / len;
            newDst[3] = v3 / len;
        }
        else {
            newDst[0] = 0;
            newDst[1] = 0;
            newDst[2] = 0;
            newDst[3] = 1;
        }
        return newDst;
    }
    /**
     * Check if 2 quaternions are approximately equal
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @returns true if quaternions are approximately equal
     */
    function equalsApproximately(a, b) {
        return Math.abs(a[0] - b[0]) < EPSILON &&
            Math.abs(a[1] - b[1]) < EPSILON &&
            Math.abs(a[2] - b[2]) < EPSILON &&
            Math.abs(a[3] - b[3]) < EPSILON;
    }
    /**
     * Check if 2 quaternions are exactly equal
     * @param a - Operand quaternion.
     * @param b - Operand quaternion.
     * @returns true if quaternions are exactly equal
     */
    function equals(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }
    /**
     * Creates an identity quaternion
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns an identity quaternion
     */
    function identity(dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = 0;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 1;
        return newDst;
    }
    const tempVec3 = vec3.create();
    const xUnitVec3 = vec3.create();
    const yUnitVec3 = vec3.create();
    /**
     * Computes a quaternion to represent the shortest rotation from one vector to another.
     *
     * @param aUnit - the start vector
     * @param bUnit - the end vector
     * @param dst - quaternion to hold result. If not passed in a new one is created.
     * @returns the result
     */
    function rotationTo(aUnit, bUnit, dst) {
        const newDst = (dst ?? new Ctor(4));
        const dot = vec3.dot(aUnit, bUnit);
        if (dot < -0.999999) {
            vec3.cross(xUnitVec3, aUnit, tempVec3);
            if (vec3.len(tempVec3) < 0.000001) {
                vec3.cross(yUnitVec3, aUnit, tempVec3);
            }
            vec3.normalize(tempVec3, tempVec3);
            fromAxisAngle(tempVec3, Math.PI, newDst);
            return newDst;
        }
        else if (dot > 0.999999) {
            newDst[0] = 0;
            newDst[1] = 0;
            newDst[2] = 0;
            newDst[3] = 1;
            return newDst;
        }
        else {
            vec3.cross(aUnit, bUnit, tempVec3);
            newDst[0] = tempVec3[0];
            newDst[1] = tempVec3[1];
            newDst[2] = tempVec3[2];
            newDst[3] = 1 + dot;
            return normalize(newDst, newDst);
        }
    }
    const tempQuat1 = new Ctor(4);
    const tempQuat2 = new Ctor(4);
    /**
     * Performs a spherical linear interpolation with two control points
     *
     * @param a - the first quaternion
     * @param b - the second quaternion
     * @param c - the third quaternion
     * @param d - the fourth quaternion
     * @param t - Interpolation coefficient 0 to 1
     * @returns result
     */
    function sqlerp(a, b, c, d, t, dst) {
        const newDst = (dst ?? new Ctor(4));
        slerp(a, d, t, tempQuat1);
        slerp(b, c, t, tempQuat2);
        slerp(tempQuat1, tempQuat2, 2 * t * (1 - t), newDst);
        return newDst;
    }
    return {
        create,
        fromValues,
        set,
        fromAxisAngle,
        toAxisAngle,
        angle,
        multiply,
        mul,
        rotateX,
        rotateY,
        rotateZ,
        slerp,
        inverse,
        conjugate,
        fromMat,
        fromEuler,
        copy,
        clone,
        add,
        subtract,
        sub,
        mulScalar,
        scale,
        divScalar,
        dot,
        lerp,
        length,
        len,
        lengthSq,
        lenSq,
        normalize,
        equalsApproximately,
        equals,
        identity,
        rotationTo,
        sqlerp,
    };
}
const cache$1 = new Map();
/**
 *
 * Quat4 math functions.
 *
 * Almost all functions take an optional `newDst` argument. If it is not passed in the
 * functions will create a new `Quat4`. In other words you can do this
 *
 *     const v = quat4.cross(v1, v2);  // Creates a new Quat4 with the cross product of v1 x v2.
 *
 * or
 *
 *     const v = quat4.create();
 *     quat4.cross(v1, v2, v);  // Puts the cross product of v1 x v2 in v
 *
 * The first style is often easier but depending on where it's used it generates garbage where
 * as there is almost never allocation with the second style.
 *
 * It is always safe to pass any vector as the destination. So for example
 *
 *     quat4.cross(v1, v2, v1);  // Puts the cross product of v1 x v2 in v1
 *
 */
function getAPI$1(Ctor) {
    let api = cache$1.get(Ctor);
    if (!api) {
        api = getAPIImpl$1(Ctor);
        cache$1.set(Ctor, api);
    }
    return api;
}

/*
 * Copyright 2022 Gregg Tavares
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
/**
 * Generates am typed API for Vec4
 * */
function getAPIImpl(Ctor) {
    /**
     * Creates a vec4; may be called with x, y, z to set initial values.
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @param z - Initial z value.
     * @param w - Initial w value.
     * @returns the created vector
     */
    function create(x, y, z, w) {
        const newDst = new Ctor(4);
        if (x !== undefined) {
            newDst[0] = x;
            if (y !== undefined) {
                newDst[1] = y;
                if (z !== undefined) {
                    newDst[2] = z;
                    if (w !== undefined) {
                        newDst[3] = w;
                    }
                }
            }
        }
        return newDst;
    }
    /**
     * Creates a vec4; may be called with x, y, z to set initial values. (same as create)
     * @param x - Initial x value.
     * @param y - Initial y value.
     * @param z - Initial z value.
     * @param z - Initial w value.
     * @returns the created vector
     */
    const fromValues = create;
    /**
     * Sets the values of a Vec4
     * Also see {@link vec4.create} and {@link vec4.copy}
     *
     * @param x first value
     * @param y second value
     * @param z third value
     * @param w fourth value
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector with its elements set.
     */
    function set(x, y, z, w, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = x;
        newDst[1] = y;
        newDst[2] = z;
        newDst[3] = w;
        return newDst;
    }
    /**
     * Applies Math.ceil to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the ceil of each element of v.
     */
    function ceil(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = Math.ceil(v[0]);
        newDst[1] = Math.ceil(v[1]);
        newDst[2] = Math.ceil(v[2]);
        newDst[3] = Math.ceil(v[3]);
        return newDst;
    }
    /**
     * Applies Math.floor to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the floor of each element of v.
     */
    function floor(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = Math.floor(v[0]);
        newDst[1] = Math.floor(v[1]);
        newDst[2] = Math.floor(v[2]);
        newDst[3] = Math.floor(v[3]);
        return newDst;
    }
    /**
     * Applies Math.round to each element of vector
     * @param v - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the round of each element of v.
     */
    function round(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = Math.round(v[0]);
        newDst[1] = Math.round(v[1]);
        newDst[2] = Math.round(v[2]);
        newDst[3] = Math.round(v[3]);
        return newDst;
    }
    /**
     * Clamp each element of vector between min and max
     * @param v - Operand vector.
     * @param max - Min value, default 0
     * @param min - Max value, default 1
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that the clamped value of each element of v.
     */
    function clamp(v, min = 0, max = 1, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = Math.min(max, Math.max(min, v[0]));
        newDst[1] = Math.min(max, Math.max(min, v[1]));
        newDst[2] = Math.min(max, Math.max(min, v[2]));
        newDst[3] = Math.min(max, Math.max(min, v[3]));
        return newDst;
    }
    /**
     * Adds two vectors; assumes a and b have the same dimension.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the sum of a and b.
     */
    function add(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] + b[0];
        newDst[1] = a[1] + b[1];
        newDst[2] = a[2] + b[2];
        newDst[3] = a[3] + b[3];
        return newDst;
    }
    /**
     * Adds two vectors, scaling the 2nd; assumes a and b have the same dimension.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param scale - Amount to scale b
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the sum of a + b * scale.
     */
    function addScaled(a, b, scale, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] + b[0] * scale;
        newDst[1] = a[1] + b[1] * scale;
        newDst[2] = a[2] + b[2] * scale;
        newDst[3] = a[3] + b[3] * scale;
        return newDst;
    }
    /**
     * Subtracts two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the difference of a and b.
     */
    function subtract(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] - b[0];
        newDst[1] = a[1] - b[1];
        newDst[2] = a[2] - b[2];
        newDst[3] = a[3] - b[3];
        return newDst;
    }
    /**
     * Subtracts two vectors.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A vector that is the difference of a and b.
     */
    const sub = subtract;
    /**
     * Check if 2 vectors are approximately equal
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns true if vectors are approximately equal
     */
    function equalsApproximately(a, b) {
        return Math.abs(a[0] - b[0]) < EPSILON &&
            Math.abs(a[1] - b[1]) < EPSILON &&
            Math.abs(a[2] - b[2]) < EPSILON &&
            Math.abs(a[3] - b[3]) < EPSILON;
    }
    /**
     * Check if 2 vectors are exactly equal
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns true if vectors are exactly equal
     */
    function equals(a, b) {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
    }
    /**
     * Performs linear interpolation on two vectors.
     * Given vectors a and b and interpolation coefficient t, returns
     * a + t * (b - a).
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param t - Interpolation coefficient.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The linear interpolated result.
     */
    function lerp(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] + t * (b[0] - a[0]);
        newDst[1] = a[1] + t * (b[1] - a[1]);
        newDst[2] = a[2] + t * (b[2] - a[2]);
        newDst[3] = a[3] + t * (b[3] - a[3]);
        return newDst;
    }
    /**
     * Performs linear interpolation on two vectors.
     * Given vectors a and b and interpolation coefficient vector t, returns
     * a + t * (b - a).
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param t - Interpolation coefficients vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns the linear interpolated result.
     */
    function lerpV(a, b, t, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] + t[0] * (b[0] - a[0]);
        newDst[1] = a[1] + t[1] * (b[1] - a[1]);
        newDst[2] = a[2] + t[2] * (b[2] - a[2]);
        newDst[3] = a[3] + t[3] * (b[3] - a[3]);
        return newDst;
    }
    /**
     * Return max values of two vectors.
     * Given vectors a and b returns
     * [max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2])].
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The max components vector.
     */
    function max(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = Math.max(a[0], b[0]);
        newDst[1] = Math.max(a[1], b[1]);
        newDst[2] = Math.max(a[2], b[2]);
        newDst[3] = Math.max(a[3], b[3]);
        return newDst;
    }
    /**
     * Return min values of two vectors.
     * Given vectors a and b returns
     * [min(a[0], b[0]), min(a[1], b[1]), min(a[2], b[2])].
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The min components vector.
     */
    function min(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = Math.min(a[0], b[0]);
        newDst[1] = Math.min(a[1], b[1]);
        newDst[2] = Math.min(a[2], b[2]);
        newDst[3] = Math.min(a[3], b[3]);
        return newDst;
    }
    /**
     * Multiplies a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    function mulScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = v[0] * k;
        newDst[1] = v[1] * k;
        newDst[2] = v[2] * k;
        newDst[3] = v[3] * k;
        return newDst;
    }
    /**
     * Multiplies a vector by a scalar. (same as mulScalar)
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    const scale = mulScalar;
    /**
     * Divides a vector by a scalar.
     * @param v - The vector.
     * @param k - The scalar.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The scaled vector.
     */
    function divScalar(v, k, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = v[0] / k;
        newDst[1] = v[1] / k;
        newDst[2] = v[2] / k;
        newDst[3] = v[3] / k;
        return newDst;
    }
    /**
     * Inverse a vector.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The inverted vector.
     */
    function inverse(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = 1 / v[0];
        newDst[1] = 1 / v[1];
        newDst[2] = 1 / v[2];
        newDst[3] = 1 / v[3];
        return newDst;
    }
    /**
     * Invert a vector. (same as inverse)
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The inverted vector.
     */
    const invert = inverse;
    /**
     * Computes the dot product of two vectors
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @returns dot product
     */
    function dot(a, b) {
        return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]) + (a[3] * b[3]);
    }
    /**
     * Computes the length of vector
     * @param v - vector.
     * @returns length of vector.
     */
    function length(v) {
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const v3 = v[3];
        return Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
    }
    /**
     * Computes the length of vector (same as length)
     * @param v - vector.
     * @returns length of vector.
     */
    const len = length;
    /**
     * Computes the square of the length of vector
     * @param v - vector.
     * @returns square of the length of vector.
     */
    function lengthSq(v) {
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const v3 = v[3];
        return v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3;
    }
    /**
     * Computes the square of the length of vector (same as lengthSq)
     * @param v - vector.
     * @returns square of the length of vector.
     */
    const lenSq = lengthSq;
    /**
     * Computes the distance between 2 points
     * @param a - vector.
     * @param b - vector.
     * @returns distance between a and b
     */
    function distance(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        const dw = a[3] - b[3];
        return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
    }
    /**
     * Computes the distance between 2 points (same as distance)
     * @param a - vector.
     * @param b - vector.
     * @returns distance between a and b
     */
    const dist = distance;
    /**
     * Computes the square of the distance between 2 points
     * @param a - vector.
     * @param b - vector.
     * @returns square of the distance between a and b
     */
    function distanceSq(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        const dw = a[3] - b[3];
        return dx * dx + dy * dy + dz * dz + dw * dw;
    }
    /**
     * Computes the square of the distance between 2 points (same as distanceSq)
     * @param a - vector.
     * @param b - vector.
     * @returns square of the distance between a and b
     */
    const distSq = distanceSq;
    /**
     * Divides a vector by its Euclidean length and returns the quotient.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The normalized vector.
     */
    function normalize(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        const v0 = v[0];
        const v1 = v[1];
        const v2 = v[2];
        const v3 = v[3];
        const len = Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2 + v3 * v3);
        if (len > 0.00001) {
            newDst[0] = v0 / len;
            newDst[1] = v1 / len;
            newDst[2] = v2 / len;
            newDst[3] = v3 / len;
        }
        else {
            newDst[0] = 0;
            newDst[1] = 0;
            newDst[2] = 0;
            newDst[3] = 0;
        }
        return newDst;
    }
    /**
     * Negates a vector.
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns -v.
     */
    function negate(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = -v[0];
        newDst[1] = -v[1];
        newDst[2] = -v[2];
        newDst[3] = -v[3];
        return newDst;
    }
    /**
     * Copies a vector. (same as {@link vec4.clone})
     * Also see {@link vec4.create} and {@link vec4.set}
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A copy of v.
     */
    function copy(v, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = v[0];
        newDst[1] = v[1];
        newDst[2] = v[2];
        newDst[3] = v[3];
        return newDst;
    }
    /**
     * Clones a vector. (same as {@link vec4.copy})
     * Also see {@link vec4.create} and {@link vec4.set}
     * @param v - The vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns A copy of v.
     */
    const clone = copy;
    /**
     * Multiplies a vector by another vector (component-wise); assumes a and
     * b have the same length.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of products of entries of a and b.
     */
    function multiply(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] * b[0];
        newDst[1] = a[1] * b[1];
        newDst[2] = a[2] * b[2];
        newDst[3] = a[3] * b[3];
        return newDst;
    }
    /**
     * Multiplies a vector by another vector (component-wise); assumes a and
     * b have the same length. (same as mul)
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of products of entries of a and b.
     */
    const mul = multiply;
    /**
     * Divides a vector by another vector (component-wise); assumes a and
     * b have the same length.
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of quotients of entries of a and b.
     */
    function divide(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = a[0] / b[0];
        newDst[1] = a[1] / b[1];
        newDst[2] = a[2] / b[2];
        newDst[3] = a[3] / b[3];
        return newDst;
    }
    /**
     * Divides a vector by another vector (component-wise); assumes a and
     * b have the same length. (same as divide)
     * @param a - Operand vector.
     * @param b - Operand vector.
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The vector of quotients of entries of a and b.
     */
    const div = divide;
    /**
     * Zero's a vector
     * @param dst - vector to hold result. If not passed in a new one is created.
     * @returns The zeroed vector.
     */
    function zero(dst) {
        const newDst = (dst ?? new Ctor(4));
        newDst[0] = 0;
        newDst[1] = 0;
        newDst[2] = 0;
        newDst[3] = 0;
        return newDst;
    }
    /**
     * transform vec4 by 4x4 matrix
     * @param v - the vector
     * @param m - The matrix.
     * @param dst - optional vec4 to store result. If not passed a new one is created.
     * @returns the transformed vector
     */
    function transformMat4(v, m, dst) {
        const newDst = (dst ?? new Ctor(4));
        const x = v[0];
        const y = v[1];
        const z = v[2];
        const w = v[3];
        newDst[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        newDst[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        newDst[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        newDst[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
        return newDst;
    }
    /**
     * Treat a 4D vector as a direction and set it's length
     *
     * @param a The vec4 to lengthen
     * @param len The length of the resulting vector
     * @returns The lengthened vector
     */
    function setLength(a, len, dst) {
        const newDst = (dst ?? new Ctor(4));
        normalize(a, newDst);
        return mulScalar(newDst, len, newDst);
    }
    /**
     * Ensure a vector is not longer than a max length
     *
     * @param a The vec4 to limit
     * @param maxLen The longest length of the resulting vector
     * @returns The vector, shortened to maxLen if it's too long
     */
    function truncate(a, maxLen, dst) {
        const newDst = (dst ?? new Ctor(4));
        if (length(a) > maxLen) {
            return setLength(a, maxLen, newDst);
        }
        return copy(a, newDst);
    }
    /**
     * Return the vector exactly between 2 endpoint vectors
     *
     * @param a Endpoint 1
     * @param b Endpoint 2
     * @returns The vector exactly residing between endpoints 1 and 2
     */
    function midpoint(a, b, dst) {
        const newDst = (dst ?? new Ctor(4));
        return lerp(a, b, 0.5, newDst);
    }
    return {
        create,
        fromValues,
        set,
        ceil,
        floor,
        round,
        clamp,
        add,
        addScaled,
        subtract,
        sub,
        equalsApproximately,
        equals,
        lerp,
        lerpV,
        max,
        min,
        mulScalar,
        scale,
        divScalar,
        inverse,
        invert,
        dot,
        length,
        len,
        lengthSq,
        lenSq,
        distance,
        dist,
        distanceSq,
        distSq,
        normalize,
        negate,
        copy,
        clone,
        multiply,
        mul,
        divide,
        div,
        zero,
        transformMat4,
        setLength,
        truncate,
        midpoint,
    };
}
const cache = new Map();
/**
 *
 * Vec4 math functions.
 *
 * Almost all functions take an optional `newDst` argument. If it is not passed in the
 * functions will create a new `Vec4`. In other words you can do this
 *
 *     const v = vec4.cross(v1, v2);  // Creates a new Vec4 with the cross product of v1 x v2.
 *
 * or
 *
 *     const v = vec4.create();
 *     vec4.cross(v1, v2, v);  // Puts the cross product of v1 x v2 in v
 *
 * The first style is often easier but depending on where it's used it generates garbage where
 * as there is almost never allocation with the second style.
 *
 * It is always safe to pass any vector as the destination. So for example
 *
 *     vec4.cross(v1, v2, v1);  // Puts the cross product of v1 x v2 in v1
 *
 */
function getAPI(Ctor) {
    let api = cache.get(Ctor);
    if (!api) {
        api = getAPIImpl(Ctor);
        cache.set(Ctor, api);
    }
    return api;
}

/**
 * Some docs
 * @namespace wgpu-matrix
 */
/**
 * Generate wgpu-matrix API for type
 */
function wgpuMatrixAPI(Mat3Ctor, Mat4Ctor, QuatCtor, Vec2Ctor, Vec3Ctor, Vec4Ctor) {
    return {
        /** @namespace mat3 */
        mat3: getAPI$3(Mat3Ctor),
        /** @namespace mat4 */
        mat4: getAPI$2(Mat4Ctor),
        /** @namespace quat */
        quat: getAPI$1(QuatCtor),
        /** @namespace vec2 */
        vec2: getAPI$5(Vec2Ctor),
        /** @namespace vec3 */
        vec3: getAPI$4(Vec3Ctor),
        /** @namespace vec4 */
        vec4: getAPI(Vec4Ctor),
    };
}
const { 
/**
 * 3x3 Matrix functions that default to returning `Float32Array`
 * @namespace
 */
mat3, 
/**
 * 4x4 Matrix functions that default to returning `Float32Array`
 * @namespace
 */
mat4, 
/**
 * Quaternion functions that default to returning `Float32Array`
 * @namespace
 */
quat, 
/**
 * Vec2 functions that default to returning `Float32Array`
 * @namespace
 */
vec2, 
/**
 * Vec3 functions that default to returning `Float32Array`
 * @namespace
 */
vec3, 
/**
 * Vec3 functions that default to returning `Float32Array`
 * @namespace
 */
vec4, } = wgpuMatrixAPI(Float32Array, Float32Array, Float32Array, Float32Array, Float32Array, Float32Array);
wgpuMatrixAPI(Float64Array, Float64Array, Float64Array, Float64Array, Float64Array, Float64Array);
wgpuMatrixAPI(ZeroArray, Array, Array, Array, Array, Array);

/**
 * dat-gui JavaScript Controller Library
 * https://github.com/dataarts/dat.gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

function ___$insertStyle(css) {
  if (typeof window === 'undefined') {
    return;
  }

  var style = document.createElement('style');

  style.setAttribute('type', 'text/css');
  style.innerHTML = css;
  document.head.appendChild(style);

  return css;
}

function colorToString (color, forceCSSHex) {
  var colorFormat = color.__state.conversionName.toString();
  var r = Math.round(color.r);
  var g = Math.round(color.g);
  var b = Math.round(color.b);
  var a = color.a;
  var h = Math.round(color.h);
  var s = color.s.toFixed(1);
  var v = color.v.toFixed(1);
  if (forceCSSHex || colorFormat === 'THREE_CHAR_HEX' || colorFormat === 'SIX_CHAR_HEX') {
    var str = color.hex.toString(16);
    while (str.length < 6) {
      str = '0' + str;
    }
    return '#' + str;
  } else if (colorFormat === 'CSS_RGB') {
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } else if (colorFormat === 'CSS_RGBA') {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  } else if (colorFormat === 'HEX') {
    return '0x' + color.hex.toString(16);
  } else if (colorFormat === 'RGB_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ']';
  } else if (colorFormat === 'RGBA_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ',' + a + ']';
  } else if (colorFormat === 'RGB_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + '}';
  } else if (colorFormat === 'RGBA_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + ',a:' + a + '}';
  } else if (colorFormat === 'HSV_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + '}';
  } else if (colorFormat === 'HSVA_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + ',a:' + a + '}';
  }
  return 'unknown format';
}

var ARR_EACH = Array.prototype.forEach;
var ARR_SLICE = Array.prototype.slice;
var Common = {
  BREAK: {},
  extend: function extend(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (!this.isUndefined(obj[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  defaults: function defaults(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (this.isUndefined(target[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  compose: function compose() {
    var toCall = ARR_SLICE.call(arguments);
    return function () {
      var args = ARR_SLICE.call(arguments);
      for (var i = toCall.length - 1; i >= 0; i--) {
        args = [toCall[i].apply(this, args)];
      }
      return args[0];
    };
  },
  each: function each(obj, itr, scope) {
    if (!obj) {
      return;
    }
    if (ARR_EACH && obj.forEach && obj.forEach === ARR_EACH) {
      obj.forEach(itr, scope);
    } else if (obj.length === obj.length + 0) {
      var key = undefined;
      var l = undefined;
      for (key = 0, l = obj.length; key < l; key++) {
        if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) {
          return;
        }
      }
    } else {
      for (var _key in obj) {
        if (itr.call(scope, obj[_key], _key) === this.BREAK) {
          return;
        }
      }
    }
  },
  defer: function defer(fnc) {
    setTimeout(fnc, 0);
  },
  debounce: function debounce(func, threshold, callImmediately) {
    var timeout = undefined;
    return function () {
      var obj = this;
      var args = arguments;
      function delayed() {
        timeout = null;
        if (!callImmediately) func.apply(obj, args);
      }
      var callNow = callImmediately || !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(delayed, threshold);
      if (callNow) {
        func.apply(obj, args);
      }
    };
  },
  toArray: function toArray(obj) {
    if (obj.toArray) return obj.toArray();
    return ARR_SLICE.call(obj);
  },
  isUndefined: function isUndefined(obj) {
    return obj === undefined;
  },
  isNull: function isNull(obj) {
    return obj === null;
  },
  isNaN: function (_isNaN) {
    function isNaN(_x) {
      return _isNaN.apply(this, arguments);
    }
    isNaN.toString = function () {
      return _isNaN.toString();
    };
    return isNaN;
  }(function (obj) {
    return isNaN(obj);
  }),
  isArray: Array.isArray || function (obj) {
    return obj.constructor === Array;
  },
  isObject: function isObject(obj) {
    return obj === Object(obj);
  },
  isNumber: function isNumber(obj) {
    return obj === obj + 0;
  },
  isString: function isString(obj) {
    return obj === obj + '';
  },
  isBoolean: function isBoolean(obj) {
    return obj === false || obj === true;
  },
  isFunction: function isFunction(obj) {
    return obj instanceof Function;
  }
};

var INTERPRETATIONS = [
{
  litmus: Common.isString,
  conversions: {
    THREE_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString() + test[1].toString() + test[2].toString() + test[2].toString() + test[3].toString() + test[3].toString(), 0)
        };
      },
      write: colorToString
    },
    SIX_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9]{6})$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString(), 0)
        };
      },
      write: colorToString
    },
    CSS_RGB: {
      read: function read(original) {
        var test = original.match(/^rgb\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3])
        };
      },
      write: colorToString
    },
    CSS_RGBA: {
      read: function read(original) {
        var test = original.match(/^rgba\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3]),
          a: parseFloat(test[4])
        };
      },
      write: colorToString
    }
  }
},
{
  litmus: Common.isNumber,
  conversions: {
    HEX: {
      read: function read(original) {
        return {
          space: 'HEX',
          hex: original,
          conversionName: 'HEX'
        };
      },
      write: function write(color) {
        return color.hex;
      }
    }
  }
},
{
  litmus: Common.isArray,
  conversions: {
    RGB_ARRAY: {
      read: function read(original) {
        if (original.length !== 3) {
          return false;
        }
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b];
      }
    },
    RGBA_ARRAY: {
      read: function read(original) {
        if (original.length !== 4) return false;
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2],
          a: original[3]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b, color.a];
      }
    }
  }
},
{
  litmus: Common.isObject,
  conversions: {
    RGBA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b) && Common.isNumber(original.a)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b,
          a: color.a
        };
      }
    },
    RGB_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b
        };
      }
    },
    HSVA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v) && Common.isNumber(original.a)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v,
          a: color.a
        };
      }
    },
    HSV_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v
        };
      }
    }
  }
}];
var result = undefined;
var toReturn = undefined;
var interpret = function interpret() {
  toReturn = false;
  var original = arguments.length > 1 ? Common.toArray(arguments) : arguments[0];
  Common.each(INTERPRETATIONS, function (family) {
    if (family.litmus(original)) {
      Common.each(family.conversions, function (conversion, conversionName) {
        result = conversion.read(original);
        if (toReturn === false && result !== false) {
          toReturn = result;
          result.conversionName = conversionName;
          result.conversion = conversion;
          return Common.BREAK;
        }
      });
      return Common.BREAK;
    }
  });
  return toReturn;
};

var tmpComponent = undefined;
var ColorMath = {
  hsv_to_rgb: function hsv_to_rgb(h, s, v) {
    var hi = Math.floor(h / 60) % 6;
    var f = h / 60 - Math.floor(h / 60);
    var p = v * (1.0 - s);
    var q = v * (1.0 - f * s);
    var t = v * (1.0 - (1.0 - f) * s);
    var c = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][hi];
    return {
      r: c[0] * 255,
      g: c[1] * 255,
      b: c[2] * 255
    };
  },
  rgb_to_hsv: function rgb_to_hsv(r, g, b) {
    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var delta = max - min;
    var h = undefined;
    var s = undefined;
    if (max !== 0) {
      s = delta / max;
    } else {
      return {
        h: NaN,
        s: 0,
        v: 0
      };
    }
    if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else {
      h = 4 + (r - g) / delta;
    }
    h /= 6;
    if (h < 0) {
      h += 1;
    }
    return {
      h: h * 360,
      s: s,
      v: max / 255
    };
  },
  rgb_to_hex: function rgb_to_hex(r, g, b) {
    var hex = this.hex_with_component(0, 2, r);
    hex = this.hex_with_component(hex, 1, g);
    hex = this.hex_with_component(hex, 0, b);
    return hex;
  },
  component_from_hex: function component_from_hex(hex, componentIndex) {
    return hex >> componentIndex * 8 & 0xFF;
  },
  hex_with_component: function hex_with_component(hex, componentIndex, value) {
    return value << (tmpComponent = componentIndex * 8) | hex & ~(0xFF << tmpComponent);
  }
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Color = function () {
  function Color() {
    classCallCheck(this, Color);
    this.__state = interpret.apply(this, arguments);
    if (this.__state === false) {
      throw new Error('Failed to interpret color arguments');
    }
    this.__state.a = this.__state.a || 1;
  }
  createClass(Color, [{
    key: 'toString',
    value: function toString() {
      return colorToString(this);
    }
  }, {
    key: 'toHexString',
    value: function toHexString() {
      return colorToString(this, true);
    }
  }, {
    key: 'toOriginal',
    value: function toOriginal() {
      return this.__state.conversion.write(this);
    }
  }]);
  return Color;
}();
function defineRGBComponent(target, component, componentHexIndex) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'RGB') {
        return this.__state[component];
      }
      Color.recalculateRGB(this, component, componentHexIndex);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'RGB') {
        Color.recalculateRGB(this, component, componentHexIndex);
        this.__state.space = 'RGB';
      }
      this.__state[component] = v;
    }
  });
}
function defineHSVComponent(target, component) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'HSV') {
        return this.__state[component];
      }
      Color.recalculateHSV(this);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'HSV') {
        Color.recalculateHSV(this);
        this.__state.space = 'HSV';
      }
      this.__state[component] = v;
    }
  });
}
Color.recalculateRGB = function (color, component, componentHexIndex) {
  if (color.__state.space === 'HEX') {
    color.__state[component] = ColorMath.component_from_hex(color.__state.hex, componentHexIndex);
  } else if (color.__state.space === 'HSV') {
    Common.extend(color.__state, ColorMath.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));
  } else {
    throw new Error('Corrupted color state');
  }
};
Color.recalculateHSV = function (color) {
  var result = ColorMath.rgb_to_hsv(color.r, color.g, color.b);
  Common.extend(color.__state, {
    s: result.s,
    v: result.v
  });
  if (!Common.isNaN(result.h)) {
    color.__state.h = result.h;
  } else if (Common.isUndefined(color.__state.h)) {
    color.__state.h = 0;
  }
};
Color.COMPONENTS = ['r', 'g', 'b', 'h', 's', 'v', 'hex', 'a'];
defineRGBComponent(Color.prototype, 'r', 2);
defineRGBComponent(Color.prototype, 'g', 1);
defineRGBComponent(Color.prototype, 'b', 0);
defineHSVComponent(Color.prototype, 'h');
defineHSVComponent(Color.prototype, 's');
defineHSVComponent(Color.prototype, 'v');
Object.defineProperty(Color.prototype, 'a', {
  get: function get$$1() {
    return this.__state.a;
  },
  set: function set$$1(v) {
    this.__state.a = v;
  }
});
Object.defineProperty(Color.prototype, 'hex', {
  get: function get$$1() {
    if (this.__state.space !== 'HEX') {
      this.__state.hex = ColorMath.rgb_to_hex(this.r, this.g, this.b);
      this.__state.space = 'HEX';
    }
    return this.__state.hex;
  },
  set: function set$$1(v) {
    this.__state.space = 'HEX';
    this.__state.hex = v;
  }
});

var Controller = function () {
  function Controller(object, property) {
    classCallCheck(this, Controller);
    this.initialValue = object[property];
    this.domElement = document.createElement('div');
    this.object = object;
    this.property = property;
    this.__onChange = undefined;
    this.__onFinishChange = undefined;
  }
  createClass(Controller, [{
    key: 'onChange',
    value: function onChange(fnc) {
      this.__onChange = fnc;
      return this;
    }
  }, {
    key: 'onFinishChange',
    value: function onFinishChange(fnc) {
      this.__onFinishChange = fnc;
      return this;
    }
  }, {
    key: 'setValue',
    value: function setValue(newValue) {
      this.object[this.property] = newValue;
      if (this.__onChange) {
        this.__onChange.call(this, newValue);
      }
      this.updateDisplay();
      return this;
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.object[this.property];
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      return this;
    }
  }, {
    key: 'isModified',
    value: function isModified() {
      return this.initialValue !== this.getValue();
    }
  }]);
  return Controller;
}();

var EVENT_MAP = {
  HTMLEvents: ['change'],
  MouseEvents: ['click', 'mousemove', 'mousedown', 'mouseup', 'mouseover'],
  KeyboardEvents: ['keydown']
};
var EVENT_MAP_INV = {};
Common.each(EVENT_MAP, function (v, k) {
  Common.each(v, function (e) {
    EVENT_MAP_INV[e] = k;
  });
});
var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;
function cssValueToPixels(val) {
  if (val === '0' || Common.isUndefined(val)) {
    return 0;
  }
  var match = val.match(CSS_VALUE_PIXELS);
  if (!Common.isNull(match)) {
    return parseFloat(match[1]);
  }
  return 0;
}
var dom = {
  makeSelectable: function makeSelectable(elem, selectable) {
    if (elem === undefined || elem.style === undefined) return;
    elem.onselectstart = selectable ? function () {
      return false;
    } : function () {};
    elem.style.MozUserSelect = selectable ? 'auto' : 'none';
    elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
    elem.unselectable = selectable ? 'on' : 'off';
  },
  makeFullscreen: function makeFullscreen(elem, hor, vert) {
    var vertical = vert;
    var horizontal = hor;
    if (Common.isUndefined(horizontal)) {
      horizontal = true;
    }
    if (Common.isUndefined(vertical)) {
      vertical = true;
    }
    elem.style.position = 'absolute';
    if (horizontal) {
      elem.style.left = 0;
      elem.style.right = 0;
    }
    if (vertical) {
      elem.style.top = 0;
      elem.style.bottom = 0;
    }
  },
  fakeEvent: function fakeEvent(elem, eventType, pars, aux) {
    var params = pars || {};
    var className = EVENT_MAP_INV[eventType];
    if (!className) {
      throw new Error('Event type ' + eventType + ' not supported.');
    }
    var evt = document.createEvent(className);
    switch (className) {
      case 'MouseEvents':
        {
          var clientX = params.x || params.clientX || 0;
          var clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false, params.cancelable || true, window, params.clickCount || 1, 0,
          0,
          clientX,
          clientY,
          false, false, false, false, 0, null);
          break;
        }
      case 'KeyboardEvents':
        {
          var init = evt.initKeyboardEvent || evt.initKeyEvent;
          Common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false, params.cancelable, window, params.ctrlKey, params.altKey, params.shiftKey, params.metaKey, params.keyCode, params.charCode);
          break;
        }
      default:
        {
          evt.initEvent(eventType, params.bubbles || false, params.cancelable || true);
          break;
        }
    }
    Common.defaults(evt, aux);
    elem.dispatchEvent(evt);
  },
  bind: function bind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.addEventListener) {
      elem.addEventListener(event, func, bool);
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, func);
    }
    return dom;
  },
  unbind: function unbind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.removeEventListener) {
      elem.removeEventListener(event, func, bool);
    } else if (elem.detachEvent) {
      elem.detachEvent('on' + event, func);
    }
    return dom;
  },
  addClass: function addClass(elem, className) {
    if (elem.className === undefined) {
      elem.className = className;
    } else if (elem.className !== className) {
      var classes = elem.className.split(/ +/);
      if (classes.indexOf(className) === -1) {
        classes.push(className);
        elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
      }
    }
    return dom;
  },
  removeClass: function removeClass(elem, className) {
    if (className) {
      if (elem.className === className) {
        elem.removeAttribute('class');
      } else {
        var classes = elem.className.split(/ +/);
        var index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          elem.className = classes.join(' ');
        }
      }
    } else {
      elem.className = undefined;
    }
    return dom;
  },
  hasClass: function hasClass(elem, className) {
    return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
  },
  getWidth: function getWidth(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-left-width']) + cssValueToPixels(style['border-right-width']) + cssValueToPixels(style['padding-left']) + cssValueToPixels(style['padding-right']) + cssValueToPixels(style.width);
  },
  getHeight: function getHeight(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-top-width']) + cssValueToPixels(style['border-bottom-width']) + cssValueToPixels(style['padding-top']) + cssValueToPixels(style['padding-bottom']) + cssValueToPixels(style.height);
  },
  getOffset: function getOffset(el) {
    var elem = el;
    var offset = { left: 0, top: 0 };
    if (elem.offsetParent) {
      do {
        offset.left += elem.offsetLeft;
        offset.top += elem.offsetTop;
        elem = elem.offsetParent;
      } while (elem);
    }
    return offset;
  },
  isActive: function isActive(elem) {
    return elem === document.activeElement && (elem.type || elem.href);
  }
};

var BooleanController = function (_Controller) {
  inherits(BooleanController, _Controller);
  function BooleanController(object, property) {
    classCallCheck(this, BooleanController);
    var _this2 = possibleConstructorReturn(this, (BooleanController.__proto__ || Object.getPrototypeOf(BooleanController)).call(this, object, property));
    var _this = _this2;
    _this2.__prev = _this2.getValue();
    _this2.__checkbox = document.createElement('input');
    _this2.__checkbox.setAttribute('type', 'checkbox');
    function onChange() {
      _this.setValue(!_this.__prev);
    }
    dom.bind(_this2.__checkbox, 'change', onChange, false);
    _this2.domElement.appendChild(_this2.__checkbox);
    _this2.updateDisplay();
    return _this2;
  }
  createClass(BooleanController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      this.__prev = this.getValue();
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (this.getValue() === true) {
        this.__checkbox.setAttribute('checked', 'checked');
        this.__checkbox.checked = true;
        this.__prev = true;
      } else {
        this.__checkbox.checked = false;
        this.__prev = false;
      }
      return get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return BooleanController;
}(Controller);

var OptionController = function (_Controller) {
  inherits(OptionController, _Controller);
  function OptionController(object, property, opts) {
    classCallCheck(this, OptionController);
    var _this2 = possibleConstructorReturn(this, (OptionController.__proto__ || Object.getPrototypeOf(OptionController)).call(this, object, property));
    var options = opts;
    var _this = _this2;
    _this2.__select = document.createElement('select');
    if (Common.isArray(options)) {
      var map = {};
      Common.each(options, function (element) {
        map[element] = element;
      });
      options = map;
    }
    Common.each(options, function (value, key) {
      var opt = document.createElement('option');
      opt.innerHTML = key;
      opt.setAttribute('value', value);
      _this.__select.appendChild(opt);
    });
    _this2.updateDisplay();
    dom.bind(_this2.__select, 'change', function () {
      var desiredValue = this.options[this.selectedIndex].value;
      _this.setValue(desiredValue);
    });
    _this2.domElement.appendChild(_this2.__select);
    return _this2;
  }
  createClass(OptionController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (dom.isActive(this.__select)) return this;
      this.__select.value = this.getValue();
      return get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return OptionController;
}(Controller);

var StringController = function (_Controller) {
  inherits(StringController, _Controller);
  function StringController(object, property) {
    classCallCheck(this, StringController);
    var _this2 = possibleConstructorReturn(this, (StringController.__proto__ || Object.getPrototypeOf(StringController)).call(this, object, property));
    var _this = _this2;
    function onChange() {
      _this.setValue(_this.__input.value);
    }
    function onBlur() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'keyup', onChange);
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        this.blur();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(StringController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (!dom.isActive(this.__input)) {
        this.__input.value = this.getValue();
      }
      return get(StringController.prototype.__proto__ || Object.getPrototypeOf(StringController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return StringController;
}(Controller);

function numDecimals(x) {
  var _x = x.toString();
  if (_x.indexOf('.') > -1) {
    return _x.length - _x.indexOf('.') - 1;
  }
  return 0;
}
var NumberController = function (_Controller) {
  inherits(NumberController, _Controller);
  function NumberController(object, property, params) {
    classCallCheck(this, NumberController);
    var _this = possibleConstructorReturn(this, (NumberController.__proto__ || Object.getPrototypeOf(NumberController)).call(this, object, property));
    var _params = params || {};
    _this.__min = _params.min;
    _this.__max = _params.max;
    _this.__step = _params.step;
    if (Common.isUndefined(_this.__step)) {
      if (_this.initialValue === 0) {
        _this.__impliedStep = 1;
      } else {
        _this.__impliedStep = Math.pow(10, Math.floor(Math.log(Math.abs(_this.initialValue)) / Math.LN10)) / 10;
      }
    } else {
      _this.__impliedStep = _this.__step;
    }
    _this.__precision = numDecimals(_this.__impliedStep);
    return _this;
  }
  createClass(NumberController, [{
    key: 'setValue',
    value: function setValue(v) {
      var _v = v;
      if (this.__min !== undefined && _v < this.__min) {
        _v = this.__min;
      } else if (this.__max !== undefined && _v > this.__max) {
        _v = this.__max;
      }
      if (this.__step !== undefined && _v % this.__step !== 0) {
        _v = Math.round(_v / this.__step) * this.__step;
      }
      return get(NumberController.prototype.__proto__ || Object.getPrototypeOf(NumberController.prototype), 'setValue', this).call(this, _v);
    }
  }, {
    key: 'min',
    value: function min(minValue) {
      this.__min = minValue;
      return this;
    }
  }, {
    key: 'max',
    value: function max(maxValue) {
      this.__max = maxValue;
      return this;
    }
  }, {
    key: 'step',
    value: function step(stepValue) {
      this.__step = stepValue;
      this.__impliedStep = stepValue;
      this.__precision = numDecimals(stepValue);
      return this;
    }
  }]);
  return NumberController;
}(Controller);

function roundToDecimal(value, decimals) {
  var tenTo = Math.pow(10, decimals);
  return Math.round(value * tenTo) / tenTo;
}
var NumberControllerBox = function (_NumberController) {
  inherits(NumberControllerBox, _NumberController);
  function NumberControllerBox(object, property, params) {
    classCallCheck(this, NumberControllerBox);
    var _this2 = possibleConstructorReturn(this, (NumberControllerBox.__proto__ || Object.getPrototypeOf(NumberControllerBox)).call(this, object, property, params));
    _this2.__truncationSuspended = false;
    var _this = _this2;
    var prevY = undefined;
    function onChange() {
      var attempted = parseFloat(_this.__input.value);
      if (!Common.isNaN(attempted)) {
        _this.setValue(attempted);
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onBlur() {
      onFinish();
    }
    function onMouseDrag(e) {
      var diff = prevY - e.clientY;
      _this.setValue(_this.getValue() + diff * _this.__impliedStep);
      prevY = e.clientY;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      onFinish();
    }
    function onMouseDown(e) {
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      prevY = e.clientY;
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'mousedown', onMouseDown);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        _this.__truncationSuspended = true;
        this.blur();
        _this.__truncationSuspended = false;
        onFinish();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(NumberControllerBox, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      this.__input.value = this.__truncationSuspended ? this.getValue() : roundToDecimal(this.getValue(), this.__precision);
      return get(NumberControllerBox.prototype.__proto__ || Object.getPrototypeOf(NumberControllerBox.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerBox;
}(NumberController);

function map(v, i1, i2, o1, o2) {
  return o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
}
var NumberControllerSlider = function (_NumberController) {
  inherits(NumberControllerSlider, _NumberController);
  function NumberControllerSlider(object, property, min, max, step) {
    classCallCheck(this, NumberControllerSlider);
    var _this2 = possibleConstructorReturn(this, (NumberControllerSlider.__proto__ || Object.getPrototypeOf(NumberControllerSlider)).call(this, object, property, { min: min, max: max, step: step }));
    var _this = _this2;
    _this2.__background = document.createElement('div');
    _this2.__foreground = document.createElement('div');
    dom.bind(_this2.__background, 'mousedown', onMouseDown);
    dom.bind(_this2.__background, 'touchstart', onTouchStart);
    dom.addClass(_this2.__background, 'slider');
    dom.addClass(_this2.__foreground, 'slider-fg');
    function onMouseDown(e) {
      document.activeElement.blur();
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      onMouseDrag(e);
    }
    function onMouseDrag(e) {
      e.preventDefault();
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(e.clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
      return false;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onTouchStart(e) {
      if (e.touches.length !== 1) {
        return;
      }
      dom.bind(window, 'touchmove', onTouchMove);
      dom.bind(window, 'touchend', onTouchEnd);
      onTouchMove(e);
    }
    function onTouchMove(e) {
      var clientX = e.touches[0].clientX;
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
    }
    function onTouchEnd() {
      dom.unbind(window, 'touchmove', onTouchMove);
      dom.unbind(window, 'touchend', onTouchEnd);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.updateDisplay();
    _this2.__background.appendChild(_this2.__foreground);
    _this2.domElement.appendChild(_this2.__background);
    return _this2;
  }
  createClass(NumberControllerSlider, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var pct = (this.getValue() - this.__min) / (this.__max - this.__min);
      this.__foreground.style.width = pct * 100 + '%';
      return get(NumberControllerSlider.prototype.__proto__ || Object.getPrototypeOf(NumberControllerSlider.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerSlider;
}(NumberController);

var FunctionController = function (_Controller) {
  inherits(FunctionController, _Controller);
  function FunctionController(object, property, text) {
    classCallCheck(this, FunctionController);
    var _this2 = possibleConstructorReturn(this, (FunctionController.__proto__ || Object.getPrototypeOf(FunctionController)).call(this, object, property));
    var _this = _this2;
    _this2.__button = document.createElement('div');
    _this2.__button.innerHTML = text === undefined ? 'Fire' : text;
    dom.bind(_this2.__button, 'click', function (e) {
      e.preventDefault();
      _this.fire();
      return false;
    });
    dom.addClass(_this2.__button, 'button');
    _this2.domElement.appendChild(_this2.__button);
    return _this2;
  }
  createClass(FunctionController, [{
    key: 'fire',
    value: function fire() {
      if (this.__onChange) {
        this.__onChange.call(this);
      }
      this.getValue().call(this.object);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
    }
  }]);
  return FunctionController;
}(Controller);

var ColorController = function (_Controller) {
  inherits(ColorController, _Controller);
  function ColorController(object, property) {
    classCallCheck(this, ColorController);
    var _this2 = possibleConstructorReturn(this, (ColorController.__proto__ || Object.getPrototypeOf(ColorController)).call(this, object, property));
    _this2.__color = new Color(_this2.getValue());
    _this2.__temp = new Color(0);
    var _this = _this2;
    _this2.domElement = document.createElement('div');
    dom.makeSelectable(_this2.domElement, false);
    _this2.__selector = document.createElement('div');
    _this2.__selector.className = 'selector';
    _this2.__saturation_field = document.createElement('div');
    _this2.__saturation_field.className = 'saturation-field';
    _this2.__field_knob = document.createElement('div');
    _this2.__field_knob.className = 'field-knob';
    _this2.__field_knob_border = '2px solid ';
    _this2.__hue_knob = document.createElement('div');
    _this2.__hue_knob.className = 'hue-knob';
    _this2.__hue_field = document.createElement('div');
    _this2.__hue_field.className = 'hue-field';
    _this2.__input = document.createElement('input');
    _this2.__input.type = 'text';
    _this2.__input_textShadow = '0 1px 1px ';
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        onBlur.call(this);
      }
    });
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__selector, 'mousedown', function () {
      dom.addClass(this, 'drag').bind(window, 'mouseup', function () {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    dom.bind(_this2.__selector, 'touchstart', function () {
      dom.addClass(this, 'drag').bind(window, 'touchend', function () {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    var valueField = document.createElement('div');
    Common.extend(_this2.__selector.style, {
      width: '122px',
      height: '102px',
      padding: '3px',
      backgroundColor: '#222',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.3)'
    });
    Common.extend(_this2.__field_knob.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      border: _this2.__field_knob_border + (_this2.__color.v < 0.5 ? '#fff' : '#000'),
      boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      borderRadius: '12px',
      zIndex: 1
    });
    Common.extend(_this2.__hue_knob.style, {
      position: 'absolute',
      width: '15px',
      height: '2px',
      borderRight: '4px solid #fff',
      zIndex: 1
    });
    Common.extend(_this2.__saturation_field.style, {
      width: '100px',
      height: '100px',
      border: '1px solid #555',
      marginRight: '3px',
      display: 'inline-block',
      cursor: 'pointer'
    });
    Common.extend(valueField.style, {
      width: '100%',
      height: '100%',
      background: 'none'
    });
    linearGradient(valueField, 'top', 'rgba(0,0,0,0)', '#000');
    Common.extend(_this2.__hue_field.style, {
      width: '15px',
      height: '100px',
      border: '1px solid #555',
      cursor: 'ns-resize',
      position: 'absolute',
      top: '3px',
      right: '3px'
    });
    hueGradient(_this2.__hue_field);
    Common.extend(_this2.__input.style, {
      outline: 'none',
      textAlign: 'center',
      color: '#fff',
      border: 0,
      fontWeight: 'bold',
      textShadow: _this2.__input_textShadow + 'rgba(0,0,0,0.7)'
    });
    dom.bind(_this2.__saturation_field, 'mousedown', fieldDown);
    dom.bind(_this2.__saturation_field, 'touchstart', fieldDown);
    dom.bind(_this2.__field_knob, 'mousedown', fieldDown);
    dom.bind(_this2.__field_knob, 'touchstart', fieldDown);
    dom.bind(_this2.__hue_field, 'mousedown', fieldDownH);
    dom.bind(_this2.__hue_field, 'touchstart', fieldDownH);
    function fieldDown(e) {
      setSV(e);
      dom.bind(window, 'mousemove', setSV);
      dom.bind(window, 'touchmove', setSV);
      dom.bind(window, 'mouseup', fieldUpSV);
      dom.bind(window, 'touchend', fieldUpSV);
    }
    function fieldDownH(e) {
      setH(e);
      dom.bind(window, 'mousemove', setH);
      dom.bind(window, 'touchmove', setH);
      dom.bind(window, 'mouseup', fieldUpH);
      dom.bind(window, 'touchend', fieldUpH);
    }
    function fieldUpSV() {
      dom.unbind(window, 'mousemove', setSV);
      dom.unbind(window, 'touchmove', setSV);
      dom.unbind(window, 'mouseup', fieldUpSV);
      dom.unbind(window, 'touchend', fieldUpSV);
      onFinish();
    }
    function fieldUpH() {
      dom.unbind(window, 'mousemove', setH);
      dom.unbind(window, 'touchmove', setH);
      dom.unbind(window, 'mouseup', fieldUpH);
      dom.unbind(window, 'touchend', fieldUpH);
      onFinish();
    }
    function onBlur() {
      var i = interpret(this.value);
      if (i !== false) {
        _this.__color.__state = i;
        _this.setValue(_this.__color.toOriginal());
      } else {
        this.value = _this.__color.toString();
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.__color.toOriginal());
      }
    }
    _this2.__saturation_field.appendChild(valueField);
    _this2.__selector.appendChild(_this2.__field_knob);
    _this2.__selector.appendChild(_this2.__saturation_field);
    _this2.__selector.appendChild(_this2.__hue_field);
    _this2.__hue_field.appendChild(_this2.__hue_knob);
    _this2.domElement.appendChild(_this2.__input);
    _this2.domElement.appendChild(_this2.__selector);
    _this2.updateDisplay();
    function setSV(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__saturation_field.getBoundingClientRect();
      var _ref = e.touches && e.touches[0] || e,
          clientX = _ref.clientX,
          clientY = _ref.clientY;
      var s = (clientX - fieldRect.left) / (fieldRect.right - fieldRect.left);
      var v = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (v > 1) {
        v = 1;
      } else if (v < 0) {
        v = 0;
      }
      if (s > 1) {
        s = 1;
      } else if (s < 0) {
        s = 0;
      }
      _this.__color.v = v;
      _this.__color.s = s;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    function setH(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__hue_field.getBoundingClientRect();
      var _ref2 = e.touches && e.touches[0] || e,
          clientY = _ref2.clientY;
      var h = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (h > 1) {
        h = 1;
      } else if (h < 0) {
        h = 0;
      }
      _this.__color.h = h * 360;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    return _this2;
  }
  createClass(ColorController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var i = interpret(this.getValue());
      if (i !== false) {
        var mismatch = false;
        Common.each(Color.COMPONENTS, function (component) {
          if (!Common.isUndefined(i[component]) && !Common.isUndefined(this.__color.__state[component]) && i[component] !== this.__color.__state[component]) {
            mismatch = true;
            return {};
          }
        }, this);
        if (mismatch) {
          Common.extend(this.__color.__state, i);
        }
      }
      Common.extend(this.__temp.__state, this.__color.__state);
      this.__temp.a = 1;
      var flip = this.__color.v < 0.5 || this.__color.s > 0.5 ? 255 : 0;
      var _flip = 255 - flip;
      Common.extend(this.__field_knob.style, {
        marginLeft: 100 * this.__color.s - 7 + 'px',
        marginTop: 100 * (1 - this.__color.v) - 7 + 'px',
        backgroundColor: this.__temp.toHexString(),
        border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip + ')'
      });
      this.__hue_knob.style.marginTop = (1 - this.__color.h / 360) * 100 + 'px';
      this.__temp.s = 1;
      this.__temp.v = 1;
      linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toHexString());
      this.__input.value = this.__color.toString();
      Common.extend(this.__input.style, {
        backgroundColor: this.__color.toHexString(),
        color: 'rgb(' + flip + ',' + flip + ',' + flip + ')',
        textShadow: this.__input_textShadow + 'rgba(' + _flip + ',' + _flip + ',' + _flip + ',.7)'
      });
    }
  }]);
  return ColorController;
}(Controller);
var vendors = ['-moz-', '-o-', '-webkit-', '-ms-', ''];
function linearGradient(elem, x, a, b) {
  elem.style.background = '';
  Common.each(vendors, function (vendor) {
    elem.style.cssText += 'background: ' + vendor + 'linear-gradient(' + x + ', ' + a + ' 0%, ' + b + ' 100%); ';
  });
}
function hueGradient(elem) {
  elem.style.background = '';
  elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);';
  elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
}

var css = {
  load: function load(url, indoc) {
    var doc = indoc || document;
    var link = doc.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    doc.getElementsByTagName('head')[0].appendChild(link);
  },
  inject: function inject(cssContent, indoc) {
    var doc = indoc || document;
    var injected = document.createElement('style');
    injected.type = 'text/css';
    injected.innerHTML = cssContent;
    var head = doc.getElementsByTagName('head')[0];
    try {
      head.appendChild(injected);
    } catch (e) {
    }
  }
};

var saveDialogContents = "<div id=\"dg-save\" class=\"dg dialogue\">\n\n  Here's the new load parameter for your <code>GUI</code>'s constructor:\n\n  <textarea id=\"dg-new-constructor\"></textarea>\n\n  <div id=\"dg-save-locally\">\n\n    <input id=\"dg-local-storage\" type=\"checkbox\"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id=\"dg-local-explain\">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n\n    </div>\n\n  </div>\n\n</div>";

var ControllerFactory = function ControllerFactory(object, property) {
  var initialValue = object[property];
  if (Common.isArray(arguments[2]) || Common.isObject(arguments[2])) {
    return new OptionController(object, property, arguments[2]);
  }
  if (Common.isNumber(initialValue)) {
    if (Common.isNumber(arguments[2]) && Common.isNumber(arguments[3])) {
      if (Common.isNumber(arguments[4])) {
        return new NumberControllerSlider(object, property, arguments[2], arguments[3], arguments[4]);
      }
      return new NumberControllerSlider(object, property, arguments[2], arguments[3]);
    }
    if (Common.isNumber(arguments[4])) {
      return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3], step: arguments[4] });
    }
    return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3] });
  }
  if (Common.isString(initialValue)) {
    return new StringController(object, property);
  }
  if (Common.isFunction(initialValue)) {
    return new FunctionController(object, property, '');
  }
  if (Common.isBoolean(initialValue)) {
    return new BooleanController(object, property);
  }
  return null;
};

function requestAnimationFrame$1(callback) {
  setTimeout(callback, 1000 / 60);
}
var requestAnimationFrame$1$1 = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || requestAnimationFrame$1;

var CenteredDiv = function () {
  function CenteredDiv() {
    classCallCheck(this, CenteredDiv);
    this.backgroundElement = document.createElement('div');
    Common.extend(this.backgroundElement.style, {
      backgroundColor: 'rgba(0,0,0,0.8)',
      top: 0,
      left: 0,
      display: 'none',
      zIndex: '1000',
      opacity: 0,
      WebkitTransition: 'opacity 0.2s linear',
      transition: 'opacity 0.2s linear'
    });
    dom.makeFullscreen(this.backgroundElement);
    this.backgroundElement.style.position = 'fixed';
    this.domElement = document.createElement('div');
    Common.extend(this.domElement.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1001',
      opacity: 0,
      WebkitTransition: '-webkit-transform 0.2s ease-out, opacity 0.2s linear',
      transition: 'transform 0.2s ease-out, opacity 0.2s linear'
    });
    document.body.appendChild(this.backgroundElement);
    document.body.appendChild(this.domElement);
    var _this = this;
    dom.bind(this.backgroundElement, 'click', function () {
      _this.hide();
    });
  }
  createClass(CenteredDiv, [{
    key: 'show',
    value: function show() {
      var _this = this;
      this.backgroundElement.style.display = 'block';
      this.domElement.style.display = 'block';
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
      this.layout();
      Common.defer(function () {
        _this.backgroundElement.style.opacity = 1;
        _this.domElement.style.opacity = 1;
        _this.domElement.style.webkitTransform = 'scale(1)';
      });
    }
  }, {
    key: 'hide',
    value: function hide() {
      var _this = this;
      var hide = function hide() {
        _this.domElement.style.display = 'none';
        _this.backgroundElement.style.display = 'none';
        dom.unbind(_this.domElement, 'webkitTransitionEnd', hide);
        dom.unbind(_this.domElement, 'transitionend', hide);
        dom.unbind(_this.domElement, 'oTransitionEnd', hide);
      };
      dom.bind(this.domElement, 'webkitTransitionEnd', hide);
      dom.bind(this.domElement, 'transitionend', hide);
      dom.bind(this.domElement, 'oTransitionEnd', hide);
      this.backgroundElement.style.opacity = 0;
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
    }
  }, {
    key: 'layout',
    value: function layout() {
      this.domElement.style.left = window.innerWidth / 2 - dom.getWidth(this.domElement) / 2 + 'px';
      this.domElement.style.top = window.innerHeight / 2 - dom.getHeight(this.domElement) / 2 + 'px';
    }
  }]);
  return CenteredDiv;
}();

var styleSheet = ___$insertStyle(".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .cr.function .property-name{width:100%}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n");

css.inject(styleSheet);
var CSS_NAMESPACE = 'dg';
var HIDE_KEY_CODE = 72;
var CLOSE_BUTTON_HEIGHT = 20;
var DEFAULT_DEFAULT_PRESET_NAME = 'Default';
var SUPPORTS_LOCAL_STORAGE = function () {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
}();
var SAVE_DIALOGUE = undefined;
var autoPlaceVirgin = true;
var autoPlaceContainer = undefined;
var hide = false;
var hideableGuis = [];
var GUI = function GUI(pars) {
  var _this = this;
  var params = pars || {};
  this.domElement = document.createElement('div');
  this.__ul = document.createElement('ul');
  this.domElement.appendChild(this.__ul);
  dom.addClass(this.domElement, CSS_NAMESPACE);
  this.__folders = {};
  this.__controllers = [];
  this.__rememberedObjects = [];
  this.__rememberedObjectIndecesToControllers = [];
  this.__listening = [];
  params = Common.defaults(params, {
    closeOnTop: false,
    autoPlace: true,
    width: GUI.DEFAULT_WIDTH
  });
  params = Common.defaults(params, {
    resizable: params.autoPlace,
    hideable: params.autoPlace
  });
  if (!Common.isUndefined(params.load)) {
    if (params.preset) {
      params.load.preset = params.preset;
    }
  } else {
    params.load = { preset: DEFAULT_DEFAULT_PRESET_NAME };
  }
  if (Common.isUndefined(params.parent) && params.hideable) {
    hideableGuis.push(this);
  }
  params.resizable = Common.isUndefined(params.parent) && params.resizable;
  if (params.autoPlace && Common.isUndefined(params.scrollable)) {
    params.scrollable = true;
  }
  var useLocalStorage = SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(this, 'isLocal')) === 'true';
  var saveToLocalStorage = undefined;
  var titleRow = undefined;
  Object.defineProperties(this,
  {
    parent: {
      get: function get$$1() {
        return params.parent;
      }
    },
    scrollable: {
      get: function get$$1() {
        return params.scrollable;
      }
    },
    autoPlace: {
      get: function get$$1() {
        return params.autoPlace;
      }
    },
    closeOnTop: {
      get: function get$$1() {
        return params.closeOnTop;
      }
    },
    preset: {
      get: function get$$1() {
        if (_this.parent) {
          return _this.getRoot().preset;
        }
        return params.load.preset;
      },
      set: function set$$1(v) {
        if (_this.parent) {
          _this.getRoot().preset = v;
        } else {
          params.load.preset = v;
        }
        setPresetSelectIndex(this);
        _this.revert();
      }
    },
    width: {
      get: function get$$1() {
        return params.width;
      },
      set: function set$$1(v) {
        params.width = v;
        setWidth(_this, v);
      }
    },
    name: {
      get: function get$$1() {
        return params.name;
      },
      set: function set$$1(v) {
        params.name = v;
        if (titleRow) {
          titleRow.innerHTML = params.name;
        }
      }
    },
    closed: {
      get: function get$$1() {
        return params.closed;
      },
      set: function set$$1(v) {
        params.closed = v;
        if (params.closed) {
          dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
        } else {
          dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
        }
        this.onResize();
        if (_this.__closeButton) {
          _this.__closeButton.innerHTML = v ? GUI.TEXT_OPEN : GUI.TEXT_CLOSED;
        }
      }
    },
    load: {
      get: function get$$1() {
        return params.load;
      }
    },
    useLocalStorage: {
      get: function get$$1() {
        return useLocalStorage;
      },
      set: function set$$1(bool) {
        if (SUPPORTS_LOCAL_STORAGE) {
          useLocalStorage = bool;
          if (bool) {
            dom.bind(window, 'unload', saveToLocalStorage);
          } else {
            dom.unbind(window, 'unload', saveToLocalStorage);
          }
          localStorage.setItem(getLocalStorageHash(_this, 'isLocal'), bool);
        }
      }
    }
  });
  if (Common.isUndefined(params.parent)) {
    this.closed = params.closed || false;
    dom.addClass(this.domElement, GUI.CLASS_MAIN);
    dom.makeSelectable(this.domElement, false);
    if (SUPPORTS_LOCAL_STORAGE) {
      if (useLocalStorage) {
        _this.useLocalStorage = true;
        var savedGui = localStorage.getItem(getLocalStorageHash(this, 'gui'));
        if (savedGui) {
          params.load = JSON.parse(savedGui);
        }
      }
    }
    this.__closeButton = document.createElement('div');
    this.__closeButton.innerHTML = GUI.TEXT_CLOSED;
    dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BUTTON);
    if (params.closeOnTop) {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_TOP);
      this.domElement.insertBefore(this.__closeButton, this.domElement.childNodes[0]);
    } else {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BOTTOM);
      this.domElement.appendChild(this.__closeButton);
    }
    dom.bind(this.__closeButton, 'click', function () {
      _this.closed = !_this.closed;
    });
  } else {
    if (params.closed === undefined) {
      params.closed = true;
    }
    var titleRowName = document.createTextNode(params.name);
    dom.addClass(titleRowName, 'controller-name');
    titleRow = addRow(_this, titleRowName);
    var onClickTitle = function onClickTitle(e) {
      e.preventDefault();
      _this.closed = !_this.closed;
      return false;
    };
    dom.addClass(this.__ul, GUI.CLASS_CLOSED);
    dom.addClass(titleRow, 'title');
    dom.bind(titleRow, 'click', onClickTitle);
    if (!params.closed) {
      this.closed = false;
    }
  }
  if (params.autoPlace) {
    if (Common.isUndefined(params.parent)) {
      if (autoPlaceVirgin) {
        autoPlaceContainer = document.createElement('div');
        dom.addClass(autoPlaceContainer, CSS_NAMESPACE);
        dom.addClass(autoPlaceContainer, GUI.CLASS_AUTO_PLACE_CONTAINER);
        document.body.appendChild(autoPlaceContainer);
        autoPlaceVirgin = false;
      }
      autoPlaceContainer.appendChild(this.domElement);
      dom.addClass(this.domElement, GUI.CLASS_AUTO_PLACE);
    }
    if (!this.parent) {
      setWidth(_this, params.width);
    }
  }
  this.__resizeHandler = function () {
    _this.onResizeDebounced();
  };
  dom.bind(window, 'resize', this.__resizeHandler);
  dom.bind(this.__ul, 'webkitTransitionEnd', this.__resizeHandler);
  dom.bind(this.__ul, 'transitionend', this.__resizeHandler);
  dom.bind(this.__ul, 'oTransitionEnd', this.__resizeHandler);
  this.onResize();
  if (params.resizable) {
    addResizeHandle(this);
  }
  saveToLocalStorage = function saveToLocalStorage() {
    if (SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(_this, 'isLocal')) === 'true') {
      localStorage.setItem(getLocalStorageHash(_this, 'gui'), JSON.stringify(_this.getSaveObject()));
    }
  };
  this.saveToLocalStorageIfPossible = saveToLocalStorage;
  function resetWidth() {
    var root = _this.getRoot();
    root.width += 1;
    Common.defer(function () {
      root.width -= 1;
    });
  }
  if (!params.parent) {
    resetWidth();
  }
};
GUI.toggleHide = function () {
  hide = !hide;
  Common.each(hideableGuis, function (gui) {
    gui.domElement.style.display = hide ? 'none' : '';
  });
};
GUI.CLASS_AUTO_PLACE = 'a';
GUI.CLASS_AUTO_PLACE_CONTAINER = 'ac';
GUI.CLASS_MAIN = 'main';
GUI.CLASS_CONTROLLER_ROW = 'cr';
GUI.CLASS_TOO_TALL = 'taller-than-window';
GUI.CLASS_CLOSED = 'closed';
GUI.CLASS_CLOSE_BUTTON = 'close-button';
GUI.CLASS_CLOSE_TOP = 'close-top';
GUI.CLASS_CLOSE_BOTTOM = 'close-bottom';
GUI.CLASS_DRAG = 'drag';
GUI.DEFAULT_WIDTH = 245;
GUI.TEXT_CLOSED = 'Close Controls';
GUI.TEXT_OPEN = 'Open Controls';
GUI._keydownHandler = function (e) {
  if (document.activeElement.type !== 'text' && (e.which === HIDE_KEY_CODE || e.keyCode === HIDE_KEY_CODE)) {
    GUI.toggleHide();
  }
};
dom.bind(window, 'keydown', GUI._keydownHandler, false);
Common.extend(GUI.prototype,
{
  add: function add(object, property) {
    return _add(this, object, property, {
      factoryArgs: Array.prototype.slice.call(arguments, 2)
    });
  },
  addColor: function addColor(object, property) {
    return _add(this, object, property, {
      color: true
    });
  },
  remove: function remove(controller) {
    this.__ul.removeChild(controller.__li);
    this.__controllers.splice(this.__controllers.indexOf(controller), 1);
    var _this = this;
    Common.defer(function () {
      _this.onResize();
    });
  },
  destroy: function destroy() {
    if (this.parent) {
      throw new Error('Only the root GUI should be removed with .destroy(). ' + 'For subfolders, use gui.removeFolder(folder) instead.');
    }
    if (this.autoPlace) {
      autoPlaceContainer.removeChild(this.domElement);
    }
    var _this = this;
    Common.each(this.__folders, function (subfolder) {
      _this.removeFolder(subfolder);
    });
    dom.unbind(window, 'keydown', GUI._keydownHandler, false);
    removeListeners(this);
  },
  addFolder: function addFolder(name) {
    if (this.__folders[name] !== undefined) {
      throw new Error('You already have a folder in this GUI by the' + ' name "' + name + '"');
    }
    var newGuiParams = { name: name, parent: this };
    newGuiParams.autoPlace = this.autoPlace;
    if (this.load &&
    this.load.folders &&
    this.load.folders[name]) {
      newGuiParams.closed = this.load.folders[name].closed;
      newGuiParams.load = this.load.folders[name];
    }
    var gui = new GUI(newGuiParams);
    this.__folders[name] = gui;
    var li = addRow(this, gui.domElement);
    dom.addClass(li, 'folder');
    return gui;
  },
  removeFolder: function removeFolder(folder) {
    this.__ul.removeChild(folder.domElement.parentElement);
    delete this.__folders[folder.name];
    if (this.load &&
    this.load.folders &&
    this.load.folders[folder.name]) {
      delete this.load.folders[folder.name];
    }
    removeListeners(folder);
    var _this = this;
    Common.each(folder.__folders, function (subfolder) {
      folder.removeFolder(subfolder);
    });
    Common.defer(function () {
      _this.onResize();
    });
  },
  open: function open() {
    this.closed = false;
  },
  close: function close() {
    this.closed = true;
  },
  hide: function hide() {
    this.domElement.style.display = 'none';
  },
  show: function show() {
    this.domElement.style.display = '';
  },
  onResize: function onResize() {
    var root = this.getRoot();
    if (root.scrollable) {
      var top = dom.getOffset(root.__ul).top;
      var h = 0;
      Common.each(root.__ul.childNodes, function (node) {
        if (!(root.autoPlace && node === root.__save_row)) {
          h += dom.getHeight(node);
        }
      });
      if (window.innerHeight - top - CLOSE_BUTTON_HEIGHT < h) {
        dom.addClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = window.innerHeight - top - CLOSE_BUTTON_HEIGHT + 'px';
      } else {
        dom.removeClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = 'auto';
      }
    }
    if (root.__resize_handle) {
      Common.defer(function () {
        root.__resize_handle.style.height = root.__ul.offsetHeight + 'px';
      });
    }
    if (root.__closeButton) {
      root.__closeButton.style.width = root.width + 'px';
    }
  },
  onResizeDebounced: Common.debounce(function () {
    this.onResize();
  }, 50),
  remember: function remember() {
    if (Common.isUndefined(SAVE_DIALOGUE)) {
      SAVE_DIALOGUE = new CenteredDiv();
      SAVE_DIALOGUE.domElement.innerHTML = saveDialogContents;
    }
    if (this.parent) {
      throw new Error('You can only call remember on a top level GUI.');
    }
    var _this = this;
    Common.each(Array.prototype.slice.call(arguments), function (object) {
      if (_this.__rememberedObjects.length === 0) {
        addSaveMenu(_this);
      }
      if (_this.__rememberedObjects.indexOf(object) === -1) {
        _this.__rememberedObjects.push(object);
      }
    });
    if (this.autoPlace) {
      setWidth(this, this.width);
    }
  },
  getRoot: function getRoot() {
    var gui = this;
    while (gui.parent) {
      gui = gui.parent;
    }
    return gui;
  },
  getSaveObject: function getSaveObject() {
    var toReturn = this.load;
    toReturn.closed = this.closed;
    if (this.__rememberedObjects.length > 0) {
      toReturn.preset = this.preset;
      if (!toReturn.remembered) {
        toReturn.remembered = {};
      }
      toReturn.remembered[this.preset] = getCurrentPreset(this);
    }
    toReturn.folders = {};
    Common.each(this.__folders, function (element, key) {
      toReturn.folders[key] = element.getSaveObject();
    });
    return toReturn;
  },
  save: function save() {
    if (!this.load.remembered) {
      this.load.remembered = {};
    }
    this.load.remembered[this.preset] = getCurrentPreset(this);
    markPresetModified(this, false);
    this.saveToLocalStorageIfPossible();
  },
  saveAs: function saveAs(presetName) {
    if (!this.load.remembered) {
      this.load.remembered = {};
      this.load.remembered[DEFAULT_DEFAULT_PRESET_NAME] = getCurrentPreset(this, true);
    }
    this.load.remembered[presetName] = getCurrentPreset(this);
    this.preset = presetName;
    addPresetOption(this, presetName, true);
    this.saveToLocalStorageIfPossible();
  },
  revert: function revert(gui) {
    Common.each(this.__controllers, function (controller) {
      if (!this.getRoot().load.remembered) {
        controller.setValue(controller.initialValue);
      } else {
        recallSavedValue(gui || this.getRoot(), controller);
      }
      if (controller.__onFinishChange) {
        controller.__onFinishChange.call(controller, controller.getValue());
      }
    }, this);
    Common.each(this.__folders, function (folder) {
      folder.revert(folder);
    });
    if (!gui) {
      markPresetModified(this.getRoot(), false);
    }
  },
  listen: function listen(controller) {
    var init = this.__listening.length === 0;
    this.__listening.push(controller);
    if (init) {
      updateDisplays(this.__listening);
    }
  },
  updateDisplay: function updateDisplay() {
    Common.each(this.__controllers, function (controller) {
      controller.updateDisplay();
    });
    Common.each(this.__folders, function (folder) {
      folder.updateDisplay();
    });
  }
});
function addRow(gui, newDom, liBefore) {
  var li = document.createElement('li');
  if (newDom) {
    li.appendChild(newDom);
  }
  if (liBefore) {
    gui.__ul.insertBefore(li, liBefore);
  } else {
    gui.__ul.appendChild(li);
  }
  gui.onResize();
  return li;
}
function removeListeners(gui) {
  dom.unbind(window, 'resize', gui.__resizeHandler);
  if (gui.saveToLocalStorageIfPossible) {
    dom.unbind(window, 'unload', gui.saveToLocalStorageIfPossible);
  }
}
function markPresetModified(gui, modified) {
  var opt = gui.__preset_select[gui.__preset_select.selectedIndex];
  if (modified) {
    opt.innerHTML = opt.value + '*';
  } else {
    opt.innerHTML = opt.value;
  }
}
function augmentController(gui, li, controller) {
  controller.__li = li;
  controller.__gui = gui;
  Common.extend(controller, {
    options: function options(_options) {
      if (arguments.length > 1) {
        var nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: nextSibling,
          factoryArgs: [Common.toArray(arguments)]
        });
      }
      if (Common.isArray(_options) || Common.isObject(_options)) {
        var _nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: _nextSibling,
          factoryArgs: [_options]
        });
      }
    },
    name: function name(_name) {
      controller.__li.firstElementChild.firstElementChild.innerHTML = _name;
      return controller;
    },
    listen: function listen() {
      controller.__gui.listen(controller);
      return controller;
    },
    remove: function remove() {
      controller.__gui.remove(controller);
      return controller;
    }
  });
  if (controller instanceof NumberControllerSlider) {
    var box = new NumberControllerBox(controller.object, controller.property, { min: controller.__min, max: controller.__max, step: controller.__step });
    Common.each(['updateDisplay', 'onChange', 'onFinishChange', 'step', 'min', 'max'], function (method) {
      var pc = controller[method];
      var pb = box[method];
      controller[method] = box[method] = function () {
        var args = Array.prototype.slice.call(arguments);
        pb.apply(box, args);
        return pc.apply(controller, args);
      };
    });
    dom.addClass(li, 'has-slider');
    controller.domElement.insertBefore(box.domElement, controller.domElement.firstElementChild);
  } else if (controller instanceof NumberControllerBox) {
    var r = function r(returned) {
      if (Common.isNumber(controller.__min) && Common.isNumber(controller.__max)) {
        var oldName = controller.__li.firstElementChild.firstElementChild.innerHTML;
        var wasListening = controller.__gui.__listening.indexOf(controller) > -1;
        controller.remove();
        var newController = _add(gui, controller.object, controller.property, {
          before: controller.__li.nextElementSibling,
          factoryArgs: [controller.__min, controller.__max, controller.__step]
        });
        newController.name(oldName);
        if (wasListening) newController.listen();
        return newController;
      }
      return returned;
    };
    controller.min = Common.compose(r, controller.min);
    controller.max = Common.compose(r, controller.max);
  } else if (controller instanceof BooleanController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__checkbox, 'click');
    });
    dom.bind(controller.__checkbox, 'click', function (e) {
      e.stopPropagation();
    });
  } else if (controller instanceof FunctionController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__button, 'click');
    });
    dom.bind(li, 'mouseover', function () {
      dom.addClass(controller.__button, 'hover');
    });
    dom.bind(li, 'mouseout', function () {
      dom.removeClass(controller.__button, 'hover');
    });
  } else if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
    controller.updateDisplay = Common.compose(function (val) {
      li.style.borderLeftColor = controller.__color.toString();
      return val;
    }, controller.updateDisplay);
    controller.updateDisplay();
  }
  controller.setValue = Common.compose(function (val) {
    if (gui.getRoot().__preset_select && controller.isModified()) {
      markPresetModified(gui.getRoot(), true);
    }
    return val;
  }, controller.setValue);
}
function recallSavedValue(gui, controller) {
  var root = gui.getRoot();
  var matchedIndex = root.__rememberedObjects.indexOf(controller.object);
  if (matchedIndex !== -1) {
    var controllerMap = root.__rememberedObjectIndecesToControllers[matchedIndex];
    if (controllerMap === undefined) {
      controllerMap = {};
      root.__rememberedObjectIndecesToControllers[matchedIndex] = controllerMap;
    }
    controllerMap[controller.property] = controller;
    if (root.load && root.load.remembered) {
      var presetMap = root.load.remembered;
      var preset = undefined;
      if (presetMap[gui.preset]) {
        preset = presetMap[gui.preset];
      } else if (presetMap[DEFAULT_DEFAULT_PRESET_NAME]) {
        preset = presetMap[DEFAULT_DEFAULT_PRESET_NAME];
      } else {
        return;
      }
      if (preset[matchedIndex] && preset[matchedIndex][controller.property] !== undefined) {
        var value = preset[matchedIndex][controller.property];
        controller.initialValue = value;
        controller.setValue(value);
      }
    }
  }
}
function _add(gui, object, property, params) {
  if (object[property] === undefined) {
    throw new Error('Object "' + object + '" has no property "' + property + '"');
  }
  var controller = undefined;
  if (params.color) {
    controller = new ColorController(object, property);
  } else {
    var factoryArgs = [object, property].concat(params.factoryArgs);
    controller = ControllerFactory.apply(gui, factoryArgs);
  }
  if (params.before instanceof Controller) {
    params.before = params.before.__li;
  }
  recallSavedValue(gui, controller);
  dom.addClass(controller.domElement, 'c');
  var name = document.createElement('span');
  dom.addClass(name, 'property-name');
  name.innerHTML = controller.property;
  var container = document.createElement('div');
  container.appendChild(name);
  container.appendChild(controller.domElement);
  var li = addRow(gui, container, params.before);
  dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
  if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
  } else {
    dom.addClass(li, _typeof(controller.getValue()));
  }
  augmentController(gui, li, controller);
  gui.__controllers.push(controller);
  return controller;
}
function getLocalStorageHash(gui, key) {
  return document.location.href + '.' + key;
}
function addPresetOption(gui, name, setSelected) {
  var opt = document.createElement('option');
  opt.innerHTML = name;
  opt.value = name;
  gui.__preset_select.appendChild(opt);
  if (setSelected) {
    gui.__preset_select.selectedIndex = gui.__preset_select.length - 1;
  }
}
function showHideExplain(gui, explain) {
  explain.style.display = gui.useLocalStorage ? 'block' : 'none';
}
function addSaveMenu(gui) {
  var div = gui.__save_row = document.createElement('li');
  dom.addClass(gui.domElement, 'has-save');
  gui.__ul.insertBefore(div, gui.__ul.firstChild);
  dom.addClass(div, 'save-row');
  var gears = document.createElement('span');
  gears.innerHTML = '&nbsp;';
  dom.addClass(gears, 'button gears');
  var button = document.createElement('span');
  button.innerHTML = 'Save';
  dom.addClass(button, 'button');
  dom.addClass(button, 'save');
  var button2 = document.createElement('span');
  button2.innerHTML = 'New';
  dom.addClass(button2, 'button');
  dom.addClass(button2, 'save-as');
  var button3 = document.createElement('span');
  button3.innerHTML = 'Revert';
  dom.addClass(button3, 'button');
  dom.addClass(button3, 'revert');
  var select = gui.__preset_select = document.createElement('select');
  if (gui.load && gui.load.remembered) {
    Common.each(gui.load.remembered, function (value, key) {
      addPresetOption(gui, key, key === gui.preset);
    });
  } else {
    addPresetOption(gui, DEFAULT_DEFAULT_PRESET_NAME, false);
  }
  dom.bind(select, 'change', function () {
    for (var index = 0; index < gui.__preset_select.length; index++) {
      gui.__preset_select[index].innerHTML = gui.__preset_select[index].value;
    }
    gui.preset = this.value;
  });
  div.appendChild(select);
  div.appendChild(gears);
  div.appendChild(button);
  div.appendChild(button2);
  div.appendChild(button3);
  if (SUPPORTS_LOCAL_STORAGE) {
    var explain = document.getElementById('dg-local-explain');
    var localStorageCheckBox = document.getElementById('dg-local-storage');
    var saveLocally = document.getElementById('dg-save-locally');
    saveLocally.style.display = 'block';
    if (localStorage.getItem(getLocalStorageHash(gui, 'isLocal')) === 'true') {
      localStorageCheckBox.setAttribute('checked', 'checked');
    }
    showHideExplain(gui, explain);
    dom.bind(localStorageCheckBox, 'change', function () {
      gui.useLocalStorage = !gui.useLocalStorage;
      showHideExplain(gui, explain);
    });
  }
  var newConstructorTextArea = document.getElementById('dg-new-constructor');
  dom.bind(newConstructorTextArea, 'keydown', function (e) {
    if (e.metaKey && (e.which === 67 || e.keyCode === 67)) {
      SAVE_DIALOGUE.hide();
    }
  });
  dom.bind(gears, 'click', function () {
    newConstructorTextArea.innerHTML = JSON.stringify(gui.getSaveObject(), undefined, 2);
    SAVE_DIALOGUE.show();
    newConstructorTextArea.focus();
    newConstructorTextArea.select();
  });
  dom.bind(button, 'click', function () {
    gui.save();
  });
  dom.bind(button2, 'click', function () {
    var presetName = prompt('Enter a new preset name.');
    if (presetName) {
      gui.saveAs(presetName);
    }
  });
  dom.bind(button3, 'click', function () {
    gui.revert();
  });
}
function addResizeHandle(gui) {
  var pmouseX = undefined;
  gui.__resize_handle = document.createElement('div');
  Common.extend(gui.__resize_handle.style, {
    width: '6px',
    marginLeft: '-3px',
    height: '200px',
    cursor: 'ew-resize',
    position: 'absolute'
  });
  function drag(e) {
    e.preventDefault();
    gui.width += pmouseX - e.clientX;
    gui.onResize();
    pmouseX = e.clientX;
    return false;
  }
  function dragStop() {
    dom.removeClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.unbind(window, 'mousemove', drag);
    dom.unbind(window, 'mouseup', dragStop);
  }
  function dragStart(e) {
    e.preventDefault();
    pmouseX = e.clientX;
    dom.addClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.bind(window, 'mousemove', drag);
    dom.bind(window, 'mouseup', dragStop);
    return false;
  }
  dom.bind(gui.__resize_handle, 'mousedown', dragStart);
  dom.bind(gui.__closeButton, 'mousedown', dragStart);
  gui.domElement.insertBefore(gui.__resize_handle, gui.domElement.firstElementChild);
}
function setWidth(gui, w) {
  gui.domElement.style.width = w + 'px';
  if (gui.__save_row && gui.autoPlace) {
    gui.__save_row.style.width = w + 'px';
  }
  if (gui.__closeButton) {
    gui.__closeButton.style.width = w + 'px';
  }
}
function getCurrentPreset(gui, useInitialValues) {
  var toReturn = {};
  Common.each(gui.__rememberedObjects, function (val, index) {
    var savedValues = {};
    var controllerMap = gui.__rememberedObjectIndecesToControllers[index];
    Common.each(controllerMap, function (controller, property) {
      savedValues[property] = useInitialValues ? controller.initialValue : controller.getValue();
    });
    toReturn[index] = savedValues;
  });
  return toReturn;
}
function setPresetSelectIndex(gui) {
  for (var index = 0; index < gui.__preset_select.length; index++) {
    if (gui.__preset_select[index].value === gui.preset) {
      gui.__preset_select.selectedIndex = index;
    }
  }
}
function updateDisplays(controllerArray) {
  if (controllerArray.length !== 0) {
    requestAnimationFrame$1$1.call(window, function () {
      updateDisplays(controllerArray);
    });
  }
  Common.each(controllerArray, function (c) {
    c.updateDisplay();
  });
}
var GUI$1 = GUI;

/** Shows an error dialog if getting an adapter wasn't successful. */
function quitIfAdapterNotAvailable(adapter) {
    if (!('gpu' in navigator)) {
        fail('navigator.gpu is not defined - WebGPU not available in this browser');
    }
    if (!adapter) {
        fail("requestAdapter returned null - this sample can't run on this system");
    }
}
/**
 * Shows an error dialog if getting a adapter or device wasn't successful,
 * or if/when the device is lost or has an uncaptured error.
 */
function quitIfWebGPUNotAvailable(adapter, device) {
    if (!device) {
        quitIfAdapterNotAvailable(adapter);
        fail('Unable to get a device for an unknown reason');
        return;
    }
    device.lost.then((reason) => {
        fail(`Device lost ("${reason.reason}"):\n${reason.message}`);
    });
    device.onuncapturederror = (ev) => {
        fail(`Uncaptured error:\n${ev.error.message}`);
    };
}
/** Fail by showing a console error, and dialog box if possible. */
const fail = (() => {
    function createErrorOutput() {
        if (typeof document === 'undefined') {
            // Not implemented in workers.
            return {
                show(msg) {
                    console.error(msg);
                },
            };
        }
        const dialogBox = document.createElement('dialog');
        dialogBox.close();
        document.body.append(dialogBox);
        const dialogText = document.createElement('pre');
        dialogText.style.whiteSpace = 'pre-wrap';
        dialogBox.append(dialogText);
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'OK';
        closeBtn.onclick = () => dialogBox.close();
        dialogBox.append(closeBtn);
        return {
            show(msg) {
                // Don't overwrite the dialog message while it's still open
                // (show the first error, not the most recent error).
                if (!dialogBox.open) {
                    dialogText.textContent = msg;
                    dialogBox.showModal();
                }
            },
        };
    }
    let output;
    return (message) => {
        if (!output)
            output = createErrorOutput();
        output.show(message);
        throw new Error(message);
    };
})();

var teapot = {};

teapot.positions=[[5.929688,4.125,0],[5.387188,4.125,2.7475],[5.2971,4.494141,2.70917],[5.832031,4.494141,0],[5.401602,4.617188,2.753633],[5.945313,4.617188,0],[5.614209,4.494141,2.844092],[6.175781,4.494141,0],[5.848437,4.125,2.94375],[6.429688,4.125,0],[3.899688,4.125,4.97],[3.830352,4.494141,4.900664],[3.910782,4.617188,4.981094],[4.074414,4.494141,5.144727],[4.254687,4.125,5.325],[1.677188,4.125,6.4575],[1.638858,4.494141,6.367412],[1.68332,4.617188,6.471914],[1.77378,4.494141,6.684522],[1.873438,4.125,6.91875],[-1.070312,4.125,7],[-1.070312,4.494141,6.902344],[-1.070312,4.617188,7.015625],[-1.070312,4.494141,7.246094],[-1.070312,4.125,7.5],[-1.070312,4.125,7],[-4.007656,4.125,6.4575],[-3.859572,4.494141,6.367412],[-1.070312,4.494141,6.902344],[-3.847676,4.617188,6.471914],[-1.070312,4.617188,7.015625],[-3.917371,4.494141,6.684522],[-1.070312,4.494141,7.246094],[-4.014062,4.125,6.91875],[-1.070312,4.125,7.5],[-6.209063,4.125,4.97],[-6.042168,4.494141,4.900664],[-6.0725,4.617188,4.981094],[-6.217675,4.494141,5.144727],[-6.395312,4.125,5.325],[-7.591093,4.125,2.7475],[-7.464421,4.494141,2.70917],[-7.550137,4.617188,2.753633],[-7.755822,4.494141,2.844092],[-7.989062,4.125,2.94375],[-8.070313,4.125,0],[-7.972656,4.494141,0],[-8.085938,4.617188,0],[-8.316406,4.494141,0],[-8.570313,4.125,0],[-8.070313,4.125,0],[-7.527812,4.125,-2.7475],[-7.437724,4.494141,-2.70917],[-7.972656,4.494141,0],[-7.542227,4.617188,-2.753633],[-8.085938,4.617188,0],[-7.754834,4.494141,-2.844092],[-8.316406,4.494141,0],[-7.989062,4.125,-2.94375],[-8.570313,4.125,0],[-6.040312,4.125,-4.97],[-5.970977,4.494141,-4.900664],[-6.051406,4.617188,-4.981094],[-6.215039,4.494141,-5.144727],[-6.395312,4.125,-5.325],[-3.817812,4.125,-6.4575],[-3.779482,4.494141,-6.367412],[-3.823945,4.617188,-6.471914],[-3.914404,4.494141,-6.684522],[-4.014062,4.125,-6.91875],[-1.070312,4.125,-7],[-1.070312,4.494141,-6.902344],[-1.070312,4.617188,-7.015625],[-1.070312,4.494141,-7.246094],[-1.070312,4.125,-7.5],[-1.070312,4.125,-7],[1.677188,4.125,-6.4575],[1.638858,4.494141,-6.367412],[-1.070312,4.494141,-6.902344],[1.68332,4.617188,-6.471914],[-1.070312,4.617188,-7.015625],[1.77378,4.494141,-6.684522],[-1.070312,4.494141,-7.246094],[1.873438,4.125,-6.91875],[-1.070312,4.125,-7.5],[3.899688,4.125,-4.97],[3.830352,4.494141,-4.900664],[3.910782,4.617188,-4.981094],[4.074414,4.494141,-5.144727],[4.254687,4.125,-5.325],[5.387188,4.125,-2.7475],[5.2971,4.494141,-2.70917],[5.401602,4.617188,-2.753633],[5.614209,4.494141,-2.844092],[5.848437,4.125,-2.94375],[5.929688,4.125,0],[5.832031,4.494141,0],[5.945313,4.617188,0],[6.175781,4.494141,0],[6.429688,4.125,0],[6.429688,4.125,0],[5.848437,4.125,2.94375],[6.695264,2.162109,3.304053],[7.347656,2.162109,0],[7.433985,0.234375,3.61836],[8.148438,0.234375,0],[7.956494,-1.623047,3.840674],[8.714844,-1.623047,0],[8.154688,-3.375,3.925],[8.929688,-3.375,0],[4.254687,4.125,5.325],[4.906446,2.162109,5.976758],[5.475,0.234375,6.545312],[5.877149,-1.623047,6.947461],[6.029688,-3.375,7.1],[1.873438,4.125,6.91875],[2.23374,2.162109,7.765576],[2.548047,0.234375,8.504297],[2.770362,-1.623047,9.026807],[2.854688,-3.375,9.225],[-1.070312,4.125,7.5],[-1.070312,2.162109,8.417969],[-1.070312,0.234375,9.21875],[-1.070312,-1.623047,9.785156],[-1.070312,-3.375,10],[-1.070312,4.125,7.5],[-4.014062,4.125,6.91875],[-4.374365,2.162109,7.765576],[-1.070312,2.162109,8.417969],[-4.688672,0.234375,8.504297],[-1.070312,0.234375,9.21875],[-4.910986,-1.623047,9.026807],[-1.070312,-1.623047,9.785156],[-4.995313,-3.375,9.225],[-1.070312,-3.375,10],[-6.395312,4.125,5.325],[-7.047071,2.162109,5.976758],[-7.615624,0.234375,6.545312],[-8.017773,-1.623047,6.947461],[-8.170312,-3.375,7.1],[-7.989062,4.125,2.94375],[-8.835889,2.162109,3.304053],[-9.57461,0.234375,3.61836],[-10.097119,-1.623047,3.840674],[-10.295313,-3.375,3.925],[-8.570313,4.125,0],[-9.488281,2.162109,0],[-10.289063,0.234375,0],[-10.855469,-1.623047,0],[-11.070313,-3.375,0],[-8.570313,4.125,0],[-7.989062,4.125,-2.94375],[-8.835889,2.162109,-3.304053],[-9.488281,2.162109,0],[-9.57461,0.234375,-3.61836],[-10.289063,0.234375,0],[-10.097119,-1.623047,-3.840674],[-10.855469,-1.623047,0],[-10.295313,-3.375,-3.925],[-11.070313,-3.375,0],[-6.395312,4.125,-5.325],[-7.047071,2.162109,-5.976758],[-7.615624,0.234375,-6.545312],[-8.017773,-1.623047,-6.947461],[-8.170312,-3.375,-7.1],[-4.014062,4.125,-6.91875],[-4.374365,2.162109,-7.765576],[-4.688672,0.234375,-8.504297],[-4.910986,-1.623047,-9.026807],[-4.995313,-3.375,-9.225],[-1.070312,4.125,-7.5],[-1.070312,2.162109,-8.417969],[-1.070312,0.234375,-9.21875],[-1.070312,-1.623047,-9.785156],[-1.070312,-3.375,-10],[-1.070312,4.125,-7.5],[1.873438,4.125,-6.91875],[2.23374,2.162109,-7.765576],[-1.070312,2.162109,-8.417969],[2.548047,0.234375,-8.504297],[-1.070312,0.234375,-9.21875],[2.770362,-1.623047,-9.026807],[-1.070312,-1.623047,-9.785156],[2.854688,-3.375,-9.225],[-1.070312,-3.375,-10],[4.254687,4.125,-5.325],[4.906446,2.162109,-5.976758],[5.475,0.234375,-6.545312],[5.877149,-1.623047,-6.947461],[6.029688,-3.375,-7.1],[5.848437,4.125,-2.94375],[6.695264,2.162109,-3.304053],[7.433985,0.234375,-3.61836],[7.956494,-1.623047,-3.840674],[8.154688,-3.375,-3.925],[6.429688,4.125,0],[7.347656,2.162109,0],[8.148438,0.234375,0],[8.714844,-1.623047,0],[8.929688,-3.375,0],[8.929688,-3.375,0],[8.154688,-3.375,3.925],[7.794336,-4.857422,3.77168],[8.539063,-4.857422,0],[7.001562,-5.953125,3.434375],[7.679688,-5.953125,0],[6.208789,-6.697266,3.09707],[6.820313,-6.697266,0],[5.848437,-7.125,2.94375],[6.429688,-7.125,0],[6.029688,-3.375,7.1],[5.752343,-4.857422,6.822656],[5.142187,-5.953125,6.2125],[4.532031,-6.697266,5.602344],[4.254687,-7.125,5.325],[2.854688,-3.375,9.225],[2.701367,-4.857422,8.864649],[2.364063,-5.953125,8.071875],[2.026758,-6.697266,7.279101],[1.873438,-7.125,6.91875],[-1.070312,-3.375,10],[-1.070312,-4.857422,9.609375],[-1.070312,-5.953125,8.75],[-1.070312,-6.697266,7.890625],[-1.070312,-7.125,7.5],[-1.070312,-3.375,10],[-4.995313,-3.375,9.225],[-4.841992,-4.857422,8.864649],[-1.070312,-4.857422,9.609375],[-4.504687,-5.953125,8.071875],[-1.070312,-5.953125,8.75],[-4.167383,-6.697266,7.279101],[-1.070312,-6.697266,7.890625],[-4.014062,-7.125,6.91875],[-1.070312,-7.125,7.5],[-8.170312,-3.375,7.1],[-7.892968,-4.857422,6.822656],[-7.282812,-5.953125,6.2125],[-6.672656,-6.697266,5.602344],[-6.395312,-7.125,5.325],[-10.295313,-3.375,3.925],[-9.934961,-4.857422,3.77168],[-9.142187,-5.953125,3.434375],[-8.349414,-6.697266,3.09707],[-7.989062,-7.125,2.94375],[-11.070313,-3.375,0],[-10.679688,-4.857422,0],[-9.820313,-5.953125,0],[-8.960938,-6.697266,0],[-8.570313,-7.125,0],[-11.070313,-3.375,0],[-10.295313,-3.375,-3.925],[-9.934961,-4.857422,-3.77168],[-10.679688,-4.857422,0],[-9.142187,-5.953125,-3.434375],[-9.820313,-5.953125,0],[-8.349414,-6.697266,-3.09707],[-8.960938,-6.697266,0],[-7.989062,-7.125,-2.94375],[-8.570313,-7.125,0],[-8.170312,-3.375,-7.1],[-7.892968,-4.857422,-6.822656],[-7.282812,-5.953125,-6.2125],[-6.672656,-6.697266,-5.602344],[-6.395312,-7.125,-5.325],[-4.995313,-3.375,-9.225],[-4.841992,-4.857422,-8.864649],[-4.504687,-5.953125,-8.071875],[-4.167383,-6.697266,-7.279101],[-4.014062,-7.125,-6.91875],[-1.070312,-3.375,-10],[-1.070312,-4.857422,-9.609375],[-1.070312,-5.953125,-8.75],[-1.070312,-6.697266,-7.890625],[-1.070312,-7.125,-7.5],[-1.070312,-3.375,-10],[2.854688,-3.375,-9.225],[2.701367,-4.857422,-8.864649],[-1.070312,-4.857422,-9.609375],[2.364063,-5.953125,-8.071875],[-1.070312,-5.953125,-8.75],[2.026758,-6.697266,-7.279101],[-1.070312,-6.697266,-7.890625],[1.873438,-7.125,-6.91875],[-1.070312,-7.125,-7.5],[6.029688,-3.375,-7.1],[5.752343,-4.857422,-6.822656],[5.142187,-5.953125,-6.2125],[4.532031,-6.697266,-5.602344],[4.254687,-7.125,-5.325],[8.154688,-3.375,-3.925],[7.794336,-4.857422,-3.77168],[7.001562,-5.953125,-3.434375],[6.208789,-6.697266,-3.09707],[5.848437,-7.125,-2.94375],[8.929688,-3.375,0],[8.539063,-4.857422,0],[7.679688,-5.953125,0],[6.820313,-6.697266,0],[6.429688,-7.125,0],[6.429688,-7.125,0],[5.848437,-7.125,2.94375],[5.691685,-7.400391,2.877056],[6.259766,-7.400391,0],[4.853868,-7.640625,2.520586],[5.351563,-7.640625,0],[2.783648,-7.810547,1.639761],[3.107422,-7.810547,0],[-1.070312,-7.875,0],[4.254687,-7.125,5.325],[4.134043,-7.400391,5.204355],[3.489219,-7.640625,4.559531],[1.895879,-7.810547,2.966191],[-1.070312,-7.875,0],[1.873438,-7.125,6.91875],[1.806743,-7.400391,6.761997],[1.450274,-7.640625,5.92418],[0.569448,-7.810547,3.85396],[-1.070312,-7.875,0],[-1.070312,-7.125,7.5],[-1.070312,-7.400391,7.330078],[-1.070312,-7.640625,6.421875],[-1.070312,-7.810547,4.177734],[-1.070312,-7.875,0],[-1.070312,-7.125,7.5],[-4.014062,-7.125,6.91875],[-3.947368,-7.400391,6.761997],[-1.070312,-7.400391,7.330078],[-3.590898,-7.640625,5.92418],[-1.070312,-7.640625,6.421875],[-2.710073,-7.810547,3.85396],[-1.070312,-7.810547,4.177734],[-1.070312,-7.875,0],[-6.395312,-7.125,5.325],[-6.274668,-7.400391,5.204355],[-5.629844,-7.640625,4.559531],[-4.036504,-7.810547,2.966191],[-1.070312,-7.875,0],[-7.989062,-7.125,2.94375],[-7.832309,-7.400391,2.877056],[-6.994492,-7.640625,2.520586],[-4.924272,-7.810547,1.639761],[-1.070312,-7.875,0],[-8.570313,-7.125,0],[-8.400391,-7.400391,0],[-7.492188,-7.640625,0],[-5.248047,-7.810547,0],[-1.070312,-7.875,0],[-8.570313,-7.125,0],[-7.989062,-7.125,-2.94375],[-7.832309,-7.400391,-2.877056],[-8.400391,-7.400391,0],[-6.994492,-7.640625,-2.520586],[-7.492188,-7.640625,0],[-4.924272,-7.810547,-1.639761],[-5.248047,-7.810547,0],[-1.070312,-7.875,0],[-6.395312,-7.125,-5.325],[-6.274668,-7.400391,-5.204355],[-5.629844,-7.640625,-4.559531],[-4.036504,-7.810547,-2.966191],[-1.070312,-7.875,0],[-4.014062,-7.125,-6.91875],[-3.947368,-7.400391,-6.761997],[-3.590898,-7.640625,-5.92418],[-2.710073,-7.810547,-3.85396],[-1.070312,-7.875,0],[-1.070312,-7.125,-7.5],[-1.070312,-7.400391,-7.330078],[-1.070312,-7.640625,-6.421875],[-1.070312,-7.810547,-4.177734],[-1.070312,-7.875,0],[-1.070312,-7.125,-7.5],[1.873438,-7.125,-6.91875],[1.806743,-7.400391,-6.761997],[-1.070312,-7.400391,-7.330078],[1.450274,-7.640625,-5.92418],[-1.070312,-7.640625,-6.421875],[0.569448,-7.810547,-3.85396],[-1.070312,-7.810547,-4.177734],[-1.070312,-7.875,0],[4.254687,-7.125,-5.325],[4.134043,-7.400391,-5.204355],[3.489219,-7.640625,-4.559531],[1.895879,-7.810547,-2.966191],[-1.070312,-7.875,0],[5.848437,-7.125,-2.94375],[5.691685,-7.400391,-2.877056],[4.853868,-7.640625,-2.520586],[2.783648,-7.810547,-1.639761],[-1.070312,-7.875,0],[6.429688,-7.125,0],[6.259766,-7.400391,0],[5.351563,-7.640625,0],[3.107422,-7.810547,0],[-1.070312,-7.875,0],[-9.070313,2.25,0],[-8.992188,2.425781,0.84375],[-11.47583,2.405457,0.84375],[-11.40625,2.232422,0],[-13.298828,2.263184,0.84375],[-13.132813,2.109375,0],[-14.421631,1.877014,0.84375],[-14.203125,1.775391,0],[-14.804688,1.125,0.84375],[-14.570313,1.125,0],[-8.820313,2.8125,1.125],[-11.628906,2.786134,1.125],[-13.664063,2.601563,1.125],[-14.902344,2.100586,1.125],[-15.320313,1.125,1.125],[-8.648438,3.199219,0.84375],[-11.781982,3.166809,0.84375],[-14.029297,2.939941,0.84375],[-15.383057,2.324158,0.84375],[-15.835938,1.125,0.84375],[-8.570313,3.375,0],[-11.851563,3.339844,0],[-14.195313,3.09375,0],[-15.601563,2.425781,0],[-16.070313,1.125,0],[-8.570313,3.375,0],[-8.648438,3.199219,-0.84375],[-11.781982,3.166809,-0.84375],[-11.851563,3.339844,0],[-14.029297,2.939941,-0.84375],[-14.195313,3.09375,0],[-15.383057,2.324158,-0.84375],[-15.601563,2.425781,0],[-15.835938,1.125,-0.84375],[-16.070313,1.125,0],[-8.820313,2.8125,-1.125],[-11.628906,2.786134,-1.125],[-13.664063,2.601563,-1.125],[-14.902344,2.100586,-1.125],[-15.320313,1.125,-1.125],[-8.992188,2.425781,-0.84375],[-11.47583,2.405457,-0.84375],[-13.298828,2.263184,-0.84375],[-14.421631,1.877014,-0.84375],[-14.804688,1.125,-0.84375],[-9.070313,2.25,0],[-11.40625,2.232422,0],[-13.132813,2.109375,0],[-14.203125,1.775391,0],[-14.570313,1.125,0],[-14.570313,1.125,0],[-14.804688,1.125,0.84375],[-14.588013,0.00705,0.84375],[-14.375,0.105469,0],[-13.90918,-1.275146,0.84375],[-13.757813,-1.125,0],[-12.724976,-2.540863,0.84375],[-12.671875,-2.355469,0],[-10.992188,-3.609375,0.84375],[-11.070313,-3.375,0],[-15.320313,1.125,1.125],[-15.056641,-0.209473,1.125],[-14.242188,-1.605469,1.125],[-12.841797,-2.94873,1.125],[-10.820313,-4.125,1.125],[-15.835938,1.125,0.84375],[-15.525269,-0.425995,0.84375],[-14.575195,-1.935791,0.84375],[-12.958618,-3.356598,0.84375],[-10.648438,-4.640625,0.84375],[-16.070313,1.125,0],[-15.738281,-0.524414,0],[-14.726563,-2.085938,0],[-13.011719,-3.541992,0],[-10.570313,-4.875,0],[-16.070313,1.125,0],[-15.835938,1.125,-0.84375],[-15.525269,-0.425995,-0.84375],[-15.738281,-0.524414,0],[-14.575195,-1.935791,-0.84375],[-14.726563,-2.085938,0],[-12.958618,-3.356598,-0.84375],[-13.011719,-3.541992,0],[-10.648438,-4.640625,-0.84375],[-10.570313,-4.875,0],[-15.320313,1.125,-1.125],[-15.056641,-0.209473,-1.125],[-14.242188,-1.605469,-1.125],[-12.841797,-2.94873,-1.125],[-10.820313,-4.125,-1.125],[-14.804688,1.125,-0.84375],[-14.588013,0.00705,-0.84375],[-13.90918,-1.275146,-0.84375],[-12.724976,-2.540863,-0.84375],[-10.992188,-3.609375,-0.84375],[-14.570313,1.125,0],[-14.375,0.105469,0],[-13.757813,-1.125,0],[-12.671875,-2.355469,0],[-11.070313,-3.375,0],[7.429688,-0.75,0],[7.429688,-1.394531,1.85625],[10.01123,-0.677124,1.676074],[9.828125,-0.199219,0],[11.101563,0.84668,1.279688],[10.867188,1.125,0],[11.723145,2.629761,0.883301],[11.4375,2.730469,0],[12.898438,4.125,0.703125],[12.429688,4.125,0],[7.429688,-2.8125,2.475],[10.414063,-1.728516,2.234766],[11.617188,0.234375,1.70625],[12.351563,2.408203,1.177734],[13.929688,4.125,0.9375],[7.429688,-4.230469,1.85625],[10.816895,-2.779907,1.676074],[12.132813,-0.37793,1.279688],[12.97998,2.186646,0.883301],[14.960938,4.125,0.703125],[7.429688,-4.875,0],[11,-3.257813,0],[12.367188,-0.65625,0],[13.265625,2.085938,0],[15.429688,4.125,0],[7.429688,-4.875,0],[7.429688,-4.230469,-1.85625],[10.816895,-2.779907,-1.676074],[11,-3.257813,0],[12.132813,-0.37793,-1.279688],[12.367188,-0.65625,0],[12.97998,2.186646,-0.883301],[13.265625,2.085938,0],[14.960938,4.125,-0.703125],[15.429688,4.125,0],[7.429688,-2.8125,-2.475],[10.414063,-1.728516,-2.234766],[11.617188,0.234375,-1.70625],[12.351563,2.408203,-1.177734],[13.929688,4.125,-0.9375],[7.429688,-1.394531,-1.85625],[10.01123,-0.677124,-1.676074],[11.101563,0.84668,-1.279688],[11.723145,2.629761,-0.883301],[12.898438,4.125,-0.703125],[7.429688,-0.75,0],[9.828125,-0.199219,0],[10.867188,1.125,0],[11.4375,2.730469,0],[12.429688,4.125,0],[12.429688,4.125,0],[12.898438,4.125,0.703125],[13.291077,4.346237,0.65918],[12.789063,4.335938,0],[13.525879,4.422729,0.5625],[13.054688,4.40625,0],[13.532898,4.350357,0.46582],[13.132813,4.335938,0],[13.242188,4.125,0.421875],[12.929688,4.125,0],[13.929688,4.125,0.9375],[14.395508,4.368896,0.878906],[14.5625,4.458984,0.75],[14.413086,4.38208,0.621094],[13.929688,4.125,0.5625],[14.960938,4.125,0.703125],[15.499939,4.391556,0.65918],[15.599121,4.495239,0.5625],[15.293274,4.413804,0.46582],[14.617188,4.125,0.421875],[15.429688,4.125,0],[16.001953,4.401855,0],[16.070313,4.511719,0],[15.693359,4.428224,0],[14.929688,4.125,0],[15.429688,4.125,0],[14.960938,4.125,-0.703125],[15.499939,4.391556,-0.65918],[16.001953,4.401855,0],[15.599121,4.495239,-0.5625],[16.070313,4.511719,0],[15.293274,4.413804,-0.46582],[15.693359,4.428224,0],[14.617188,4.125,-0.421875],[14.929688,4.125,0],[13.929688,4.125,-0.9375],[14.395508,4.368896,-0.878906],[14.5625,4.458984,-0.75],[14.413086,4.38208,-0.621094],[13.929688,4.125,-0.5625],[12.898438,4.125,-0.703125],[13.291077,4.346237,-0.65918],[13.525879,4.422729,-0.5625],[13.532898,4.350357,-0.46582],[13.242188,4.125,-0.421875],[12.429688,4.125,0],[12.789063,4.335938,0],[13.054688,4.40625,0],[13.132813,4.335938,0],[12.929688,4.125,0],[0.501414,7.628906,0.670256],[0.632813,7.628906,0],[-1.070312,7.875,0],[0.429278,7.03125,0.639395],[0.554688,7.03125,0],[-0.162029,6.292969,0.38696],[-0.085937,6.292969,0],[-0.147812,5.625,0.3925],[-0.070312,5.625,0],[0.140489,7.628906,1.210801],[-1.070312,7.875,0],[0.084844,7.03125,1.155156],[-0.370879,6.292969,0.699434],[-0.360312,5.625,0.71],[-0.400056,7.628906,1.571726],[-1.070312,7.875,0],[-0.430918,7.03125,1.49959],[-0.683352,6.292969,0.908284],[-0.677812,5.625,0.9225],[-1.070312,7.628906,1.703125],[-1.070312,7.875,0],[-1.070312,7.03125,1.625],[-1.070312,6.292969,0.984375],[-1.070312,5.625,1],[-1.740569,7.628906,1.571726],[-1.070312,7.628906,1.703125],[-1.070312,7.875,0],[-1.709707,7.03125,1.49959],[-1.070312,7.03125,1.625],[-1.457273,6.292969,0.908284],[-1.070312,6.292969,0.984375],[-1.462812,5.625,0.9225],[-1.070312,5.625,1],[-2.281113,7.628906,1.210801],[-1.070312,7.875,0],[-2.225469,7.03125,1.155156],[-1.769746,6.292969,0.699434],[-1.780312,5.625,0.71],[-2.642038,7.628906,0.670256],[-1.070312,7.875,0],[-2.569902,7.03125,0.639395],[-1.978596,6.292969,0.38696],[-1.992812,5.625,0.3925],[-2.773438,7.628906,0],[-1.070312,7.875,0],[-2.695313,7.03125,0],[-2.054687,6.292969,0],[-2.070312,5.625,0],[-2.642038,7.628906,-0.670256],[-2.773438,7.628906,0],[-1.070312,7.875,0],[-2.569902,7.03125,-0.639395],[-2.695313,7.03125,0],[-1.978596,6.292969,-0.38696],[-2.054687,6.292969,0],[-1.992812,5.625,-0.3925],[-2.070312,5.625,0],[-2.281113,7.628906,-1.210801],[-1.070312,7.875,0],[-2.225469,7.03125,-1.155156],[-1.769746,6.292969,-0.699434],[-1.780312,5.625,-0.71],[-1.740569,7.628906,-1.571726],[-1.070312,7.875,0],[-1.709707,7.03125,-1.49959],[-1.457273,6.292969,-0.908284],[-1.462812,5.625,-0.9225],[-1.070312,7.628906,-1.703125],[-1.070312,7.875,0],[-1.070312,7.03125,-1.625],[-1.070312,6.292969,-0.984375],[-1.070312,5.625,-1],[-0.400056,7.628906,-1.571726],[-1.070312,7.628906,-1.703125],[-1.070312,7.875,0],[-0.430918,7.03125,-1.49959],[-1.070312,7.03125,-1.625],[-0.683352,6.292969,-0.908284],[-1.070312,6.292969,-0.984375],[-0.677812,5.625,-0.9225],[-1.070312,5.625,-1],[0.140489,7.628906,-1.210801],[-1.070312,7.875,0],[0.084844,7.03125,-1.155156],[-0.370879,6.292969,-0.699434],[-0.360312,5.625,-0.71],[0.501414,7.628906,-0.670256],[-1.070312,7.875,0],[0.429278,7.03125,-0.639395],[-0.162029,6.292969,-0.38696],[-0.147812,5.625,-0.3925],[0.632813,7.628906,0],[-1.070312,7.875,0],[0.554688,7.03125,0],[-0.085937,6.292969,0],[-0.070312,5.625,0],[-0.070312,5.625,0],[-0.147812,5.625,0.3925],[1.034141,5.179688,0.895391],[1.210938,5.179688,0],[2.735,4.875,1.619062],[3.054688,4.875,0],[4.262891,4.570313,2.26914],[4.710938,4.570313,0],[4.925938,4.125,2.55125],[5.429688,4.125,0],[-0.360312,5.625,0.71],[0.549375,5.179688,1.619688],[1.858438,4.875,2.92875],[3.034375,4.570313,4.104687],[3.544688,4.125,4.615],[-0.677812,5.625,0.9225],[-0.174922,5.179688,2.104453],[0.54875,4.875,3.805313],[1.198828,4.570313,5.333203],[1.480938,4.125,5.99625],[-1.070312,5.625,1],[-1.070312,5.179688,2.28125],[-1.070312,4.875,4.125],[-1.070312,4.570313,5.78125],[-1.070312,4.125,6.5],[-1.070312,5.625,1],[-1.462812,5.625,0.9225],[-1.965703,5.179688,2.104453],[-1.070312,5.179688,2.28125],[-2.689375,4.875,3.805313],[-1.070312,4.875,4.125],[-3.339453,4.570313,5.333203],[-1.070312,4.570313,5.78125],[-3.621562,4.125,5.99625],[-1.070312,4.125,6.5],[-1.780312,5.625,0.71],[-2.69,5.179688,1.619688],[-3.999062,4.875,2.92875],[-5.174999,4.570313,4.104687],[-5.685312,4.125,4.615],[-1.992812,5.625,0.3925],[-3.174765,5.179688,0.895391],[-4.875625,4.875,1.619062],[-6.403516,4.570313,2.26914],[-7.066563,4.125,2.55125],[-2.070312,5.625,0],[-3.351562,5.179688,0],[-5.195313,4.875,0],[-6.851563,4.570313,0],[-7.570313,4.125,0],[-2.070312,5.625,0],[-1.992812,5.625,-0.3925],[-3.174765,5.179688,-0.895391],[-3.351562,5.179688,0],[-4.875625,4.875,-1.619062],[-5.195313,4.875,0],[-6.403516,4.570313,-2.26914],[-6.851563,4.570313,0],[-7.066563,4.125,-2.55125],[-7.570313,4.125,0],[-1.780312,5.625,-0.71],[-2.69,5.179688,-1.619688],[-3.999062,4.875,-2.92875],[-5.174999,4.570313,-4.104687],[-5.685312,4.125,-4.615],[-1.462812,5.625,-0.9225],[-1.965703,5.179688,-2.104453],[-2.689375,4.875,-3.805313],[-3.339453,4.570313,-5.333203],[-3.621562,4.125,-5.99625],[-1.070312,5.625,-1],[-1.070312,5.179688,-2.28125],[-1.070312,4.875,-4.125],[-1.070312,4.570313,-5.78125],[-1.070312,4.125,-6.5],[-1.070312,5.625,-1],[-0.677812,5.625,-0.9225],[-0.174922,5.179688,-2.104453],[-1.070312,5.179688,-2.28125],[0.54875,4.875,-3.805313],[-1.070312,4.875,-4.125],[1.198828,4.570313,-5.333203],[-1.070312,4.570313,-5.78125],[1.480938,4.125,-5.99625],[-1.070312,4.125,-6.5],[-0.360312,5.625,-0.71],[0.549375,5.179688,-1.619688],[1.858438,4.875,-2.92875],[3.034375,4.570313,-4.104687],[3.544688,4.125,-4.615],[-0.147812,5.625,-0.3925],[1.034141,5.179688,-0.895391],[2.735,4.875,-1.619062],[4.262891,4.570313,-2.26914],[4.925938,4.125,-2.55125],[-0.070312,5.625,0],[1.210938,5.179688,0],[3.054688,4.875,0],[4.710938,4.570313,0],[5.429688,4.125,0]];
teapot.cells=[[0,1,2],[2,3,0],[3,2,4],[4,5,3],[5,4,6],[6,7,5],[7,6,8],[8,9,7],[1,10,11],[11,2,1],[2,11,12],[12,4,2],[4,12,13],[13,6,4],[6,13,14],[14,8,6],[10,15,16],[16,11,10],[11,16,17],[17,12,11],[12,17,18],[18,13,12],[13,18,19],[19,14,13],[15,20,21],[21,16,15],[16,21,22],[22,17,16],[17,22,23],[23,18,17],[18,23,24],[24,19,18],[25,26,27],[27,28,25],[28,27,29],[29,30,28],[30,29,31],[31,32,30],[32,31,33],[33,34,32],[26,35,36],[36,27,26],[27,36,37],[37,29,27],[29,37,38],[38,31,29],[31,38,39],[39,33,31],[35,40,41],[41,36,35],[36,41,42],[42,37,36],[37,42,43],[43,38,37],[38,43,44],[44,39,38],[40,45,46],[46,41,40],[41,46,47],[47,42,41],[42,47,48],[48,43,42],[43,48,49],[49,44,43],[50,51,52],[52,53,50],[53,52,54],[54,55,53],[55,54,56],[56,57,55],[57,56,58],[58,59,57],[51,60,61],[61,52,51],[52,61,62],[62,54,52],[54,62,63],[63,56,54],[56,63,64],[64,58,56],[60,65,66],[66,61,60],[61,66,67],[67,62,61],[62,67,68],[68,63,62],[63,68,69],[69,64,63],[65,70,71],[71,66,65],[66,71,72],[72,67,66],[67,72,73],[73,68,67],[68,73,74],[74,69,68],[75,76,77],[77,78,75],[78,77,79],[79,80,78],[80,79,81],[81,82,80],[82,81,83],[83,84,82],[76,85,86],[86,77,76],[77,86,87],[87,79,77],[79,87,88],[88,81,79],[81,88,89],[89,83,81],[85,90,91],[91,86,85],[86,91,92],[92,87,86],[87,92,93],[93,88,87],[88,93,94],[94,89,88],[90,95,96],[96,91,90],[91,96,97],[97,92,91],[92,97,98],[98,93,92],[93,98,99],[99,94,93],[100,101,102],[102,103,100],[103,102,104],[104,105,103],[105,104,106],[106,107,105],[107,106,108],[108,109,107],[101,110,111],[111,102,101],[102,111,112],[112,104,102],[104,112,113],[113,106,104],[106,113,114],[114,108,106],[110,115,116],[116,111,110],[111,116,117],[117,112,111],[112,117,118],[118,113,112],[113,118,119],[119,114,113],[115,120,121],[121,116,115],[116,121,122],[122,117,116],[117,122,123],[123,118,117],[118,123,124],[124,119,118],[125,126,127],[127,128,125],[128,127,129],[129,130,128],[130,129,131],[131,132,130],[132,131,133],[133,134,132],[126,135,136],[136,127,126],[127,136,137],[137,129,127],[129,137,138],[138,131,129],[131,138,139],[139,133,131],[135,140,141],[141,136,135],[136,141,142],[142,137,136],[137,142,143],[143,138,137],[138,143,144],[144,139,138],[140,145,146],[146,141,140],[141,146,147],[147,142,141],[142,147,148],[148,143,142],[143,148,149],[149,144,143],[150,151,152],[152,153,150],[153,152,154],[154,155,153],[155,154,156],[156,157,155],[157,156,158],[158,159,157],[151,160,161],[161,152,151],[152,161,162],[162,154,152],[154,162,163],[163,156,154],[156,163,164],[164,158,156],[160,165,166],[166,161,160],[161,166,167],[167,162,161],[162,167,168],[168,163,162],[163,168,169],[169,164,163],[165,170,171],[171,166,165],[166,171,172],[172,167,166],[167,172,173],[173,168,167],[168,173,174],[174,169,168],[175,176,177],[177,178,175],[178,177,179],[179,180,178],[180,179,181],[181,182,180],[182,181,183],[183,184,182],[176,185,186],[186,177,176],[177,186,187],[187,179,177],[179,187,188],[188,181,179],[181,188,189],[189,183,181],[185,190,191],[191,186,185],[186,191,192],[192,187,186],[187,192,193],[193,188,187],[188,193,194],[194,189,188],[190,195,196],[196,191,190],[191,196,197],[197,192,191],[192,197,198],[198,193,192],[193,198,199],[199,194,193],[200,201,202],[202,203,200],[203,202,204],[204,205,203],[205,204,206],[206,207,205],[207,206,208],[208,209,207],[201,210,211],[211,202,201],[202,211,212],[212,204,202],[204,212,213],[213,206,204],[206,213,214],[214,208,206],[210,215,216],[216,211,210],[211,216,217],[217,212,211],[212,217,218],[218,213,212],[213,218,219],[219,214,213],[215,220,221],[221,216,215],[216,221,222],[222,217,216],[217,222,223],[223,218,217],[218,223,224],[224,219,218],[225,226,227],[227,228,225],[228,227,229],[229,230,228],[230,229,231],[231,232,230],[232,231,233],[233,234,232],[226,235,236],[236,227,226],[227,236,237],[237,229,227],[229,237,238],[238,231,229],[231,238,239],[239,233,231],[235,240,241],[241,236,235],[236,241,242],[242,237,236],[237,242,243],[243,238,237],[238,243,244],[244,239,238],[240,245,246],[246,241,240],[241,246,247],[247,242,241],[242,247,248],[248,243,242],[243,248,249],[249,244,243],[250,251,252],[252,253,250],[253,252,254],[254,255,253],[255,254,256],[256,257,255],[257,256,258],[258,259,257],[251,260,261],[261,252,251],[252,261,262],[262,254,252],[254,262,263],[263,256,254],[256,263,264],[264,258,256],[260,265,266],[266,261,260],[261,266,267],[267,262,261],[262,267,268],[268,263,262],[263,268,269],[269,264,263],[265,270,271],[271,266,265],[266,271,272],[272,267,266],[267,272,273],[273,268,267],[268,273,274],[274,269,268],[275,276,277],[277,278,275],[278,277,279],[279,280,278],[280,279,281],[281,282,280],[282,281,283],[283,284,282],[276,285,286],[286,277,276],[277,286,287],[287,279,277],[279,287,288],[288,281,279],[281,288,289],[289,283,281],[285,290,291],[291,286,285],[286,291,292],[292,287,286],[287,292,293],[293,288,287],[288,293,294],[294,289,288],[290,295,296],[296,291,290],[291,296,297],[297,292,291],[292,297,298],[298,293,292],[293,298,299],[299,294,293],[300,301,302],[302,303,300],[303,302,304],[304,305,303],[305,304,306],[306,307,305],[307,306,308],[301,309,310],[310,302,301],[302,310,311],[311,304,302],[304,311,312],[312,306,304],[306,312,313],[309,314,315],[315,310,309],[310,315,316],[316,311,310],[311,316,317],[317,312,311],[312,317,318],[314,319,320],[320,315,314],[315,320,321],[321,316,315],[316,321,322],[322,317,316],[317,322,323],[324,325,326],[326,327,324],[327,326,328],[328,329,327],[329,328,330],[330,331,329],[331,330,332],[325,333,334],[334,326,325],[326,334,335],[335,328,326],[328,335,336],[336,330,328],[330,336,337],[333,338,339],[339,334,333],[334,339,340],[340,335,334],[335,340,341],[341,336,335],[336,341,342],[338,343,344],[344,339,338],[339,344,345],[345,340,339],[340,345,346],[346,341,340],[341,346,347],[348,349,350],[350,351,348],[351,350,352],[352,353,351],[353,352,354],[354,355,353],[355,354,356],[349,357,358],[358,350,349],[350,358,359],[359,352,350],[352,359,360],[360,354,352],[354,360,361],[357,362,363],[363,358,357],[358,363,364],[364,359,358],[359,364,365],[365,360,359],[360,365,366],[362,367,368],[368,363,362],[363,368,369],[369,364,363],[364,369,370],[370,365,364],[365,370,371],[372,373,374],[374,375,372],[375,374,376],[376,377,375],[377,376,378],[378,379,377],[379,378,380],[373,381,382],[382,374,373],[374,382,383],[383,376,374],[376,383,384],[384,378,376],[378,384,385],[381,386,387],[387,382,381],[382,387,388],[388,383,382],[383,388,389],[389,384,383],[384,389,390],[386,391,392],[392,387,386],[387,392,393],[393,388,387],[388,393,394],[394,389,388],[389,394,395],[396,397,398],[398,399,396],[399,398,400],[400,401,399],[401,400,402],[402,403,401],[403,402,404],[404,405,403],[397,406,407],[407,398,397],[398,407,408],[408,400,398],[400,408,409],[409,402,400],[402,409,410],[410,404,402],[406,411,412],[412,407,406],[407,412,413],[413,408,407],[408,413,414],[414,409,408],[409,414,415],[415,410,409],[411,416,417],[417,412,411],[412,417,418],[418,413,412],[413,418,419],[419,414,413],[414,419,420],[420,415,414],[421,422,423],[423,424,421],[424,423,425],[425,426,424],[426,425,427],[427,428,426],[428,427,429],[429,430,428],[422,431,432],[432,423,422],[423,432,433],[433,425,423],[425,433,434],[434,427,425],[427,434,435],[435,429,427],[431,436,437],[437,432,431],[432,437,438],[438,433,432],[433,438,439],[439,434,433],[434,439,440],[440,435,434],[436,441,442],[442,437,436],[437,442,443],[443,438,437],[438,443,444],[444,439,438],[439,444,445],[445,440,439],[446,447,448],[448,449,446],[449,448,450],[450,451,449],[451,450,452],[452,453,451],[453,452,454],[454,455,453],[447,456,457],[457,448,447],[448,457,458],[458,450,448],[450,458,459],[459,452,450],[452,459,460],[460,454,452],[456,461,462],[462,457,456],[457,462,463],[463,458,457],[458,463,464],[464,459,458],[459,464,465],[465,460,459],[461,466,467],[467,462,461],[462,467,468],[468,463,462],[463,468,469],[469,464,463],[464,469,470],[470,465,464],[471,472,473],[473,474,471],[474,473,475],[475,476,474],[476,475,477],[477,478,476],[478,477,479],[479,480,478],[472,481,482],[482,473,472],[473,482,483],[483,475,473],[475,483,484],[484,477,475],[477,484,485],[485,479,477],[481,486,487],[487,482,481],[482,487,488],[488,483,482],[483,488,489],[489,484,483],[484,489,490],[490,485,484],[486,491,492],[492,487,486],[487,492,493],[493,488,487],[488,493,494],[494,489,488],[489,494,495],[495,490,489],[496,497,498],[498,499,496],[499,498,500],[500,501,499],[501,500,502],[502,503,501],[503,502,504],[504,505,503],[497,506,507],[507,498,497],[498,507,508],[508,500,498],[500,508,509],[509,502,500],[502,509,510],[510,504,502],[506,511,512],[512,507,506],[507,512,513],[513,508,507],[508,513,514],[514,509,508],[509,514,515],[515,510,509],[511,516,517],[517,512,511],[512,517,518],[518,513,512],[513,518,519],[519,514,513],[514,519,520],[520,515,514],[521,522,523],[523,524,521],[524,523,525],[525,526,524],[526,525,527],[527,528,526],[528,527,529],[529,530,528],[522,531,532],[532,523,522],[523,532,533],[533,525,523],[525,533,534],[534,527,525],[527,534,535],[535,529,527],[531,536,537],[537,532,531],[532,537,538],[538,533,532],[533,538,539],[539,534,533],[534,539,540],[540,535,534],[536,541,542],[542,537,536],[537,542,543],[543,538,537],[538,543,544],[544,539,538],[539,544,545],[545,540,539],[546,547,548],[548,549,546],[549,548,550],[550,551,549],[551,550,552],[552,553,551],[553,552,554],[554,555,553],[547,556,557],[557,548,547],[548,557,558],[558,550,548],[550,558,559],[559,552,550],[552,559,560],[560,554,552],[556,561,562],[562,557,556],[557,562,563],[563,558,557],[558,563,564],[564,559,558],[559,564,565],[565,560,559],[561,566,567],[567,562,561],[562,567,568],[568,563,562],[563,568,569],[569,564,563],[564,569,570],[570,565,564],[571,572,573],[573,574,571],[574,573,575],[575,576,574],[576,575,577],[577,578,576],[578,577,579],[579,580,578],[572,581,582],[582,573,572],[573,582,583],[583,575,573],[575,583,584],[584,577,575],[577,584,585],[585,579,577],[581,586,587],[587,582,581],[582,587,588],[588,583,582],[583,588,589],[589,584,583],[584,589,590],[590,585,584],[586,591,592],[592,587,586],[587,592,593],[593,588,587],[588,593,594],[594,589,588],[589,594,595],[595,590,589],[596,597,598],[597,596,599],[599,600,597],[600,599,601],[601,602,600],[602,601,603],[603,604,602],[605,596,606],[596,605,607],[607,599,596],[599,607,608],[608,601,599],[601,608,609],[609,603,601],[610,605,611],[605,610,612],[612,607,605],[607,612,613],[613,608,607],[608,613,614],[614,609,608],[615,610,616],[610,615,617],[617,612,610],[612,617,618],[618,613,612],[613,618,619],[619,614,613],[620,621,622],[621,620,623],[623,624,621],[624,623,625],[625,626,624],[626,625,627],[627,628,626],[629,620,630],[620,629,631],[631,623,620],[623,631,632],[632,625,623],[625,632,633],[633,627,625],[634,629,635],[629,634,636],[636,631,629],[631,636,637],[637,632,631],[632,637,638],[638,633,632],[639,634,640],[634,639,641],[641,636,634],[636,641,642],[642,637,636],[637,642,643],[643,638,637],[644,645,646],[645,644,647],[647,648,645],[648,647,649],[649,650,648],[650,649,651],[651,652,650],[653,644,654],[644,653,655],[655,647,644],[647,655,656],[656,649,647],[649,656,657],[657,651,649],[658,653,659],[653,658,660],[660,655,653],[655,660,661],[661,656,655],[656,661,662],[662,657,656],[663,658,664],[658,663,665],[665,660,658],[660,665,666],[666,661,660],[661,666,667],[667,662,661],[668,669,670],[669,668,671],[671,672,669],[672,671,673],[673,674,672],[674,673,675],[675,676,674],[677,668,678],[668,677,679],[679,671,668],[671,679,680],[680,673,671],[673,680,681],[681,675,673],[682,677,683],[677,682,684],[684,679,677],[679,684,685],[685,680,679],[680,685,686],[686,681,680],[687,682,688],[682,687,689],[689,684,682],[684,689,690],[690,685,684],[685,690,691],[691,686,685],[692,693,694],[694,695,692],[695,694,696],[696,697,695],[697,696,698],[698,699,697],[699,698,700],[700,701,699],[693,702,703],[703,694,693],[694,703,704],[704,696,694],[696,704,705],[705,698,696],[698,705,706],[706,700,698],[702,707,708],[708,703,702],[703,708,709],[709,704,703],[704,709,710],[710,705,704],[705,710,711],[711,706,705],[707,712,713],[713,708,707],[708,713,714],[714,709,708],[709,714,715],[715,710,709],[710,715,716],[716,711,710],[717,718,719],[719,720,717],[720,719,721],[721,722,720],[722,721,723],[723,724,722],[724,723,725],[725,726,724],[718,727,728],[728,719,718],[719,728,729],[729,721,719],[721,729,730],[730,723,721],[723,730,731],[731,725,723],[727,732,733],[733,728,727],[728,733,734],[734,729,728],[729,734,735],[735,730,729],[730,735,736],[736,731,730],[732,737,738],[738,733,732],[733,738,739],[739,734,733],[734,739,740],[740,735,734],[735,740,741],[741,736,735],[742,743,744],[744,745,742],[745,744,746],[746,747,745],[747,746,748],[748,749,747],[749,748,750],[750,751,749],[743,752,753],[753,744,743],[744,753,754],[754,746,744],[746,754,755],[755,748,746],[748,755,756],[756,750,748],[752,757,758],[758,753,752],[753,758,759],[759,754,753],[754,759,760],[760,755,754],[755,760,761],[761,756,755],[757,762,763],[763,758,757],[758,763,764],[764,759,758],[759,764,765],[765,760,759],[760,765,766],[766,761,760],[767,768,769],[769,770,767],[770,769,771],[771,772,770],[772,771,773],[773,774,772],[774,773,775],[775,776,774],[768,777,778],[778,769,768],[769,778,779],[779,771,769],[771,779,780],[780,773,771],[773,780,781],[781,775,773],[777,782,783],[783,778,777],[778,783,784],[784,779,778],[779,784,785],[785,780,779],[780,785,786],[786,781,780],[782,787,788],[788,783,782],[783,788,789],[789,784,783],[784,789,790],[790,785,784],[785,790,791],[791,786,785]];

function computeSurfaceNormals(positions, triangles) {
    const normals = positions.map(() => {
        // Initialize to zero.
        return [0, 0, 0];
    });
    triangles.forEach(([i0, i1, i2]) => {
        const p0 = positions[i0];
        const p1 = positions[i1];
        const p2 = positions[i2];
        const v0 = vec3.subtract(p1, p0);
        const v1 = vec3.subtract(p2, p0);
        vec3.normalize(v0, v0);
        vec3.normalize(v1, v1);
        const norm = vec3.cross(v0, v1);
        // Accumulate the normals.
        vec3.add(normals[i0], norm, normals[i0]);
        vec3.add(normals[i1], norm, normals[i1]);
        vec3.add(normals[i2], norm, normals[i2]);
    });
    normals.forEach((n) => {
        // Normalize accumulated normals.
        vec3.normalize(n, n);
    });
    return normals;
}

const mesh = {
    positions: teapot.positions,
    triangles: teapot.cells,
    normals: [],
};
// Compute surface normals
mesh.normals = computeSurfaceNormals(mesh.positions, mesh.triangles);

var opaqueWGSL = `struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32
};

@vertex
fn main_vs(@location(0) position: vec4f, @builtin(instance_index) instance: u32) -> VertexOutput {
  var output: VertexOutput;

  // distribute instances into a staggered 4x4 grid
  const gridWidth = 125.0;
  const cellSize = gridWidth / 4.0;
  let row = instance / 2u;
  let col = instance % 2u;

  let xOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 * cellSize * f32(col) + f32(row % 2u != 0u) * cellSize;
  let zOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 + f32(row) * cellSize;

  let offsetPos = vec4(position.x + xOffset, position.y, position.z + zOffset, position.w);

  output.position = uniforms.modelViewProjectionMatrix * offsetPos;
  output.instance = instance;
  return output;
}

@fragment
fn main_fs(@location(0) @interpolate(flat) instance: u32) -> @location(0) vec4f {
  const colors = array<vec3f,6>(
      vec3(1.0, 0.0, 0.0),
      vec3(0.0, 1.0, 0.0),
      vec3(0.0, 0.0, 1.0),
      vec3(1.0, 0.0, 1.0),
      vec3(1.0, 1.0, 0.0),
      vec3(0.0, 1.0, 1.0),
  );

  return vec4(colors[instance % 6u], 1.0);
}
`;

var translucentWGSL = `struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  maxStorableFragments: u32,
  targetWidth: u32,
};

struct SliceInfo {
  sliceStartY: i32
};

struct Heads {
  numFragments: atomic<u32>,
  data: array<atomic<u32>>
};

struct LinkedListElement {
  color: vec4f,
  depth: f32,
  next: u32
};

struct LinkedList {
  data: array<LinkedListElement>
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;
@binding(1) @group(0) var<storage, read_write> heads: Heads;
@binding(2) @group(0) var<storage, read_write> linkedList: LinkedList;
@binding(3) @group(0) var opaqueDepthTexture: texture_depth_2d;
@binding(4) @group(0) var<uniform> sliceInfo: SliceInfo;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32
};

@vertex
fn main_vs(@location(0) position: vec4f, @builtin(instance_index) instance: u32) -> VertexOutput {
  var output: VertexOutput;

  // distribute instances into a staggered 4x4 grid
  const gridWidth = 125.0;
  const cellSize = gridWidth / 4.0;
  let row = instance / 2u;
  let col = instance % 2u;

  let xOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 * cellSize * f32(col) + f32(row % 2u == 0u) * cellSize;
  let zOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 + f32(row) * cellSize;

  let offsetPos = vec4(position.x + xOffset, position.y, position.z + zOffset, position.w);

  output.position = uniforms.modelViewProjectionMatrix * offsetPos;
  output.instance = instance;

  return output;
}

@fragment
fn main_fs(@builtin(position) position: vec4f, @location(0) @interpolate(flat) instance: u32) {
  const colors = array<vec3f,6>(
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),
    vec3(1.0, 0.0, 1.0),
    vec3(1.0, 1.0, 0.0),
    vec3(0.0, 1.0, 1.0),
  );

  let fragCoords = vec2i(position.xy);
  let opaqueDepth = textureLoad(opaqueDepthTexture, fragCoords, 0);

  // reject fragments behind opaque objects
  if position.z >= opaqueDepth {
    discard;
  }

  // The index in the heads buffer corresponding to the head data for the fragment at
  // the current location.
  let headsIndex = u32(fragCoords.y - sliceInfo.sliceStartY) * uniforms.targetWidth + u32(fragCoords.x);

  // The index in the linkedList buffer at which to store the new fragment
  let fragIndex = atomicAdd(&heads.numFragments, 1u);

  // If we run out of space to store the fragments, we just lose them
  if fragIndex < uniforms.maxStorableFragments {
    let lastHead = atomicExchange(&heads.data[headsIndex], fragIndex);
    linkedList.data[fragIndex].depth = position.z;
    linkedList.data[fragIndex].next = lastHead;
    linkedList.data[fragIndex].color = vec4(colors[(instance + 3u) % 6u], 0.3);
  }
}
`;

var compositeWGSL = `struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  maxStorableFragments: u32,
  targetWidth: u32,
};

struct SliceInfo {
  sliceStartY: i32
};

struct Heads {
  numFragments: u32,
  data: array<u32>
};

struct LinkedListElement {
  color: vec4f,
  depth: f32,
  next: u32
};

struct LinkedList {
  data: array<LinkedListElement>
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;
@binding(1) @group(0) var<storage, read_write> heads: Heads;
@binding(2) @group(0) var<storage, read_write> linkedList: LinkedList;
@binding(3) @group(0) var<uniform> sliceInfo: SliceInfo;

// Output a full screen quad
@vertex
fn main_vs(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4f {
  const position = array<vec2f, 6>(
    vec2(-1.0, -1.0),
    vec2(1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, 1.0),
  );
  
  return vec4(position[vertIndex], 0.0, 1.0);
}

@fragment
fn main_fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let fragCoords = vec2i(position.xy);
  let headsIndex = u32(fragCoords.y - sliceInfo.sliceStartY) * uniforms.targetWidth + u32(fragCoords.x);

  // The maximum layers we can process for any pixel
  const maxLayers = 12u;

  var layers: array<LinkedListElement, maxLayers>;

  var numLayers = 0u;
  var elementIndex = heads.data[headsIndex];

  // copy the list elements into an array up to the maximum amount of layers
  while elementIndex != 0xFFFFFFFFu && numLayers < maxLayers {
    layers[numLayers] = linkedList.data[elementIndex];
    numLayers++;
    elementIndex = linkedList.data[elementIndex].next;
  }

  if numLayers == 0u {
    discard;
  }
  
  // sort the fragments by depth
  for (var i = 1u; i < numLayers; i++) {
    let toInsert = layers[i];
    var j = i;

    while j > 0u && toInsert.depth > layers[j - 1u].depth {
      layers[j] = layers[j - 1u];
      j--;
    }

    layers[j] = toInsert;
  }

  // pre-multiply alpha for the first layer
  var color = vec4(layers[0].color.a * layers[0].color.rgb, layers[0].color.a);

  // blend the remaining layers
  for (var i = 1u; i < numLayers; i++) {
    let mixed = mix(color.rgb, layers[i].color.rgb, layers[i].color.aaa);
    color = vec4(mixed, color.a);
  }

  return color;
}
`;

function roundUp(n, k) {
    return Math.ceil(n / k) * k;
}
const canvas = document.querySelector('canvas');
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);
const context = canvas.getContext('webgpu');
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'opaque',
});
const params = new URLSearchParams(window.location.search);
const settings = {
    memoryStrategy: params.get('memoryStrategy') || 'multipass',
};
// Create the model vertex buffer
const vertexBuffer = device.createBuffer({
    size: 3 * mesh.positions.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
    label: 'vertexBuffer',
});
{
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
        mapping.set(mesh.positions[i], 3 * i);
    }
    vertexBuffer.unmap();
}
// Create the model index buffer
const indexCount = mesh.triangles.length * 3;
const indexBuffer = device.createBuffer({
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
    label: 'indexBuffer',
});
{
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < mesh.triangles.length; ++i) {
        mapping.set(mesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
}
// Uniforms contains:
// * modelViewProjectionMatrix: mat4x4f
// * maxStorableFragments: u32
// * targetWidth: u32
const uniformsSize = roundUp(16 * Float32Array.BYTES_PER_ELEMENT + 2 * Uint32Array.BYTES_PER_ELEMENT, 16);
const uniformBuffer = device.createBuffer({
    size: uniformsSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'uniformBuffer',
});
const opaqueModule = device.createShaderModule({
    code: opaqueWGSL,
    label: 'opaqueModule',
});
const opaquePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: opaqueModule,
        buffers: [
            {
                arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
                attributes: [
                    {
                        // position
                        format: 'float32x3',
                        offset: 0,
                        shaderLocation: 0,
                    },
                ],
            },
        ],
    },
    fragment: {
        module: opaqueModule,
        targets: [
            {
                format: presentationFormat,
            },
        ],
    },
    primitive: {
        topology: 'triangle-list',
    },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
    },
    label: 'opaquePipeline',
});
const opaquePassDescriptor = {
    colorAttachments: [
        {
            view: undefined,
            clearValue: [0, 0, 0, 1.0],
            loadOp: 'clear',
            storeOp: 'store',
        },
    ],
    depthStencilAttachment: {
        view: undefined,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
    },
    label: 'opaquePassDescriptor',
};
const opaqueBindGroup = device.createBindGroup({
    layout: opaquePipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: uniformBuffer,
                size: 16 * Float32Array.BYTES_PER_ELEMENT,
                label: 'modelViewProjection',
            },
        },
    ],
    label: 'opaquePipeline',
});
const translucentModule = device.createShaderModule({
    code: translucentWGSL,
    label: 'translucentModule',
});
const translucentBindGroupLayout = device.createBindGroupLayout({
    label: 'translucentBindGroupLayout',
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
            },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'storage',
            },
        },
        {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'storage',
            },
        },
        {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { sampleType: 'depth' },
        },
        {
            binding: 4,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
                hasDynamicOffset: true,
            },
        },
    ],
});
const translucentPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts: [translucentBindGroupLayout],
        label: 'translucentPipelineLayout',
    }),
    vertex: {
        module: translucentModule,
        buffers: [
            {
                arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
                attributes: [
                    {
                        format: 'float32x3',
                        offset: 0,
                        shaderLocation: 0,
                    },
                ],
            },
        ],
    },
    fragment: {
        module: translucentModule,
        targets: [
            {
                format: presentationFormat,
                writeMask: 0x0,
            },
        ],
    },
    primitive: {
        topology: 'triangle-list',
    },
    label: 'translucentPipeline',
});
const translucentPassDescriptor = {
    colorAttachments: [
        {
            loadOp: 'load',
            storeOp: 'store',
            view: undefined,
        },
    ],
    label: 'translucentPassDescriptor',
};
const compositeModule = device.createShaderModule({
    code: compositeWGSL,
    label: 'compositeModule',
});
const compositeBindGroupLayout = device.createBindGroupLayout({
    label: 'compositeBindGroupLayout',
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
            },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'storage',
            },
        },
        {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'storage',
            },
        },
        {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform',
                hasDynamicOffset: true,
            },
        },
    ],
});
const compositePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
        bindGroupLayouts: [compositeBindGroupLayout],
        label: 'compositePipelineLayout',
    }),
    vertex: {
        module: compositeModule,
    },
    fragment: {
        module: compositeModule,
        targets: [
            {
                format: presentationFormat,
                blend: {
                    color: {
                        srcFactor: 'one',
                        operation: 'add',
                        dstFactor: 'one-minus-src-alpha',
                    },
                    alpha: {},
                },
            },
        ],
    },
    primitive: {
        topology: 'triangle-list',
    },
    label: 'compositePipeline',
});
const compositePassDescriptor = {
    colorAttachments: [
        {
            view: undefined,
            loadOp: 'load',
            storeOp: 'store',
        },
    ],
    label: 'compositePassDescriptor',
};
const configure = () => {
    let devicePixelRatio = window.devicePixelRatio;
    // The default maximum storage buffer binding size is 128Mib. The amount
    // of memory we need to store transparent fragments depends on the size
    // of the canvas and the average number of layers per fragment we want to
    // support. When the devicePixelRatio is 1, we know that 128Mib is enough
    // to store 4 layers per pixel at 600x600. However, when the device pixel
    // ratio is high enough we will exceed this limit.
    //
    // We provide 2 choices of mitigations to this issue:
    // 1) Clamp the device pixel ratio to a value which we know will not break
    //    the limit. The tradeoff here is that the canvas resolution will not
    //    match the native resolution and therefore may have a reduction in
    //    quality.
    // 2) Break the frame into a series of horizontal slices using the scissor
    //    functionality and process a single slice at a time. This limits memory
    //    usage because we only need enough memory to process the dimensions
    //    of the slice. The tradeoff is the performance reduction due to multiple
    //    passes.
    if (settings.memoryStrategy === 'clamp-pixel-ratio') {
        devicePixelRatio = Math.min(window.devicePixelRatio, 3);
    }
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        label: 'depthTexture',
    });
    const depthTextureView = depthTexture.createView({
        label: 'depthTextureView',
    });
    // Determines how much memory is allocated to store linked-list elements
    const averageLayersPerFragment = 4;
    // Each element stores
    // * color : vec4f
    // * depth : f32
    // * index of next element in the list : u32
    const linkedListElementSize = 5 * Float32Array.BYTES_PER_ELEMENT + 1 * Uint32Array.BYTES_PER_ELEMENT;
    // We want to keep the linked-list buffer size under the maxStorageBufferBindingSize.
    // Split the frame into enough slices to meet that constraint.
    const bytesPerline = canvas.width * averageLayersPerFragment * linkedListElementSize;
    const maxLinesSupported = Math.floor(device.limits.maxStorageBufferBindingSize / bytesPerline);
    const numSlices = Math.ceil(canvas.height / maxLinesSupported);
    const sliceHeight = Math.ceil(canvas.height / numSlices);
    const linkedListBufferSize = sliceHeight * bytesPerline;
    const linkedListBuffer = device.createBuffer({
        size: linkedListBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: 'linkedListBuffer',
    });
    // To slice up the frame we need to pass the starting fragment y position of the slice.
    // We do this using a uniform buffer with a dynamic offset.
    const sliceInfoBuffer = device.createBuffer({
        size: numSlices * device.limits.minUniformBufferOffsetAlignment,
        usage: GPUBufferUsage.UNIFORM,
        mappedAtCreation: true,
        label: 'sliceInfoBuffer',
    });
    {
        const mapping = new Int32Array(sliceInfoBuffer.getMappedRange());
        // This assumes minUniformBufferOffsetAlignment is a multiple of 4
        const stride = device.limits.minUniformBufferOffsetAlignment /
            Int32Array.BYTES_PER_ELEMENT;
        for (let i = 0; i < numSlices; ++i) {
            mapping[i * stride] = i * sliceHeight;
        }
        sliceInfoBuffer.unmap();
    }
    // `Heads` struct contains the start index of the linked-list of translucent fragments
    // for a given pixel.
    // * numFragments : u32
    // * data : array<u32>
    const headsBuffer = device.createBuffer({
        size: (1 + canvas.width * sliceHeight) * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: 'headsBuffer',
    });
    const headsInitBuffer = device.createBuffer({
        size: (1 + canvas.width * sliceHeight) * Uint32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
        label: 'headsInitBuffer',
    });
    {
        const buffer = new Uint32Array(headsInitBuffer.getMappedRange());
        for (let i = 0; i < buffer.length; ++i) {
            buffer[i] = 0xffffffff;
        }
        headsInitBuffer.unmap();
    }
    const translucentBindGroup = device.createBindGroup({
        layout: translucentBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    label: 'uniforms',
                },
            },
            {
                binding: 1,
                resource: {
                    buffer: headsBuffer,
                    label: 'headsBuffer',
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: linkedListBuffer,
                    label: 'linkedListBuffer',
                },
            },
            {
                binding: 3,
                resource: depthTextureView,
            },
            {
                binding: 4,
                resource: {
                    buffer: sliceInfoBuffer,
                    size: device.limits.minUniformBufferOffsetAlignment,
                    label: 'sliceInfoBuffer',
                },
            },
        ],
        label: 'translucentBindGroup',
    });
    const compositeBindGroup = device.createBindGroup({
        layout: compositePipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    label: 'uniforms',
                },
            },
            {
                binding: 1,
                resource: {
                    buffer: headsBuffer,
                    label: 'headsBuffer',
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: linkedListBuffer,
                    label: 'linkedListBuffer',
                },
            },
            {
                binding: 3,
                resource: {
                    buffer: sliceInfoBuffer,
                    size: device.limits.minUniformBufferOffsetAlignment,
                    label: 'sliceInfoBuffer',
                },
            },
        ],
    });
    opaquePassDescriptor.depthStencilAttachment.view = depthTextureView;
    // Rotates the camera around the origin based on time.
    function getCameraViewProjMatrix() {
        const aspect = canvas.width / canvas.height;
        const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 2000.0);
        const upVector = vec3.fromValues(0, 1, 0);
        const origin = vec3.fromValues(0, 0, 0);
        const eyePosition = vec3.fromValues(0, 5, -100);
        const rad = Math.PI * (Date.now() / 5000);
        const rotation = mat4.rotateY(mat4.translation(origin), rad);
        vec3.transformMat4(eyePosition, rotation, eyePosition);
        const viewMatrix = mat4.lookAt(eyePosition, origin, upVector);
        const viewProjMatrix = mat4.multiply(projectionMatrix, viewMatrix);
        return viewProjMatrix;
    }
    return function doDraw() {
        // update the uniform buffer
        {
            const buffer = new ArrayBuffer(uniformBuffer.size);
            new Float32Array(buffer).set(getCameraViewProjMatrix());
            new Uint32Array(buffer, 16 * Float32Array.BYTES_PER_ELEMENT).set([
                averageLayersPerFragment * canvas.width * sliceHeight,
                canvas.width,
            ]);
            device.queue.writeBuffer(uniformBuffer, 0, buffer);
        }
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
        // Draw the opaque objects
        opaquePassDescriptor.colorAttachments[0].view = textureView;
        const opaquePassEncoder = commandEncoder.beginRenderPass(opaquePassDescriptor);
        opaquePassEncoder.setPipeline(opaquePipeline);
        opaquePassEncoder.setBindGroup(0, opaqueBindGroup);
        opaquePassEncoder.setVertexBuffer(0, vertexBuffer);
        opaquePassEncoder.setIndexBuffer(indexBuffer, 'uint16');
        opaquePassEncoder.drawIndexed(mesh.triangles.length * 3, 8);
        opaquePassEncoder.end();
        for (let slice = 0; slice < numSlices; ++slice) {
            // initialize the heads buffer
            commandEncoder.copyBufferToBuffer(headsInitBuffer, 0, headsBuffer, 0, headsInitBuffer.size);
            const scissorX = 0;
            const scissorY = slice * sliceHeight;
            const scissorWidth = canvas.width;
            const scissorHeight = Math.min((slice + 1) * sliceHeight, canvas.height) -
                slice * sliceHeight;
            // Draw the translucent objects
            translucentPassDescriptor.colorAttachments[0].view = textureView;
            const translucentPassEncoder = commandEncoder.beginRenderPass(translucentPassDescriptor);
            // Set the scissor to only process a horizontal slice of the frame
            translucentPassEncoder.setScissorRect(scissorX, scissorY, scissorWidth, scissorHeight);
            translucentPassEncoder.setPipeline(translucentPipeline);
            translucentPassEncoder.setBindGroup(0, translucentBindGroup, [
                slice * device.limits.minUniformBufferOffsetAlignment,
            ]);
            translucentPassEncoder.setVertexBuffer(0, vertexBuffer);
            translucentPassEncoder.setIndexBuffer(indexBuffer, 'uint16');
            translucentPassEncoder.drawIndexed(mesh.triangles.length * 3, 8);
            translucentPassEncoder.end();
            // Composite the opaque and translucent objects
            compositePassDescriptor.colorAttachments[0].view = textureView;
            const compositePassEncoder = commandEncoder.beginRenderPass(compositePassDescriptor);
            // Set the scissor to only process a horizontal slice of the frame
            compositePassEncoder.setScissorRect(scissorX, scissorY, scissorWidth, scissorHeight);
            compositePassEncoder.setPipeline(compositePipeline);
            compositePassEncoder.setBindGroup(0, compositeBindGroup, [
                slice * device.limits.minUniformBufferOffsetAlignment,
            ]);
            compositePassEncoder.draw(6);
            compositePassEncoder.end();
        }
        device.queue.submit([commandEncoder.finish()]);
    };
};
let doDraw = configure();
const updateSettings = () => {
    doDraw = configure();
};
const gui = new GUI$1();
gui
    .add(settings, 'memoryStrategy', ['multipass', 'clamp-pixel-ratio'])
    .onFinishChange(updateSettings);
function frame() {
    doDraw();
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//# sourceMappingURL=main.js.map
