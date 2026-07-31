const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

module.exports = (code, input = "") => {
    return new Promise((resolve) => {

        const dir = path.join(__dirname, "../temp");

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Find the public class name
        const match = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);

        if (!match) {
            return resolve({
                success: false,
                output: "No public class found.",
                stdout: "",
                stderr: "No public class found."
            });
        }

        const className = match[1];
        const javaFile = path.join(dir, `${className}.java`);
        const classFile = path.join(dir, `${className}.class`);

        fs.writeFileSync(javaFile, code);

        exec(`javac "${javaFile}"`, (compileErr, compileStdout, compileStderr) => {

            if (compileErr) {

                cleanup();

                return resolve({
                    success: false,
                    output: compileStderr || compileStdout,
                    stdout: compileStdout,
                    stderr: compileStderr,
                    exitCode: compileErr.code
                });
            }

            const child = spawn("java", ["-cp", dir, className]);

            let stdout = "";
            let stderr = "";

            child.stdout.on("data", data => {
                stdout += data.toString();
            });

            child.stderr.on("data", data => {
                stderr += data.toString();
            });

            if (input) {
                child.stdin.write(input);
            }

            child.stdin.end();

            const TIME_LIMIT = 5000;
            let timedOut = false;

            const timer = setTimeout(() => {
                timedOut = true;
                child.kill("SIGKILL");
            }, TIME_LIMIT);

            child.on("close", code => {

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

        });

        function cleanup() {
            try {
                if (fs.existsSync(javaFile)) fs.unlinkSync(javaFile);
                if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
            } catch (err) {
                console.error(err);
            }
        }

    });
};