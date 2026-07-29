const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

module.exports = (code, input = "") => {
    return new Promise((resolve) => {

        const dir = path.join(__dirname, "../temp");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filePath = path.join(dir, "main.py");
        fs.writeFileSync(filePath, code);

        const child = spawn("python", [filePath]);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", data => stdout += data.toString());
        child.stderr.on("data", data => stderr += data.toString());

        if (input) child.stdin.write(input);
        child.stdin.end();

        child.on("close", code => {
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code
            });
        });
    });
};