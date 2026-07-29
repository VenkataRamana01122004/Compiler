const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { v4: uuid } = require("uuid");

const execFileAsync = promisify(execFile);

async function runPython(code, input = "") {
    const jobId = uuid();

    const dir = path.join(__dirname, "..", "temp", jobId);

    await fs.mkdir(dir, { recursive: true });

    const codeFile = path.join(dir, "main.py");
    const inputFile = path.join(dir, "input.txt");

    await fs.writeFile(codeFile, code);
    await fs.writeFile(inputFile, input);

    try {
        const { stdout, stderr } = await execFileAsync(
            "python",
            [codeFile],
            {
                input,
                timeout: 5000,
                maxBuffer: 1024 * 1024
            }
        );

        return {
            success: true,
            stdout,
            stderr,
            exitCode: 0
        };
    } catch (err) {
        return {
            success: false,
            stdout: err.stdout || "",
            stderr: err.stderr || err.message,
            exitCode: err.code || 1
        };
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}

module.exports = runPython;