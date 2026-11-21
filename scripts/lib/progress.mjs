// Shared terminal progress for the repo's CLI scripts (npm run seed, install:app, docs:pull, the host
// deploy, vendor builds). Zero dependencies.
//
// Modes (resolveProgress):
//   tty    stdout is a terminal: one animated status line, redrawn in place (\r + ANSI erase), cleared
//          before every normal log line and on exit / Ctrl+C. Colour unless NO_COLOR is set.
//   lines  stdout is captured (Claude's tool, CI, `| tee`): the status prints as a plain line when it
//          changes (at most one every 2 s) and otherwise every ~10 s as a heartbeat. Never thousands.
//   off    no status line at all (log lines still print).
// Flags every script accepts: --progress=tty|lines|off (or --progress tty), --quiet (no status line and
// no informational chatter: warnings, errors and the final summary only). Env: REACT_PORTAL_PROGRESS
// (same values), NO_COLOR, FORCE_COLOR, CI.
import { appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { format } from 'node:util';

const ESC = '\x1b[';
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;
const MODES = ['tty', 'lines', 'off'];

export const stripAnsi = (s) => String(s).replace(ANSI_RE, '');

/** Cut a string (which may hold ANSI colour codes) to `width` visible characters. */
export function truncate(s, width) {
    const str = String(s);
    if (width <= 0) return '';
    if (stripAnsi(str).length <= width) return str;
    let out = '';
    let seen = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\x1b') {
            const m = /^\x1b\[[0-9;?]*[A-Za-z]/.exec(str.slice(i));
            if (m) {
                out += m[0];
                i += m[0].length - 1;
                continue;
            }
        }
        if (seen >= width - 1) break;
        out += str[i];
        seen++;
    }
    return out + '…' + (str.includes('\x1b') ? ESC + '0m' : '');
}

/** 4.2s, 42s, 1m42s, 1h02m. */
export function formatDuration(ms) {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return '?';
    if (ms < 10000) return (ms / 1000).toFixed(1) + 's';
    const total = Math.round(ms / 1000);
    if (total < 60) return total + 's';
    const m = Math.floor(total / 60);
    if (m < 60) return m + 'm' + String(total % 60).padStart(2, '0') + 's';
    return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') + 'm';
}

/** 812 B, 42 KB, 1.3 MB. */
export function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
}

/** ██████░░░░ for a fraction 0..1. */
export function renderBar(fraction, width = 20) {
    const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
    const full = Math.round(f * width);
    return '█'.repeat(full) + '░'.repeat(width - full);
}

/** Remaining ms from observed throughput, or null while there isn't enough to go on. */
export function estimateRemaining(doneUnits, totalUnits, elapsedMs, minElapsedMs = 5000) {
    if (!(doneUnits > 0) || elapsedMs < minElapsedMs || totalUnits <= doneUnits) return null;
    return ((totalUnits - doneUnits) * elapsedMs) / doneUnits;
}

/** Column-aligned rows (first row = header). Right-aligns columns whose cells all look numeric. */
export function renderTable(rows, { indent = '  ', gap = '  ' } = {}) {
    if (!rows.length) return '';
    const cols = Math.max(...rows.map((r) => r.length));
    const widths = [];
    const numeric = [];
    for (let c = 0; c < cols; c++) {
        widths[c] = Math.max(...rows.map((r) => stripAnsi(r[c] == null ? '' : r[c]).length));
        numeric[c] = rows.slice(1).every((r) => /^[\d.,]*[a-zA-Z%]{0,3}$/.test(stripAnsi(r[c] == null ? '' : r[c])));
    }
    return rows
        .map((r) =>
            (
                indent +
                r
                    .map((cell, c) => {
                        const s = cell == null ? '' : String(cell);
                        const pad = ' '.repeat(Math.max(0, widths[c] - stripAnsi(s).length));
                        return numeric[c] && c > 0 ? pad + s : s + pad;
                    })
                    .join(gap)
            ).trimEnd()
        )
        .join('\n');
}

/**
 * Read --progress / --quiet / env and decide the mode. `argv` is left untouched: scripts with an
 * unknown-flag check list '--progress' and '--quiet' as known.
 */
export function resolveProgress({ argv = process.argv.slice(2), env = process.env, stream = process.stdout } = {}) {
    const quiet = argv.includes('--quiet');
    let requested = null;
    const at = argv.findIndex((a) => a === '--progress' || a.startsWith('--progress='));
    if (at >= 0) requested = argv[at].includes('=') ? argv[at].split('=')[1] : argv[at + 1] || '';
    if (requested !== null && !MODES.includes(requested))
        throw new Error(`--progress expects tty, lines or off (got "${requested}")`);
    const envMode = MODES.includes(env.REACT_PORTAL_PROGRESS) ? env.REACT_PORTAL_PROGRESS : null;
    const isTty = !!stream.isTTY && env.TERM !== 'dumb' && !env.CI;
    const mode = quiet ? 'off' : requested || envMode || (isTty ? 'tty' : 'lines');
    const noColor = env.NO_COLOR !== undefined && env.NO_COLOR !== '';
    const color =
        env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false'
            ? !noColor
            : !noColor && !!stream.isTTY && mode === 'tty';
    return { mode, quiet, color };
}

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const live = new Set();
let exitHooked = false;
function hookExit() {
    if (exitHooked) return;
    exitHooked = true;
    const restore = () => live.forEach((p) => p.clear());
    process.on('exit', restore);
    const onSignal = (sig, code) =>
        process.once(sig, () => {
            restore();
            process.stdout.write('\n');
            process.exit(code);
        });
    onSignal('SIGINT', 130);
    onSignal('SIGTERM', 143);
}

export class Progress {
    constructor({
        argv = process.argv.slice(2),
        env = process.env,
        stream = process.stdout,
        errStream = process.stderr,
        heartbeatMs = 10000,
        minGapMs = 2000,
    } = {}) {
        Object.assign(this, resolveProgress({ argv, env, stream }));
        this.stream = stream;
        this.errStream = errStream;
        this.heartbeatMs = heartbeatMs;
        this.minGapMs = minGapMs;
        this.t0 = Date.now();
        this._line = null;
        this._timer = null;
        this._frame = 0;
        this._drawn = false;
        this._lastPrint = 0;
        this._lastKey = null;
        this._dirty = false;
        const paint = (open, close) => (s) => (this.color ? ESC + open + 'm' + s + ESC + close + 'm' : String(s));
        this.c = {
            bold: paint('1', '22'),
            dim: paint('2', '22'),
            red: paint('31', '39'),
            green: paint('32', '39'),
            yellow: paint('33', '39'),
            cyan: paint('36', '39'),
            gray: paint('90', '39'),
        };
        this.sym = {
            ok: this.c.green('✓'),
            fail: this.c.red('✗'),
            warn: this.c.yellow('!'),
            run: this.c.cyan('▶'),
            dot: this.c.dim('·'),
        };
    }

    /** Informational line (suppressed by --quiet). */
    log(...a) {
        if (!this.quiet) this._write(this.stream, format(...a));
    }
    /** Always printed (final summaries). */
    out(...a) {
        this._write(this.stream, format(...a));
    }
    /** Always printed, on stdout so it stays in order with the log. */
    warn(...a) {
        this._write(this.stream, format(...a));
    }
    /** Always printed, on stderr. */
    error(...a) {
        this._write(this.errStream, format(...a));
    }

    /**
     * Set the status line. `render` is a string or a function (called on every redraw, so elapsed
     * times tick). `key` says when the status really changed (lines mode prints on a key change);
     * it defaults to the string itself.
     */
    status(render, { key } = {}) {
        if (this.mode === 'off') return;
        const k = key !== undefined ? key : typeof render === 'string' ? render : null;
        const changed = !this._line || k !== this._lastKey;
        this._line = { render };
        this._lastKey = k;
        if (this.mode === 'tty') {
            hookExit();
            live.add(this);
            if (!this._timer) {
                this.stream.write(ESC + '?25l');
                this._timer = setInterval(() => this._draw(), 80);
                this._timer.unref();
            }
            this._draw();
            return;
        }
        if (changed) this._dirty = true;
        this._tick();
        if (!this._timer) {
            this._timer = setInterval(() => this._tick(), 1000);
            this._timer.unref();
        }
    }

    /** Remove the status line (and stop its timer). */
    clear() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
        if (this.mode === 'tty' && this._drawn) this.stream.write('\r' + ESC + '2K');
        if (this.mode === 'tty' && this._line) this.stream.write(ESC + '?25h');
        this._drawn = false;
        this._line = null;
        this._lastKey = null;
        this._dirty = false;
        live.delete(this);
    }

    /**
     * A timed task on the status line: `[label] · detail · 12.3s`. succeed()/fail() clear it and log
     * one line with the elapsed time.
     */
    task(label) {
        const start = Date.now();
        let detail = '';
        let detailKey = '';
        // Lines mode prints the first line right away: "started" reads better there than "0.0s".
        const elapsed = () =>
            this.mode === 'lines' && Date.now() - start < 1000 ? 'started' : formatDuration(Date.now() - start);
        const draw = () =>
            this.status(
                () =>
                    `${label}${detail ? ' ' + this.sym.dot + ' ' + detail : ''} ${this.sym.dot} ${this.c.dim(elapsed())}`,
                { key: label + '|' + detailKey }
            );
        draw();
        return {
            start,
            elapsed: () => Date.now() - start,
            /** `key` (default: the detail) decides when lines mode prints a new line. */
            update: (d, key) => {
                detail = d || '';
                detailKey = key !== undefined ? key : detail;
                draw();
            },
            succeed: (note) => {
                this.clear();
                this.log(
                    `${this.sym.ok} ${label} ${this.c.dim(formatDuration(Date.now() - start))}${note ? ' ' + this.sym.dot + ' ' + note : ''}`
                );
            },
            fail: (note) => {
                this.clear();
                this.error(
                    `${this.sym.fail} ${label} ${this.c.dim(formatDuration(Date.now() - start))}${note ? ' ' + this.sym.dot + ' ' + note : ''}`
                );
            },
        };
    }

    _text() {
        const r = this._line && this._line.render;
        try {
            return typeof r === 'function' ? r() : String(r == null ? '' : r);
        } catch (e) {
            return '';
        }
    }

    _draw() {
        if (!this._line) return;
        this._frame = (this._frame + 1) % SPINNER.length;
        const cols = (this.stream.columns || 100) - 1;
        const text = this.c.cyan(SPINNER[this._frame]) + ' ' + this._text();
        this.stream.write('\r' + ESC + '2K' + truncate(text, cols));
        this._drawn = true;
    }

    _tick() {
        if (!this._line) return;
        const now = Date.now();
        const since = now - this._lastPrint;
        if ((this._dirty && since >= this.minGapMs) || since >= this.heartbeatMs) {
            this._dirty = false;
            this._lastPrint = now;
            this.stream.write('  … ' + stripAnsi(this._text()) + '\n');
        }
    }

    _write(stream, text) {
        if (this.mode === 'tty' && this._drawn) {
            this.stream.write('\r' + ESC + '2K');
            this._drawn = false;
        }
        stream.write(text + '\n');
        if (this.mode === 'tty' && this._line) this._draw();
    }
}

export const createProgress = (opts) => new Progress(opts);

const SECRET_RE = /(--?(?:password|pass|pwd|token)[= ])\S+/gi;

/**
 * Run a command, line by line: every chunk is appended to `logFile` (secrets in --password=… masked),
 * each line (split on \n and \r, so redrawn progress counts as lines) goes to `onLine(line, which)`.
 * `passthrough` writes the raw output to this process's stdout/stderr too. A partial line that sits
 * unterminated for a second (a prompt) is surfaced through `onPrompt`. Resolves
 * { code, signal, tail: string[] } (the last 200 lines).
 */
export function runCommand(command, args, opts = {}) {
    const { cwd, env, shell = false, logFile, onLine, onPrompt, passthrough = false, stdin = 'inherit' } = opts;
    return new Promise((resolve) => {
        const child = spawn(command, args, { cwd, env, shell, windowsHide: true, stdio: [stdin, 'pipe', 'pipe'] });
        const tail = [];
        const partial = { stdout: '', stderr: '' };
        let promptTimer = null;
        const emit = (raw, which) => {
            const line = raw.replace(SECRET_RE, '$1****');
            tail.push(line);
            if (tail.length > 200) tail.shift();
            if (onLine && line.trim()) onLine(line, which);
        };
        const feed = (which) => (chunk) => {
            const text = chunk.toString();
            if (logFile) {
                try {
                    appendFileSync(logFile, text.replace(SECRET_RE, '$1****'));
                } catch (e) {}
            }
            if (passthrough) (which === 'stderr' ? process.stderr : process.stdout).write(chunk);
            const parts = (partial[which] + text).split(/\r\n|\n|\r/);
            partial[which] = parts.pop();
            parts.forEach((l) => emit(stripAnsi(l), which));
            if (promptTimer) clearTimeout(promptTimer);
            if (partial[which] && onPrompt)
                promptTimer = setTimeout(() => {
                    if (partial[which]) onPrompt(stripAnsi(partial[which]));
                }, 1000);
        };
        child.stdout.on('data', feed('stdout'));
        child.stderr.on('data', feed('stderr'));
        child.on('error', (e) => {
            emit(String(e.message || e), 'stderr');
        });
        child.on('close', (code, signal) => {
            if (promptTimer) clearTimeout(promptTimer);
            ['stdout', 'stderr'].forEach((w) => partial[w] && emit(stripAnsi(partial[w]), w));
            resolve({ code: code == null ? 1 : code, signal, tail });
        });
    });
}

/** Start (truncate) a log file with a header. */
export function startLog(file, header) {
    writeFileSync(file, `# ${header}\n# ${new Date().toISOString()}\n\n`);
}
