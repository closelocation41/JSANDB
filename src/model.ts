import fs from "fs";
import mingo from "mingo";
import readline from "readline";
import { createReadStream, createWriteStream, promises as fsPromises } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export class Model<T> {
    filePath: string;
    schema: Record<string, { type: string }>;

    constructor(filePath: string, schema: Record<string, { type: string }>) {
        this.filePath = filePath;
        this.schema = schema;
    }

    /** Insert a new record (append mode) */
    async insert(data: T): Promise<Model<T>> {
        const json = JSON.stringify(data);
        await fsPromises.appendFile(this.filePath, json + "\n");
        return this;
    }

    /** Find records using query (streaming, memory efficient) */
    async find(query: Partial<T>): Promise<T[]> {
        const results: T[] = [];
        const mingoQuery = new mingo.Query(query);

        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) results.push(record);
        }
        return results;
    }

    /** Find one record matching query */
    async findOne(query: Partial<T>): Promise<T | null> {
        const mingoQuery = new mingo.Query(query);

        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) return record;
        }
        return null;
    }

    /** Update records matching query (streaming, memory efficient) */
    async update(query: Partial<T>, update: Partial<T>): Promise<Model<T>> {
        const mingoQuery = new mingo.Query(query);
        const tempPath = join(tmpdir(), `model-update-${Date.now()}.jsonl`);
        const readStream = createReadStream(this.filePath);
        const writeStream = createWriteStream(tempPath);

        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            let record = JSON.parse(line);
            if (mingoQuery.test(record)) {
                record = { ...record, ...update };
            }
            writeStream.write(JSON.stringify(record) + "\n");
        }
        writeStream.end();

        await new Promise<void>((resolve) => writeStream.on("finish", () => resolve()));
        await fsPromises.rename(tempPath, this.filePath);
        return this;
    }

    /** Delete records matching query */
    async delete(query: Partial<T>): Promise<number> {
        const mingoQuery = new mingo.Query(query);
        const tempPath = join(tmpdir(), `model-delete-${Date.now()}.jsonl`);
        const readStream = createReadStream(this.filePath);
        const writeStream = createWriteStream(tempPath);

        let deletedCount = 0;
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) {
                deletedCount++;
                continue;
            }
            writeStream.write(JSON.stringify(record) + "\n");
        }
        writeStream.end();

        await new Promise<void>((resolve) => writeStream.on("finish", () => resolve()));
        await fsPromises.rename(tempPath, this.filePath);
        return deletedCount;
    }

    /** Count records matching query */
    async count(query: Partial<T> = {}): Promise<number> {
        const mingoQuery = new mingo.Query(query);
        let count = 0;

        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) count++;
        }
        return count;
    }

    /** Aggregate records using Mingo (streaming, memory efficient) */
    async aggregate(pipeline: any[]): Promise<any[]> {
        const records: T[] = [];
        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            records.push(JSON.parse(line));
        }
        return mingo.aggregate(records, pipeline);
    }

    /** Filter records using query (streaming, memory efficient) */
    async filter(query: Partial<T>): Promise<T[]> {
        return this.find(query);
    }

    /** Get all records (use with caution for large files) */
    async all(): Promise<T[]> {
        const results: T[] = [];
        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            results.push(JSON.parse(line));
        }
        return results;
    }

    /** Paginate records */
    async paginate(query: Partial<T>, page: number, pageSize: number): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
        const mingoQuery = new mingo.Query(query);
        const results: T[] = [];
        let total = 0;
        let skipped = 0;
        let taken = 0;

        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) {
                total++;
                if (skipped < (page - 1) * pageSize) {
                    skipped++;
                    continue;
                }
                if (taken < pageSize) {
                    results.push(record);
                    taken++;
                }
            }
            if (taken >= pageSize) break;
        }
        return { data: results, total, page, pageSize };
    }

     async getAll(): Promise<T[]> {
        const data = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(data) as T[];
    }
}