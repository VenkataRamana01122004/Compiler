const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

module.exports = (code, input = "") => {
    return new Promise((resolve) => {

        const dir = path.join(__dirname, "../temp");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const source = path.join(dir, "program.cpp");
        const exe = path.join(dir, "program.exe");

        fs.writeFileSync(source, code);

        exec(`g++ "${source}" -o "${exe}"`, (err, stdout, stderr) => {

            if (err) {
                return resolve({
                    success: false,
                    stdout,
                    stderr,
                    exitCode: err.code
                });
            }

            const child = spawn(exe);

            let output = "";
            let error = "";

            child.stdout.on("data", data => output += data.toString());
            child.stderr.on("data", data => error += data.toString());

            if (input) child.stdin.write(input);
            child.stdin.end();

            child.on("close", code => {
                resolve({
                    success: code === 0,
                    stdout: output,
                    stderr: error,
                    exitCode: code
                });
            });

        });

    });
};