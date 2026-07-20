import { connect } from 'cloudflare:sockets';

async function readLine(reader, decoder, bufferObj) {
  while (true) {
    const idx = bufferObj.buffer.indexOf('\n');
    if (idx !== -1) {
      const line = bufferObj.buffer.substring(0, idx).replace(/\r$/, '');
      bufferObj.buffer = bufferObj.buffer.substring(idx + 1);
      return line;
    }
    const { value, done } = await reader.read();
    if (done) break;
    bufferObj.buffer += decoder.decode(value, { stream: true });
  }
  const remaining = bufferObj.buffer.trim();
  bufferObj.buffer = '';
  return remaining || null;
}

async function sendCommand(writer, encoder, cmd) {
  await writer.write(encoder.encode(cmd + '\r\n'));
}

export async function sendEmail({ host, port, secure, user, pass, from, to, subject, html }) {
  const socket = connect(
    { hostname: host, port: parseInt(port, 10) },
    { secureTransport: secure === 'true' ? 'on' : 'off' }
  );

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const bufferObj = { buffer: '' };

  const cmd = (msg) => sendCommand(writer, encoder, msg);
  const line = () => readLine(reader, decoder, bufferObj);

  try {
    console.log('SMTP: conectando...');
    let res = await line();
    console.log('SMTP banner:', res);
    if (!res || !res.startsWith('220')) throw new Error(`Banner SMTP inválido: ${res}`);

    // EHLO
    console.log('SMTP: enviando EHLO...');
    await cmd('EHLO localhost');
    do {
      res = await line();
      console.log('SMTP EHLO response:', res);
    } while (res && res.charAt(3) === '-');

    // AUTH (opcional, para Gmail)
    if (user && pass) {
      console.log('SMTP: enviando AUTH LOGIN...');
      await cmd('AUTH LOGIN');
      res = await line();
      if (!res || !res.startsWith('334')) throw new Error(`AUTH LOGIN no soportado: ${res}`);

      console.log('SMTP: enviando usuario...');
      await cmd(btoa(user));
      res = await line();
      if (!res || !res.startsWith('334')) throw new Error(`Error en usuario: ${res}`);

      console.log('SMTP: enviando password...');
      await cmd(btoa(pass));
      res = await line();
      if (!res || !res.startsWith('235')) throw new Error(`Autenticación fallida: ${res}`);
    }

    console.log('SMTP: MAIL FROM...');
    await cmd(`MAIL FROM:<${from || user}>`);
    res = await line();
    console.log('SMTP MAIL FROM response:', res);
    if (!res || !res.startsWith('250')) throw new Error(`MAIL FROM: ${res}`);

    console.log('SMTP: RCPT TO...');
    await cmd(`RCPT TO:<${to}>`);
    res = await line();
    console.log('SMTP RCPT TO response:', res);
    if (!res || (!res.startsWith('250') && !res.startsWith('251'))) throw new Error(`RCPT TO: ${res}`);

    console.log('SMTP: DATA...');
    await cmd('DATA');
    res = await line();
    console.log('SMTP DATA response:', res);
    if (!res || !res.startsWith('354')) throw new Error(`DATA: ${res}`);

    const message = [
      `From: ${from || user}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
      '.',
    ].join('\r\n');

    console.log('SMTP: enviando mensaje...');
    await cmd(message);
    res = await line();
    console.log('SMTP mensaje response:', res);
    if (!res || !res.startsWith('250')) throw new Error(`Envío: ${res}`);

    console.log('SMTP: QUIT...');
    await cmd('QUIT');
    await line();
  } finally {
    writer.releaseLock();
    reader.releaseLock();
    socket.close();
  }
}
