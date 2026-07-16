/**
 * Vectors: Building Blocks — Section for Hilbert Space Lesson
 * ============================================================
 *
 * Opening section introducing vectors as geometric objects with magnitude
 * and direction, through a "Basis Recipe Constructor" visualization.
 * Students discover that vectors are really instructions for combining
 * basis vectors, not just lists of numbers.
 */

import React, { useEffect, useRef, useState, type ReactElement } from "react";
import { StackLayout, SplitLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableH3,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineSpotColor,
    InlineTooltip,
    InlineFormula,
    InlineFeedback,
    InlineClozeChoice,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { FormulaBlock } from "@/components/molecules/FormulaBlock";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, vec2, type Vec2 as MotionVec2 } from "@/lib/motion";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";
import {
    BASIS_1,
    BASIS_2,
    TARGET_VECTOR,
    TARGET_THRESHOLD,
    computeResultant,
    isTargetReached,
    distance2,
    type Vec2,
} from "../model";

// ── View constants ────────────────────────────────────────────────────────────

const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 400;
const ORIGIN: MotionVec2 = { x: 180, y: 280 };
const PIXELS_PER_UNIT = 45;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const PAPER = "#FFFFFF";
const ACCENT_1 = "#62D0AD"; // Teal - basis 1
const ACCENT_2 = "#8E90F5"; // Indigo - basis 2
const TARGET_COLOR = "#9CA3AF"; // Gray for target
const RESULTANT_COLOR = "#F7B23B"; // Amber for resultant
const SUCCESS_COLOR = "#22c55e"; // Green for success

// ── Helper functions ──────────────────────────────────────────────────────────

const toScreen = (v: Vec2): MotionVec2 => ({
    x: ORIGIN.x + v[0] * PIXELS_PER_UNIT,
    y: ORIGIN.y - v[1] * PIXELS_PER_UNIT, // Y inverted for screen coords
});

const vecToScreen = (v: Vec2): { x: number; y: number } => toScreen(v);

// ── Integer Spinner Component ─────────────────────────────────────────────────

interface IntegerSpinnerProps {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    label: string;
    color: string;
}

function IntegerSpinner({ value, onChange, min, max, label, color }: IntegerSpinnerProps) {
    const handleIncrement = () => {
        if (value < max) onChange(value + 1);
    };
    const handleDecrement = () => {
        if (value > min) onChange(value - 1);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color, minWidth: "24px" }}>
                {label}:
            </span>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="flex h-8 w-8 items-center justify-center text-lg font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                    aria-label={`Decrease ${label}`}
                >
                    −
                </button>
                <span
                    className="flex h-8 w-10 items-center justify-center text-base font-bold"
                    style={{ color, fontVariantNumeric: "tabular-nums" }}
                >
                    {value}
                </span>
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="flex h-8 w-8 items-center justify-center text-lg font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
}

// ── Arrow head marker ─────────────────────────────────────────────────────────

function ArrowMarkers() {
    return (
        <defs>
            <marker
                id="arrow-teal"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <path d="M0,1 L7,4 L0,7 L2,4 Z" fill={ACCENT_1} />
            </marker>
            <marker
                id="arrow-indigo"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <path d="M0,1 L7,4 L0,7 L2,4 Z" fill={ACCENT_2} />
            </marker>
            <marker
                id="arrow-amber"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="5"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <path d="M0,1 L8,5 L0,9 L2,5 Z" fill={RESULTANT_COLOR} />
            </marker>
            <marker
                id="arrow-gray"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <path d="M0,1 L7,4 L0,7 L2,4 Z" fill={TARGET_COLOR} />
            </marker>
            <marker
                id="arrow-success"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="5"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <path d="M0,1 L8,5 L0,9 L2,5 Z" fill={SUCCESS_COLOR} />
            </marker>
            <filter id="ghost-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
            </filter>
        </defs>
    );
}

// ── Ghost trace rendering ─────────────────────────────────────────────────────

interface GhostTrace {
    c1: number;
    c2: number;
}

function GhostTraces({ traces }: { traces: GhostTrace[] }) {
    return (
        <g opacity="0.25" filter="url(#ghost-blur)">
            {traces.map((trace, i) => {
                const result = computeResultant(trace.c1, trace.c2);
                const end = toScreen(result);
                return (
                    <g key={`ghost-${i}`}>
                        <line
                            x1={ORIGIN.x}
                            y1={ORIGIN.y}
                            x2={end.x}
                            y2={end.y}
                            stroke={INK_QUIET}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <text
                            x={end.x + 5}
                            y={end.y - 5}
                            fill={INK_QUIET}
                            fontSize="9"
                            fontWeight="500"
                        >
                            {trace.c1},{trace.c2}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

// ── Tip-to-tail chain visualization ───────────────────────────────────────────

function TipToTailChain({ coeff1, coeff2 }: { coeff1: number; coeff2: number }) {
    const segments: Array<{ start: MotionVec2; end: MotionVec2; color: string }> = [];

    let current: Vec2 = [0, 0];

    // Add basis 1 segments
    const count1 = Math.abs(coeff1);
    const dir1: Vec2 = coeff1 >= 0 ? BASIS_1 : [-BASIS_1[0], -BASIS_1[1]];
    for (let i = 0; i < count1; i++) {
        const start = toScreen(current);
        current = [current[0] + dir1[0], current[1] + dir1[1]];
        const end = toScreen(current);
        segments.push({ start, end, color: ACCENT_1 });
    }

    // Add basis 2 segments
    const count2 = Math.abs(coeff2);
    const dir2: Vec2 = coeff2 >= 0 ? BASIS_2 : [-BASIS_2[0], -BASIS_2[1]];
    for (let i = 0; i < count2; i++) {
        const start = toScreen(current);
        current = [current[0] + dir2[0], current[1] + dir2[1]];
        const end = toScreen(current);
        segments.push({ start, end, color: ACCENT_2 });
    }

    return (
        <g>
            {segments.map((seg, i) => (
                <line
                    key={`seg-${i}`}
                    x1={seg.start.x}
                    y1={seg.start.y}
                    x2={seg.end.x}
                    y2={seg.end.y}
                    stroke={seg.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    markerEnd={seg.color === ACCENT_1 ? "url(#arrow-teal)" : "url(#arrow-indigo)"}
                    opacity="0.7"
                />
            ))}
        </g>
    );
}

// ── Main drawing component ────────────────────────────────────────────────────

function BasisRecipeDrawing() {
    const setVar = useSetVar();
    const coeff1 = useVar<number>("vbb_coeff1", 1);
    const coeff2 = useVar<number>("vbb_coeff2", 0);
    const ghostTraces = useVar<GhostTrace[]>("vbb_ghostTraces", []);

    const prevCoeffs = useRef({ c1: coeff1, c2: coeff2 });

    // Compute derived values
    const resultant = computeResultant(coeff1, coeff2);
    const dist = distance2(resultant, TARGET_VECTOR);
    const reached = isTargetReached(resultant);

    // Update derived store variables
    useEffect(() => {
        setVar("vbb_resultX", resultant[0]);
        setVar("vbb_resultY", resultant[1]);
        setVar("vbb_distanceToTarget", dist);
        setVar("vbb_targetReached", reached);
    }, [resultant, dist, reached, setVar]);

    // Add ghost trace when coefficients change
    useEffect(() => {
        const prev = prevCoeffs.current;
        if (prev.c1 !== coeff1 || prev.c2 !== coeff2) {
            // Only add if previous wasn't origin and not already in traces
            if (prev.c1 !== 0 || prev.c2 !== 0) {
                const existing = ghostTraces.find(
                    (t) => t.c1 === prev.c1 && t.c2 === prev.c2
                );
                if (!existing && ghostTraces.length < 12) {
                    setVar("vbb_ghostTraces", [...ghostTraces, { c1: prev.c1, c2: prev.c2 }]);
                }
            }
            prevCoeffs.current = { c1: coeff1, c2: coeff2 };
        }
    }, [coeff1, coeff2, ghostTraces, setVar]);

    // Screen positions
    const targetScreen = toScreen(TARGET_VECTOR);
    const resultScreen = toScreen(resultant);
    const basis1Screen = toScreen(BASIS_1);
    const basis2Screen = toScreen(BASIS_2);

    // Spring animation for resultant position
    const resultX = useSpring(resultScreen.x, { stiffness: 200, damping: 20 });
    const resultY = useSpring(resultScreen.y, { stiffness: 200, damping: 20 });

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="Basis recipe constructor showing how to combine basis vectors to reach a target"
        >
            <ArrowMarkers />

            {/* Background grid */}
            <g stroke={INK_QUIET} strokeWidth="0.5" opacity="0.4">
                {Array.from({ length: 11 }, (_, i) => {
                    const x = ORIGIN.x + (i - 5) * PIXELS_PER_UNIT;
                    return (
                        <line key={`vgrid-${i}`} x1={x} y1={40} x2={x} y2={VIEW_HEIGHT - 40} />
                    );
                })}
                {Array.from({ length: 9 }, (_, i) => {
                    const y = ORIGIN.y - (i - 4) * PIXELS_PER_UNIT;
                    return (
                        <line key={`hgrid-${i}`} x1={40} y1={y} x2={VIEW_WIDTH - 40} y2={y} />
                    );
                })}
            </g>

            {/* Axes */}
            <g stroke={INK_STRUCTURE} strokeWidth="1.5" strokeLinecap="round">
                <line x1={40} y1={ORIGIN.y} x2={VIEW_WIDTH - 40} y2={ORIGIN.y} />
                <line x1={ORIGIN.x} y1={40} x2={ORIGIN.x} y2={VIEW_HEIGHT - 40} />
            </g>

            {/* Axis labels */}
            <text x={VIEW_WIDTH - 35} y={ORIGIN.y + 18} fill={INK_STRUCTURE} fontSize="12">
                x
            </text>
            <text x={ORIGIN.x + 8} y={50} fill={INK_STRUCTURE} fontSize="12">
                y
            </text>

            {/* Ghost traces */}
            <GhostTraces traces={ghostTraces} />

            {/* Target vector (gray) */}
            <g data-concept="target">
                <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={targetScreen.x}
                    y2={targetScreen.y}
                    stroke={TARGET_COLOR}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    markerEnd="url(#arrow-gray)"
                />
                <text
                    x={targetScreen.x + 8}
                    y={targetScreen.y - 8}
                    fill={TARGET_COLOR}
                    fontSize="12"
                    fontWeight="600"
                >
                    target
                </text>
            </g>

            {/* Basis vectors (faint reference) */}
            <g opacity="0.35">
                <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={basis1Screen.x}
                    y2={basis1Screen.y}
                    stroke={ACCENT_1}
                    strokeWidth="2"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-teal)"
                />
                <text
                    x={basis1Screen.x + 5}
                    y={basis1Screen.y - 8}
                    fill={ACCENT_1}
                    fontSize="11"
                    fontWeight="500"
                >
                    e₁
                </text>
                <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={basis2Screen.x}
                    y2={basis2Screen.y}
                    stroke={ACCENT_2}
                    strokeWidth="2"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-indigo)"
                />
                <text
                    x={basis2Screen.x + 5}
                    y={basis2Screen.y - 8}
                    fill={ACCENT_2}
                    fontSize="11"
                    fontWeight="500"
                >
                    e₂
                </text>
            </g>

            {/* Tip-to-tail construction chain */}
            <TipToTailChain coeff1={coeff1} coeff2={coeff2} />

            {/* Resultant vector (bright amber / success green when reached) */}
            <g data-concept="vbb_resultant">
                <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={resultX}
                    y2={resultY}
                    stroke={reached ? SUCCESS_COLOR : RESULTANT_COLOR}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    markerEnd={reached ? "url(#arrow-success)" : "url(#arrow-amber)"}
                />
            </g>

            {/* Gap line to target (when not reached) */}
            {!reached && (
                <g data-concept="vbb_distanceToTarget">
                    <line
                        x1={resultX}
                        y1={resultY}
                        x2={targetScreen.x}
                        y2={targetScreen.y}
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        opacity="0.6"
                    />
                    <text
                        x={(resultX + targetScreen.x) / 2}
                        y={(resultY + targetScreen.y) / 2 - 8}
                        fill="#ef4444"
                        fontSize="11"
                        fontWeight="500"
                        textAnchor="middle"
                    >
                        {dist.toFixed(1)}
                    </text>
                </g>
            )}

            {/* Success indicator */}
            {reached && (
                <g>
                    <circle
                        cx={targetScreen.x}
                        cy={targetScreen.y}
                        r="18"
                        fill="none"
                        stroke={SUCCESS_COLOR}
                        strokeWidth="2.5"
                        opacity="0.6"
                    />
                    <text
                        x={VIEW_WIDTH / 2}
                        y={50}
                        fill={SUCCESS_COLOR}
                        fontSize="14"
                        fontWeight="600"
                        textAnchor="middle"
                    >
                        Target reached!
                    </text>
                </g>
            )}

            {/* Coefficient readout */}
            <g fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
                <text x={VIEW_WIDTH - 140} y={VIEW_HEIGHT - 70} fill={INK}>
                    <tspan fill={ACCENT_1} fontWeight="600">{coeff1}</tspan>
                    <tspan fill={INK}> × e₁ + </tspan>
                    <tspan fill={ACCENT_2} fontWeight="600">{coeff2}</tspan>
                    <tspan fill={INK}> × e₂</tspan>
                </text>
                <text x={VIEW_WIDTH - 140} y={VIEW_HEIGHT - 50} fill={INK}>
                    = ({resultant[0].toFixed(1)}, {resultant[1].toFixed(1)})
                </text>
            </g>
        </svg>
    );
}

// ── Figure composition ────────────────────────────────────────────────────────

function BasisRecipeFigure() {
    const setVar = useSetVar();
    const coeff1 = useVar<number>("vbb_coeff1", 1);
    const coeff2 = useVar<number>("vbb_coeff2", 0);

    return (
        <Figure
            id="figure-basis-recipe"
            onReset={() => {
                setVar("vbb_coeff1", 1);
                setVar("vbb_coeff2", 0);
                setVar("vbb_ghostTraces", []);
            }}
            caption="Adjust the coefficients to construct the target vector using the two basis vectors."
        >
            <BasisRecipeDrawing />
            <div className="flex flex-wrap items-center justify-center gap-6 px-6 pb-5 pt-3">
                <IntegerSpinner
                    value={coeff1}
                    onChange={(v) => setVar("vbb_coeff1", v)}
                    min={-4}
                    max={4}
                    label="e₁"
                    color={ACCENT_1}
                />
                <IntegerSpinner
                    value={coeff2}
                    onChange={(v) => setVar("vbb_coeff2", v)}
                    min={-4}
                    max={4}
                    label="e₂"
                    color={ACCENT_2}
                />
            </div>
            <InteractionHintSequence
                hintKey="vectors-basis-recipe-spinners"
                steps={[
                    {
                        gesture: "click",
                        label: "Click + or − to change how many copies of each basis vector to use",
                        position: { x: "35%", y: "92%" },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported section blocks ───────────────────────────────────────────────────

export const vectorsBuildingBlocksBlocks: ReactElement[] = [
    // Section heading
    <StackLayout key="layout-vectors-title" maxWidth="xl">
        <Block id="vectors-title" padding="md">
            <EditableH2 id="h2-vectors-title" blockId="vectors-title">
                Vectors: The Building Blocks
            </EditableH2>
        </Block>
    </StackLayout>,

    // Introduction paragraph
    <StackLayout key="layout-vectors-intro" maxWidth="xl">
        <Block id="vectors-intro" padding="sm">
            <EditableParagraph id="para-vectors-intro" blockId="vectors-intro">
                What is a vector? You might think of it as a list of numbers, like (3, 2).
                But that description misses the point. A vector is fundamentally a{" "}
                <InlineTooltip
                    id="tooltip-geometric-object"
                    tooltip="An object defined by its geometric properties in space, not by any particular coordinate system"
                >
                    geometric object
                </InlineTooltip>{" "}
                with two essential properties: a <strong>magnitude</strong> (how long it is)
                and a <strong>direction</strong> (where it points).
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Key insight paragraph
    <StackLayout key="layout-vectors-insight" maxWidth="xl">
        <Block id="vectors-insight" padding="sm">
            <EditableParagraph id="para-vectors-insight" blockId="vectors-insight">
                The numbers (3, 2) are not the vector itself. They are a{" "}
                <em>recipe</em> for constructing the vector from chosen{" "}
                <InlineTooltip
                    id="tooltip-basis-vectors"
                    tooltip="A set of vectors that can be combined to reach any point in the space"
                >
                    basis vectors
                </InlineTooltip>
                . Change the basis, and the same geometric arrow has completely different numbers.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Visualization heading
    <StackLayout key="layout-vectors-viz-heading" maxWidth="xl">
        <Block id="vectors-viz-heading" padding="sm">
            <EditableH3 id="h3-vectors-viz-heading" blockId="vectors-viz-heading">
                The Recipe Constructor
            </EditableH3>
        </Block>
    </StackLayout>,

    // Explanation before visualization
    <StackLayout key="layout-vectors-viz-explanation" maxWidth="xl">
        <Block id="vectors-viz-explanation" padding="sm">
            <EditableParagraph id="para-vectors-viz-explanation" blockId="vectors-viz-explanation">
                Below you have two basis vectors:{" "}
                <InlineSpotColor varName="vbb_coeff1" color={ACCENT_1}>
                    e₁
                </InlineSpotColor>{" "}
                (teal) and{" "}
                <InlineSpotColor varName="vbb_coeff2" color={ACCENT_2}>
                    e₂
                </InlineSpotColor>{" "}
                (indigo). Your goal is to reach the gray target vector using only
                whole-number multiples of these two ingredients.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // The visualization
    <StackLayout key="layout-vectors-viz" maxWidth="xl">
        <Block id="vectors-viz" padding="sm" hasVisualization>
            <BasisRecipeFigure />
        </Block>
    </StackLayout>,

    // Guided exploration
    <StackLayout key="layout-vectors-exploration" maxWidth="xl">
        <Block id="vectors-exploration" padding="sm">
            <EditableParagraph id="para-vectors-exploration" blockId="vectors-exploration">
                Use the + and − buttons to adjust how many copies of each basis vector
                you use. Watch how the colored segments stack tip-to-tail, and how the
                amber resultant arrow shows where you end up. Can you find the exact
                combination that lands on the target?
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Formula block
    <StackLayout key="layout-vectors-formula" maxWidth="xl">
        <Block id="vectors-formula" padding="md">
            <FormulaBlock
                id="formula-linear-combination"
                latex="\vec{v} = \scrub{vbb_coeff1} \cdot \clr{basis1}{\vec{e}_1} + \scrub{vbb_coeff2} \cdot \clr{basis2}{\vec{e}_2}"
                variables={{
                    vbb_coeff1: { min: -4, max: 4, step: 1, color: ACCENT_1 },
                    vbb_coeff2: { min: -4, max: 4, step: 1, color: ACCENT_2 },
                }}
                colorMap={{
                    basis1: ACCENT_1,
                    basis2: ACCENT_2,
                }}
            />
        </Block>
    </StackLayout>,

    // Reflection paragraph
    <StackLayout key="layout-vectors-reflection" maxWidth="xl">
        <Block id="vectors-reflection" padding="sm">
            <EditableParagraph id="para-vectors-reflection" blockId="vectors-reflection">
                Notice what happened: you can reach <em>any</em> vector in the plane
                by choosing the right coefficients. The numbers you adjust are not
                properties of the target itself. They are instructions for how to
                combine the basis vectors to construct it. This is why we call
                vectors <em>coordinate-free</em> objects.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Assessment heading
    <StackLayout key="layout-vectors-assessment-heading" maxWidth="xl">
        <Block id="vectors-assessment-heading" padding="sm">
            <EditableH3 id="h3-vectors-assessment-heading" blockId="vectors-assessment-heading">
                Check Your Understanding
            </EditableH3>
        </Block>
    </StackLayout>,

    // Assessment question
    <StackLayout key="layout-vectors-question" maxWidth="xl">
        <Block id="vectors-question" padding="sm">
            <EditableParagraph id="para-vectors-question" blockId="vectors-question">
                With two non-parallel basis vectors, can you reach any point in the 2D plane
                by choosing the right coefficients?{" "}
                <InlineFeedback
                    varName="vbb_answer_reach_any"
                    correctValue="yes"
                    position="terminal"
                    successMessage="Exactly! Two non-parallel vectors span the entire plane"
                    failureMessage="Not quite."
                    hint="Try the visualization with different targets in your mind"
                    reviewBlockId="vectors-reflection"
                    reviewLabel="Review the key insight"
                    visualizationHint={{
                        blockId: "vectors-viz",
                        hintKey: "vectors-reach-any-hint",
                        steps: [
                            {
                                gesture: "click",
                                label: "Try adjusting both coefficients to see how far you can reach",
                                position: { x: "50%", y: "92%" },
                            },
                        ],
                        label: "Explore it yourself",
                        resetVars: { vbb_coeff1: 0, vbb_coeff2: 0 },
                    }}
                >
                    <InlineClozeChoice
                        varName="vbb_answer_reach_any"
                        correctAnswer="yes"
                        options={["yes", "no", "only some"]}
                        {...choicePropsFromDefinition(getVariableInfo("vbb_answer_reach_any"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // Closing insight
    <StackLayout key="layout-vectors-closing" maxWidth="xl">
        <Block id="vectors-closing" padding="sm">
            <EditableParagraph id="para-vectors-closing" blockId="vectors-closing">
                This insight is foundational for understanding Hilbert spaces: vectors
                are not their coordinates. The coordinates depend on your choice of
                basis, but the geometric object itself remains unchanged. In the next
                section, we will see how collections of vectors form <em>vector spaces</em>
                with rich algebraic structure.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
