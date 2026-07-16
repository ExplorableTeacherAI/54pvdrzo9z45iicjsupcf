/**
 * Hilbert Space Lesson Domain Model
 * =================================
 *
 * This file contains the mathematical functions and constants
 * that define the core concepts of the lesson. All sections
 * compute from these functions — no section re-implements math locally.
 */

// ============================================
// SECTION 1: VECTORS
// ============================================

/** A 2D vector represented as [x, y] */
export type Vec2 = [number, number];

/** A 3D vector represented as [x, y, z] */
export type Vec3 = [number, number, number];

/** Add two 2D vectors */
export const addVec2 = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];

/** Scale a 2D vector by a scalar */
export const scaleVec2 = (v: Vec2, s: number): Vec2 => [v[0] * s, v[1] * s];

/** Compute the magnitude (length) of a 2D vector */
export const magnitude2 = (v: Vec2): number => Math.sqrt(v[0] * v[0] + v[1] * v[1]);

/** Compute the magnitude (length) of a 3D vector */
export const magnitude3 = (v: Vec3): number => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

/** Linear combination of two 2D vectors: c1*v1 + c2*v2 */
export const linearCombination2 = (v1: Vec2, c1: number, v2: Vec2, c2: number): Vec2 =>
    addVec2(scaleVec2(v1, c1), scaleVec2(v2, c2));

/** Distance between two 2D points/vectors */
export const distance2 = (a: Vec2, b: Vec2): number =>
    magnitude2([b[0] - a[0], b[1] - a[1]]);

// ============================================
// SECTION 2: VECTOR SPACES
// ============================================

/** Check if a vector is the zero vector (with tolerance) */
export const isZeroVector = (v: Vec2, tolerance = 1e-10): boolean =>
    magnitude2(v) < tolerance;

/** Check closure under addition: result of adding two vectors */
export const closureAddition = (a: Vec2, b: Vec2): Vec2 => addVec2(a, b);

/** Check closure under scalar multiplication */
export const closureScalar = (v: Vec2, s: number): Vec2 => scaleVec2(v, s);

/** The zero vector in 2D */
export const ZERO_VEC2: Vec2 = [0, 0];

/** Additive inverse of a vector */
export const negateVec2 = (v: Vec2): Vec2 => scaleVec2(v, -1);

// ============================================
// SECTION 3: INNER PRODUCTS
// ============================================

/** Standard inner product (dot product) in 2D */
export const innerProduct2 = (a: Vec2, b: Vec2): number =>
    a[0] * b[0] + a[1] * b[1];

/** Standard inner product (dot product) in 3D */
export const innerProduct3 = (a: Vec3, b: Vec3): number =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Compute the norm induced by the inner product: ||v|| = sqrt(<v,v>) */
export const norm2 = (v: Vec2): number => Math.sqrt(innerProduct2(v, v));

/** Compute the angle between two vectors using inner product (in radians) */
export const angleBetween = (a: Vec2, b: Vec2): number => {
    const dot = innerProduct2(a, b);
    const magA = magnitude2(a);
    const magB = magnitude2(b);
    if (magA === 0 || magB === 0) return 0;
    // Clamp to avoid NaN from floating point errors
    const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosTheta);
};

/** Convert radians to degrees */
export const toDegrees = (radians: number): number => radians * (180 / Math.PI);

/** Check if two vectors are orthogonal (perpendicular) */
export const areOrthogonal = (a: Vec2, b: Vec2, tolerance = 1e-10): boolean =>
    Math.abs(innerProduct2(a, b)) < tolerance;

/** Project vector a onto vector b */
export const project = (a: Vec2, b: Vec2): Vec2 => {
    const bMag = magnitude2(b);
    if (bMag === 0) return ZERO_VEC2;
    const scalar = innerProduct2(a, b) / (bMag * bMag);
    return scaleVec2(b, scalar);
};

// ============================================
// SECTION 4: COMPLETENESS (CAUCHY SEQUENCES)
// ============================================

/** Generate the n-th term of a Cauchy sequence converging to a limit */
export const cauchyTerm = (limit: number, n: number): number => {
    if (n <= 0) return limit;
    return limit + (1 / n); // Simple convergent sequence
};

/** Generate the n-th term of a non-convergent sequence (harmonic-like partial sums) */
export const nonConvergentTerm = (n: number): number => {
    // Partial sums of 1/k (diverges to infinity)
    let sum = 0;
    for (let k = 1; k <= n; k++) {
        sum += 1 / k;
    }
    return sum;
};

/** Check if a sequence is Cauchy up to term n (simplified check) */
export const isCauchyUpTo = (terms: number[], tolerance: number): boolean => {
    if (terms.length < 2) return true;
    const lastTerms = terms.slice(-5);
    for (let i = 0; i < lastTerms.length - 1; i++) {
        for (let j = i + 1; j < lastTerms.length; j++) {
            if (Math.abs(lastTerms[i] - lastTerms[j]) > tolerance) return false;
        }
    }
    return true;
};

// ============================================
// SECTION 5: HILBERT SPACE CONDITIONS
// ============================================

/**
 * A space is a Hilbert space if it has:
 * 1. An inner product (complete inner product space)
 * 2. Is complete (every Cauchy sequence converges)
 */
export interface HilbertSpaceCheck {
    hasInnerProduct: boolean;
    isComplete: boolean;
    isHilbertSpace: boolean;
}

export const checkHilbertSpace = (hasInnerProduct: boolean, isComplete: boolean): HilbertSpaceCheck => ({
    hasInnerProduct,
    isComplete,
    isHilbertSpace: hasInnerProduct && isComplete,
});

// Common examples
export const HILBERT_EXAMPLES = {
    Rn: { name: 'ℝⁿ', hasInnerProduct: true, isComplete: true, isHilbertSpace: true },
    L2: { name: 'L²', hasInnerProduct: true, isComplete: true, isHilbertSpace: true },
    Q: { name: 'ℚⁿ', hasInnerProduct: true, isComplete: false, isHilbertSpace: false },
    C00: { name: 'c₀₀', hasInnerProduct: true, isComplete: false, isHilbertSpace: false },
};

// ============================================
// BASIS RECIPE CONSTRUCTOR (Section: vectors-building-blocks)
// ============================================

/** Fixed basis vectors for the Basis Recipe Constructor visualization */
export const BASIS_1: Vec2 = [2, 0.5];     // Teal basis vector (not aligned with axes)
export const BASIS_2: Vec2 = [1, 2];       // Indigo basis vector (not perpendicular to basis 1)

/** Target vector that students must reach by combining basis vectors */
export const TARGET_VECTOR: Vec2 = [5, 3]; // Solution: 2*basis1 + 1*basis2 = [4+1, 1+2] = [5, 3]

/** Threshold for considering the target "reached" */
export const TARGET_THRESHOLD = 0.3;

/** Compute resultant vector from coefficients and basis vectors */
export const computeResultant = (coeff1: number, coeff2: number): Vec2 =>
    linearCombination2(BASIS_1, coeff1, BASIS_2, coeff2);

/** Check if target is reached */
export const isTargetReached = (resultant: Vec2): boolean =>
    distance2(resultant, TARGET_VECTOR) < TARGET_THRESHOLD;
