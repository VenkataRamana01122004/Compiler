const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

module.exports = (code, input = "") => {
    return new Promise((resolve) => {

        const dir = path.join(__dirname, "../temp");

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filePath = path.join(dir, "main.py");
        fs.writeFileSync(filePath, code);

        const child = spawn("python", [filePath]);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        if (input) {
            child.stdin.write(input);
        }

        child.stdin.end();

        const TIME_LIMIT = 5000; // 5 seconds
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, TIME_LIMIT);

        child.on("close", (code) => {

            clearTimeout(timer);

            cleanup();

            if (timedOut) {
                return resolve({
                    success: false,
                    output: "Time Limit Exceeded",
                    stdout: "",
                    stderr: "Time Limit Exceeded",
                    exitCode: -1
                });
            }

            resolve({
                success: code === 0,
                output: stderr || stdout,
                stdout,
                stderr,
                exitCode: code
            });

        });

        function cleanup() {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (err) {
                console.error(err);
            }
        }

    });
};