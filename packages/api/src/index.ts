import app from './app';
import { config } from './config';

app.listen(config.apiPort, () => {
  console.log(`API listening on port ${config.apiPort} (${config.nodeEnv})`);
});
