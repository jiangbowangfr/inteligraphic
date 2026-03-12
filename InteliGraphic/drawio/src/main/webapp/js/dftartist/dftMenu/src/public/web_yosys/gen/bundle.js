// node_modules/@yowasp/runtime/lib/fetch.js
var fetch;
if (typeof process === "object" && process.release?.name === "node") {
  fetch = async function(url, options) {
    if (url.protocol === "file:") {
      const { readFile } = await import("fs/promises");
      let contentType = "application/octet-stream";
      if (url.pathname.endsWith(".wasm"))
        contentType = "application/wasm";
      return new Response(await readFile(url), { headers: { "Content-Type": contentType } });
    } else {
      return globalThis.fetch(url, options);
    }
  };
} else {
  fetch = globalThis.fetch;
}
var fetch_default = fetch;

// node_modules/@yowasp/runtime/lib/wasi-virt.js
var Exit = class extends Error {
  constructor(code = 0) {
    super(`Exited with status ${code}`);
    this.code = code;
  }
};
function monotonicNow() {
  return BigInt(Math.floor(performance.now() * 1e6));
}
function wallClockNow() {
  let now = Date.now();
  const seconds = BigInt(Math.floor(now / 1e3));
  const nanoseconds = now % 1e3 * 1e6;
  return { seconds, nanoseconds };
}
var Xoroshiro128StarStar = class {
  constructor(seed) {
    if (BigInt(seed) === 0n) {
      throw new Error("xoroshiro128** must be seeded with a non-zero state");
    }
    this.s = [BigInt(seed) & 0xffffffffffffffffn, BigInt(seed) >> 64n & 0xffffffffffffffffn];
  }
  next() {
    function trunc64(x) {
      return x & 0xffffffffffffffffn;
    }
    function rotl(x, k) {
      return x << k | x >> 64n - k;
    }
    let [s0, s1] = this.s;
    const r = trunc64(rotl(s0 * 5n, 7n) * 9n);
    s1 ^= s0;
    s0 = trunc64(rotl(s0, 24n) ^ s1 ^ s1 << 16n);
    s1 = trunc64(rotl(s1, 37n));
    this.s = [s0, s1];
    return r;
  }
  getBytes(length) {
    return Uint8Array.from({ length }, () => Number(BigInt.asUintN(8, this.next() >> 32n)));
  }
};
var IoError = class extends Error {
};
var InputStream = class {
  read(_len) {
    throw { tag: "closed" };
  }
  blockingRead(len) {
    return this.read(len);
  }
};
var OutputStream = class {
  checkWrite() {
    throw { tag: "closed" };
  }
  write(_contents) {
    this.checkWrite();
  }
  flush() {
  }
  blockingFlush() {
    this.flush();
  }
  blockingWriteAndFlush(contents) {
    this.write(contents);
    this.blockingFlush();
  }
};
var CallbackInputStream = class extends InputStream {
  constructor(callback = null) {
    super();
    this.callback = callback;
  }
  read(len) {
    if (this.callback === null)
      throw { tag: "closed" };
    let contents = this.callback(Number(len));
    if (contents === null)
      throw { tag: "closed" };
    return contents;
  }
};
var CallbackOutputStream = class extends OutputStream {
  constructor(callback = null) {
    super();
    this.callback = callback;
  }
  checkWrite() {
    return 4096;
  }
  write(contents) {
    if (this.callback !== null)
      this.callback(contents);
  }
  flush() {
    if (this.callback !== null)
      this.callback(null);
  }
};
var TerminalInput = class {
};
var TerminalOutput = class {
};
var File = class {
  constructor(data = "") {
    if (data instanceof Uint8Array) {
      this.data = data;
    } else if (typeof data === "string") {
      this.data = new TextEncoder().encode(data);
    } else {
      throw new Error(`Cannot construct a file from ${typeof data}`);
    }
  }
  get size() {
    return this.data.length;
  }
};
var ReadStream = class extends InputStream {
  constructor(file, offset) {
    super();
    this.file = file;
    this.offset = offset;
  }
  read(len) {
    const data = this.file.data.subarray(Number(this.offset), Number(this.offset + len));
    this.offset += len;
    return data;
  }
};
var WriteStream = class extends OutputStream {
  constructor(file, offset) {
    super();
    this.file = file;
    this.offset = offset;
  }
  write(contents) {
    const newData = new Uint8Array(this.file.data.length + contents.length);
    newData.set(this.file.data);
    newData.subarray(Number(this.offset)).set(contents);
    this.file.data = newData;
    this.offset += BigInt(contents.length);
  }
};
var Directory = class _Directory {
  constructor(files = {}) {
    this.files = files;
  }
  get size() {
    return Object.keys(this.files).length;
  }
  traverse(path, flags = { create: false, remove: false }) {
    let entry = this;
    let separatorAt = -1;
    do {
      if (entry instanceof File)
        throw "not-directory";
      const files = entry.files;
      separatorAt = path.indexOf("/");
      const segment = separatorAt === -1 ? path : path.substring(0, separatorAt);
      if (separatorAt === -1 && flags.remove)
        delete files[segment];
      else if (segment === "" || segment === ".")
        ;
      else if (segment === "..")
        ;
      else if (Object.hasOwn(files, segment))
        entry = files[segment];
      else if (flags.create === "directory" || flags.create === "file" && separatorAt !== -1)
        entry = files[segment] = new _Directory({});
      else if (flags.create === "file")
        entry = files[segment] = new File(new Uint8Array());
      else
        throw "no-entry";
      path = path.substring(separatorAt + 1);
    } while (separatorAt !== -1);
    return entry;
  }
};
var Descriptor = class _Descriptor {
  constructor(entry) {
    this.entry = entry;
  }
  getType() {
    if (this.entry instanceof Directory)
      return "directory";
    if (this.entry instanceof File)
      return "regular-file";
  }
  getFlags() {
    return {};
  }
  metadataHash() {
    return { upper: 0, lower: 0 };
  }
  metadataHashAt(_pathFlags, path) {
    if (!(this.entry instanceof Directory))
      throw "invalid";
    const pathEntry = this.entry.traverse(path);
    return new _Descriptor(pathEntry).metadataHash();
  }
  stat() {
    let type;
    if (this.entry instanceof Directory)
      type = "directory";
    if (this.entry instanceof File)
      type = "regular-file";
    return {
      type,
      linkCount: 1,
      size: this.entry.size,
      dataAccessTimestamp: null,
      dataModificationTimestamp: null,
      statusChangeTimestamp: null
    };
  }
  statAt(_pathFlags, path) {
    if (!(this.entry instanceof Directory))
      throw "invalid";
    const pathEntry = this.entry.traverse(path);
    return new _Descriptor(pathEntry).stat();
  }
  openAt(_pathFlags, path, openFlags, _descriptorFlags) {
    if (!(this.entry instanceof Directory))
      throw "invalid";
    const openEntry = this.entry.traverse(path, { create: openFlags.create ? "file" : false });
    if (openFlags.directory) {
      if (!(openEntry instanceof Directory))
        throw "not-directory";
    } else {
      if (openEntry instanceof Directory)
        throw "is-directory";
      if (openFlags.truncate)
        openEntry.data = new Uint8Array();
    }
    return new _Descriptor(openEntry);
  }
  read(length, offset) {
    if (this.entry instanceof Directory)
      throw "is-directory";
    [length, offset] = [Number(length), Number(offset)];
    return [this.entry.data.subarray(offset, offset + length), offset + length >= this.entry.data.byteLength];
  }
  readViaStream(offset) {
    return new ReadStream(this.entry, offset);
  }
  write(_buffer, _offset) {
    if (this.entry instanceof Directory)
      throw "is-directory";
    console.error("Descriptor.write not implemented");
    throw "unsupported";
  }
  writeViaStream(offset) {
    return new WriteStream(this.entry, offset);
  }
  readDirectory() {
    return new DirectoryEntryStream(this.entry);
  }
  createDirectoryAt(path) {
    this.entry.traverse(path, { create: "directory" });
  }
  unlinkFileAt(path) {
    const pathEntry = this.entry.traverse(path);
    if (pathEntry instanceof Directory)
      return "is-directory";
    this.entry.traverse(path, { remove: true });
  }
  removeDirectoryAt(path) {
    const pathEntry = this.entry.traverse(path);
    if (!(pathEntry instanceof Directory))
      return "not-directory";
    this.entry.traverse(path, { remove: true });
  }
};
var DirectoryEntryStream = class {
  constructor(directory) {
    this.entries = Object.entries(directory.files);
    this.index = 0;
  }
  readDirectoryEntry() {
    if (this.index === this.entries.length)
      return null;
    const [name, entry] = this.entries[this.index++];
    let type;
    if (entry instanceof Directory)
      type = "directory";
    if (entry instanceof File)
      type = "regular-file";
    return { name, type };
  }
};
function directoryFromTree(tree) {
  const files = {};
  for (const [filename, data] of Object.entries(tree)) {
    if (typeof data === "string" || data instanceof Uint8Array)
      files[filename] = new File(tree[filename]);
    else
      files[filename] = directoryFromTree(tree[filename]);
  }
  return new Directory(files);
}
function directoryIntoTree(directory, { decodeASCII = true } = {}) {
  function isASCII(buffer) {
    for (const byte of buffer)
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13 || byte >= 127)
        return false;
    return true;
  }
  const tree = {};
  for (const [filename, entry] of Object.entries(directory.files)) {
    if (entry instanceof File)
      tree[filename] = decodeASCII && isASCII(entry.data) ? new TextDecoder().decode(entry.data) : entry.data;
    if (entry instanceof Directory)
      tree[filename] = directoryIntoTree(entry, { decodeASCII });
  }
  return tree;
}
var Environment = class {
  vars = {};
  args = [];
  root = new Directory({});
  constructor() {
    this.prng = new Xoroshiro128StarStar(1n);
    this.standardInputStream = new CallbackInputStream();
    this.standardOutputStream = new CallbackOutputStream();
    this.standardErrorStream = new CallbackOutputStream();
    this.terminalInput = new TerminalInput();
    this.terminalOutput = new TerminalOutput();
    const $this = this;
    this.exports = {
      monotonicClock: {
        now: monotonicNow
      },
      wallClock: {
        now: wallClockNow
      },
      random: {
        getRandomBytes(length) {
          return $this.prng.getBytes(Number(length));
        }
      },
      io: {
        Error: IoError,
        InputStream,
        OutputStream
      },
      cli: {
        exit(status) {
          throw new Exit(status.tag === "ok" ? 0 : 1);
        },
        getEnvironment() {
          return $this.vars;
        },
        getArguments() {
          return $this.args;
        },
        getStdin() {
          return $this.standardInputStream;
        },
        getStdout() {
          return $this.standardOutputStream;
        },
        getStderr() {
          return $this.standardErrorStream;
        },
        getTerminalStdin() {
          return $this.terminalInput;
        },
        getTerminalStdout() {
          return $this.terminalOutput;
        },
        getTerminalStderr() {
          return $this.terminalOutput;
        },
        TerminalInput,
        TerminalOutput
      },
      fs: {
        Descriptor,
        DirectoryEntryStream,
        filesystemErrorCode() {
        },
        getDirectories() {
          if ($this.root === null)
            return [];
          return [[new Descriptor($this.root), "/"]];
        }
      }
    };
  }
  get stdin() {
    return this.standardInputStream.callback;
  }
  set stdin(callback) {
    this.standardInputStream.callback = callback;
  }
  get stdout() {
    return this.standardOutputStream.callback;
  }
  set stdout(callback) {
    this.standardOutputStream.callback = callback;
  }
  get stderr() {
    return this.standardErrorStream.callback;
  }
  set stderr(callback) {
    this.standardErrorStream.callback = callback;
  }
};

// node_modules/@yowasp/runtime/lib/util.js
function lineBuffered(processLine) {
  let buffer = new Uint8Array();
  return (bytes) => {
    if (bytes === null)
      return;
    let newBuffer = new Uint8Array(buffer.length + bytes.length);
    newBuffer.set(buffer);
    newBuffer.set(bytes, buffer.length);
    buffer = newBuffer;
    let newlineAt = -1;
    while (true) {
      const nextNewlineAt = buffer.indexOf(10, newlineAt + 1);
      if (nextNewlineAt === -1)
        break;
      processLine(new TextDecoder().decode(buffer.subarray(newlineAt + 1, nextNewlineAt)));
      newlineAt = nextNewlineAt;
    }
    buffer = buffer.subarray(newlineAt + 1);
  };
}

// node_modules/@yowasp/runtime/lib/api.js
async function fetchObject(obj, fetchFn) {
  const promises = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" || value instanceof Uint8Array) {
      promises.push(Promise.resolve([key, value]));
    } else if (value instanceof URL) {
      promises.push(fetchFn(value).then((fetched) => [key, fetched]));
    } else {
      promises.push(fetchObject(value, fetchFn).then((fetched) => [key, fetched]));
    }
  }
  for (const [key, value] of await Promise.all(promises))
    obj[key] = value;
  return obj;
}
function fetchWebAssembly(url) {
  return fetch_default(url).then(WebAssembly.compileStreaming);
}
function fetchUint8Array(url) {
  return fetch_default(url).then((resp) => resp.arrayBuffer()).then((buf) => new Uint8Array(buf));
}
function fetchResources({ modules, filesystem }) {
  return Promise.all([
    fetchObject(modules, fetchWebAssembly),
    fetchObject(filesystem, fetchUint8Array)
  ]).then(([modules2, filesystem2]) => {
    return { modules: modules2, filesystem: filesystem2 };
  });
}
var Application = class {
  constructor(resources, instantiate2, argv0) {
    this.resources = resources;
    this.resourceData = null;
    this.instantiate = instantiate2;
    this.argv0 = argv0;
  }
  // The `printLine` option is deprecated and not documented but still accepted for compatibility.
  run(args = null, files = {}, options = {}) {
    if (this.resourceData === null) {
      if (options.synchronously)
        throw new Error("Cannot run application synchronously unless resources are prefetched first; use `await run()` to do so");
      return this.resources().then(fetchResources).then((resourceData) => {
        this.resourceData = resourceData;
        return this.run(args, files, options);
      });
    }
    if (args === null)
      return;
    const environment = new Environment();
    environment.args = [this.argv0].concat(args);
    environment.root = directoryFromTree(files);
    for (const [dirName, dirContents] of Object.entries(this.resourceData.filesystem))
      environment.root.files[dirName] = directoryFromTree(dirContents);
    const lineBufferedConsole = lineBuffered(options.printLine ?? console.log);
    environment.stdin = options.stdin === void 0 ? null : options.stdin;
    environment.stdout = options.stdout === void 0 ? lineBufferedConsole : options.stdout;
    environment.stderr = options.stderr === void 0 ? lineBufferedConsole : options.stderr;
    const runCommand = (wasmCommand) => {
      let error = null;
      try {
        wasmCommand.run.run();
      } catch (e) {
        if (!(e instanceof Exit))
          throw e;
        if (e instanceof Exit && e.code !== 0)
          error = e;
      }
      for (const dirName of Object.keys(this.resourceData.filesystem))
        delete environment.root.files[dirName];
      files = directoryIntoTree(environment.root, { decodeASCII: options.decodeASCII ?? true });
      if (error !== null) {
        error.files = files;
        throw error;
      } else {
        return files;
      }
    };
    const getCoreModule = (filename) => this.resourceData.modules[filename];
    const imports = { runtime: environment.exports };
    if (options.synchronously) {
      const instantiateCore = (module, imports2) => new WebAssembly.Instance(module, imports2);
      return runCommand(this.instantiate(getCoreModule, imports, instantiateCore));
    } else {
      return this.instantiate(getCoreModule, imports).then(runCommand);
    }
  }
};

// gen/yosys.js
var ComponentError = class extends Error {
  constructor(value) {
    const enumerable = typeof value !== "string";
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, "payload", { value, enumerable });
  }
};
var curResourceBorrows = [];
var dv = new DataView(new ArrayBuffer());
var dataView = (mem) => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);
function getErrorPayload(e) {
  if (e && hasOwnProperty.call(e, "payload"))
    return e.payload;
  if (e instanceof Error)
    throw e;
  return e;
}
var handleTables = [];
var hasOwnProperty = Object.prototype.hasOwnProperty;
var T_FLAG = 1 << 30;
function rscTableCreateOwn(table, rep) {
  const free = table[0] & ~T_FLAG;
  if (free === 0) {
    table.push(0);
    table.push(rep | T_FLAG);
    return (table.length >> 1) - 1;
  }
  table[0] = table[free << 1];
  table[free << 1] = 0;
  table[(free << 1) + 1] = rep | T_FLAG;
  return free;
}
function rscTableRemove(table, handle) {
  const scope = table[handle << 1];
  const val = table[(handle << 1) + 1];
  const own = (val & T_FLAG) !== 0;
  const rep = val & ~T_FLAG;
  if (val === 0 || (scope & T_FLAG) !== 0)
    throw new TypeError("Invalid handle");
  table[handle << 1] = table[0] | T_FLAG;
  table[0] = handle | T_FLAG;
  return { rep, scope, own };
}
var symbolCabiDispose = Symbol.for("cabiDispose");
var symbolRscHandle = Symbol("handle");
var symbolRscRep = Symbol.for("cabiRep");
var symbolDispose = Symbol.dispose || Symbol.for("dispose");
var toUint64 = (val) => BigInt.asUintN(64, BigInt(val));
function toUint32(val) {
  return val >>> 0;
}
var utf8Decoder = new TextDecoder();
var utf8Encoder = new TextEncoder();
var utf8EncodedLen = 0;
function utf8Encode(s, realloc, memory) {
  if (typeof s !== "string")
    throw new TypeError("expected a string");
  if (s.length === 0) {
    utf8EncodedLen = 0;
    return 1;
  }
  let buf = utf8Encoder.encode(s);
  let ptr = realloc(0, 0, 1, buf.length);
  new Uint8Array(memory.buffer).set(buf, ptr);
  utf8EncodedLen = buf.length;
  return ptr;
}
function instantiate(getCoreModule, imports, instantiateCore = WebAssembly.instantiate) {
  const module0 = getCoreModule("yosys.core.wasm");
  const module1 = getCoreModule("yosys.core2.wasm");
  const module2 = getCoreModule("yosys.core3.wasm");
  const module3 = getCoreModule("yosys.core4.wasm");
  const { cli, fs, io, monotonicClock, random, wallClock } = imports.runtime;
  const {
    TerminalInput: TerminalInput2,
    TerminalOutput: TerminalOutput2,
    exit,
    getArguments,
    getEnvironment,
    getStderr,
    getStdin,
    getStdout,
    getTerminalStderr,
    getTerminalStdin,
    getTerminalStdout
  } = cli;
  const {
    Descriptor: Descriptor2,
    DirectoryEntryStream: DirectoryEntryStream2,
    filesystemErrorCode,
    getDirectories
  } = fs;
  const {
    Error: Error$1,
    InputStream: InputStream2,
    OutputStream: OutputStream2,
    Pollable,
    poll
  } = io;
  const {
    now,
    subscribeDuration,
    subscribeInstant
  } = monotonicClock;
  const { getRandomBytes } = random;
  const { now: now$1 } = wallClock;
  let gen = function* init() {
    let exports0;
    let exports1;
    function trampoline0() {
      const ret = now();
      return toUint64(ret);
    }
    const handleTable1 = [T_FLAG, 0];
    const captureTable1 = /* @__PURE__ */ new Map();
    let captureCnt1 = 0;
    handleTables[1] = handleTable1;
    function trampoline6(arg0) {
      const ret = subscribeDuration(BigInt.asUintN(64, arg0));
      if (!(ret instanceof Pollable)) {
        throw new TypeError('Resource error: Not a valid "Pollable" resource.');
      }
      var handle0 = ret[symbolRscHandle];
      if (!handle0) {
        const rep = ret[symbolRscRep] || ++captureCnt1;
        captureTable1.set(rep, ret);
        handle0 = rscTableCreateOwn(handleTable1, rep);
      }
      return handle0;
    }
    function trampoline7(arg0) {
      const ret = subscribeInstant(BigInt.asUintN(64, arg0));
      if (!(ret instanceof Pollable)) {
        throw new TypeError('Resource error: Not a valid "Pollable" resource.');
      }
      var handle0 = ret[symbolRscHandle];
      if (!handle0) {
        const rep = ret[symbolRscRep] || ++captureCnt1;
        captureTable1.set(rep, ret);
        handle0 = rscTableCreateOwn(handleTable1, rep);
      }
      return handle0;
    }
    const handleTable3 = [T_FLAG, 0];
    const captureTable3 = /* @__PURE__ */ new Map();
    let captureCnt3 = 0;
    handleTables[3] = handleTable3;
    function trampoline8(arg0) {
      var handle1 = arg0;
      var rep2 = handleTable3[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable3.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(OutputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      const ret = rsc0.subscribe();
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      if (!(ret instanceof Pollable)) {
        throw new TypeError('Resource error: Not a valid "Pollable" resource.');
      }
      var handle3 = ret[symbolRscHandle];
      if (!handle3) {
        const rep = ret[symbolRscRep] || ++captureCnt1;
        captureTable1.set(rep, ret);
        handle3 = rscTableCreateOwn(handleTable1, rep);
      }
      return handle3;
    }
    const handleTable2 = [T_FLAG, 0];
    const captureTable2 = /* @__PURE__ */ new Map();
    let captureCnt2 = 0;
    handleTables[2] = handleTable2;
    function trampoline9(arg0) {
      var handle1 = arg0;
      var rep2 = handleTable2[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable2.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(InputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      const ret = rsc0.subscribe();
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      if (!(ret instanceof Pollable)) {
        throw new TypeError('Resource error: Not a valid "Pollable" resource.');
      }
      var handle3 = ret[symbolRscHandle];
      if (!handle3) {
        const rep = ret[symbolRscRep] || ++captureCnt1;
        captureTable1.set(rep, ret);
        handle3 = rscTableCreateOwn(handleTable1, rep);
      }
      return handle3;
    }
    function trampoline11() {
      const ret = getStderr();
      if (!(ret instanceof OutputStream2)) {
        throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
      }
      var handle0 = ret[symbolRscHandle];
      if (!handle0) {
        const rep = ret[symbolRscRep] || ++captureCnt3;
        captureTable3.set(rep, ret);
        handle0 = rscTableCreateOwn(handleTable3, rep);
      }
      return handle0;
    }
    function trampoline14() {
      const ret = getStdin();
      if (!(ret instanceof InputStream2)) {
        throw new TypeError('Resource error: Not a valid "InputStream" resource.');
      }
      var handle0 = ret[symbolRscHandle];
      if (!handle0) {
        const rep = ret[symbolRscRep] || ++captureCnt2;
        captureTable2.set(rep, ret);
        handle0 = rscTableCreateOwn(handleTable2, rep);
      }
      return handle0;
    }
    function trampoline15() {
      const ret = getStdout();
      if (!(ret instanceof OutputStream2)) {
        throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
      }
      var handle0 = ret[symbolRscHandle];
      if (!handle0) {
        const rep = ret[symbolRscRep] || ++captureCnt3;
        captureTable3.set(rep, ret);
        handle0 = rscTableCreateOwn(handleTable3, rep);
      }
      return handle0;
    }
    function trampoline16(arg0) {
      let variant0;
      switch (arg0) {
        case 0: {
          variant0 = {
            tag: "ok",
            val: void 0
          };
          break;
        }
        case 1: {
          variant0 = {
            tag: "err",
            val: void 0
          };
          break;
        }
        default: {
          throw new TypeError("invalid variant discriminant for expected");
        }
      }
      exit(variant0);
    }
    let exports2;
    let memory0;
    let realloc0;
    function trampoline17(arg0) {
      const ret = getEnvironment();
      var vec3 = ret;
      var len3 = vec3.length;
      var result3 = realloc0(0, 0, 4, len3 * 16);
      for (let i = 0; i < vec3.length; i++) {
        const e = vec3[i];
        const base = result3 + i * 16;
        var [tuple0_0, tuple0_1] = e;
        var ptr1 = utf8Encode(tuple0_0, realloc0, memory0);
        var len1 = utf8EncodedLen;
        dataView(memory0).setInt32(base + 4, len1, true);
        dataView(memory0).setInt32(base + 0, ptr1, true);
        var ptr2 = utf8Encode(tuple0_1, realloc0, memory0);
        var len2 = utf8EncodedLen;
        dataView(memory0).setInt32(base + 12, len2, true);
        dataView(memory0).setInt32(base + 8, ptr2, true);
      }
      dataView(memory0).setInt32(arg0 + 4, len3, true);
      dataView(memory0).setInt32(arg0 + 0, result3, true);
    }
    function trampoline18(arg0) {
      const ret = getArguments();
      var vec1 = ret;
      var len1 = vec1.length;
      var result1 = realloc0(0, 0, 4, len1 * 8);
      for (let i = 0; i < vec1.length; i++) {
        const e = vec1[i];
        const base = result1 + i * 8;
        var ptr0 = utf8Encode(e, realloc0, memory0);
        var len0 = utf8EncodedLen;
        dataView(memory0).setInt32(base + 4, len0, true);
        dataView(memory0).setInt32(base + 0, ptr0, true);
      }
      dataView(memory0).setInt32(arg0 + 4, len1, true);
      dataView(memory0).setInt32(arg0 + 0, result1, true);
    }
    function trampoline19(arg0) {
      const ret = now$1();
      var { seconds: v0_0, nanoseconds: v0_1 } = ret;
      dataView(memory0).setBigInt64(arg0 + 0, toUint64(v0_0), true);
      dataView(memory0).setInt32(arg0 + 8, toUint32(v0_1), true);
    }
    const handleTable6 = [T_FLAG, 0];
    const captureTable6 = /* @__PURE__ */ new Map();
    let captureCnt6 = 0;
    handleTables[6] = handleTable6;
    function trampoline20(arg0, arg1, arg2) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.readViaStream(BigInt.asUintN(64, arg1)) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg2 + 0, 0, true);
          if (!(e instanceof InputStream2)) {
            throw new TypeError('Resource error: Not a valid "InputStream" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt2;
            captureTable2.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable2, rep);
          }
          dataView(memory0).setInt32(arg2 + 4, handle3, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg2 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg2 + 4, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline21(arg0, arg1, arg2) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.writeViaStream(BigInt.asUintN(64, arg1)) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg2 + 0, 0, true);
          if (!(e instanceof OutputStream2)) {
            throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt3;
            captureTable3.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable3, rep);
          }
          dataView(memory0).setInt32(arg2 + 4, handle3, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg2 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg2 + 4, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline22(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.appendViaStream() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          if (!(e instanceof OutputStream2)) {
            throw new TypeError('Resource error: Not a valid "OutputStream" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt3;
            captureTable3.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable3, rep);
          }
          dataView(memory0).setInt32(arg1 + 4, handle3, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 4, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline23(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.getFlags() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          let flags3 = 0;
          if (typeof e === "object" && e !== null) {
            flags3 = Boolean(e.read) << 0 | Boolean(e.write) << 1 | Boolean(e.fileIntegritySync) << 2 | Boolean(e.dataIntegritySync) << 3 | Boolean(e.requestedWriteSync) << 4 | Boolean(e.mutateDirectory) << 5;
          } else if (e !== null && e !== void 0) {
            throw new TypeError("only an object, undefined or null can be converted to flags");
          }
          dataView(memory0).setInt8(arg1 + 1, flags3, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 1, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline24(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.getType() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          var val3 = e;
          let enum3;
          switch (val3) {
            case "unknown": {
              enum3 = 0;
              break;
            }
            case "block-device": {
              enum3 = 1;
              break;
            }
            case "character-device": {
              enum3 = 2;
              break;
            }
            case "directory": {
              enum3 = 3;
              break;
            }
            case "fifo": {
              enum3 = 4;
              break;
            }
            case "symbolic-link": {
              enum3 = 5;
              break;
            }
            case "regular-file": {
              enum3 = 6;
              break;
            }
            case "socket": {
              enum3 = 7;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val3}" is not one of the cases of descriptor-type`);
            }
          }
          dataView(memory0).setInt8(arg1 + 1, enum3, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 1, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    const handleTable7 = [T_FLAG, 0];
    const captureTable7 = /* @__PURE__ */ new Map();
    let captureCnt7 = 0;
    handleTables[7] = handleTable7;
    function trampoline25(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.readDirectory() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          if (!(e instanceof DirectoryEntryStream2)) {
            throw new TypeError('Resource error: Not a valid "DirectoryEntryStream" resource.');
          }
          var handle3 = e[symbolRscHandle];
          if (!handle3) {
            const rep = e[symbolRscRep] || ++captureCnt7;
            captureTable7.set(rep, e);
            handle3 = rscTableCreateOwn(handleTable7, rep);
          }
          dataView(memory0).setInt32(arg1 + 4, handle3, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 4, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline26(arg0, arg1, arg2, arg3) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      var ptr3 = arg1;
      var len3 = arg2;
      var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.createDirectoryAt(result3) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 0, 0, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg3 + 1, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline27(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.stat() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant12 = ret;
      switch (variant12.tag) {
        case "ok": {
          const e = variant12.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          var { type: v3_0, linkCount: v3_1, size: v3_2, dataAccessTimestamp: v3_3, dataModificationTimestamp: v3_4, statusChangeTimestamp: v3_5 } = e;
          var val4 = v3_0;
          let enum4;
          switch (val4) {
            case "unknown": {
              enum4 = 0;
              break;
            }
            case "block-device": {
              enum4 = 1;
              break;
            }
            case "character-device": {
              enum4 = 2;
              break;
            }
            case "directory": {
              enum4 = 3;
              break;
            }
            case "fifo": {
              enum4 = 4;
              break;
            }
            case "symbolic-link": {
              enum4 = 5;
              break;
            }
            case "regular-file": {
              enum4 = 6;
              break;
            }
            case "socket": {
              enum4 = 7;
              break;
            }
            default: {
              if (v3_0 instanceof Error) {
                console.error(v3_0);
              }
              throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
            }
          }
          dataView(memory0).setInt8(arg1 + 8, enum4, true);
          dataView(memory0).setBigInt64(arg1 + 16, toUint64(v3_1), true);
          dataView(memory0).setBigInt64(arg1 + 24, toUint64(v3_2), true);
          var variant6 = v3_3;
          if (variant6 === null || variant6 === void 0) {
            dataView(memory0).setInt8(arg1 + 32, 0, true);
          } else {
            const e2 = variant6;
            dataView(memory0).setInt8(arg1 + 32, 1, true);
            var { seconds: v5_0, nanoseconds: v5_1 } = e2;
            dataView(memory0).setBigInt64(arg1 + 40, toUint64(v5_0), true);
            dataView(memory0).setInt32(arg1 + 48, toUint32(v5_1), true);
          }
          var variant8 = v3_4;
          if (variant8 === null || variant8 === void 0) {
            dataView(memory0).setInt8(arg1 + 56, 0, true);
          } else {
            const e2 = variant8;
            dataView(memory0).setInt8(arg1 + 56, 1, true);
            var { seconds: v7_0, nanoseconds: v7_1 } = e2;
            dataView(memory0).setBigInt64(arg1 + 64, toUint64(v7_0), true);
            dataView(memory0).setInt32(arg1 + 72, toUint32(v7_1), true);
          }
          var variant10 = v3_5;
          if (variant10 === null || variant10 === void 0) {
            dataView(memory0).setInt8(arg1 + 80, 0, true);
          } else {
            const e2 = variant10;
            dataView(memory0).setInt8(arg1 + 80, 1, true);
            var { seconds: v9_0, nanoseconds: v9_1 } = e2;
            dataView(memory0).setBigInt64(arg1 + 88, toUint64(v9_0), true);
            dataView(memory0).setInt32(arg1 + 96, toUint32(v9_1), true);
          }
          break;
        }
        case "err": {
          const e = variant12.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val11 = e;
          let enum11;
          switch (val11) {
            case "access": {
              enum11 = 0;
              break;
            }
            case "would-block": {
              enum11 = 1;
              break;
            }
            case "already": {
              enum11 = 2;
              break;
            }
            case "bad-descriptor": {
              enum11 = 3;
              break;
            }
            case "busy": {
              enum11 = 4;
              break;
            }
            case "deadlock": {
              enum11 = 5;
              break;
            }
            case "quota": {
              enum11 = 6;
              break;
            }
            case "exist": {
              enum11 = 7;
              break;
            }
            case "file-too-large": {
              enum11 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum11 = 9;
              break;
            }
            case "in-progress": {
              enum11 = 10;
              break;
            }
            case "interrupted": {
              enum11 = 11;
              break;
            }
            case "invalid": {
              enum11 = 12;
              break;
            }
            case "io": {
              enum11 = 13;
              break;
            }
            case "is-directory": {
              enum11 = 14;
              break;
            }
            case "loop": {
              enum11 = 15;
              break;
            }
            case "too-many-links": {
              enum11 = 16;
              break;
            }
            case "message-size": {
              enum11 = 17;
              break;
            }
            case "name-too-long": {
              enum11 = 18;
              break;
            }
            case "no-device": {
              enum11 = 19;
              break;
            }
            case "no-entry": {
              enum11 = 20;
              break;
            }
            case "no-lock": {
              enum11 = 21;
              break;
            }
            case "insufficient-memory": {
              enum11 = 22;
              break;
            }
            case "insufficient-space": {
              enum11 = 23;
              break;
            }
            case "not-directory": {
              enum11 = 24;
              break;
            }
            case "not-empty": {
              enum11 = 25;
              break;
            }
            case "not-recoverable": {
              enum11 = 26;
              break;
            }
            case "unsupported": {
              enum11 = 27;
              break;
            }
            case "no-tty": {
              enum11 = 28;
              break;
            }
            case "no-such-device": {
              enum11 = 29;
              break;
            }
            case "overflow": {
              enum11 = 30;
              break;
            }
            case "not-permitted": {
              enum11 = 31;
              break;
            }
            case "pipe": {
              enum11 = 32;
              break;
            }
            case "read-only": {
              enum11 = 33;
              break;
            }
            case "invalid-seek": {
              enum11 = 34;
              break;
            }
            case "text-file-busy": {
              enum11 = 35;
              break;
            }
            case "cross-device": {
              enum11 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val11}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 8, enum11, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline28(arg0, arg1, arg2, arg3, arg4) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      if ((arg1 & 4294967294) !== 0) {
        throw new TypeError("flags have extraneous bits set");
      }
      var flags3 = {
        symlinkFollow: Boolean(arg1 & 1)
      };
      var ptr4 = arg2;
      var len4 = arg3;
      var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.statAt(flags3, result4) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant14 = ret;
      switch (variant14.tag) {
        case "ok": {
          const e = variant14.val;
          dataView(memory0).setInt8(arg4 + 0, 0, true);
          var { type: v5_0, linkCount: v5_1, size: v5_2, dataAccessTimestamp: v5_3, dataModificationTimestamp: v5_4, statusChangeTimestamp: v5_5 } = e;
          var val6 = v5_0;
          let enum6;
          switch (val6) {
            case "unknown": {
              enum6 = 0;
              break;
            }
            case "block-device": {
              enum6 = 1;
              break;
            }
            case "character-device": {
              enum6 = 2;
              break;
            }
            case "directory": {
              enum6 = 3;
              break;
            }
            case "fifo": {
              enum6 = 4;
              break;
            }
            case "symbolic-link": {
              enum6 = 5;
              break;
            }
            case "regular-file": {
              enum6 = 6;
              break;
            }
            case "socket": {
              enum6 = 7;
              break;
            }
            default: {
              if (v5_0 instanceof Error) {
                console.error(v5_0);
              }
              throw new TypeError(`"${val6}" is not one of the cases of descriptor-type`);
            }
          }
          dataView(memory0).setInt8(arg4 + 8, enum6, true);
          dataView(memory0).setBigInt64(arg4 + 16, toUint64(v5_1), true);
          dataView(memory0).setBigInt64(arg4 + 24, toUint64(v5_2), true);
          var variant8 = v5_3;
          if (variant8 === null || variant8 === void 0) {
            dataView(memory0).setInt8(arg4 + 32, 0, true);
          } else {
            const e2 = variant8;
            dataView(memory0).setInt8(arg4 + 32, 1, true);
            var { seconds: v7_0, nanoseconds: v7_1 } = e2;
            dataView(memory0).setBigInt64(arg4 + 40, toUint64(v7_0), true);
            dataView(memory0).setInt32(arg4 + 48, toUint32(v7_1), true);
          }
          var variant10 = v5_4;
          if (variant10 === null || variant10 === void 0) {
            dataView(memory0).setInt8(arg4 + 56, 0, true);
          } else {
            const e2 = variant10;
            dataView(memory0).setInt8(arg4 + 56, 1, true);
            var { seconds: v9_0, nanoseconds: v9_1 } = e2;
            dataView(memory0).setBigInt64(arg4 + 64, toUint64(v9_0), true);
            dataView(memory0).setInt32(arg4 + 72, toUint32(v9_1), true);
          }
          var variant12 = v5_5;
          if (variant12 === null || variant12 === void 0) {
            dataView(memory0).setInt8(arg4 + 80, 0, true);
          } else {
            const e2 = variant12;
            dataView(memory0).setInt8(arg4 + 80, 1, true);
            var { seconds: v11_0, nanoseconds: v11_1 } = e2;
            dataView(memory0).setBigInt64(arg4 + 88, toUint64(v11_0), true);
            dataView(memory0).setInt32(arg4 + 96, toUint32(v11_1), true);
          }
          break;
        }
        case "err": {
          const e = variant14.val;
          dataView(memory0).setInt8(arg4 + 0, 1, true);
          var val13 = e;
          let enum13;
          switch (val13) {
            case "access": {
              enum13 = 0;
              break;
            }
            case "would-block": {
              enum13 = 1;
              break;
            }
            case "already": {
              enum13 = 2;
              break;
            }
            case "bad-descriptor": {
              enum13 = 3;
              break;
            }
            case "busy": {
              enum13 = 4;
              break;
            }
            case "deadlock": {
              enum13 = 5;
              break;
            }
            case "quota": {
              enum13 = 6;
              break;
            }
            case "exist": {
              enum13 = 7;
              break;
            }
            case "file-too-large": {
              enum13 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum13 = 9;
              break;
            }
            case "in-progress": {
              enum13 = 10;
              break;
            }
            case "interrupted": {
              enum13 = 11;
              break;
            }
            case "invalid": {
              enum13 = 12;
              break;
            }
            case "io": {
              enum13 = 13;
              break;
            }
            case "is-directory": {
              enum13 = 14;
              break;
            }
            case "loop": {
              enum13 = 15;
              break;
            }
            case "too-many-links": {
              enum13 = 16;
              break;
            }
            case "message-size": {
              enum13 = 17;
              break;
            }
            case "name-too-long": {
              enum13 = 18;
              break;
            }
            case "no-device": {
              enum13 = 19;
              break;
            }
            case "no-entry": {
              enum13 = 20;
              break;
            }
            case "no-lock": {
              enum13 = 21;
              break;
            }
            case "insufficient-memory": {
              enum13 = 22;
              break;
            }
            case "insufficient-space": {
              enum13 = 23;
              break;
            }
            case "not-directory": {
              enum13 = 24;
              break;
            }
            case "not-empty": {
              enum13 = 25;
              break;
            }
            case "not-recoverable": {
              enum13 = 26;
              break;
            }
            case "unsupported": {
              enum13 = 27;
              break;
            }
            case "no-tty": {
              enum13 = 28;
              break;
            }
            case "no-such-device": {
              enum13 = 29;
              break;
            }
            case "overflow": {
              enum13 = 30;
              break;
            }
            case "not-permitted": {
              enum13 = 31;
              break;
            }
            case "pipe": {
              enum13 = 32;
              break;
            }
            case "read-only": {
              enum13 = 33;
              break;
            }
            case "invalid-seek": {
              enum13 = 34;
              break;
            }
            case "text-file-busy": {
              enum13 = 35;
              break;
            }
            case "cross-device": {
              enum13 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val13}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg4 + 8, enum13, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline29(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      if ((arg1 & 4294967294) !== 0) {
        throw new TypeError("flags have extraneous bits set");
      }
      var flags3 = {
        symlinkFollow: Boolean(arg1 & 1)
      };
      var ptr4 = arg2;
      var len4 = arg3;
      var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
      if ((arg4 & 4294967280) !== 0) {
        throw new TypeError("flags have extraneous bits set");
      }
      var flags5 = {
        create: Boolean(arg4 & 1),
        directory: Boolean(arg4 & 2),
        exclusive: Boolean(arg4 & 4),
        truncate: Boolean(arg4 & 8)
      };
      if ((arg5 & 4294967232) !== 0) {
        throw new TypeError("flags have extraneous bits set");
      }
      var flags6 = {
        read: Boolean(arg5 & 1),
        write: Boolean(arg5 & 2),
        fileIntegritySync: Boolean(arg5 & 4),
        dataIntegritySync: Boolean(arg5 & 8),
        requestedWriteSync: Boolean(arg5 & 16),
        mutateDirectory: Boolean(arg5 & 32)
      };
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.openAt(flags3, result4, flags5, flags6) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant9 = ret;
      switch (variant9.tag) {
        case "ok": {
          const e = variant9.val;
          dataView(memory0).setInt8(arg6 + 0, 0, true);
          if (!(e instanceof Descriptor2)) {
            throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
          }
          var handle7 = e[symbolRscHandle];
          if (!handle7) {
            const rep = e[symbolRscRep] || ++captureCnt6;
            captureTable6.set(rep, e);
            handle7 = rscTableCreateOwn(handleTable6, rep);
          }
          dataView(memory0).setInt32(arg6 + 4, handle7, true);
          break;
        }
        case "err": {
          const e = variant9.val;
          dataView(memory0).setInt8(arg6 + 0, 1, true);
          var val8 = e;
          let enum8;
          switch (val8) {
            case "access": {
              enum8 = 0;
              break;
            }
            case "would-block": {
              enum8 = 1;
              break;
            }
            case "already": {
              enum8 = 2;
              break;
            }
            case "bad-descriptor": {
              enum8 = 3;
              break;
            }
            case "busy": {
              enum8 = 4;
              break;
            }
            case "deadlock": {
              enum8 = 5;
              break;
            }
            case "quota": {
              enum8 = 6;
              break;
            }
            case "exist": {
              enum8 = 7;
              break;
            }
            case "file-too-large": {
              enum8 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum8 = 9;
              break;
            }
            case "in-progress": {
              enum8 = 10;
              break;
            }
            case "interrupted": {
              enum8 = 11;
              break;
            }
            case "invalid": {
              enum8 = 12;
              break;
            }
            case "io": {
              enum8 = 13;
              break;
            }
            case "is-directory": {
              enum8 = 14;
              break;
            }
            case "loop": {
              enum8 = 15;
              break;
            }
            case "too-many-links": {
              enum8 = 16;
              break;
            }
            case "message-size": {
              enum8 = 17;
              break;
            }
            case "name-too-long": {
              enum8 = 18;
              break;
            }
            case "no-device": {
              enum8 = 19;
              break;
            }
            case "no-entry": {
              enum8 = 20;
              break;
            }
            case "no-lock": {
              enum8 = 21;
              break;
            }
            case "insufficient-memory": {
              enum8 = 22;
              break;
            }
            case "insufficient-space": {
              enum8 = 23;
              break;
            }
            case "not-directory": {
              enum8 = 24;
              break;
            }
            case "not-empty": {
              enum8 = 25;
              break;
            }
            case "not-recoverable": {
              enum8 = 26;
              break;
            }
            case "unsupported": {
              enum8 = 27;
              break;
            }
            case "no-tty": {
              enum8 = 28;
              break;
            }
            case "no-such-device": {
              enum8 = 29;
              break;
            }
            case "overflow": {
              enum8 = 30;
              break;
            }
            case "not-permitted": {
              enum8 = 31;
              break;
            }
            case "pipe": {
              enum8 = 32;
              break;
            }
            case "read-only": {
              enum8 = 33;
              break;
            }
            case "invalid-seek": {
              enum8 = 34;
              break;
            }
            case "text-file-busy": {
              enum8 = 35;
              break;
            }
            case "cross-device": {
              enum8 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val8}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg6 + 4, enum8, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline30(arg0, arg1, arg2, arg3) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      var ptr3 = arg1;
      var len3 = arg2;
      var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.readlinkAt(result3) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant6 = ret;
      switch (variant6.tag) {
        case "ok": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg3 + 0, 0, true);
          var ptr4 = utf8Encode(e, realloc0, memory0);
          var len4 = utf8EncodedLen;
          dataView(memory0).setInt32(arg3 + 8, len4, true);
          dataView(memory0).setInt32(arg3 + 4, ptr4, true);
          break;
        }
        case "err": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg3 + 0, 1, true);
          var val5 = e;
          let enum5;
          switch (val5) {
            case "access": {
              enum5 = 0;
              break;
            }
            case "would-block": {
              enum5 = 1;
              break;
            }
            case "already": {
              enum5 = 2;
              break;
            }
            case "bad-descriptor": {
              enum5 = 3;
              break;
            }
            case "busy": {
              enum5 = 4;
              break;
            }
            case "deadlock": {
              enum5 = 5;
              break;
            }
            case "quota": {
              enum5 = 6;
              break;
            }
            case "exist": {
              enum5 = 7;
              break;
            }
            case "file-too-large": {
              enum5 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum5 = 9;
              break;
            }
            case "in-progress": {
              enum5 = 10;
              break;
            }
            case "interrupted": {
              enum5 = 11;
              break;
            }
            case "invalid": {
              enum5 = 12;
              break;
            }
            case "io": {
              enum5 = 13;
              break;
            }
            case "is-directory": {
              enum5 = 14;
              break;
            }
            case "loop": {
              enum5 = 15;
              break;
            }
            case "too-many-links": {
              enum5 = 16;
              break;
            }
            case "message-size": {
              enum5 = 17;
              break;
            }
            case "name-too-long": {
              enum5 = 18;
              break;
            }
            case "no-device": {
              enum5 = 19;
              break;
            }
            case "no-entry": {
              enum5 = 20;
              break;
            }
            case "no-lock": {
              enum5 = 21;
              break;
            }
            case "insufficient-memory": {
              enum5 = 22;
              break;
            }
            case "insufficient-space": {
              enum5 = 23;
              break;
            }
            case "not-directory": {
              enum5 = 24;
              break;
            }
            case "not-empty": {
              enum5 = 25;
              break;
            }
            case "not-recoverable": {
              enum5 = 26;
              break;
            }
            case "unsupported": {
              enum5 = 27;
              break;
            }
            case "no-tty": {
              enum5 = 28;
              break;
            }
            case "no-such-device": {
              enum5 = 29;
              break;
            }
            case "overflow": {
              enum5 = 30;
              break;
            }
            case "not-permitted": {
              enum5 = 31;
              break;
            }
            case "pipe": {
              enum5 = 32;
              break;
            }
            case "read-only": {
              enum5 = 33;
              break;
            }
            case "invalid-seek": {
              enum5 = 34;
              break;
            }
            case "text-file-busy": {
              enum5 = 35;
              break;
            }
            case "cross-device": {
              enum5 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val5}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg3 + 4, enum5, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline31(arg0, arg1, arg2, arg3) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      var ptr3 = arg1;
      var len3 = arg2;
      var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.removeDirectoryAt(result3) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 0, 0, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg3 + 1, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline32(arg0, arg1, arg2, arg3) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      var ptr3 = arg1;
      var len3 = arg2;
      var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.unlinkFileAt(result3) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 0, 0, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg3 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg3 + 1, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline33(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.metadataHash() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          var { lower: v3_0, upper: v3_1 } = e;
          dataView(memory0).setBigInt64(arg1 + 8, toUint64(v3_0), true);
          dataView(memory0).setBigInt64(arg1 + 16, toUint64(v3_1), true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val4 = e;
          let enum4;
          switch (val4) {
            case "access": {
              enum4 = 0;
              break;
            }
            case "would-block": {
              enum4 = 1;
              break;
            }
            case "already": {
              enum4 = 2;
              break;
            }
            case "bad-descriptor": {
              enum4 = 3;
              break;
            }
            case "busy": {
              enum4 = 4;
              break;
            }
            case "deadlock": {
              enum4 = 5;
              break;
            }
            case "quota": {
              enum4 = 6;
              break;
            }
            case "exist": {
              enum4 = 7;
              break;
            }
            case "file-too-large": {
              enum4 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum4 = 9;
              break;
            }
            case "in-progress": {
              enum4 = 10;
              break;
            }
            case "interrupted": {
              enum4 = 11;
              break;
            }
            case "invalid": {
              enum4 = 12;
              break;
            }
            case "io": {
              enum4 = 13;
              break;
            }
            case "is-directory": {
              enum4 = 14;
              break;
            }
            case "loop": {
              enum4 = 15;
              break;
            }
            case "too-many-links": {
              enum4 = 16;
              break;
            }
            case "message-size": {
              enum4 = 17;
              break;
            }
            case "name-too-long": {
              enum4 = 18;
              break;
            }
            case "no-device": {
              enum4 = 19;
              break;
            }
            case "no-entry": {
              enum4 = 20;
              break;
            }
            case "no-lock": {
              enum4 = 21;
              break;
            }
            case "insufficient-memory": {
              enum4 = 22;
              break;
            }
            case "insufficient-space": {
              enum4 = 23;
              break;
            }
            case "not-directory": {
              enum4 = 24;
              break;
            }
            case "not-empty": {
              enum4 = 25;
              break;
            }
            case "not-recoverable": {
              enum4 = 26;
              break;
            }
            case "unsupported": {
              enum4 = 27;
              break;
            }
            case "no-tty": {
              enum4 = 28;
              break;
            }
            case "no-such-device": {
              enum4 = 29;
              break;
            }
            case "overflow": {
              enum4 = 30;
              break;
            }
            case "not-permitted": {
              enum4 = 31;
              break;
            }
            case "pipe": {
              enum4 = 32;
              break;
            }
            case "read-only": {
              enum4 = 33;
              break;
            }
            case "invalid-seek": {
              enum4 = 34;
              break;
            }
            case "text-file-busy": {
              enum4 = 35;
              break;
            }
            case "cross-device": {
              enum4 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val4}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 8, enum4, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline34(arg0, arg1, arg2, arg3, arg4) {
      var handle1 = arg0;
      var rep2 = handleTable6[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable6.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Descriptor2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      if ((arg1 & 4294967294) !== 0) {
        throw new TypeError("flags have extraneous bits set");
      }
      var flags3 = {
        symlinkFollow: Boolean(arg1 & 1)
      };
      var ptr4 = arg2;
      var len4 = arg3;
      var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.metadataHashAt(flags3, result4) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant7 = ret;
      switch (variant7.tag) {
        case "ok": {
          const e = variant7.val;
          dataView(memory0).setInt8(arg4 + 0, 0, true);
          var { lower: v5_0, upper: v5_1 } = e;
          dataView(memory0).setBigInt64(arg4 + 8, toUint64(v5_0), true);
          dataView(memory0).setBigInt64(arg4 + 16, toUint64(v5_1), true);
          break;
        }
        case "err": {
          const e = variant7.val;
          dataView(memory0).setInt8(arg4 + 0, 1, true);
          var val6 = e;
          let enum6;
          switch (val6) {
            case "access": {
              enum6 = 0;
              break;
            }
            case "would-block": {
              enum6 = 1;
              break;
            }
            case "already": {
              enum6 = 2;
              break;
            }
            case "bad-descriptor": {
              enum6 = 3;
              break;
            }
            case "busy": {
              enum6 = 4;
              break;
            }
            case "deadlock": {
              enum6 = 5;
              break;
            }
            case "quota": {
              enum6 = 6;
              break;
            }
            case "exist": {
              enum6 = 7;
              break;
            }
            case "file-too-large": {
              enum6 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum6 = 9;
              break;
            }
            case "in-progress": {
              enum6 = 10;
              break;
            }
            case "interrupted": {
              enum6 = 11;
              break;
            }
            case "invalid": {
              enum6 = 12;
              break;
            }
            case "io": {
              enum6 = 13;
              break;
            }
            case "is-directory": {
              enum6 = 14;
              break;
            }
            case "loop": {
              enum6 = 15;
              break;
            }
            case "too-many-links": {
              enum6 = 16;
              break;
            }
            case "message-size": {
              enum6 = 17;
              break;
            }
            case "name-too-long": {
              enum6 = 18;
              break;
            }
            case "no-device": {
              enum6 = 19;
              break;
            }
            case "no-entry": {
              enum6 = 20;
              break;
            }
            case "no-lock": {
              enum6 = 21;
              break;
            }
            case "insufficient-memory": {
              enum6 = 22;
              break;
            }
            case "insufficient-space": {
              enum6 = 23;
              break;
            }
            case "not-directory": {
              enum6 = 24;
              break;
            }
            case "not-empty": {
              enum6 = 25;
              break;
            }
            case "not-recoverable": {
              enum6 = 26;
              break;
            }
            case "unsupported": {
              enum6 = 27;
              break;
            }
            case "no-tty": {
              enum6 = 28;
              break;
            }
            case "no-such-device": {
              enum6 = 29;
              break;
            }
            case "overflow": {
              enum6 = 30;
              break;
            }
            case "not-permitted": {
              enum6 = 31;
              break;
            }
            case "pipe": {
              enum6 = 32;
              break;
            }
            case "read-only": {
              enum6 = 33;
              break;
            }
            case "invalid-seek": {
              enum6 = 34;
              break;
            }
            case "text-file-busy": {
              enum6 = 35;
              break;
            }
            case "cross-device": {
              enum6 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val6}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg4 + 8, enum6, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline35(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable7[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable7.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(DirectoryEntryStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.readDirectoryEntry() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant8 = ret;
      switch (variant8.tag) {
        case "ok": {
          const e = variant8.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          var variant6 = e;
          if (variant6 === null || variant6 === void 0) {
            dataView(memory0).setInt8(arg1 + 4, 0, true);
          } else {
            const e2 = variant6;
            dataView(memory0).setInt8(arg1 + 4, 1, true);
            var { type: v3_0, name: v3_1 } = e2;
            var val4 = v3_0;
            let enum4;
            switch (val4) {
              case "unknown": {
                enum4 = 0;
                break;
              }
              case "block-device": {
                enum4 = 1;
                break;
              }
              case "character-device": {
                enum4 = 2;
                break;
              }
              case "directory": {
                enum4 = 3;
                break;
              }
              case "fifo": {
                enum4 = 4;
                break;
              }
              case "symbolic-link": {
                enum4 = 5;
                break;
              }
              case "regular-file": {
                enum4 = 6;
                break;
              }
              case "socket": {
                enum4 = 7;
                break;
              }
              default: {
                if (v3_0 instanceof Error) {
                  console.error(v3_0);
                }
                throw new TypeError(`"${val4}" is not one of the cases of descriptor-type`);
              }
            }
            dataView(memory0).setInt8(arg1 + 8, enum4, true);
            var ptr5 = utf8Encode(v3_1, realloc0, memory0);
            var len5 = utf8EncodedLen;
            dataView(memory0).setInt32(arg1 + 16, len5, true);
            dataView(memory0).setInt32(arg1 + 12, ptr5, true);
          }
          break;
        }
        case "err": {
          const e = variant8.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var val7 = e;
          let enum7;
          switch (val7) {
            case "access": {
              enum7 = 0;
              break;
            }
            case "would-block": {
              enum7 = 1;
              break;
            }
            case "already": {
              enum7 = 2;
              break;
            }
            case "bad-descriptor": {
              enum7 = 3;
              break;
            }
            case "busy": {
              enum7 = 4;
              break;
            }
            case "deadlock": {
              enum7 = 5;
              break;
            }
            case "quota": {
              enum7 = 6;
              break;
            }
            case "exist": {
              enum7 = 7;
              break;
            }
            case "file-too-large": {
              enum7 = 8;
              break;
            }
            case "illegal-byte-sequence": {
              enum7 = 9;
              break;
            }
            case "in-progress": {
              enum7 = 10;
              break;
            }
            case "interrupted": {
              enum7 = 11;
              break;
            }
            case "invalid": {
              enum7 = 12;
              break;
            }
            case "io": {
              enum7 = 13;
              break;
            }
            case "is-directory": {
              enum7 = 14;
              break;
            }
            case "loop": {
              enum7 = 15;
              break;
            }
            case "too-many-links": {
              enum7 = 16;
              break;
            }
            case "message-size": {
              enum7 = 17;
              break;
            }
            case "name-too-long": {
              enum7 = 18;
              break;
            }
            case "no-device": {
              enum7 = 19;
              break;
            }
            case "no-entry": {
              enum7 = 20;
              break;
            }
            case "no-lock": {
              enum7 = 21;
              break;
            }
            case "insufficient-memory": {
              enum7 = 22;
              break;
            }
            case "insufficient-space": {
              enum7 = 23;
              break;
            }
            case "not-directory": {
              enum7 = 24;
              break;
            }
            case "not-empty": {
              enum7 = 25;
              break;
            }
            case "not-recoverable": {
              enum7 = 26;
              break;
            }
            case "unsupported": {
              enum7 = 27;
              break;
            }
            case "no-tty": {
              enum7 = 28;
              break;
            }
            case "no-such-device": {
              enum7 = 29;
              break;
            }
            case "overflow": {
              enum7 = 30;
              break;
            }
            case "not-permitted": {
              enum7 = 31;
              break;
            }
            case "pipe": {
              enum7 = 32;
              break;
            }
            case "read-only": {
              enum7 = 33;
              break;
            }
            case "invalid-seek": {
              enum7 = 34;
              break;
            }
            case "text-file-busy": {
              enum7 = 35;
              break;
            }
            case "cross-device": {
              enum7 = 36;
              break;
            }
            default: {
              if (e instanceof Error) {
                console.error(e);
              }
              throw new TypeError(`"${val7}" is not one of the cases of error-code`);
            }
          }
          dataView(memory0).setInt8(arg1 + 4, enum7, true);
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    const handleTable0 = [T_FLAG, 0];
    const captureTable0 = /* @__PURE__ */ new Map();
    let captureCnt0 = 0;
    handleTables[0] = handleTable0;
    function trampoline36(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable0[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable0.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(Error$1.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      const ret = filesystemErrorCode(rsc0);
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant4 = ret;
      if (variant4 === null || variant4 === void 0) {
        dataView(memory0).setInt8(arg1 + 0, 0, true);
      } else {
        const e = variant4;
        dataView(memory0).setInt8(arg1 + 0, 1, true);
        var val3 = e;
        let enum3;
        switch (val3) {
          case "access": {
            enum3 = 0;
            break;
          }
          case "would-block": {
            enum3 = 1;
            break;
          }
          case "already": {
            enum3 = 2;
            break;
          }
          case "bad-descriptor": {
            enum3 = 3;
            break;
          }
          case "busy": {
            enum3 = 4;
            break;
          }
          case "deadlock": {
            enum3 = 5;
            break;
          }
          case "quota": {
            enum3 = 6;
            break;
          }
          case "exist": {
            enum3 = 7;
            break;
          }
          case "file-too-large": {
            enum3 = 8;
            break;
          }
          case "illegal-byte-sequence": {
            enum3 = 9;
            break;
          }
          case "in-progress": {
            enum3 = 10;
            break;
          }
          case "interrupted": {
            enum3 = 11;
            break;
          }
          case "invalid": {
            enum3 = 12;
            break;
          }
          case "io": {
            enum3 = 13;
            break;
          }
          case "is-directory": {
            enum3 = 14;
            break;
          }
          case "loop": {
            enum3 = 15;
            break;
          }
          case "too-many-links": {
            enum3 = 16;
            break;
          }
          case "message-size": {
            enum3 = 17;
            break;
          }
          case "name-too-long": {
            enum3 = 18;
            break;
          }
          case "no-device": {
            enum3 = 19;
            break;
          }
          case "no-entry": {
            enum3 = 20;
            break;
          }
          case "no-lock": {
            enum3 = 21;
            break;
          }
          case "insufficient-memory": {
            enum3 = 22;
            break;
          }
          case "insufficient-space": {
            enum3 = 23;
            break;
          }
          case "not-directory": {
            enum3 = 24;
            break;
          }
          case "not-empty": {
            enum3 = 25;
            break;
          }
          case "not-recoverable": {
            enum3 = 26;
            break;
          }
          case "unsupported": {
            enum3 = 27;
            break;
          }
          case "no-tty": {
            enum3 = 28;
            break;
          }
          case "no-such-device": {
            enum3 = 29;
            break;
          }
          case "overflow": {
            enum3 = 30;
            break;
          }
          case "not-permitted": {
            enum3 = 31;
            break;
          }
          case "pipe": {
            enum3 = 32;
            break;
          }
          case "read-only": {
            enum3 = 33;
            break;
          }
          case "invalid-seek": {
            enum3 = 34;
            break;
          }
          case "text-file-busy": {
            enum3 = 35;
            break;
          }
          case "cross-device": {
            enum3 = 36;
            break;
          }
          default: {
            if (e instanceof Error) {
              console.error(e);
            }
            throw new TypeError(`"${val3}" is not one of the cases of error-code`);
          }
        }
        dataView(memory0).setInt8(arg1 + 1, enum3, true);
      }
    }
    function trampoline37(arg0, arg1, arg2) {
      var handle1 = arg0;
      var rep2 = handleTable2[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable2.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(InputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.read(BigInt.asUintN(64, arg1)) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant6 = ret;
      switch (variant6.tag) {
        case "ok": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg2 + 0, 0, true);
          var val3 = e;
          var len3 = val3.byteLength;
          var ptr3 = realloc0(0, 0, 1, len3 * 1);
          var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
          new Uint8Array(memory0.buffer, ptr3, len3 * 1).set(src3);
          dataView(memory0).setInt32(arg2 + 8, len3, true);
          dataView(memory0).setInt32(arg2 + 4, ptr3, true);
          break;
        }
        case "err": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg2 + 0, 1, true);
          var variant5 = e;
          switch (variant5.tag) {
            case "last-operation-failed": {
              const e2 = variant5.val;
              dataView(memory0).setInt8(arg2 + 4, 0, true);
              if (!(e2 instanceof Error$1)) {
                throw new TypeError('Resource error: Not a valid "Error" resource.');
              }
              var handle4 = e2[symbolRscHandle];
              if (!handle4) {
                const rep = e2[symbolRscRep] || ++captureCnt0;
                captureTable0.set(rep, e2);
                handle4 = rscTableCreateOwn(handleTable0, rep);
              }
              dataView(memory0).setInt32(arg2 + 8, handle4, true);
              break;
            }
            case "closed": {
              dataView(memory0).setInt8(arg2 + 4, 1, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
            }
          }
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline38(arg0, arg1, arg2) {
      var handle1 = arg0;
      var rep2 = handleTable2[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable2.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(InputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.blockingRead(BigInt.asUintN(64, arg1)) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant6 = ret;
      switch (variant6.tag) {
        case "ok": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg2 + 0, 0, true);
          var val3 = e;
          var len3 = val3.byteLength;
          var ptr3 = realloc0(0, 0, 1, len3 * 1);
          var src3 = new Uint8Array(val3.buffer || val3, val3.byteOffset, len3 * 1);
          new Uint8Array(memory0.buffer, ptr3, len3 * 1).set(src3);
          dataView(memory0).setInt32(arg2 + 8, len3, true);
          dataView(memory0).setInt32(arg2 + 4, ptr3, true);
          break;
        }
        case "err": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg2 + 0, 1, true);
          var variant5 = e;
          switch (variant5.tag) {
            case "last-operation-failed": {
              const e2 = variant5.val;
              dataView(memory0).setInt8(arg2 + 4, 0, true);
              if (!(e2 instanceof Error$1)) {
                throw new TypeError('Resource error: Not a valid "Error" resource.');
              }
              var handle4 = e2[symbolRscHandle];
              if (!handle4) {
                const rep = e2[symbolRscRep] || ++captureCnt0;
                captureTable0.set(rep, e2);
                handle4 = rscTableCreateOwn(handleTable0, rep);
              }
              dataView(memory0).setInt32(arg2 + 8, handle4, true);
              break;
            }
            case "closed": {
              dataView(memory0).setInt8(arg2 + 4, 1, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
            }
          }
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline39(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable3[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable3.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(OutputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.checkWrite() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          dataView(memory0).setBigInt64(arg1 + 8, toUint64(e), true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var variant4 = e;
          switch (variant4.tag) {
            case "last-operation-failed": {
              const e2 = variant4.val;
              dataView(memory0).setInt8(arg1 + 8, 0, true);
              if (!(e2 instanceof Error$1)) {
                throw new TypeError('Resource error: Not a valid "Error" resource.');
              }
              var handle3 = e2[symbolRscHandle];
              if (!handle3) {
                const rep = e2[symbolRscRep] || ++captureCnt0;
                captureTable0.set(rep, e2);
                handle3 = rscTableCreateOwn(handleTable0, rep);
              }
              dataView(memory0).setInt32(arg1 + 12, handle3, true);
              break;
            }
            case "closed": {
              dataView(memory0).setInt8(arg1 + 8, 1, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
            }
          }
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline40(arg0, arg1, arg2, arg3) {
      var handle1 = arg0;
      var rep2 = handleTable3[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable3.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(OutputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      var ptr3 = arg1;
      var len3 = arg2;
      var result3 = new Uint8Array(memory0.buffer.slice(ptr3, ptr3 + len3 * 1));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.write(result3) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant6 = ret;
      switch (variant6.tag) {
        case "ok": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg3 + 0, 0, true);
          break;
        }
        case "err": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg3 + 0, 1, true);
          var variant5 = e;
          switch (variant5.tag) {
            case "last-operation-failed": {
              const e2 = variant5.val;
              dataView(memory0).setInt8(arg3 + 4, 0, true);
              if (!(e2 instanceof Error$1)) {
                throw new TypeError('Resource error: Not a valid "Error" resource.');
              }
              var handle4 = e2[symbolRscHandle];
              if (!handle4) {
                const rep = e2[symbolRscRep] || ++captureCnt0;
                captureTable0.set(rep, e2);
                handle4 = rscTableCreateOwn(handleTable0, rep);
              }
              dataView(memory0).setInt32(arg3 + 8, handle4, true);
              break;
            }
            case "closed": {
              dataView(memory0).setInt8(arg3 + 4, 1, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
            }
          }
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline41(arg0, arg1, arg2, arg3) {
      var handle1 = arg0;
      var rep2 = handleTable3[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable3.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(OutputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      var ptr3 = arg1;
      var len3 = arg2;
      var result3 = new Uint8Array(memory0.buffer.slice(ptr3, ptr3 + len3 * 1));
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.blockingWriteAndFlush(result3) };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant6 = ret;
      switch (variant6.tag) {
        case "ok": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg3 + 0, 0, true);
          break;
        }
        case "err": {
          const e = variant6.val;
          dataView(memory0).setInt8(arg3 + 0, 1, true);
          var variant5 = e;
          switch (variant5.tag) {
            case "last-operation-failed": {
              const e2 = variant5.val;
              dataView(memory0).setInt8(arg3 + 4, 0, true);
              if (!(e2 instanceof Error$1)) {
                throw new TypeError('Resource error: Not a valid "Error" resource.');
              }
              var handle4 = e2[symbolRscHandle];
              if (!handle4) {
                const rep = e2[symbolRscRep] || ++captureCnt0;
                captureTable0.set(rep, e2);
                handle4 = rscTableCreateOwn(handleTable0, rep);
              }
              dataView(memory0).setInt32(arg3 + 8, handle4, true);
              break;
            }
            case "closed": {
              dataView(memory0).setInt8(arg3 + 4, 1, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant5.tag)}\` (received \`${variant5}\`) specified for \`StreamError\``);
            }
          }
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline42(arg0, arg1) {
      var handle1 = arg0;
      var rep2 = handleTable3[(handle1 << 1) + 1] & ~T_FLAG;
      var rsc0 = captureTable3.get(rep2);
      if (!rsc0) {
        rsc0 = Object.create(OutputStream2.prototype);
        Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
        Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
      }
      curResourceBorrows.push(rsc0);
      let ret;
      try {
        ret = { tag: "ok", val: rsc0.blockingFlush() };
      } catch (e) {
        ret = { tag: "err", val: getErrorPayload(e) };
      }
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var variant5 = ret;
      switch (variant5.tag) {
        case "ok": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 0, true);
          break;
        }
        case "err": {
          const e = variant5.val;
          dataView(memory0).setInt8(arg1 + 0, 1, true);
          var variant4 = e;
          switch (variant4.tag) {
            case "last-operation-failed": {
              const e2 = variant4.val;
              dataView(memory0).setInt8(arg1 + 4, 0, true);
              if (!(e2 instanceof Error$1)) {
                throw new TypeError('Resource error: Not a valid "Error" resource.');
              }
              var handle3 = e2[symbolRscHandle];
              if (!handle3) {
                const rep = e2[symbolRscRep] || ++captureCnt0;
                captureTable0.set(rep, e2);
                handle3 = rscTableCreateOwn(handleTable0, rep);
              }
              dataView(memory0).setInt32(arg1 + 8, handle3, true);
              break;
            }
            case "closed": {
              dataView(memory0).setInt8(arg1 + 4, 1, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant4.tag)}\` (received \`${variant4}\`) specified for \`StreamError\``);
            }
          }
          break;
        }
        default: {
          throw new TypeError("invalid variant specified for result");
        }
      }
    }
    function trampoline43(arg0, arg1, arg2) {
      var len3 = arg1;
      var base3 = arg0;
      var result3 = [];
      for (let i = 0; i < len3; i++) {
        const base = base3 + i * 4;
        var handle1 = dataView(memory0).getInt32(base + 0, true);
        var rep2 = handleTable1[(handle1 << 1) + 1] & ~T_FLAG;
        var rsc0 = captureTable1.get(rep2);
        if (!rsc0) {
          rsc0 = Object.create(Pollable.prototype);
          Object.defineProperty(rsc0, symbolRscHandle, { writable: true, value: handle1 });
          Object.defineProperty(rsc0, symbolRscRep, { writable: true, value: rep2 });
        }
        curResourceBorrows.push(rsc0);
        result3.push(rsc0);
      }
      const ret = poll(result3);
      for (const rsc of curResourceBorrows) {
        rsc[symbolRscHandle] = null;
      }
      curResourceBorrows = [];
      var val4 = ret;
      var len4 = val4.length;
      var ptr4 = realloc0(0, 0, 4, len4 * 4);
      var src4 = new Uint8Array(val4.buffer, val4.byteOffset, len4 * 4);
      new Uint8Array(memory0.buffer, ptr4, len4 * 4).set(src4);
      dataView(memory0).setInt32(arg2 + 4, len4, true);
      dataView(memory0).setInt32(arg2 + 0, ptr4, true);
    }
    function trampoline44(arg0, arg1) {
      const ret = getRandomBytes(BigInt.asUintN(64, arg0));
      var val0 = ret;
      var len0 = val0.byteLength;
      var ptr0 = realloc0(0, 0, 1, len0 * 1);
      var src0 = new Uint8Array(val0.buffer || val0, val0.byteOffset, len0 * 1);
      new Uint8Array(memory0.buffer, ptr0, len0 * 1).set(src0);
      dataView(memory0).setInt32(arg1 + 4, len0, true);
      dataView(memory0).setInt32(arg1 + 0, ptr0, true);
    }
    function trampoline45(arg0) {
      const ret = getDirectories();
      var vec3 = ret;
      var len3 = vec3.length;
      var result3 = realloc0(0, 0, 4, len3 * 12);
      for (let i = 0; i < vec3.length; i++) {
        const e = vec3[i];
        const base = result3 + i * 12;
        var [tuple0_0, tuple0_1] = e;
        if (!(tuple0_0 instanceof Descriptor2)) {
          throw new TypeError('Resource error: Not a valid "Descriptor" resource.');
        }
        var handle1 = tuple0_0[symbolRscHandle];
        if (!handle1) {
          const rep = tuple0_0[symbolRscRep] || ++captureCnt6;
          captureTable6.set(rep, tuple0_0);
          handle1 = rscTableCreateOwn(handleTable6, rep);
        }
        dataView(memory0).setInt32(base + 0, handle1, true);
        var ptr2 = utf8Encode(tuple0_1, realloc0, memory0);
        var len2 = utf8EncodedLen;
        dataView(memory0).setInt32(base + 8, len2, true);
        dataView(memory0).setInt32(base + 4, ptr2, true);
      }
      dataView(memory0).setInt32(arg0 + 4, len3, true);
      dataView(memory0).setInt32(arg0 + 0, result3, true);
    }
    const handleTable4 = [T_FLAG, 0];
    const captureTable4 = /* @__PURE__ */ new Map();
    let captureCnt4 = 0;
    handleTables[4] = handleTable4;
    function trampoline46(arg0) {
      const ret = getTerminalStdin();
      var variant1 = ret;
      if (variant1 === null || variant1 === void 0) {
        dataView(memory0).setInt8(arg0 + 0, 0, true);
      } else {
        const e = variant1;
        dataView(memory0).setInt8(arg0 + 0, 1, true);
        if (!(e instanceof TerminalInput2)) {
          throw new TypeError('Resource error: Not a valid "TerminalInput" resource.');
        }
        var handle0 = e[symbolRscHandle];
        if (!handle0) {
          const rep = e[symbolRscRep] || ++captureCnt4;
          captureTable4.set(rep, e);
          handle0 = rscTableCreateOwn(handleTable4, rep);
        }
        dataView(memory0).setInt32(arg0 + 4, handle0, true);
      }
    }
    const handleTable5 = [T_FLAG, 0];
    const captureTable5 = /* @__PURE__ */ new Map();
    let captureCnt5 = 0;
    handleTables[5] = handleTable5;
    function trampoline47(arg0) {
      const ret = getTerminalStdout();
      var variant1 = ret;
      if (variant1 === null || variant1 === void 0) {
        dataView(memory0).setInt8(arg0 + 0, 0, true);
      } else {
        const e = variant1;
        dataView(memory0).setInt8(arg0 + 0, 1, true);
        if (!(e instanceof TerminalOutput2)) {
          throw new TypeError('Resource error: Not a valid "TerminalOutput" resource.');
        }
        var handle0 = e[symbolRscHandle];
        if (!handle0) {
          const rep = e[symbolRscRep] || ++captureCnt5;
          captureTable5.set(rep, e);
          handle0 = rscTableCreateOwn(handleTable5, rep);
        }
        dataView(memory0).setInt32(arg0 + 4, handle0, true);
      }
    }
    function trampoline48(arg0) {
      const ret = getTerminalStderr();
      var variant1 = ret;
      if (variant1 === null || variant1 === void 0) {
        dataView(memory0).setInt8(arg0 + 0, 0, true);
      } else {
        const e = variant1;
        dataView(memory0).setInt8(arg0 + 0, 1, true);
        if (!(e instanceof TerminalOutput2)) {
          throw new TypeError('Resource error: Not a valid "TerminalOutput" resource.');
        }
        var handle0 = e[symbolRscHandle];
        if (!handle0) {
          const rep = e[symbolRscRep] || ++captureCnt5;
          captureTable5.set(rep, e);
          handle0 = rscTableCreateOwn(handleTable5, rep);
        }
        dataView(memory0).setInt32(arg0 + 4, handle0, true);
      }
    }
    let exports3;
    function trampoline1(handle) {
      const handleEntry = rscTableRemove(handleTable7, handle);
      if (handleEntry.own) {
        const rsc = captureTable7.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable7.delete(handleEntry.rep);
        } else if (DirectoryEntryStream2[symbolCabiDispose]) {
          DirectoryEntryStream2[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline2(handle) {
      const handleEntry = rscTableRemove(handleTable3, handle);
      if (handleEntry.own) {
        const rsc = captureTable3.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable3.delete(handleEntry.rep);
        } else if (OutputStream2[symbolCabiDispose]) {
          OutputStream2[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline3(handle) {
      const handleEntry = rscTableRemove(handleTable0, handle);
      if (handleEntry.own) {
        const rsc = captureTable0.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable0.delete(handleEntry.rep);
        } else if (Error$1[symbolCabiDispose]) {
          Error$1[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline4(handle) {
      const handleEntry = rscTableRemove(handleTable2, handle);
      if (handleEntry.own) {
        const rsc = captureTable2.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable2.delete(handleEntry.rep);
        } else if (InputStream2[symbolCabiDispose]) {
          InputStream2[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline5(handle) {
      const handleEntry = rscTableRemove(handleTable6, handle);
      if (handleEntry.own) {
        const rsc = captureTable6.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable6.delete(handleEntry.rep);
        } else if (Descriptor2[symbolCabiDispose]) {
          Descriptor2[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline10(handle) {
      const handleEntry = rscTableRemove(handleTable1, handle);
      if (handleEntry.own) {
        const rsc = captureTable1.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable1.delete(handleEntry.rep);
        } else if (Pollable[symbolCabiDispose]) {
          Pollable[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline12(handle) {
      const handleEntry = rscTableRemove(handleTable4, handle);
      if (handleEntry.own) {
        const rsc = captureTable4.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable4.delete(handleEntry.rep);
        } else if (TerminalInput2[symbolCabiDispose]) {
          TerminalInput2[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    function trampoline13(handle) {
      const handleEntry = rscTableRemove(handleTable5, handle);
      if (handleEntry.own) {
        const rsc = captureTable5.get(handleEntry.rep);
        if (rsc) {
          if (rsc[symbolDispose])
            rsc[symbolDispose]();
          captureTable5.delete(handleEntry.rep);
        } else if (TerminalOutput2[symbolCabiDispose]) {
          TerminalOutput2[symbolCabiDispose](handleEntry.rep);
        }
      }
    }
    Promise.all([module0, module1, module2, module3]).catch(() => {
    });
    ({ exports: exports0 } = yield instantiateCore(yield module2));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      wasi_snapshot_preview1: {
        args_get: exports0["32"],
        args_sizes_get: exports0["33"],
        clock_time_get: exports0["36"],
        environ_get: exports0["34"],
        environ_sizes_get: exports0["35"],
        fd_close: exports0["37"],
        fd_fdstat_get: exports0["38"],
        fd_fdstat_set_flags: exports0["39"],
        fd_filestat_get: exports0["40"],
        fd_prestat_dir_name: exports0["42"],
        fd_prestat_get: exports0["41"],
        fd_read: exports0["43"],
        fd_readdir: exports0["44"],
        fd_renumber: exports0["45"],
        fd_seek: exports0["46"],
        fd_write: exports0["47"],
        path_create_directory: exports0["48"],
        path_filestat_get: exports0["49"],
        path_open: exports0["50"],
        path_readlink: exports0["51"],
        path_remove_directory: exports0["52"],
        path_unlink_file: exports0["53"],
        poll_oneoff: exports0["54"],
        proc_exit: exports0["55"],
        random_get: exports0["57"],
        sched_yield: exports0["56"]
      }
    }));
    ({ exports: exports2 } = yield instantiateCore(yield module1, {
      __main_module__: {
        _start: exports1._start
      },
      env: {
        memory: exports1.memory
      },
      "wasi:cli/environment@0.2.0": {
        "get-arguments": exports0["1"],
        "get-environment": exports0["0"]
      },
      "wasi:cli/exit@0.2.0": {
        exit: trampoline16
      },
      "wasi:cli/stderr@0.2.0": {
        "get-stderr": trampoline11
      },
      "wasi:cli/stdin@0.2.0": {
        "get-stdin": trampoline14
      },
      "wasi:cli/stdout@0.2.0": {
        "get-stdout": trampoline15
      },
      "wasi:cli/terminal-input@0.2.0": {
        "[resource-drop]terminal-input": trampoline12
      },
      "wasi:cli/terminal-output@0.2.0": {
        "[resource-drop]terminal-output": trampoline13
      },
      "wasi:cli/terminal-stderr@0.2.0": {
        "get-terminal-stderr": exports0["31"]
      },
      "wasi:cli/terminal-stdin@0.2.0": {
        "get-terminal-stdin": exports0["29"]
      },
      "wasi:cli/terminal-stdout@0.2.0": {
        "get-terminal-stdout": exports0["30"]
      },
      "wasi:clocks/monotonic-clock@0.2.0": {
        now: trampoline0,
        "subscribe-duration": trampoline6,
        "subscribe-instant": trampoline7
      },
      "wasi:clocks/wall-clock@0.2.0": {
        now: exports0["2"]
      },
      "wasi:filesystem/preopens@0.2.0": {
        "get-directories": exports0["28"]
      },
      "wasi:filesystem/types@0.2.0": {
        "[method]descriptor.append-via-stream": exports0["5"],
        "[method]descriptor.create-directory-at": exports0["9"],
        "[method]descriptor.get-flags": exports0["6"],
        "[method]descriptor.get-type": exports0["7"],
        "[method]descriptor.metadata-hash": exports0["16"],
        "[method]descriptor.metadata-hash-at": exports0["17"],
        "[method]descriptor.open-at": exports0["12"],
        "[method]descriptor.read-directory": exports0["8"],
        "[method]descriptor.read-via-stream": exports0["3"],
        "[method]descriptor.readlink-at": exports0["13"],
        "[method]descriptor.remove-directory-at": exports0["14"],
        "[method]descriptor.stat": exports0["10"],
        "[method]descriptor.stat-at": exports0["11"],
        "[method]descriptor.unlink-file-at": exports0["15"],
        "[method]descriptor.write-via-stream": exports0["4"],
        "[method]directory-entry-stream.read-directory-entry": exports0["18"],
        "[resource-drop]descriptor": trampoline5,
        "[resource-drop]directory-entry-stream": trampoline1,
        "filesystem-error-code": exports0["19"]
      },
      "wasi:io/error@0.2.0": {
        "[resource-drop]error": trampoline3
      },
      "wasi:io/poll@0.2.0": {
        "[resource-drop]pollable": trampoline10,
        poll: exports0["26"]
      },
      "wasi:io/streams@0.2.0": {
        "[method]input-stream.blocking-read": exports0["21"],
        "[method]input-stream.read": exports0["20"],
        "[method]input-stream.subscribe": trampoline9,
        "[method]output-stream.blocking-flush": exports0["25"],
        "[method]output-stream.blocking-write-and-flush": exports0["24"],
        "[method]output-stream.check-write": exports0["22"],
        "[method]output-stream.subscribe": trampoline8,
        "[method]output-stream.write": exports0["23"],
        "[resource-drop]input-stream": trampoline4,
        "[resource-drop]output-stream": trampoline2
      },
      "wasi:random/random@0.2.0": {
        "get-random-bytes": exports0["27"]
      }
    }));
    memory0 = exports1.memory;
    realloc0 = exports2.cabi_import_realloc;
    ({ exports: exports3 } = yield instantiateCore(yield module3, {
      "": {
        $imports: exports0.$imports,
        "0": trampoline17,
        "1": trampoline18,
        "10": trampoline27,
        "11": trampoline28,
        "12": trampoline29,
        "13": trampoline30,
        "14": trampoline31,
        "15": trampoline32,
        "16": trampoline33,
        "17": trampoline34,
        "18": trampoline35,
        "19": trampoline36,
        "2": trampoline19,
        "20": trampoline37,
        "21": trampoline38,
        "22": trampoline39,
        "23": trampoline40,
        "24": trampoline41,
        "25": trampoline42,
        "26": trampoline43,
        "27": trampoline44,
        "28": trampoline45,
        "29": trampoline46,
        "3": trampoline20,
        "30": trampoline47,
        "31": trampoline48,
        "32": exports2.args_get,
        "33": exports2.args_sizes_get,
        "34": exports2.environ_get,
        "35": exports2.environ_sizes_get,
        "36": exports2.clock_time_get,
        "37": exports2.fd_close,
        "38": exports2.fd_fdstat_get,
        "39": exports2.fd_fdstat_set_flags,
        "4": trampoline21,
        "40": exports2.fd_filestat_get,
        "41": exports2.fd_prestat_get,
        "42": exports2.fd_prestat_dir_name,
        "43": exports2.fd_read,
        "44": exports2.fd_readdir,
        "45": exports2.fd_renumber,
        "46": exports2.fd_seek,
        "47": exports2.fd_write,
        "48": exports2.path_create_directory,
        "49": exports2.path_filestat_get,
        "5": trampoline22,
        "50": exports2.path_open,
        "51": exports2.path_readlink,
        "52": exports2.path_remove_directory,
        "53": exports2.path_unlink_file,
        "54": exports2.poll_oneoff,
        "55": exports2.proc_exit,
        "56": exports2.sched_yield,
        "57": exports2.random_get,
        "6": trampoline23,
        "7": trampoline24,
        "8": trampoline25,
        "9": trampoline26
      }
    }));
    function run() {
      const ret = exports2["wasi:cli/run@0.2.0#run"]();
      let variant0;
      switch (ret) {
        case 0: {
          variant0 = {
            tag: "ok",
            val: void 0
          };
          break;
        }
        case 1: {
          variant0 = {
            tag: "err",
            val: void 0
          };
          break;
        }
        default: {
          throw new TypeError("invalid variant discriminant for expected");
        }
      }
      if (variant0.tag === "err") {
        throw new ComponentError(variant0.val);
      }
      return variant0.val;
    }
    const run020 = {
      run
    };
    return { run: run020, "wasi:cli/run@0.2.0": run020 };
  }();
  let promise, resolve, reject;
  function runNext(value) {
    try {
      let done;
      do {
        ({ value, done } = gen.next(value));
      } while (!(value instanceof Promise) && !done);
      if (done) {
        if (resolve)
          resolve(value);
        else
          return value;
      }
      if (!promise)
        promise = new Promise((_resolve, _reject) => (resolve = _resolve, reject = _reject));
      value.then((nextVal) => done ? resolve() : runNext(nextVal), reject);
    } catch (e) {
      if (reject)
        reject(e);
      else
        throw e;
    }
  }
  const maybeSyncReturn = runNext(null);
  return promise || maybeSyncReturn;
}

// lib/api.js
var yosys = new Application(() => import("./resources-yosys.js"), instantiate, "yowasp-yosys");
var runYosys = yosys.run.bind(yosys);
var commands = { "yosys": runYosys };
var version = "0.57.141-dev.973";
export {
  Exit,
  commands,
  runYosys,
  version
};
