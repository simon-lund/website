---
title: 'openapi-burrito: openapi-typescript, but for Python'
description: 'A generator that turns an OpenAPI spec into a small, typed Python client. You call endpoints by their path, and the only dependency is httpx.'
pubDate: 'Nov 08 2026'
tags: ['Python', 'API Design']
draft: true
---

At the start of this year I was building a client for [ArtifactsMMO](https://artifactsmmo.com), a game you play through its API. I wanted a generated client, but a lightweight one. In TypeScript, [openapi-typescript and openapi-fetch](https://openapi-ts.dev/) do exactly that, and I wanted the same for Python.

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

## Finishing it

Then I got busy with other things and only worked on it now and then. I've now finished it with the help of AI (Claude Code).

A code generator turns text from a spec into code, so it can be an injection risk. I cross-checked known CVEs in other generators so I wouldn't repeat their mistakes, for example [CVE-2020-15142](https://github.com/advisories/GHSA-9x4c-63pf-525f), where a malicious spec could inject code into the generated client. Identifiers go through one sanitizer, literals through `repr()`, and property tests throw arbitrary strings at both.

## Examples

The repo has examples for [ArtifactsMMO](https://github.com/simon-lund/openapi-burrito/tree/main/examples/artifactsmmo) and the [Petstore](https://github.com/simon-lund/openapi-burrito/tree/main/examples/petstore). I also tested it on big real-world specs: the GitHub API (1,272 operations) generates in about 20 seconds and passes `mypy --strict` and pyright, and Stripe (612 operations) passes `mypy --strict`.

## Other generators

- **openapi-python-client** generates model classes with (de)serialization code. That's more runtime machinery, and you call one function per operation instead of a path.
- **openapi-generator** is Java-based, supports many languages and has heavier output.
- **datamodel-code-generator** is great for models, but it doesn't generate a client.

## Try it

It's for anyone who calls an OpenAPI-described API from Python and wants types without extra runtime dependencies. Feel free to try it and experiment with it. It works and it's well tested, but it's version 0.2 and I'm not sure it's production-ready yet. If you throw your own spec at it, tell me where it breaks.

Known gaps: no discriminator handling (you get the plain union), an inline `allOf` of several schemas becomes `Any`, and Swagger 2.0 specs need converting first (`npx swagger2openapi`).

```bash
uv tool install openapi-burrito
openapi-burrito generate openapi.json -o my_client
```

The code is [on GitHub](https://github.com/simon-lund/openapi-burrito), MIT-licensed.
