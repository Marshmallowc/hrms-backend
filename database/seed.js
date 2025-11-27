import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'hrms.db'));

console.log('🔄 开始插入模拟数据...\n');

// 清空现有数据
console.log('清空现有数据...');
db.prepare('DELETE FROM attendance').run();
db.prepare('DELETE FROM performance_reviews').run();
db.prepare('DELETE FROM leave_requests').run();
db.prepare('DELETE FROM employees').run();
db.prepare('DELETE FROM users').run();

// 创建用户和员工
const users = [
    { username: 'admin', email: 'admin@hrms.com', password: 'admin123', role: 'admin', full_name: '张伟', department: 'IT', position: '系统管理员', salary: 15000 },
    { username: 'manager1', email: 'manager1@hrms.com', password: 'manager123', role: 'manager', full_name: '李娜', department: 'HR', position: '人力资源经理', salary: 12000 },
    { username: 'manager2', email: 'manager2@hrms.com', password: 'manager123', role: 'manager', full_name: '王强', department: 'Engineering', position: '技术经理', salary: 14000 },
    { username: 'emp1', email: 'emp1@hrms.com', password: 'emp123', role: 'employee', full_name: '刘洋', department: 'Engineering', position: '高级工程师', salary: 11000 },
    { username: 'emp2', email: 'emp2@hrms.com', password: 'emp123', role: 'employee', full_name: '陈静', department: 'Engineering', position: '前端工程师', salary: 10000 },
    { username: 'emp3', email: 'emp3@hrms.com', password: 'emp123', role: 'employee', full_name: '赵敏', department: 'Sales', position: '销售专员', salary: 9000 },
    { username: 'emp4', email: 'emp4@hrms.com', password: 'emp123', role: 'employee', full_name: '孙浩', department: 'Marketing', position: '市场专员', salary: 9500 },
    { username: 'emp5', email: 'emp5@hrms.com', password: 'emp123', role: 'employee', full_name: '周芳', department: 'HR', position: 'HR专员', salary: 8500 },
    { username: 'emp6', email: 'emp6@hrms.com', password: 'emp123', role: 'employee', full_name: '吴磊', department: 'Finance', position: '财务专员', salary: 10500 },
    { username: 'emp7', email: 'emp7@hrms.com', password: 'emp123', role: 'employee', full_name: '郑雪', department: 'Engineering', position: '后端工程师', salary: 11500 },
];

const hireDates = [
    '2020-03-15', '2021-06-01', '2019-09-20', '2022-01-10', '2021-11-05',
    '2020-07-15', '2022-03-20', '2021-04-12', '2020-10-08', '2022-05-15'
];

console.log('创建用户和员工...');
const userMap = {}; // username -> {userId, employeeId}

for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const passwordHash = await bcrypt.hash(user.password, 10);

    // 创建用户
    const userResult = db.prepare(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(user.username, user.email, passwordHash, user.role);

    const userId = userResult.lastInsertRowid;

    // 创建员工记录
    const empResult = db.prepare(
        'INSERT INTO employees (user_id, full_name, department, position, hire_date, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, user.full_name, user.department, user.position, hireDates[i], user.salary, 'active');

    const employeeId = empResult.lastInsertRowid;

    userMap[user.username] = { userId, employeeId };
    console.log(`✓ 创建: ${user.full_name} (${user.username}) - ${user.role}`);
}

// 创建请假记录
console.log('\n创建请假记录...');
const leaveRequests = [
    { username: 'emp1', type: 'annual', start: '2024-12-20', end: '2024-12-25', reason: '年假回家探亲', status: 'approved' },
    { username: 'emp2', type: 'sick', start: '2024-11-15', end: '2024-11-16', reason: '感冒发烧', status: 'approved' },
    { username: 'emp3', type: 'personal', start: '2024-12-01', end: '2024-12-01', reason: '处理个人事务', status: 'approved' },
    { username: 'emp4', type: 'annual', start: '2024-12-10', end: '2024-12-12', reason: '年假旅游', status: 'pending' },
    { username: 'emp5', type: 'sick', start: '2024-11-20', end: '2024-11-21', reason: '身体不适', status: 'rejected' },
    { username: 'emp6', type: 'annual', start: '2024-12-15', end: '2024-12-18', reason: '年假休息', status: 'pending' },
    { username: 'emp7', type: 'personal', start: '2024-11-25', end: '2024-11-25', reason: '家庭事务', status: 'approved' },
    { username: 'emp1', type: 'annual', start: '2025-01-05', end: '2025-01-10', reason: '春节假期', status: 'pending' },
];

leaveRequests.forEach(leave => {
    const employeeId = userMap[leave.username].employeeId;
    db.prepare(
        'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(employeeId, leave.type, leave.start, leave.end, leave.reason, leave.status);
    console.log(`✓ 请假: ${leave.username} - ${leave.type} (${leave.status})`);
});

// 创建绩效评价
console.log('\n创建绩效评价...');
const performanceReviews = [
    { employee: 'emp1', reviewer: 'manager2', period: '2024 Q3', rating: 5, goals: '完成核心功能开发，优化系统性能', feedback: '表现优秀，技术能力强，按时完成所有任务' },
    { employee: 'emp2', reviewer: 'manager2', period: '2024 Q3', rating: 4, goals: '完成前端页面开发，提升用户体验', feedback: '工作认真负责，代码质量高，需要加强沟通' },
    { employee: 'emp7', reviewer: 'manager2', period: '2024 Q3', rating: 4, goals: '完成后端API开发，保证系统稳定性', feedback: '技术扎实，工作效率高，团队协作良好' },
    { employee: 'emp3', reviewer: 'manager1', period: '2024 Q3', rating: 5, goals: '完成销售目标，拓展新客户', feedback: '超额完成销售任务，客户满意度高' },
    { employee: 'emp4', reviewer: 'manager1', period: '2024 Q3', rating: 3, goals: '制定市场推广方案，提升品牌知名度', feedback: '工作态度积极，但执行力需要提升' },
    { employee: 'emp5', reviewer: 'manager1', period: '2024 Q3', rating: 4, goals: '优化招聘流程，提升员工满意度', feedback: '工作细致认真，流程优化效果明显' },
    { employee: 'emp6', reviewer: 'manager1', period: '2024 Q3', rating: 4, goals: '完成财务报表，确保账目准确', feedback: '专业能力强，工作严谨，准确性高' },
    { employee: 'emp1', reviewer: 'manager2', period: '2024 Q2', rating: 4, goals: '学习新技术，提升开发效率', feedback: '学习能力强，技术进步明显' },
    { employee: 'emp2', reviewer: 'manager2', period: '2024 Q2', rating: 4, goals: '优化前端性能，提升加载速度', feedback: '性能优化效果显著，用户体验提升' },
];

performanceReviews.forEach(review => {
    const employeeId = userMap[review.employee].employeeId;
    const reviewerId = userMap[review.reviewer].userId;
    db.prepare(
        'INSERT INTO performance_reviews (employee_id, reviewer_id, period, rating, goals, feedback) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(employeeId, reviewerId, review.period, review.rating, review.goals, review.feedback);
    console.log(`✓ 绩效: ${review.employee} - ${review.period} - ${review.rating}星`);
});

// 创建考勤记录（最近30天）
console.log('\n创建考勤记录...');
const today = new Date();
const employeeUsernames = ['emp1', 'emp2', 'emp3', 'emp4', 'emp5', 'emp6', 'emp7'];
let attendanceCount = 0;

for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // 跳过周末
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    employeeUsernames.forEach(username => {
        // 90%的出勤率
        if (Math.random() > 0.1) {
            const clockIn = `${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;
            const clockOut = `${17 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;

            // 计算工时
            const inHour = parseInt(clockIn.split(':')[0]);
            const inMin = parseInt(clockIn.split(':')[1]);
            const outHour = parseInt(clockOut.split(':')[0]);
            const outMin = parseInt(clockOut.split(':')[1]);
            const totalHours = (outHour + outMin / 60) - (inHour + inMin / 60);

            // 判断状态
            let status = 'present';
            if (inHour >= 9) status = 'late';

            const employeeId = userMap[username].employeeId;
            db.prepare(
                'INSERT INTO attendance (employee_id, date, clock_in, clock_out, total_hours, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(employeeId, dateStr, clockIn, clockOut, totalHours.toFixed(2), status);
            attendanceCount++;
        }
    });
}
console.log(`✓ 创建了 ${attendanceCount} 条考勤记录`);

// 统计信息
console.log('\n📊 数据统计:');
console.log(`用户总数: ${db.prepare('SELECT COUNT(*) as count FROM users').get().count}`);
console.log(`员工总数: ${db.prepare('SELECT COUNT(*) as count FROM employees').get().count}`);
console.log(`请假记录: ${db.prepare('SELECT COUNT(*) as count FROM leave_requests').get().count}`);
console.log(`绩效评价: ${db.prepare('SELECT COUNT(*) as count FROM performance_reviews').get().count}`);
console.log(`考勤记录: ${db.prepare('SELECT COUNT(*) as count FROM attendance').get().count}`);

console.log('\n✅ 模拟数据插入完成！\n');
console.log('测试账号信息:');
console.log('━'.repeat(60));
console.log('管理员账号:');
console.log('  用户名: admin      密码: admin123');
console.log('\n经理账号:');
console.log('  用户名: manager1   密码: manager123 (HR经理)');
console.log('  用户名: manager2   密码: manager123 (技术经理)');
console.log('\n员工账号:');
console.log('  用户名: emp1       密码: emp123 (高级工程师)');
console.log('  用户名: emp2       密码: emp123 (前端工程师)');
console.log('  用户名: emp3       密码: emp123 (销售专员)');
console.log('━'.repeat(60));

db.close();
