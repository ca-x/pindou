# Task Plan: 拼豆在线应用后端开发

## Goal
为拼豆工具创建Go后端服务，实现用户登录、保存拼豆作品、分享作品功能，前端通过embed嵌入。

## Phases
- [x] Phase 1: 项目初始化和架构设计
- [x] Phase 2: 数据库Schema设计 (Ent ORM)
- [x] Phase 3: 前端文件拆分 (CSS/JS/HTML)
- [x] Phase 4: 用户认证模块实现
- [x] Phase 5: 拼豆作品CRUD API实现
- [x] Phase 6: 分享功能实现
- [x] Phase 7: 前端集成和embed配置
- [x] Phase 8: 测试和完善

## Status
**已完成** - 所有功能测试通过

## Key Questions
1. 用户认证方式：Session vs JWT?
2. 拼豆数据存储格式：JSON还是分离存储？
3. 分享机制：公开链接 vs 指定用户？

## Decisions Made
- 认证方式: Session-based认证 (简单可靠)
- 数据存储: JSON存储网格数据 + 元数据字段
- 分享机制: 生成唯一分享码的公开链接

## Project Structure
```
pindou-lzcapp/
├── cmd/
│   └── server/
│       └── main.go          # 入口文件
├── internal/
│   ├── config/
│   │   └── config.go        # 配置管理
│   ├── database/
│   │   └── database.go      # 数据库连接
│   ├── handlers/
│   │   ├── auth.go          # 认证处理
│   │   ├── design.go        # 作品处理
│   │   └── share.go         # 分享处理
│   ├── middleware/
│   │   └── auth.go          # 认证中间件
│   └── models/
│       └── types.go         # 请求/响应类型
├── ent/
│   └── schema/
│       ├── user.go          # 用户表
│       └── design.go        # 作品表
├── web/
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css    # 拆分的样式
│   │   └── js/
│   │       └── app.js       # 拆分的JS
│   ├── index.html           # 主页面
│   └── embed.go             # embed配置
├── go.mod
└── go.sum
```

## API Design
```
POST   /api/auth/register    # 用户注册
POST   /api/auth/login       # 用户登录
POST   /api/auth/logout      # 用户登出
GET    /api/auth/me          # 获取当前用户

GET    /api/designs          # 获取用户作品列表
POST   /api/designs          # 创建新作品
GET    /api/designs/:id      # 获取作品详情
PUT    /api/designs/:id      # 更新作品
DELETE /api/designs/:id      # 删除作品

POST   /api/designs/:id/share    # 创建分享链接
GET    /api/share/:code          # 获取分享作品(公开)
```

## Status
**Currently in Phase 1** - 准备开始项目初始化