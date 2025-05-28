
# JSANDB Documentation

JSANDB is a lightweight, file-based database for JavaScript and TypeScript projects. This guide covers installation, setup, usage of models, database operations, and the CLI.

---

## Installation

```bash
npm install jsandb
```

---

## Setup

Initialize JSANDB in your project:

```typescript
import { JSANDB } from 'jsandb';

const db = new JSANDB({
    path: './data', // Directory to store database files
});
```

---

## Defining Models

Create models to structure your data:

```typescript
const User = db.model('User', {
    name: String,
    email: String,
    age: Number,
});
```

---

## Database Operations

### Create

```typescript
const user = await User.create({ name: 'Alice', email: 'alice@example.com', age: 25 });
```

### Read

```typescript
const users = await User.find({ age: { $gte: 18 } });
```

### Update

```typescript
await User.update({ name: 'Alice' }, { age: 26 });
```

### Delete

```typescript
await User.delete({ name: 'Alice' });
```

---

## CLI Usage

JSANDB provides a CLI for database management.

### Initialize Database

```bash
npx jsandb init
```

### Run Migrations

```bash
npx jsandb migrate
```

### Seed Data

```bash
npx jsandb seed
```

---

## Configuration

You can customize the database path and other options in the JSANDB constructor.

---

## Further Reading

- [API Reference](./docs/api.md)
- [CLI Commands](./docs/cli.md)
- [Examples](./examples)

---

For more details, visit the [official documentation](https://github.com/your-org/jsandb).
