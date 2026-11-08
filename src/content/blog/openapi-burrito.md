---
title: 'openapi-burrito: openapi-typescript, but for Python'
description: 'A generator that turns an OpenAPI spec into a small, typed Python client. You call endpoints by their path, and the only dependency is httpx.'
pubDate: 'Nov 08 2026'
tags: ['Python', 'API Design']
---

At the start of this year I was building a client for [ArtifactsMMO](https://artifactsmmo.com), a game you play through its API. I wanted a generated client, but a lightweight one. In TypeScript, [openapi-typescript and openapi-fetch](https://openapi-ts.dev/) do exactly that, and I wanted the same for Python.

**Disclaimer:** I wasn't able to finish openapi-burrito right when I started, because I got busy. However, I've now taken the time to finish it, with the help of AI (Claude Code).

## What it does

You give it an OpenAPI spec and it generates a small, readable Python package. That package depends on httpx and nothing else, not even openapi-burrito. There's no framework and no unusual API to learn. You get a basic client with `GET`, `POST`, `PUT`, `PATCH`, `DELETE` and so on, and the paths are typed:

```python
from my_client import AsyncClient

api = AsyncClient(base_url="https://petstore3.swagger.io/api/v3")

res = await api.GET("/pet/{pet_id}", pet_id=1)
if res.data is not None:
    print(res.data["name"])  # res.data is a Pet (a TypedDict)

await api.DELETE("/pet/{pet_id}", pet_id=1)
```

Your type checker knows every path, the arguments each one takes and what it returns, and your editor autocompletes them. Models are TypedDicts, which only exist for the type checker. At runtime, `res.data` is simply the parsed JSON.

## Why Python suits this

Python turned out to be an even better fit for this than TypeScript, because it has keyword arguments. JavaScript doesn't, so openapi-fetch has to nest everything:

```ts
client.GET("/pet/{petId}", { params: { path: { petId: 1 } } })
```

In Python it's just `pet_id=1`. The client knows whether each argument belongs in the path, query, header or cookie. Names become snake_case on your side, and the client sends the API's own names: `include_owner=True` goes out as `includeOwner=true`. Python also has both sync and async HTTP, so you can generate either client, or both, from the same spec.

## Try it

The code is [on GitHub](https://github.com/simon-lund/openapi-burrito), MIT-licensed, with examples for [ArtifactsMMO](https://github.com/simon-lund/openapi-burrito/tree/main/examples/artifactsmmo) and the [Petstore](https://github.com/simon-lund/openapi-burrito/tree/main/examples/petstore). I also tested it on big real-world specs: the GitHub API (1,272 operations) generates in about 20 seconds and passes `mypy --strict` and pyright, and Stripe (612 operations) passes `mypy --strict`.

Try it with your own OpenAPI spec if you call an API from Python and want types without extra runtime dependencies. It works and it's well tested, but it's version 0.2 and I'm not sure it's production-ready yet. If it breaks on your spec, tell me where.

```bash
uv tool install openapi-burrito
openapi-burrito generate openapi.json -o my_client
```

Known gaps:

- No discriminator handling (you get the plain union).
- An inline `allOf` of several schemas becomes `Any`.
- Swagger 2.0 specs need converting first (`npx swagger2openapi`).

## Security

I cross-checked the CVEs of the existing generators listed below. Most of them didn't apply. However, [CVE-2020-15142](https://github.com/advisories/GHSA-9x4c-63pf-525f) was relevant: a malicious spec can end up as code in the generated client. To mitigate this, identifiers go through one sanitizer, literals go through `repr()`, and property tests throw arbitrary strings at both.

[CVE-2026-55389](https://github.com/advisories/GHSA-8359-h9fx-j6v9) and [CVE-2026-54690](https://github.com/advisories/GHSA-954p-556p-r752) were also relevant: through an external `$ref`, a spec could read local files and URLs into the generated code. To prevent this, a `$ref` can only reach files inside the spec's folder, unless you pass `--allow-external-refs`.

## Other generators

- **[openapi-python-client](https://github.com/openapi-generators/openapi-python-client)** generates model classes with (de)serialization code. That's more runtime machinery, and you call one function per operation instead of a path.
- **[openapi-generator](https://github.com/OpenAPITools/openapi-generator)** is Java-based, supports many languages and has heavier output.
- **[datamodel-code-generator](https://github.com/datamodel-code-generator/datamodel-code-generator)** is great for models, but it doesn't generate a client.
