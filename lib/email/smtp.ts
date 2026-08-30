import net from "node:net";
import tls from "node:tls";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user?: string;
  pass?: string;
  timeoutMs?: number;
};

export type SmtpMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

type SmtpResponse = {
  code: number;
  message: string;
};

class SmtpSession {
  private socket: SmtpSocket;
  private readonly config: SmtpConfig;
  private readonly lines: string[] = [];
  private buffer = "";
  private dataWaiter: (() => void) | null = null;
  private readonly onData = (chunk: Buffer) => {
    this.buffer += chunk.toString("utf8");
    let newlineIndex = this.buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
      this.lines.push(line);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      newlineIndex = this.buffer.indexOf("\n");
    }
    this.dataWaiter?.();
  };

  constructor(socket: SmtpSocket, config: SmtpConfig) {
    this.socket = socket;
    this.config = config;
    this.socket.on("data", this.onData);
  }

  async readResponse(): Promise<SmtpResponse> {
    const timeoutMs = this.config.timeoutMs ?? 10000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = this.takeResponse();
      if (response) return response;
      await this.waitForData(Math.max(250, timeoutMs - (Date.now() - startedAt)));
    }

    throw new Error("SMTP server response timed out.");
  }

  sendLine(command: string) {
    this.socket.write(`${command}\r\n`);
  }

  async expect(codes: number[], action: string): Promise<SmtpResponse> {
    const response = await this.readResponse();
    if (!codes.includes(response.code)) {
      throw new Error(`${action}: SMTP ${response.code} ${response.message}`);
    }
    return response;
  }

  async startTls() {
    this.socket.off("data", this.onData);
    this.socket = tls.connect({ socket: this.socket as net.Socket, servername: this.config.host });
    await new Promise<void>((resolve, reject) => {
      this.socket.once("secureConnect", resolve);
      this.socket.once("error", reject);
    });
    this.socket.on("data", this.onData);
  }

  close() {
    this.socket.off("data", this.onData);
    this.socket.end();
  }

  destroy() {
    this.socket.off("data", this.onData);
    this.socket.destroy();
  }

  private takeResponse(): SmtpResponse | null {
    const responseLines: string[] = [];
    for (let index = 0; index < this.lines.length; index += 1) {
      const line = this.lines[index];
      const match = /^(\d{3})([ -])/.exec(line);
      if (!match) continue;
      responseLines.push(line);
      if (match[2] === " ") {
        this.lines.splice(0, index + 1);
        return { code: Number(match[1]), message: responseLines.join("\n") };
      }
    }
    return null;
  }

  private waitForData(timeoutMs: number) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("SMTP server response timed out."));
      }, timeoutMs);
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        clearTimeout(timeout);
        this.socket.off("error", onError);
        this.dataWaiter = null;
      };
      this.socket.once("error", onError);
      this.dataWaiter = () => {
        cleanup();
        resolve();
      };
    });
  }
}

function encodeAddress(value: string) {
  return /<([^<>]+)>/.exec(value)?.[1]?.trim() ?? value.trim();
}

function escapeData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function encodeHeader(value: string) {
  return /[^\x20-\x7e]/.test(value) ? `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=` : value;
}

function buildMessage(message: SmtpMessage) {
  const boundary = `uplands-${Date.now().toString(36)}`;
  const headers = [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
  ];

  if (!message.html) {
    return escapeData([...headers, "Content-Type: text/plain; charset=utf-8", "", message.text].join("\r\n"));
  }

  return escapeData(
    [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      message.text,
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      message.html,
      `--${boundary}--`,
    ].join("\r\n"),
  );
}

async function connect(config: SmtpConfig) {
  const socket = config.secure ? tls.connect({ host: config.host, port: config.port, servername: config.host }) : net.connect({ host: config.host, port: config.port });
  await new Promise<void>((resolve, reject) => {
    socket.once(config.secure ? "secureConnect" : "connect", resolve);
    socket.once("error", reject);
  });
  return new SmtpSession(socket, config);
}

export async function sendSmtpMail(config: SmtpConfig, message: SmtpMessage) {
  const session = await connect(config);
  let tlsActive = config.secure;

  try {
    await session.expect([220], "SMTP connection failed");
    session.sendLine(`EHLO ${config.host}`);
    let ehlo = await session.expect([250], "SMTP greeting failed");

    if (!config.secure) {
      const supportsStartTls = /\bSTARTTLS\b/i.test(ehlo.message);
      if (supportsStartTls) {
        session.sendLine("STARTTLS");
        await session.expect([220], "SMTP STARTTLS failed");
        await session.startTls();
        tlsActive = true;
        session.sendLine(`EHLO ${config.host}`);
        ehlo = await session.expect([250], "SMTP secure greeting failed");
      } else if (config.requireTls) {
        throw new Error("SMTP server does not advertise STARTTLS.");
      }
    }

    if (config.user || config.pass) {
      if (!tlsActive && config.requireTls) {
        throw new Error("SMTP authentication requires TLS.");
      }
      session.sendLine("AUTH LOGIN");
      await session.expect([334], "SMTP authentication failed");
      session.sendLine(Buffer.from(config.user ?? "").toString("base64"));
      await session.expect([334], "SMTP username rejected");
      session.sendLine(Buffer.from(config.pass ?? "").toString("base64"));
      await session.expect([235], "SMTP password rejected");
    }

    session.sendLine(`MAIL FROM:<${encodeAddress(message.from)}>`);
    await session.expect([250], "SMTP sender rejected");
    session.sendLine(`RCPT TO:<${encodeAddress(message.to)}>`);
    await session.expect([250, 251], "SMTP recipient rejected");
    session.sendLine("DATA");
    await session.expect([354], "SMTP DATA rejected");
    session.sendLine(`${buildMessage(message)}\r\n.`);
    await session.expect([250], "SMTP message rejected");
    session.sendLine("QUIT");
    await session.expect([221, 250], "SMTP quit failed");
    session.close();
  } catch (error) {
    session.destroy();
    throw error;
  }
}
