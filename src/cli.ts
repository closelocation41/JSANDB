import { Command } from "commander";
import { connect } from "./index";

const program = new Command();

program
    .name("jsandb")
    .description("JSON-based local database CLI")
    .version("1.0.0");

// Create a new database
program
    .command("create-db <database> <username> <password>")
    .description("Create a new database if it does not exist")
    .action(async (database, username, password) => {
        try {
            let DB;
            let dbExists = true;
            try {
                DB = await connect({ database, username, password });
            } catch (err) {
                dbExists = false;
            }
            if (dbExists) {
                console.error(`❌ Database "${database}" already exists.`);
                process.exit(1);
            }
            DB = await connect({ database, username, password });
            const userModel = DB.createModel("users", {
                username: { type: "string" },
                password: { type: "string" }
            });
            await userModel.insert({ username, password });
            console.log(`✅ Database "${database}" created and user "${username}" added.`);
        } catch (error) {
            console.error("❌ Error creating database:", error);
            process.exit(1);
        }
    });


program.parse(process.argv);