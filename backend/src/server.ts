import dotenv from 'dotenv';
import app from './app';

// 環境変数の読み込み
dotenv.config();

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Backend server started on port ${PORT}`);
});
