const fs = require("fs");
const path = require("path");
const { execFile, spawn } = require("child_process");
const { randomUUID } = require("crypto");

const TIME_LIMIT = 5000;

module.exports = (code, input = "", testCases = null) => {
    return new Promise((resolve) => {
        const id = randomUUID();
        const dir = path.join(__dirname, "../temp", id);

        let finished = false;

        function cleanup() {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            } catch (err) {
                console.error("Cleanup error:", err.message);
            }
        }

        function finish(result) {
            if (finished) return;
            finished = true;
            cleanup();
            resolve(result);
        }

        try {
            fs.mkdirSync(dir, { recursive: true });

            // Find the public class name.
            const match = code.match(
                /public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/
            );

            if (!match) {
                return finish({
                    success: false,
                    output: "No public class found.",
                    stdout: "",
                    stderr: "No public class found.",
                    exitCode: 1
                });
            }

            const className = match[1];
            const javaFile = path.join(dir, `${className}.java`);

            fs.writeFileSync(javaFile, code);

            // Compile exactly once.
            execFile(
                "javac",
                [javaFile],
                { timeout: 15000 },
                async (compileErr, compileStdout, compileStderr) => {
                    if (finished) return;

                    if (compileErr) {
                        return finish({
                            success: false,
                            output: compileStderr || compileStdout ||
                                compileErr.message,
                            stdout: compileStdout || "",
                            stderr: compileStderr || compileErr.message,
                            exitCode: compileErr.code ?? 1
                        });
                    }

                    // Batch mode: reuse the compiled class for all tests.
                    if (Array.isArray(testCases)) {
                        const results = [];

                        for (let i = 0; i < testCases.length; i++) {
                            const tc = testCases[i];

                            const result = await runJava(
                                dir,
                                className,
                                tc.input ?? ""
                            );

                            const actual = result.stdout.trim();
                            const expected = String(
                                tc.expectedOutput ?? ""
                            ).trim();

                            results.push({
                                testCase: i + 1,
                                passed:
                                    result.success &&
                                    actual === expected,
                                input: tc.input ?? "",
                                expectedOutput: expected,
                                actualOutput: actual,
                                stderr: result.stderr,
                                exitCode: result.exitCode,
                                error: result.error || null
                            });
                        }

                        const passed = results.filter(
                            (r) => r.passed
                        ).length;

                        return finish({
                            success: true,
                            output: `Passed ${passed}/${results.length} test cases`,
                            stdout: "",
                            stderr: "",
                            exitCode: 0,
                            total: results.length,
                            passed,
                            failed: results.length - passed,
                            testResults: results
                        });
                    }

                    // Backward-compatible single-input mode.
                    const result = await runJava(
                        dir,
                        className,
                        input
                    );

                    finish({
                        success: result.success,
                        output: result.stderr || result.stdout ||
                            result.error || "",
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode
                    });
                }
            );
        } catch (err) {
            finish({
                success: false,
                output: err.message,
                stdout: "",
                stderr: err.message,
                exitCode: 1
            });
        }
    });
};

function runJava(dir, className, input) {
    return new Promise((resolve) => {
        let child;

        try {
            child = spawn("java", ["-cp", dir, className]);
        } catch (err) {
            return resolve({
                success: false,
                stdout: "",
                stderr: err.message,
                exitCode: 1,
                error: err.message
            });
        }

        let stdout = "";
        let stderr = "";
        let settled = false;
        let timedOut = false;

        function settle(result) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        }

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, TIME_LIMIT);

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("error", (err) => {
            settle({
                success: false,
                stdout,
                stderr,
                exitCode: 1,
                error: err.message
            });
        });

        child.on("close", (exitCode) => {
            if (timedOut) {
                return settle({
                    success: false,
                    stdout,
                    stderr: stderr || "Time Limit Exceeded",
                    exitCode: -1,
                    error: "Time Limit Exceeded"
                });
            }

            settle({
                success: exitCode === 0,
                stdout,
                stderr,
                exitCode
            });
        });

        child.stdin.on("error", () => {
            // The program may close stdin before all input is written.
        });

        child.stdin.end(String(input ?? ""));
    });
}