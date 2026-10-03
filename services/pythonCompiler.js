const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
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

            const filePath = path.join(dir, "main.py");
            fs.writeFileSync(filePath, code);

            // Batch mode: execute once per test case.
            if (Array.isArray(testCases)) {
                runBatch(filePath, testCases)
                    .then(finish)
                    .catch(err => {
                        finish({
                            success: false,
                            output: err.message,
                            stdout: "",
                            stderr: err.message,
                            exitCode: 1
                        });
                    });

                return;
            }

            // Backward-compatible single-input mode.
            runPython(filePath, input ?? "")
                .then(result => finish({
                    success: result.success,
                    output: result.stderr || result.stdout ||
                        result.error || "",
                    stdout: result.stdout,
                    stderr: result.stderr,
                    exitCode: result.exitCode
                }));
        } catch (err) {
            finish({
                success: false,
                output: err.message,
                stdout: "",
                stderr: err.message,
                exitCode: 1
            });
        }

        async function runBatch(filePath, cases) {
            const results = [];

            for (let i = 0; i < cases.length; i++) {
                const tc = cases[i];

                const result = await runPython(
                    filePath,
                    tc.input ?? ""
                );

                const actual = result.stdout.trim();
                const expected = String(
                    tc.expectedOutput ?? ""
                ).trim();

                results.push({
                    testCase: i + 1,
                    passed: result.success && actual === expected,
                    input: tc.input ?? "",
                    expectedOutput: expected,
                    actualOutput: actual,
                    stderr: result.stderr,
                    exitCode: result.exitCode,
                    error: result.error || null
                });
            }

            const passed = results.filter(
                r => r.passed
            ).length;

            return {
                success: true,
                output: `Passed ${passed}/${results.length} test cases`,
                stdout: "",
                stderr: "",
                exitCode: 0,
                total: results.length,
                passed,
                failed: results.length - passed,
                testResults: results
            };
        }
    });
};

function runPython(filePath, input) {
    return new Promise((resolve) => {
        let child;

        try {
            child = spawn("python", [filePath], {
                windowsHide: true
            });
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

        child.stdout.on("data", data => {
            stdout += data.toString();
        });

        child.stderr.on("data", data => {
            stderr += data.toString();
        });

        child.on("error", err => {
            settle({
                success: false,
                stdout,
                stderr,
                exitCode: 1,
                error: err.message
            });
        });

        child.on("close", exitCode => {
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

        child.stdin.on("error", () => {});

        child.stdin.end(String(input ?? ""));
    });
}