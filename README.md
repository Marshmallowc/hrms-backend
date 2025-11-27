# 企业人力资源综合管理系统 (HRMS Enterprise)

### 环境要求
- Node.js >= 20.19.0
- pnpm (推荐) 或 npm

### 安装步骤

1. **安装后端依赖**
```bash
cd backend
npm install
```

### 启动服务

**启动后端服务器:**
```bash
cd backend
node server.js
```
后端运行在: http://localhost:3000

## 测试账号

系统提供了多个测试账号，可以体验不同角色的功能：

### 管理员账号
| 邮箱 | 密码 | 角色 | 说明 |
|------|------|------|------|
| admin@hrms.com | admin123 | Admin | 系统管理员，拥有所有权限 |

### 经理账号
| 邮箱 | 密码 | 角色 | 部门 |
|------|------|------|------|
| manager1@hrms.com | manager123 | Manager | HR经理 |
| manager2@hrms.com | manager123 | Manager | 技术经理 |

### 员工账号
| 邮箱 | 密码 | 角色 | 职位 |
|------|------|------|------|
| emp1@hrms.com | emp123 | Employee | 高级工程师 |
| emp2@hrms.com | emp123 | Employee | 前端工程师 |
| emp3@hrms.com | emp123 | Employee | 销售专员 |
| emp4@hrms.com | emp123 | Employee | 市场专员 |
| emp5@hrms.com | emp123 | Employee | HR专员 |
| emp6@hrms.com | emp123 | Employee | 财务专员 |
| emp7@hrms.com | emp123 | Employee | 后端工程师 |

## 角色权限说明

### Employee (员工)
- 查看个人仪表盘（个人统计数据）
- 申请请假
- 查看个人请假记录
- 查看个人绩效评价
- 打卡签到/签退
- 查看个人考勤记录

### Manager (经理)
- 员工的所有权限
- 查看所有员工信息
- 添加/编辑员工
- 审批请假申请
- 对员工进行绩效评价
- 查看所有考勤记录

### Admin (管理员)
- 经理的所有权限
- 删除员工记录
- 删除请假记录
- 系统配置管理

### 数据库

系统使用 SQLite 数据库，数据库文件位于 `backend/database/hrms.db`。

**初始化数据库**

数据库会在首次启动后端时自动创建。如需插入测试数据：

```bash
cd backend
node database/seed.js
```

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提issue。
