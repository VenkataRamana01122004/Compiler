const runPython = require("../services/pythonCompiler");

exports.runCode = async (req, res) => {

    const { language, code, input } = req.body;

    if (!language || !code) {
        return res.status(400).json({
            success: false,
            message: "language and code are required"
        });
    }

    try {

        switch (language.toLowerCase()) {

            case "python":
                return res.json(await runPython(code, input));

            default:
                return res.status(400).json({
                    success: false,
                    message: "Unsupported language"
                });
        }

    } catch (err) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};

exports.getLanguages = (req, res) => {

    res.json([
        "python"
    ]);

};