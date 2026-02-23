# @quercle/sdk

Generated JavaScript/TypeScript SDK for the Quercle API.

- OpenAPI version: 1.0.0
- This repository is synchronized automatically from Quercle API releases.

## Installation

```bash
npm install @quercle/sdk
```

## Usage

```ts
import { createClient, postV1Search } from "@quercle/sdk";

const client = createClient({
  baseUrl: "https://api.quercle.dev",
  auth: process.env.QUERCLE_API_KEY,
});

const response = await postV1Search({
  client,
  body: { query: "latest bun release notes" },
});

console.log(response.data?.result);
```
