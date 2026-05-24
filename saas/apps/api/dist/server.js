import { app } from './app';
import { env } from './config/env';
import './db/database';
import { initDatabase } from './database/init';
async function start() {
    await initDatabase();
    app.listen(env.port, () => {
        console.log(`API running on http://localhost:${env.port}`);
    });
}
void start().catch((error) => {
    console.error('Failed to start API', error);
    process.exit(1);
});
