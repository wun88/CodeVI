export const DEFAULT_THRESHOLDS = {
    // Long Method
    LONG_METHOD_LINES: 20,

    // Large Class
    LARGE_CLASS_FIELDS: 15,
    LARGE_CLASS_METHODS: 20,
    LARGE_CLASS_LOC: 300,

    // Long Parameter List
    LONG_PARAMETER_COUNT: 4,

    // Duplicated Code
    DUPLICATED_CODE_SIMILARITY: 0.8,  // 80%
    DUPLICATED_CODE_MIN_TOKENS: 50,

    // Data Clumps
    DATA_CLUMPS_MIN_PARAMS: 3,
    DATA_CLUMPS_MIN_OCCURRENCES: 2,

    // Switch Statements
    SWITCH_MIN_CASES: 3,

    // Cyclomatic Complexity
    HIGH_COMPLEXITY: 10,
    VERY_HIGH_COMPLEXITY: 20,
} as const;
