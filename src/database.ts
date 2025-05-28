import fs from "fs";
import path from "path";
import { Model } from "./model";

export class Database {
  name: string;
  dbPath: string;
  models: Record<string, Model>;

  constructor(name: string) {
    this.name = name;
    this.dbPath = path.join(__dirname, "JSANDB", name);
    if (!fs.existsSync(this.dbPath)) fs.mkdirSync(this.dbPath);
    this.models = {};
  }

  createModel<T>(modelName: string, schema: Record<string, { type: string }>): Model<T> {
    const filePath = path.join(this.dbPath, `${modelName}.json`);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    this.models[modelName] = new Model<T>(filePath, schema);
    return this.models[modelName];
  }
}