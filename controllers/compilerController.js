const runPython = require("../services/pythonCompiler");
const runJava = require("../services/javaCompiler");
const runC = require("../services/cCompiler");
const runCpp = require("../services/cppCompiler");

exports.runCode = async (req, res) => {
    const { language, code, input } = req.body;

    if (!language || !code) {
        return res.status(400).json({
            success: false,
            message: "language and code are required",
        });
    }

    try {
        switch (language.toLowerCase()) {
            case "python":
                return res.json(await runPython(code, input));

            case "java":
                return res.json(await runJava(code, input));

            case "c":
                return res.json(await runC(code, input));

            case "cpp":
            case "c++":
                return res.json(await runCpp(code, input));

            default:
                return res.status(400).json({
                    success: false,
                    message: "Unsupported language",
                });
        }
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.getLanguages = (req, res) => {
    res.json([
        "python",
        "java",
        "c",
        "cpp"
    ]);
};