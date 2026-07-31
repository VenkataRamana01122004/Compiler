const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

module.exports = (code, input = "") => {
    return new Promise((resolve) => {

        const dir = path.join(__dirname, "../temp");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const source = path.join(dir, "program.c");
        const exe = path.join(dir, "program.exe");

        fs.writeFileSync(source, code);

        exec(`gcc "${source}" -o "${exe}"`, (err, stdout, stderr) => {

            if (err) {
                cleanup();

                return resolve({
                    success: false,
                    output: stderr || stdout,
                    stdout,
                    stderr,
                    exitCode: err.code
                });
            }

            const child = spawn(exe);

            let output = "";
            let error = "";

            child.stdout.on("data", data => {
                output += data.toString();
            });

            child.stderr.on("data", data => {
                error += data.toString();
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
                    output: error || output,
                    stdout: output,
                    stderr: error,
                    exitCode: code
                });

            });

        });

        function cleanup() {
            try {
                if (fs.existsSync(source)) fs.unlinkSync(source);
                if (fs.existsSync(exe)) fs.unlinkSync(exe);
            } catch (err) {
                console.error(err);
            }
        }

    });
};