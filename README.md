# JSANDB Documentation

JSANDB is a lightweight, file-based database for JavaScript and TypeScript projects. This guide covers installation, setup, usage of models, and file-based database operations.

---

## Installation

```bash
npm install jsandb
```

---

## Setup

```typescript
import { JSANDB } from 'jsandb';

const DB1 = await JSANDB.connect({
    database: 'DB1',
    username: 'admin',
    password: 'JSANDB@123'
});
```

---

## Defining and Using Models

Create models and perform operations:

```typescript
DB1.createModel({
    name: 'user',
    schema: {
        name: String,
        email: String,
        age: Number,
    }
});

// Insert a new user
await DB1.user.insert({ name: 'Alice', email: 'alice@example.com', age: 25 });

// Update user(s)
await DB1.user.update({ name: 'Alice' }, { age: 26 });

// Find user(s)
const users = await DB1.user.find({ age: { $gte: 18 } });

// Aggregate user data
const stats = await DB1.user.aggregate({ groupBy: 'age' });

// Filter user(s)
const filtered = await DB1.user.filter({ email: /@example\.com$/ });
```

---

## File-based Database Operations

JSANDB stores each model as a separate JSON file in the specified directory. All CRUD operations interact directly with these files.

---

## Configuration

You can customize the database name, username, password, and other options in the `JSANDB.connect` method. All data is stored as JSON files in the specified directory.

---

## Further Reading

- [API Reference](./docs/api.md)
- [Examples](./examples)

---

For more details, visit the [official documentation](https://github.com/your-org/jsandb).
