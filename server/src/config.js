import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(serverRoot, '..', '.env') });
dotenv.config({ path: path.resolve(serverRoot, '.env') });

export const config = {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 3000),
    baseFolder: path.resolve('D:\\Media'),
    databasePath: path.resolve(serverRoot, process.env.DATABASE_PATH || './data/media.db'),
    clientDist: path.resolve(serverRoot, process.env.CLIENT_DIST || '../client/dist')
};