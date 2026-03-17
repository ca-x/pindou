# Pindou

拼豆图案生成工具 - 将图片转换为拼豆图案，支持多种颜色和尺寸。

## 功能特点

- 图片自动转换为拼豆图案
- 支持多种颜色数量（24色-221色）
- 自定义图纸大小（16-104格）
- 实时颜色统计
- 3D 预览效果
- 作品保存与分享
- 用户账户系统

## 快速开始

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/czyt/pindou.git
cd pindou

# 构建
go build -o pindou ./cmd/server

# 运行
./pindou
```

### 使用 Docker

```bash
# 拉取镜像
docker pull czyt/pindou:latest

# 运行
docker run -d -p 8080:8080 -v pindou-data:/app/data czyt/pindou:latest
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `8080` |
| `DATABASE_PATH` | 数据库路径 | `./data/pindou.db` |
| `SESSION_SECRET` | Session 密钥 | 随机生成 |

## 使用说明

1. 打开浏览器访问 `http://localhost:8080`
2. 注册/登录账户
3. 点击"选择图片"上传图片
4. 调整参数（图纸大小、颜色数量）
5. 使用画笔工具编辑图案
6. 保存作品或导出图纸

## 技术栈

- **后端**: Go + Gin + Ent ORM + SQLite
- **前端**: 原生 JavaScript + Canvas
- **部署**: Docker

## License

MIT
