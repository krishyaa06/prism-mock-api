<!-- ═════════════ HEADER ═════════════ -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:07060f,50:FF7AC6,100:00D2FF&height=200&section=header&text=Prism%20Mock%20API&fontSize=48&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=Fake%20REST%20API%20from%20a%20JSON%20file&descAlignY=58&descSize=16" width="100%" alt="Prism Mock API" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=19&duration=2600&pause=800&color=FF7AC6&center=true&vCenter=true&width=680&lines=mockapi;Frontend+first%2C+backend+later;db.json+%E2%86%92+REST+API;CRUD+in+one+second" alt="Typing SVG" />
</p>

<p align="center">
  <a href="https://github.com/krishyaa06/prism-mock-api/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/krishyaa06/prism-mock-api/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A518.17-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/dependencies-0-FF7AC6?style=for-the-badge" alt="Zero dependencies" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/krishyaa06/prism-mock-api?style=for-the-badge&color=00D2FF" alt="License" /></a>
</p>

<p align="center">
  <img src="assets/screenshots/demo.png" width="90%" alt="Prism Mock API screenshot" />
</p>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" width="100%" alt="" />

## ⚡ Overview

**Prism Mock API** (`mockapi`) gives your frontend a real backend before the backend exists. Write a `db.json` (or let it create a sample one), run `mockapi` and every top-level array becomes a REST collection with full CRUD, every object becomes a singleton endpoint. Writes are saved back to the file, edits to the file hot-reload, and you get filters, search, sorting, pagination and relations — perfect for prototypes, demos, hackathons and AI-generated frontends.

## ✨ Features

- **CRUD** for every collection: `GET/POST /posts`, `GET/PUT/PATCH/DELETE /posts/:id`
- **Filters**: `?role=dev`, `?likes_gte=100`, `_lte/_gt/_lt/_ne`, regex `?title_like=ai`, full-text `?q=`
- **Sort & paginate**: `?_sort=-likes`, `_page/_limit` with `X-Total-Count` and `Link` headers, `_start/_end`
- **Relations**: `?_embed=comments`, `?_expand=user`, nested `/posts/1/comments`
- **Singletons**: objects like `profile` support GET / PUT / PATCH
- `--delay` to simulate slow networks, `--read-only`, `--prefix /api`, `--no-persist`
- CORS on, colourful request log, auto free port, LAN URL, hot reload; zero dependencies

## 🚀 Quick Start

```bash
# run without installing
npx github:krishyaa06/prism-mock-api 

# or install globally
npm install -g github:krishyaa06/prism-mock-api
mockapi db.json --delay 300
```

Requires Node.js 18.17+. No dependencies.

## 🛠️ Usage

```text
mockapi [db.json] [options]       (creates db.json with sample data if missing)

  -p, --port <n>        port (default 3000, next free if busy)
  -d, --delay <ms>      add latency to every response
      --prefix <path>   mount under a path, e.g. /api
      --read-only       reject writes
      --no-persist      keep writes in memory only
      --no-watch        don't reload when the file changes
  -q, --quiet           no request log
```

### Routes

| Request | Result |
| --- | --- |
| `GET /posts?likes_gte=100&_sort=-likes` | filtered + sorted list |
| `GET /posts?_page=2&_limit=10` | page 2, `X-Total-Count` header |
| `GET /posts/1?_embed=comments` / `?_expand=user` | with relations (`postId`, `userId`) |
| `GET /posts/1/comments` | nested children |
| `POST /posts` | create, auto id |
| `PUT` / `PATCH` / `DELETE /posts/1` | replace / merge / remove |
| `GET /` | list of resources |

```js
// in your frontend
const posts = await fetch("http://localhost:3000/posts?_sort=-likes").then(r => r.json());
```

## 📁 Project Structure

```text
prism-mock-api/
├── assets/
│   ├── logo.png
│   └── logo.svg
├── bin/
│   └── mockapi.js   # CLI entry
├── examples/
│   └── db.json   # sample database
├── src/
│   ├── index.js   # router, query engine, persistence
│   └── ui.js   # colours, tables
├── test/
│   └── mockapi.test.js
├── .gitignore
├── LICENSE
└── package.json
```

## 🧪 Tests

```bash
npm test
```

Tests use the built-in `node:test` runner, so there is nothing to install. CI runs them on Node 20 and 22.

## 🤝 Contributing

1. Fork the repo and create a branch: `git checkout -b feature/my-idea`
2. Make your change and add a test in `test/`
3. Run `npm test` and open a Pull Request

## 🔷 Part of Prism Protocol

Prism Mock API is one of the open-source tools built by [Prism Protocol](https://dc.gg/prismprotocol), a tech community where young builders learn, ship and compete together.

## 👤 Author

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/krishyaa06"><img src="https://github.com/krishyaa06.png" width="90" style="border-radius:50%" alt="Soumya Bhandare" /><br><b>Soumya Bhandare</b></a><br>
      <sub>Founder @ Prism Protocol</sub>
    </td>
    <td>
      <a href="https://dc.gg/prismprotocol"><img src="https://img.shields.io/badge/Discord-Prism%20Protocol-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a><br>
      <a href="https://instagram.com/prism_protocol_"><img src="https://img.shields.io/badge/Instagram-@prism__protocol__-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" /></a><br>
      <a href="https://x.com/krishyaa06"><img src="https://img.shields.io/badge/X-@krishyaa06-000000?style=for-the-badge&logo=x&logoColor=white" alt="X" /></a>
    </td>
  </tr>
</table>

## 📄 License

Released under the [MIT License](LICENSE).

<p align="center">
  <b>If you like this project, consider giving it a ⭐</b><br>
  <sub>"Build. Create. Compete." · Made with ⚡ by Prism Protocol</sub>
</p>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00D2FF,50:FF7AC6,100:07060f&height=110&section=footer" width="100%" alt="" />
