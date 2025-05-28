const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");

const BASE_DIR = path.join(__dirname, "..", "JSANDB");
const ADMIN_DB = path.join(BASE_DIR, "admin_db");
const USERS_FILE = path.join(ADMIN_DB, "user.json");
const ROLES_FILE = path.join(ADMIN_DB, "roles.json");

async function setupAdminDB() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Enter admin username: ", (username) => {
        rl.question("Enter admin password: ", (password) => {
            rl.question("Enter default database name: ", (database) => {
                // Create necessary directories
                if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR);
                if (!fs.existsSync(ADMIN_DB)) fs.mkdirSync(ADMIN_DB);

                // Store admin credentials securely
                const adminData = {
                    username: username,
                    password: crypto.createHash("sha256").update(password).digest("hex"),
                    defaultDB: database
                };
                fs.writeFileSync(USERS_FILE, JSON.stringify(adminData, null, 2));

                // Define default roles and permissions
                const rolesData = {
                    admin: ["ALL"],
                    user: ["READ", "WRITE"]
                };
                fs.writeFileSync(ROLES_FILE, JSON.stringify(rolesData, null, 2));

                console.log("✅ Admin database initialized successfully!");
                console.log("✅ Roles configuration created successfully!");
                rl.close();
            });
        });
    });
}

setupAdminDB();