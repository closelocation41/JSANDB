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

    /** Find and update one record matching query */
    async findOneAndUpdate(query: Partial<T>, update: Partial<T>): Promise<T | null> {
        const mingoQuery = new mingo.Query(query);
        const tempPath = join(tmpdir(), `model-findoneupdate-${Date.now()}.jsonl`);
        const readStream = createReadStream(this.filePath);
        const writeStream = createWriteStream(tempPath);

        let updatedRecord: T | null = null;
        let updated = false;
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            let record = JSON.parse(line);
            if (!updated && mingoQuery.test(record)) {
                record = { ...record, ...update };
                updatedRecord = record;
                updated = true;
            }
            writeStream.write(JSON.stringify(record) + "\n");
        }
        writeStream.end();

        await new Promise<void>((resolve) => writeStream.on("finish", () => resolve()));
        await fsPromises.rename(tempPath, this.filePath);
        return updatedRecord;
    }

    /** Find and delete one record matching query */
    async findOneAndDelete(query: Partial<T>): Promise<T | null> {
        const mingoQuery = new mingo.Query(query);
        const tempPath = join(tmpdir(), `model-findonedelete-${Date.now()}.jsonl`);
        const readStream = createReadStream(this.filePath);
        const writeStream = createWriteStream(tempPath);

        let deletedRecord: T | null = null;
        let deleted = false;
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (!deleted && mingoQuery.test(record)) {
                deletedRecord = record;
                deleted = true;
                continue;
            }
            writeStream.write(JSON.stringify(record) + "\n");
        }
        writeStream.end();

        await new Promise<void>((resolve) => writeStream.on("finish", () => resolve()));
        await fsPromises.rename(tempPath, this.filePath);
        return deletedRecord;
    }

    /** Distinct values for a field */
    async distinct<K extends keyof T>(field: K, query: Partial<T> = {}): Promise<T[K][]> {
        const mingoQuery = new mingo.Query(query);
        const values = new Set<T[K]>();

        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) {
                values.add(record[field]);
            }
        }
        return Array.from(values);
    }

    /** Project fields (like MongoDB's projection) */
    async project(query: Partial<T>, projection: Partial<Record<keyof T, 0 | 1>>): Promise<Partial<T>[]> {
        const mingoQuery = new mingo.Query(query);
        const results: Partial<T>[] = [];

        const includeFields = Object.entries(projection)
            .filter(([_, v]) => v === 1)
            .map(([k]) => k);

        const excludeFields = Object.entries(projection)
            .filter(([_, v]) => v === 0)
            .map(([k]) => k);

        const rl = readline.createInterface({
            input: createReadStream(this.filePath),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            if (mingoQuery.test(record)) {
                let projected: Partial<T> = {};
                if (includeFields.length > 0) {
                    for (const field of includeFields) {
                        projected[field as keyof T] = record[field];
                    }
                } else if (excludeFields.length > 0) {
                    projected = { ...record };
                    for (const field of excludeFields) {
                        delete projected[field as keyof T];
                    }
                } else {
                    projected = record;
                }
                results.push(projected);
            }
        }
        return results;
    }
}