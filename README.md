# XAI Chat

一个基于 XAI API 的智能对话系统。

## 特性

- 💡 清晰的思考过程展示
- 📊 置信度评分可视化
- 🔍 关键信息智能高亮
- 📚 引用来源实时展示
- 🎯 个性化交互体验
- 🖼️ 图像理解与分析

## 快速部署

### Docker 部署

1. 克隆仓库：

```bash
git clone https://github.com/shebing5/x-ai.git
cd x-ai
```

2. 使用 Docker Compose 启动：

```bash
docker-compose up -d
```

3. 访问 `http://localhost:3000` 即可使用

注意：默认使用3000端口，如需修改请在 docker-compose.yml 中配置


## 本地开发

1. 安装依赖：

```bash
npm install -g http-server
```

2. 启动开发服务器：

```bash
http-server
```

3. 访问 `http://localhost:8080` 进行开发

## 环境变量

生产环境需要配置:

- `XAI_API_KEY`: XAI API 密钥
- `XAI_API_BASE_URL`: API 基础 URL（可选）

## 许可证

MIT
