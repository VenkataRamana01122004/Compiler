const runPython = require("../services/pythonCompiler");
const runJava = require("../services/javaCompiler");
const runC = require("../services/cCompiler");
const runCpp = require("../services/cppCompiler");

const COMPILERS = {
    python: runPython,
    java: runJava,
    c: runC,
    cpp: runCpp,
};

// =====================================================
// Normalize output for test-case comparison
// =====================================================
const normalizeOutput = (output) => {
    if (output === null || output === undefined) {
        return "";
    }

    return String(output)
        // Convert literal "\n" into actual newline
        .replace(/\\n/g, "\n")

        // Normalize Windows line endings
        .replace(/\r\n/g, "\n")

        // Normalize remaining \r
        .replace(/\r/g, "\n")

        // Remove trailing spaces from each line
        .split("\n")
        .map(line => line.trimEnd())
        .join("\n")

        // Remove leading/trailing whitespace
        .trim();
};


// =====================================================
// Normalize test cases
// =====================================================
const normalizeTestCases = (testCases) => {
    if (!Array.isArray(testCases)) {
        return testCases;
    }

    return testCases.map(testCase => ({
        ...testCase,

        input: normalizeOutput(testCase.input),
        expectedOutput: normalizeOutput(
            testCase.expectedOutput ??
            testCase.expected ??
            testCase.output ??
            ""
        ),
    }));
};


exports.runCode = async (req, res) => {
    try {
        const {
            language,
            code,
            input = "",
            testCases = null,
        } = req.body;

        // -----------------------------
        // Validate required fields
        // -----------------------------
        if (!language || typeof language !== "string") {
            return res.status(400).json({
                success: false,
                message: "language is required",
            });
        }

        if (!code || typeof code !== "string") {
            return res.status(400).json({
                success: false,
                message: "code is required",
            });
        }

        // -----------------------------
        // Normalize language
        // -----------------------------
        const normalizedLanguage = language
            .trim()
            .toLowerCase();

        const compilerKey =
            normalizedLanguage === "c++"
                ? "cpp"
                : normalizedLanguage;

        const compiler = COMPILERS[compilerKey];

        // -----------------------------
        // Check supported language
        // -----------------------------
        if (!compiler) {
            return res.status(400).json({
                success: false,
                message: `Unsupported language: ${language}`,
                supportedLanguages: Object.keys(COMPILERS),
            });
        }

        // -----------------------------
        // Validate test cases
        // -----------------------------
        if (testCases !== null && !Array.isArray(testCases)) {
            return res.status(400).json({
                success: false,
                message: "testCases must be an array",
            });
        }

        // -----------------------------
        // Normalize test cases
        // -----------------------------
        const normalizedTestCases =
            Array.isArray(testCases)
                ? normalizeTestCases(testCases)
                : null;

        // -----------------------------
        // Run compiler
        // -----------------------------
        const result = await compiler(
            code,
            normalizeOutput(input),
            normalizedTestCases
        );

        // =================================================
        // Normalize compiler result
        // =================================================

        if (result && Array.isArray(result.testResults)) {
            result.testResults = result.testResults.map(test => ({
                ...test,

                input: normalizeOutput(test.input),

                expectedOutput: normalizeOutput(
                    test.expectedOutput ??
                    test.expected ??
                    ""
                ),

                actualOutput: normalizeOutput(
                    test.actualOutput ??
                    test.actual ??
                    test.output ??
                    ""
                ),
            }));
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error("Compiler API error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal compiler error",
        });
    }
};


// -------------------------------------
// Get supported programming languages
// -------------------------------------
exports.getLanguages = (req, res) => {
    return res.status(200).json({
        success: true,
        languages: Object.keys(COMPILERS),
    });
};