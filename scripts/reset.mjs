import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

fs.writeFileSync(path.join(DATA_DIR, 'status.json'), '{}', 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'latency.json'), '{"checks":[]}', 'utf-8');
fs.writeFileSync(path.join(DATA_DIR, 'incidents.json'), '{"incidents":[]}', 'utf-8');

console.log('Data reset complete.');
