const fs = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");

module.exports = (code, input = "") => {
    return new Promise((resolve) => {

        const dir = path.join(__dirname, "../temp");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);

        const filePath = path.join(dir, "Main.java");

        fs.writeFileSync(filePath, code);

        exec(`javac "${filePath}"`, (compileErr, stdout, stderr) => {

            if (compileErr) {
                return resolve({
                    success: false,
                    stdout,
                    stderr
                });
            }

            const child = spawn("java", ["-cp", dir, "Main"]);

            let output = "";
            let error = "";

            child.stdout.on("data", (data) => {
                output += data.toString();
            });

            child.stderr.on("data", (data) => {
                error += data.toString();
            });

            child.on("close", (code) => {
                resolve({
                    success: code === 0,
                    stdout: output,
                    stderr: error
                });
            });

            if (input) {
                child.stdin.write(input);
            }

            child.stdin.end();

        });

    });
};