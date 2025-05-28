import { Database } from "./database";
import * as fs from "fs/promises";
import * as path from "path";

interface UserCredentials {
    username: string;
    password: string;
}

async function databaseFileExists(database: string): Promise<boolean> {
    try {
        await fs.access(database);
        return true;
    } catch {
        return false;
    }
}

async function readUsers(userFile: string): Promise<UserCredentials[]> {
    try {
        const userData = await fs.readFile(userFile, "utf-8");
        return JSON.parse(userData);
    } catch {
        throw new Error("user.json file not found or invalid.");
    }
}

function validateUser(users: UserCredentials[], username: string, password: string): boolean {
    return users.some(u => u.username === username && u.password === password);
}

export async function connect({
    database,
    username,
    password,
}: { database: string; username: string; password: string }): Promise<Database> {
    if (!await databaseFileExists(database)) {
        throw new Error("Database file does not exist.");
    }

    const userFile = path.resolve(path.dirname(database), "user.json");
    const users = await readUsers(userFile);

    if (!validateUser(users, username, password)) {
        throw new Error("Invalid username or password.");
    }

    return new Database(database);
}