# Run and test

## On this computer

Python 3.9 or newer serves the folder. `requirements.txt` lists no third-party packages, because `serve.py` uses the standard library. Node.js 22 or newer is only for rebuilding TypeScript and running tests. That toolchain is `typescript` 5.9.2 in `package.json`.

```bash
python3 -m pip install -r requirements.txt
python3 serve.py
```

Open http://127.0.0.1:8766/. Stop it with Ctrl+C. The default bind is loopback. A non-loopback address is refused unless you pass `--expose`.

After you edit anything under `src/`:

```bash
npm install
npm run build
npm test
```

`npm test` compiles TypeScript and runs the unit tests. The page loads the compiled files in `js/`, so commit those files when the TypeScript changes. The tests also check that tracked text does not carry private-inventory markers, and that the license is MIT.

The tests cover the 30-day window in `America/Sao_Paulo`, coordinate parsing, URLs with no API key, a single retry on HTTP 429, the marine 15-day to 8-day fallback, null rain left null when reanalysis and the archived forecast disagree, swell kept apart from total wave height, the condition thresholds, the map link, and the CSV and PDF text.

## On a Linux host you control

`deploy/playbook.yml` installs Python 3, copies `index.html`, `css/`, `js/`, and `serve.py` to `/opt/weathermeter`, and enables `weathermeter.service`. The unit listens on port 8766 and passes `--expose`, so it can answer beyond loopback. Run it only on a host and a network you trust.

```bash
ansible-playbook deploy/playbook.yml -i <host>,
```

`deploy/terragrunt.hcl.example` is a template for an unprivileged Debian LXC: 1 core, 512 MB, no swap, 4 GB, nesting off, firewall on. It reads the container id, node, address, and gateway from the environment:

- `CT_WEATHERMETER_ID`
- `CT_WEATHERMETER_NODE`
- `CT_WEATHERMETER_IP`
- `GATEWAY_IP`

Set those from your own inventory. Do not write an address into the file. Point `source` at the LXC module you already use, and match the `include` style to the Terragrunt version you run. The example is not applied from this repository. The last good response is stored in the browser.
